/**
 * 누락된 테이블 추가 마이그레이션
 *
 * 이 스크립트는 기존 테이블은 유지하고 누락된 테이블만 추가합니다.
 * 서버 시작 시 자동으로 실행됩니다.
 */

import { getDatabase } from '../utils/database.js';

export async function runMissingTablesMigration() {
  const db = getDatabase();

  console.log('🔧 [Migration] Adding missing tables...');

  try {
    // 홈 배너 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS home_banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_url VARCHAR(500) NOT NULL,
        title VARCHAR(200),
        subtitle VARCHAR(300),
        link_url VARCHAR(500),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_order (display_order)
      )
    `);
    console.log('✅ home_banners table created/verified');

    // 액티비티 이미지 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        activity_id INT NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        caption VARCHAR(200),
        display_order INT DEFAULT 0,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_activity (activity_id),
        INDEX idx_order (display_order)
      )
    `);
    console.log('✅ activity_images table created/verified');

    // 숙박 예약 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS lodging_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_number VARCHAR(50) UNIQUE NOT NULL,
        listing_id INT NOT NULL,
        room_type_id INT NOT NULL,
        user_id INT NOT NULL,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        num_guests INT DEFAULT 1,
        total_amount DECIMAL(10, 2) NOT NULL,
        deposit_amount DECIMAL(10, 2) DEFAULT 0,
        payment_status ENUM('pending', 'deposit_paid', 'fully_paid', 'refunded') DEFAULT 'pending',
        booking_status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'pending',
        customer_info JSON,
        special_requests TEXT,
        cancellation_reason TEXT,
        expiry_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing (listing_id),
        INDEX idx_room_type (room_type_id),
        INDEX idx_user (user_id),
        INDEX idx_payment_status (payment_status),
        INDEX idx_booking_status (booking_status),
        INDEX idx_expiry (expiry_date)
      )
    `);
    console.log('✅ lodging_bookings table created/verified');

    // 벤더 설정 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vendor_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vendor_setting (vendor_id, setting_key),
        INDEX idx_vendor (vendor_id)
      )
    `);
    console.log('✅ vendor_settings table created/verified');

    // PMS API 크레덴셜 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pms_api_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        pms_provider VARCHAR(50) NOT NULL,
        api_key VARCHAR(500),
        api_secret VARCHAR(500),
        api_endpoint VARCHAR(500),
        hotel_id VARCHAR(100),
        property_id VARCHAR(100),
        sync_enabled BOOLEAN DEFAULT FALSE,
        sync_interval_hours INT DEFAULT 1,
        last_sync_at TIMESTAMP,
        settings JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vendor_pms (vendor_id),
        INDEX idx_provider (pms_provider),
        INDEX idx_sync_enabled (sync_enabled)
      )
    `);
    console.log('✅ pms_api_credentials table created/verified');

    // PMS 동기화 작업 로그 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pms_sync_jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pms_credential_id INT NOT NULL,
        status ENUM('RUNNING', 'SUCCESS', 'FAILED') DEFAULT 'RUNNING',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        rooms_synced INT DEFAULT 0,
        rates_synced INT DEFAULT 0,
        availability_synced INT DEFAULT 0,
        sync_details JSON,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_credential (pms_credential_id),
        INDEX idx_status (status),
        INDEX idx_started_at (started_at)
      )
    `);
    console.log('✅ pms_sync_jobs table created/verified');

    // 수수료율 관리 테이블
    await db.execute(`
      CREATE TABLE IF NOT EXISTS commission_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(50),
        vendor_id INT,
        rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
        effective_from TIMESTAMP,
        effective_to TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_by INT,
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_vendor (vendor_id),
        INDEX idx_active (is_active),
        INDEX idx_effective_dates (effective_from, effective_to)
      )
    `);
    console.log('✅ commission_rates table created/verified');

    // 기본 수수료율 데이터 시드
    const commissionRatesData = [
      { id: 1, category: null, vendor_id: null, rate: 10.00, notes: '전체 기본 수수료율', created_by: 1 },
      { id: 2, category: 'rentcar', vendor_id: null, rate: 10.00, notes: '렌트카 기본 수수료율', created_by: 1 },
      { id: 3, category: 'stay', vendor_id: null, rate: 12.00, notes: '숙박 기본 수수료율', created_by: 1 },
      { id: 4, category: 'tour', vendor_id: null, rate: 15.00, notes: '여행 기본 수수료율', created_by: 1 },
      { id: 5, category: 'food', vendor_id: null, rate: 8.00, notes: '음식 기본 수수료율', created_by: 1 },
      { id: 6, category: 'tourist', vendor_id: null, rate: 12.00, notes: '관광지 기본 수수료율', created_by: 1 },
      { id: 7, category: 'popup', vendor_id: null, rate: 20.00, notes: '팝업 기본 수수료율', created_by: 1 },
      { id: 8, category: 'event', vendor_id: null, rate: 15.00, notes: '행사 기본 수수료율', created_by: 1 },
      { id: 9, category: 'experience', vendor_id: null, rate: 15.00, notes: '체험 기본 수수료율', created_by: 1 }
    ];

    for (const commissionRate of commissionRatesData) {
      await db.execute(`
        INSERT IGNORE INTO commission_rates (id, category, vendor_id, rate, is_active, notes, created_by)
        VALUES (?, ?, ?, ?, TRUE, ?, ?)
      `, [commissionRate.id, commissionRate.category, commissionRate.vendor_id, commissionRate.rate, commissionRate.notes, commissionRate.created_by]);
    }
    console.log('✅ commission_rates seed data inserted');

    console.log('🎉 [Migration] All missing tables added successfully!');
    return true;

  } catch (error) {
    console.error('❌ [Migration] Failed to add missing tables:', error);
    return false;
  }
}
