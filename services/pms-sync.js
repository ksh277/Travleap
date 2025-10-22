const { connect } = require('@planetscale/database');

/**
 * PMS 동기화 메인 로직
 *
 * 지원 PMS:
 * - carcloud: CarCloud API
 * - rentsyst: RentSyst API
 * - custom: 커스텀 엔드포인트
 */

class PMSSync {
  constructor(vendorId, pmsConfig) {
    this.vendorId = vendorId;
    this.pmsConfig = pmsConfig;
    this.connection = connect({ url: process.env.DATABASE_URL });

    this.stats = {
      added: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };
  }

  /**
   * 동기화 실행
   */
  async sync() {
    const logId = await this.createSyncLog();

    try {
      console.log(`🔄 [PMS Sync] 시작 - Vendor ${this.vendorId}, Provider: ${this.pmsConfig.pms_provider}`);

      // 1. PMS에서 차량 데이터 가져오기
      const pmsVehicles = await this.fetchFromPMS();
      console.log(`📥 [PMS Sync] ${pmsVehicles.length}개 차량 데이터 수신`);

      // 2. 현재 DB 차량 목록
      const dbVehicles = await this.getDBVehicles();
      console.log(`💾 [PMS Sync] DB에 ${dbVehicles.length}개 차량 존재`);

      // 3. 차량 데이터 동기화
      await this.syncVehicles(pmsVehicles, dbVehicles);

      // 4. 동기화 로그 업데이트 (성공)
      await this.updateSyncLog(logId, 'success');

      console.log(`✅ [PMS Sync] 완료 - 추가: ${this.stats.added}, 수정: ${this.stats.updated}, 삭제: ${this.stats.deleted}`);

      return {
        success: true,
        stats: this.stats
      };

    } catch (error) {
      console.error(`❌ [PMS Sync] 실패:`, error);

      // 동기화 로그 업데이트 (실패)
      await this.updateSyncLog(logId, 'failed', error.message);

      return {
        success: false,
        error: error.message,
        stats: this.stats
      };
    }
  }

  /**
   * PMS에서 차량 데이터 가져오기
   */
  async fetchFromPMS() {
    const { pms_provider, pms_api_key, pms_endpoint } = this.pmsConfig;

    // Mock 데이터 (실제 환경에서는 PMS API 호출)
    if (process.env.NODE_ENV === 'development' || !pms_endpoint) {
      console.log('⚠️ [PMS Sync] 개발 모드 - Mock 데이터 사용');
      return this.getMockVehicles();
    }

    try {
      // 실제 PMS API 호출
      const response = await fetch(pms_endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${pms_api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`PMS API returned ${response.status}`);
      }

      const data = await response.json();

      // PMS별로 데이터 형식이 다를 수 있으므로 변환
      return this.transformPMSData(data, pms_provider);

    } catch (error) {
      console.error('❌ [PMS Sync] API 호출 실패:', error);
      throw new Error(`PMS API 호출 실패: ${error.message}`);
    }
  }

  /**
   * PMS 데이터 형식 변환
   */
  transformPMSData(data, provider) {
    // 각 PMS별로 데이터 형식이 다르므로 변환 로직
    switch (provider) {
      case 'carcloud':
        return this.transformCarCloud(data);
      case 'rentsyst':
        return this.transformRentSyst(data);
      default:
        return data.vehicles || data;
    }
  }

  transformCarCloud(data) {
    // CarCloud API 형식 변환
    return (data.cars || []).map(car => ({
      external_id: car.id,
      name: car.make_model,
      type: car.vehicle_type,
      year: car.year,
      seats: car.passenger_capacity,
      transmission: car.transmission_type,
      fuel_type: car.fuel_type,
      daily_rate: car.daily_rate,
      image_url: car.primary_image
    }));
  }

  transformRentSyst(data) {
    // RentSyst API 형식 변환
    return (data.inventory || []).map(vehicle => ({
      external_id: vehicle.vehicle_id,
      name: `${vehicle.brand} ${vehicle.model}`,
      type: vehicle.category,
      year: vehicle.year,
      seats: vehicle.seats,
      transmission: vehicle.gearbox,
      fuel_type: vehicle.fuel,
      daily_rate: vehicle.price_per_day,
      image_url: vehicle.photo_url
    }));
  }

  /**
   * DB에서 현재 차량 목록 가져오기
   */
  async getDBVehicles() {
    const result = await this.connection.execute(
      'SELECT id, external_id, name, updated_at FROM rentcar_vehicles WHERE vendor_id = ?',
      [this.vendorId]
    );
    return result.rows || [];
  }

  /**
   * 차량 동기화
   */
  async syncVehicles(pmsVehicles, dbVehicles) {
    // external_id로 매핑
    const dbMap = new Map(dbVehicles.map(v => [v.external_id, v]));
    const pmsMap = new Map(pmsVehicles.map(v => [v.external_id, v]));

    // 1. PMS에 있는 차량 -> 추가 or 업데이트
    for (const pmsVehicle of pmsVehicles) {
      const dbVehicle = dbMap.get(pmsVehicle.external_id);

      if (!dbVehicle) {
        // 신규 차량 추가
        await this.addVehicle(pmsVehicle);
        this.stats.added++;
      } else {
        // 기존 차량 업데이트
        await this.updateVehicle(dbVehicle.id, pmsVehicle);
        this.stats.updated++;
      }
    }

    // 2. PMS에 없는 차량 -> 삭제 또는 비활성화
    for (const dbVehicle of dbVehicles) {
      if (!pmsMap.has(dbVehicle.external_id)) {
        await this.deactivateVehicle(dbVehicle.id);
        this.stats.deleted++;
      }
    }
  }

  /**
   * 차량 추가
   */
  async addVehicle(vehicle) {
    try {
      await this.connection.execute(
        `INSERT INTO rentcar_vehicles (
          vendor_id, external_id, name, type, year, seats,
          transmission, fuel_type, daily_rate, images, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          this.vendorId,
          vehicle.external_id,
          vehicle.name,
          vehicle.type || '중형',
          vehicle.year || new Date().getFullYear(),
          vehicle.seats || 5,
          vehicle.transmission || '자동',
          vehicle.fuel_type || '가솔린',
          vehicle.daily_rate || 0,
          JSON.stringify([vehicle.image_url || 'https://via.placeholder.com/400x300'])
        ]
      );
      console.log(`✅ [PMS Sync] 차량 추가: ${vehicle.name}`);
    } catch (error) {
      console.error(`❌ [PMS Sync] 차량 추가 실패: ${vehicle.name}`, error);
      this.stats.errors.push(`추가 실패: ${vehicle.name}`);
    }
  }

  /**
   * 차량 업데이트
   */
  async updateVehicle(vehicleId, vehicle) {
    try {
      await this.connection.execute(
        `UPDATE rentcar_vehicles
         SET name = ?, type = ?, year = ?, seats = ?,
             transmission = ?, fuel_type = ?, daily_rate = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          vehicle.name,
          vehicle.type || '중형',
          vehicle.year || new Date().getFullYear(),
          vehicle.seats || 5,
          vehicle.transmission || '자동',
          vehicle.fuel_type || '가솔린',
          vehicle.daily_rate || 0,
          vehicleId
        ]
      );
      console.log(`✅ [PMS Sync] 차량 업데이트: ${vehicle.name}`);
    } catch (error) {
      console.error(`❌ [PMS Sync] 차량 업데이트 실패: ${vehicle.name}`, error);
      this.stats.errors.push(`업데이트 실패: ${vehicle.name}`);
    }
  }

  /**
   * 차량 비활성화
   */
  async deactivateVehicle(vehicleId) {
    try {
      await this.connection.execute(
        'UPDATE rentcar_vehicles SET is_active = 0, updated_at = NOW() WHERE id = ?',
        [vehicleId]
      );
      console.log(`✅ [PMS Sync] 차량 비활성화: ID ${vehicleId}`);
    } catch (error) {
      console.error(`❌ [PMS Sync] 차량 비활성화 실패: ID ${vehicleId}`, error);
      this.stats.errors.push(`비활성화 실패: ID ${vehicleId}`);
    }
  }

  /**
   * 동기화 로그 생성
   */
  async createSyncLog() {
    const result = await this.connection.execute(
      `INSERT INTO pms_sync_logs (
        vendor_id, sync_status, sync_started_at, created_at
      ) VALUES (?, 'partial', NOW(), NOW())`,
      [this.vendorId]
    );
    return result.insertId;
  }

  /**
   * 동기화 로그 업데이트
   */
  async updateSyncLog(logId, status, errorMessage = null) {
    await this.connection.execute(
      `UPDATE pms_sync_logs
       SET sync_status = ?,
           vehicles_added = ?,
           vehicles_updated = ?,
           vehicles_deleted = ?,
           error_message = ?,
           sync_completed_at = NOW()
       WHERE id = ?`,
      [
        status,
        this.stats.added,
        this.stats.updated,
        this.stats.deleted,
        errorMessage,
        logId
      ]
    );

    // rentcar_vendors의 pms_last_sync 업데이트
    await this.connection.execute(
      'UPDATE rentcar_vendors SET pms_last_sync = NOW() WHERE id = ?',
      [this.vendorId]
    );
  }

  /**
   * Mock 데이터 (테스트용)
   */
  getMockVehicles() {
    return [
      {
        external_id: 'PMS_001',
        name: '현대 아반떼',
        type: '준중형',
        year: 2023,
        seats: 5,
        transmission: '자동',
        fuel_type: '가솔린',
        daily_rate: 50000,
        image_url: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Avante'
      },
      {
        external_id: 'PMS_002',
        name: 'K5',
        type: '중형',
        year: 2024,
        seats: 5,
        transmission: '자동',
        fuel_type: '가솔린',
        daily_rate: 70000,
        image_url: 'https://via.placeholder.com/400x300/cc0000/ffffff?text=K5'
      }
    ];
  }
}

module.exports = { PMSSync };
