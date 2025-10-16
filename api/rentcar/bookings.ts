// 렌트카 예약 API
import { db } from '../../utils/database';
import { InventoryLockManager } from '../../utils/inventory-lock';

const lockManager = InventoryLockManager.getInstance();

interface CreateBookingRequest {
  vehicle_id: number;
  pickup_location_id: number;
  dropoff_location_id: number;
  pickup_date: string; // YYYY-MM-DD
  pickup_time: string; // HH:MM
  dropoff_date: string; // YYYY-MM-DD
  dropoff_time: string; // HH:MM
  driver_name: string;
  driver_phone: string;
  driver_email: string;
  driver_license_number?: string;
  insurance_ids?: number[]; // 선택한 보험 상품 ID들
  option_ids?: number[]; // 선택한 추가 옵션 ID들
  user_id?: number;
}

interface CheckAvailabilityRequest {
  vehicle_id?: number;
  vendor_id?: number;
  pickup_date: string;
  dropoff_date: string;
  pickup_location_id?: number;
}

// 예약 번호 생성
function generateBookingNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RC-${timestamp}-${random}`;
}

// 날짜 검증
function validateDates(pickupDate: string, dropoffDate: string): { valid: boolean; error?: string; days?: number } {
  const pickup = new Date(pickupDate);
  const dropoff = new Date(dropoffDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 과거 날짜 체크
  if (pickup < now) {
    return { valid: false, error: '과거 날짜로 예약할 수 없습니다' };
  }

  // 대여일 < 반납일 체크
  if (pickup >= dropoff) {
    return { valid: false, error: '반납일은 대여일보다 이후여야 합니다' };
  }

  // 대여 기간 계산 (일 단위)
  const diffTime = dropoff.getTime() - pickup.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 최소 대여 기간 (1일)
  if (diffDays < 1) {
    return { valid: false, error: '최소 대여 기간은 1일입니다' };
  }

  // 최대 대여 기간 (90일)
  if (diffDays > 90) {
    return { valid: false, error: '최대 대여 기간은 90일입니다' };
  }

  return { valid: true, days: diffDays };
}

// 재고 확인 (해당 날짜에 차량이 예약되어 있는지)
export async function checkAvailability(request: CheckAvailabilityRequest) {
  try {
    const { vehicle_id, vendor_id, pickup_date, dropoff_date, pickup_location_id } = request;

    // 날짜 검증
    const dateValidation = validateDates(pickup_date, dropoff_date);
    if (!dateValidation.valid) {
      return {
        success: false,
        message: dateValidation.error,
        available_vehicles: []
      };
    }

    let query = `
      SELECT
        v.*,
        vendor.business_name as vendor_name,
        (
          SELECT COUNT(*)
          FROM rentcar_bookings rb
          WHERE rb.vehicle_id = v.id
          AND rb.status NOT IN ('cancelled')
          AND (
            (rb.pickup_date <= ? AND rb.dropoff_date >= ?) OR
            (rb.pickup_date <= ? AND rb.dropoff_date >= ?) OR
            (rb.pickup_date >= ? AND rb.dropoff_date <= ?)
          )
        ) as conflict_count
      FROM rentcar_vehicles v
      LEFT JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE v.is_active = TRUE
    `;

    const params: any[] = [
      pickup_date, pickup_date,
      dropoff_date, dropoff_date,
      pickup_date, dropoff_date
    ];

    if (vehicle_id) {
      query += ' AND v.id = ?';
      params.push(vehicle_id);
    }

    if (vendor_id) {
      query += ' AND v.vendor_id = ?';
      params.push(vendor_id);
    }

    if (pickup_location_id) {
      // 해당 지점에서 픽업 가능한 차량만
      query += ` AND EXISTS (
        SELECT 1 FROM rentcar_locations loc
        WHERE loc.vendor_id = v.vendor_id
        AND loc.id = ?
      )`;
      params.push(pickup_location_id);
    }

    const vehicles = await db.query(query, params);

    // conflict_count가 0인 차량만 필터링
    const availableVehicles = vehicles.filter((v: any) => v.conflict_count === 0);

    return {
      success: true,
      available_vehicles: availableVehicles,
      total_count: availableVehicles.length
    };
  } catch (error) {
    console.error('❌ [Rentcar] 재고 확인 오류:', error);
    return {
      success: false,
      message: '재고 확인 중 오류가 발생했습니다',
      available_vehicles: []
    };
  }
}

// 예약 생성 (Lock 보호)
export async function createBooking(request: CreateBookingRequest) {
  const lockKey = `rentcar:booking:${request.vehicle_id}:${request.pickup_date}`;
  const lockOwner = `user_${request.user_id || 'guest'}`;

  try {
    // 1. Lock 획득
    const lockAcquired = await lockManager.acquireLock(lockKey, lockOwner, 600); // 10분
    if (!lockAcquired) {
      return {
        success: false,
        message: '다른 사용자가 예약 중입니다. 잠시 후 다시 시도해주세요'
      };
    }

    console.log('🔒 [Rentcar] Lock 획득:', lockKey);

    // 2. 날짜 검증
    const dateValidation = validateDates(request.pickup_date, request.dropoff_date);
    if (!dateValidation.valid) {
      return { success: false, message: dateValidation.error };
    }
    const rentalDays = dateValidation.days!;

    // 3. 차량 정보 조회
    const vehicles = await db.query(`
      SELECT v.*, vendor.business_name, vendor.commission_rate
      FROM rentcar_vehicles v
      LEFT JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE v.id = ? AND v.is_active = TRUE
    `, [request.vehicle_id]);

    if (vehicles.length === 0) {
      return { success: false, message: '차량을 찾을 수 없거나 비활성 상태입니다' };
    }

    const vehicle = vehicles[0];

    // 4. 재고 확인 (중복 예약 방지)
    const availability = await checkAvailability({
      vehicle_id: request.vehicle_id,
      pickup_date: request.pickup_date,
      dropoff_date: request.dropoff_date
    });

    if (!availability.success || availability.available_vehicles.length === 0) {
      return {
        success: false,
        message: '선택하신 날짜에 해당 차량을 예약할 수 없습니다'
      };
    }

    // 5. 픽업/반납 지점 정보 조회
    const pickupLocation = await db.query(
      'SELECT * FROM rentcar_locations WHERE id = ?',
      [request.pickup_location_id]
    );
    const dropoffLocation = await db.query(
      'SELECT * FROM rentcar_locations WHERE id = ?',
      [request.dropoff_location_id]
    );

    if (pickupLocation.length === 0 || dropoffLocation.length === 0) {
      return { success: false, message: '픽업/반납 지점을 찾을 수 없습니다' };
    }

    // 6. 가격 계산
    const dailyRate = vehicle.daily_rate_krw;
    const subtotal = dailyRate * rentalDays;

    // 픽업/반납 수수료
    const pickupFee = pickupLocation[0].pickup_fee_krw || 0;
    const dropoffFee = dropoffLocation[0].dropoff_fee_krw || 0;

    // 보험료 계산
    let insuranceTotal = 0;
    if (request.insurance_ids && request.insurance_ids.length > 0) {
      const insurances = await db.query(
        `SELECT * FROM rentcar_insurance_products WHERE id IN (${request.insurance_ids.join(',')}) AND is_active = TRUE`
      );
      insuranceTotal = insurances.reduce((sum: number, ins: any) => sum + ins.price_per_day_krw * rentalDays, 0);
    }

    // 추가 옵션 비용 계산
    let optionsTotal = 0;
    if (request.option_ids && request.option_ids.length > 0) {
      const options = await db.query(
        `SELECT * FROM rentcar_additional_options WHERE id IN (${request.option_ids.join(',')}) AND is_active = TRUE`
      );
      optionsTotal = options.reduce((sum: number, opt: any) => {
        if (opt.charge_type === 'per_day') {
          return sum + opt.price_krw * rentalDays;
        } else {
          return sum + opt.price_krw; // one_time
        }
      }, 0);
    }

    // 세금 (10%)
    const taxRate = 0.1;
    const taxAmount = Math.floor((subtotal + pickupFee + dropoffFee + insuranceTotal + optionsTotal) * taxRate);

    // 총액
    const totalPrice = subtotal + pickupFee + dropoffFee + insuranceTotal + optionsTotal + taxAmount;

    // 7. 예약 생성
    const bookingNumber = generateBookingNumber();

    const bookingResult = await db.execute(`
      INSERT INTO rentcar_bookings (
        booking_number, vendor_id, vehicle_id, user_id,
        pickup_location_id, dropoff_location_id,
        pickup_date, pickup_time, dropoff_date, dropoff_time,
        driver_name, driver_phone, driver_email, driver_license_number,
        rental_days, daily_rate_krw,
        subtotal_krw, insurance_krw, extras_krw, tax_krw, total_krw,
        status, payment_status, created_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?,
        'pending', 'pending', NOW()
      )
    `, [
      bookingNumber, vehicle.vendor_id, request.vehicle_id, request.user_id || null,
      request.pickup_location_id, request.dropoff_location_id,
      request.pickup_date, request.pickup_time, request.dropoff_date, request.dropoff_time,
      request.driver_name, request.driver_phone, request.driver_email, request.driver_license_number || null,
      rentalDays, dailyRate,
      subtotal, insuranceTotal, optionsTotal + pickupFee + dropoffFee, taxAmount, totalPrice
    ]);

    const bookingId = bookingResult.insertId;

    // 8. 보험 선택 저장
    if (request.insurance_ids && request.insurance_ids.length > 0) {
      for (const insuranceId of request.insurance_ids) {
        const insurance = await db.query('SELECT * FROM rentcar_insurance_products WHERE id = ?', [insuranceId]);
        if (insurance.length > 0) {
          await db.execute(`
            INSERT INTO rentcar_booking_insurance (booking_id, insurance_id, price_krw)
            VALUES (?, ?, ?)
          `, [bookingId, insuranceId, insurance[0].price_per_day_krw * rentalDays]);
        }
      }
    }

    // 9. 추가 옵션 저장
    if (request.option_ids && request.option_ids.length > 0) {
      for (const optionId of request.option_ids) {
        const option = await db.query('SELECT * FROM rentcar_additional_options WHERE id = ?', [optionId]);
        if (option.length > 0) {
          const optionPrice = option[0].charge_type === 'per_day'
            ? option[0].price_krw * rentalDays
            : option[0].price_krw;

          await db.execute(`
            INSERT INTO rentcar_booking_options (booking_id, option_id, quantity, price_krw)
            VALUES (?, ?, ?, ?)
          `, [bookingId, optionId, 1, optionPrice]);
        }
      }
    }

    console.log('✅ [Rentcar] 예약 생성 완료:', bookingNumber);

    return {
      success: true,
      message: '예약이 생성되었습니다',
      booking: {
        id: bookingId,
        booking_number: bookingNumber,
        vehicle_name: vehicle.display_name,
        vendor_name: vehicle.business_name,
        pickup_date: request.pickup_date,
        dropoff_date: request.dropoff_date,
        rental_days: rentalDays,
        total_price: totalPrice,
        status: 'pending',
        payment_status: 'pending'
      }
    };

  } catch (error) {
    console.error('❌ [Rentcar] 예약 생성 오류:', error);
    return {
      success: false,
      message: '예약 생성 중 오류가 발생했습니다'
    };
  } finally {
    // Lock 해제
    await lockManager.releaseLock(lockKey, lockOwner);
    console.log('🔓 [Rentcar] Lock 해제:', lockKey);
  }
}

// 예약 취소
export async function cancelBooking(bookingId: number, userId?: number) {
  try {
    // 예약 조회
    const bookings = await db.query('SELECT * FROM rentcar_bookings WHERE id = ?', [bookingId]);

    if (bookings.length === 0) {
      return { success: false, message: '예약을 찾을 수 없습니다' };
    }

    const booking = bookings[0];

    // 권한 확인
    if (userId && booking.user_id !== userId) {
      return { success: false, message: '예약을 취소할 권한이 없습니다' };
    }

    // 이미 취소되었거나 완료된 예약
    if (booking.status === 'cancelled') {
      return { success: false, message: '이미 취소된 예약입니다' };
    }

    if (booking.status === 'completed') {
      return { success: false, message: '완료된 예약은 취소할 수 없습니다' };
    }

    // 예약 취소
    await db.execute(`
      UPDATE rentcar_bookings
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ?
    `, [bookingId]);

    console.log('✅ [Rentcar] 예약 취소 완료:', booking.booking_number);

    return {
      success: true,
      message: '예약이 취소되었습니다',
      booking_number: booking.booking_number
    };

  } catch (error) {
    console.error('❌ [Rentcar] 예약 취소 오류:', error);
    return {
      success: false,
      message: '예약 취소 중 오류가 발생했습니다'
    };
  }
}

// 예약 목록 조회
export async function getBookings(filters: {
  vendor_id?: number;
  user_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}) {
  try {
    let query = `
      SELECT
        b.*,
        v.display_name as vehicle_name,
        v.thumbnail_url as vehicle_image,
        vendor.business_name as vendor_name,
        pl.name as pickup_location_name,
        dl.name as dropoff_location_name
      FROM rentcar_bookings b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_vendors vendor ON b.vendor_id = vendor.id
      LEFT JOIN rentcar_locations pl ON b.pickup_location_id = pl.id
      LEFT JOIN rentcar_locations dl ON b.dropoff_location_id = dl.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters.vendor_id) {
      query += ' AND b.vendor_id = ?';
      params.push(filters.vendor_id);
    }

    if (filters.user_id) {
      query += ' AND b.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }

    if (filters.start_date) {
      query += ' AND b.pickup_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND b.pickup_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY b.created_at DESC';

    const bookings = await db.query(query, params);

    return {
      success: true,
      bookings
    };

  } catch (error) {
    console.error('❌ [Rentcar] 예약 목록 조회 오류:', error);
    return {
      success: false,
      message: '예약 목록 조회 중 오류가 발생했습니다',
      bookings: []
    };
  }
}
