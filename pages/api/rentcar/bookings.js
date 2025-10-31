/**
 * 사용자용 - 렌트카 예약 API
 * POST /api/rentcar/bookings - 예약 생성
 * GET /api/rentcar/bookings?user_id=123 - 사용자 예약 내역
 */

const { connect } = require('@planetscale/database');

// 예약 번호 생성 (RC + 타임스탬프 + 랜덤)
const generateBookingNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RC${timestamp}${random}`;
};

// 확인 코드 생성 (6자리 알파벳+숫자)
const generateConfirmationCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동하기 쉬운 문자 제외
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // 예약 생성
  if (req.method === 'POST') {
    try {
      const {
        user_id,
        vehicle_id,
        pickup_location_id,
        dropoff_location_id,
        pickup_datetime,
        dropoff_datetime,
        customer_name,
        customer_email,
        customer_phone,
        customer_driver_license,
        selected_insurance_ids = [], // 선택한 보험 ID 배열
        special_requests = ''
      } = req.body;

      // 필수 필드 검증
      if (!user_id || !vehicle_id || !pickup_datetime || !dropoff_datetime || !customer_name || !customer_email || !customer_phone || !customer_driver_license) {
        return res.status(400).json({
          success: false,
          error: '필수 정보를 모두 입력해주세요.'
        });
      }

      // 차량 정보 조회
      const vehicleQuery = `
        SELECT
          v.*,
          vd.id as vendor_id,
          vd.business_name as vendor_name
        FROM rentcar_vehicles v
        LEFT JOIN rentcar_vendors vd ON v.vendor_id = vd.id
        WHERE v.id = ? AND v.is_active = 1
      `;

      const vehicleResult = await connection.execute(vehicleQuery, [vehicle_id]);

      if (!vehicleResult.rows || vehicleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '차량을 찾을 수 없습니다.'
        });
      }

      const vehicle = vehicleResult.rows[0];

      // 날짜 계산
      const pickupDate = new Date(pickup_datetime);
      const dropoffDate = new Date(dropoff_datetime);
      const totalDays = Math.ceil((dropoffDate - pickupDate) / (1000 * 60 * 60 * 24));

      if (totalDays <= 0) {
        return res.status(400).json({
          success: false,
          error: '반납일은 대여일보다 이후여야 합니다.'
        });
      }

      // TODO: 차량 가용성 체크 (rentcar_availability_rules, rentcar_bookings 테이블)
      // 현재는 간단하게 활성화된 차량이면 예약 가능하다고 가정

      // 기본 요금 계산 (deposit_amount를 일일 요금으로 간주 - 추후 rate_plans 테이블 사용)
      const dailyRate = vehicle.deposit_amount_krw || 50000;
      const basePrice = dailyRate * totalDays;

      // 선택한 보험 비용 계산
      let insuranceFee = 0;
      let insuranceDetails = [];

      if (selected_insurance_ids.length > 0) {
        const insuranceQuery = `
          SELECT id, insurance_name, daily_rate_krw, coverage_amount_krw
          FROM rentcar_insurance_plans
          WHERE id IN (${selected_insurance_ids.map(() => '?').join(',')})
            AND vehicle_id = ?
            AND is_active = 1
        `;

        const insuranceResult = await connection.execute(
          insuranceQuery,
          [...selected_insurance_ids, vehicle_id]
        );

        if (insuranceResult.rows && insuranceResult.rows.length > 0) {
          insuranceResult.rows.forEach(insurance => {
            const insuranceCost = insurance.daily_rate_krw * totalDays;
            insuranceFee += insuranceCost;
            insuranceDetails.push({
              id: insurance.id,
              name: insurance.insurance_name,
              daily_rate: insurance.daily_rate_krw,
              total_cost: insuranceCost
            });
          });
        }
      }

      // 추가 비용 (현재는 0, 추후 옵션 추가 시 계산)
      const additionalFees = 0;

      // 총 금액
      const totalPrice = basePrice + insuranceFee + additionalFees;

      // 예약 번호 및 확인 코드 생성
      const bookingNumber = generateBookingNumber();
      const confirmationCode = generateConfirmationCode();

      // 예약 생성
      const insertQuery = `
        INSERT INTO rentcar_bookings (
          booking_number,
          user_id,
          vehicle_id,
          vendor_id,
          pickup_location_id,
          dropoff_location_id,
          pickup_datetime,
          dropoff_datetime,
          customer_name,
          customer_email,
          customer_phone,
          customer_driver_license,
          total_days,
          daily_rate_krw,
          insurance_fee_krw,
          additional_fees_krw,
          total_price_krw,
          status,
          payment_status,
          special_requests,
          confirmation_code,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, NOW())
      `;

      const insertResult = await connection.execute(insertQuery, [
        bookingNumber,
        user_id,
        vehicle_id,
        vehicle.vendor_id,
        pickup_location_id || null,
        dropoff_location_id || null,
        pickup_datetime,
        dropoff_datetime,
        customer_name,
        customer_email,
        customer_phone,
        customer_driver_license,
        totalDays,
        dailyRate,
        insuranceFee,
        additionalFees,
        totalPrice,
        special_requests,
        confirmationCode
      ]);

      console.log('✅ [Rentcar Booking] 예약 생성:', {
        booking_number: bookingNumber,
        vehicle: vehicle.display_name || `${vehicle.brand} ${vehicle.model}`,
        total_days: totalDays,
        total_price: totalPrice
      });

      return res.status(201).json({
        success: true,
        booking: {
          id: insertResult.insertId,
          booking_number: bookingNumber,
          confirmation_code: confirmationCode,
          vehicle_name: vehicle.display_name || `${vehicle.brand} ${vehicle.model}`,
          vendor_name: vehicle.vendor_name,
          pickup_datetime,
          dropoff_datetime,
          total_days: totalDays,
          daily_rate_krw: dailyRate,
          insurance_fee_krw: insuranceFee,
          insurance_details: insuranceDetails,
          additional_fees_krw: additionalFees,
          total_price_krw: totalPrice,
          status: 'pending',
          payment_status: 'pending'
        }
      });

    } catch (error) {
      console.error('❌ [Rentcar Booking] 예약 생성 실패:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 사용자 예약 내역 조회
  if (req.method === 'GET') {
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: '사용자 ID가 필요합니다.'
        });
      }

      const query = `
        SELECT
          b.id,
          b.booking_number,
          b.confirmation_code,
          b.pickup_datetime,
          b.dropoff_datetime,
          b.total_days,
          b.daily_rate_krw,
          b.insurance_fee_krw,
          b.additional_fees_krw,
          b.total_price_krw,
          b.status,
          b.payment_status,
          b.special_requests,
          b.created_at,
          b.customer_name,
          b.customer_email,
          b.customer_phone,
          v.id as vehicle_id,
          v.brand as vehicle_brand,
          v.model as vehicle_model,
          v.display_name as vehicle_display_name,
          v.vehicle_class,
          v.thumbnail_url as vehicle_image,
          v.seating_capacity,
          v.transmission,
          v.fuel_type,
          vd.business_name as vendor_name,
          vd.logo_url as vendor_logo,
          pl.location_name as pickup_location,
          dl.location_name as dropoff_location
        FROM rentcar_bookings b
        LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        LEFT JOIN rentcar_vendors vd ON b.vendor_id = vd.id
        LEFT JOIN rentcar_locations pl ON b.pickup_location_id = pl.id
        LEFT JOIN rentcar_locations dl ON b.dropoff_location_id = dl.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
      `;

      const result = await connection.execute(query, [user_id]);

      const bookings = (result.rows || []).map(booking => ({
        id: booking.id,
        booking_number: booking.booking_number,
        confirmation_code: booking.confirmation_code,
        vehicle: {
          id: booking.vehicle_id,
          brand: booking.vehicle_brand,
          model: booking.vehicle_model,
          display_name: booking.vehicle_display_name || `${booking.vehicle_brand} ${booking.vehicle_model}`,
          vehicle_class: booking.vehicle_class,
          thumbnail_url: booking.vehicle_image,
          seating_capacity: booking.seating_capacity,
          transmission: booking.transmission,
          fuel_type: booking.fuel_type
        },
        vendor_name: booking.vendor_name,
        vendor_logo: booking.vendor_logo,
        pickup_location: booking.pickup_location,
        dropoff_location: booking.dropoff_location,
        pickup_datetime: booking.pickup_datetime,
        dropoff_datetime: booking.dropoff_datetime,
        total_days: booking.total_days,
        daily_rate_krw: booking.daily_rate_krw,
        insurance_fee_krw: booking.insurance_fee_krw,
        additional_fees_krw: booking.additional_fees_krw,
        total_price_krw: booking.total_price_krw,
        status: booking.status,
        payment_status: booking.payment_status,
        special_requests: booking.special_requests,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        created_at: booking.created_at
      }));

      return res.status(200).json({
        success: true,
        bookings
      });

    } catch (error) {
      console.error('❌ [Rentcar Booking] 예약 조회 실패:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
