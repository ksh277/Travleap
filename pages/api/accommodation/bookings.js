/**
 * 사용자용 - 숙박 예약 API
 * POST /api/accommodation/bookings - 예약 생성 - 금액 서버 검증 적용
 * GET /api/accommodation/bookings?user_id=123 - 사용자 예약 내역
 */

const { connect } = require('@planetscale/database');

const STAY_CATEGORY_ID = 1857;

// 예약 번호 생성 (ACC + 타임스탬프 + 랜덤)
const generateBookingNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ACC${timestamp}${random}`;
};

// 확인 코드 생성 (6자리 알파벳+숫자)
const generateConfirmationCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
        listing_id,
        checkin_date,
        checkout_date,
        guest_name,
        guest_email,
        guest_phone,
        guest_count,
        total_price, // 클라이언트가 보낸 값 (검증 필요)
        special_requests = ''
      } = req.body;

      // 필수 필드 검증
      if (!user_id || !listing_id || !checkin_date || !checkout_date || !guest_name || !guest_email || !guest_phone || !guest_count) {
        return res.status(400).json({
          success: false,
          error: '필수 정보를 모두 입력해주세요.'
        });
      }

      // 🔒 트랜잭션 시작
      await connection.execute('START TRANSACTION');

      try {
        // 숙박 정보 조회 (FOR UPDATE로 락 획득)
        const listingQuery = `
          SELECT
            l.id,
            l.title,
            l.base_price_per_night,
            l.price_from,
            l.weekend_surcharge,
            l.max_occupancy,
            l.min_nights,
            l.max_nights,
            l.breakfast_included,
            p.id as vendor_id,
            p.business_name as vendor_name
          FROM listings l
          LEFT JOIN partners p ON l.partner_id = p.id
          WHERE l.id = ? AND l.category = 'stay' AND l.is_active = 1
          FOR UPDATE
        `;

        const listingResult = await connection.execute(listingQuery, [listing_id]);

        if (!listingResult.rows || listingResult.rows.length === 0) {
          await connection.execute('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: '숙박을 찾을 수 없습니다.'
          });
        }

        const listing = listingResult.rows[0];

        // 날짜 계산
        const checkinDateObj = new Date(checkin_date);
        const checkoutDateObj = new Date(checkout_date);
        const nights = Math.ceil((checkoutDateObj - checkinDateObj) / (1000 * 60 * 60 * 24));

        if (nights <= 0) {
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: '체크아웃일은 체크인일보다 이후여야 합니다.'
          });
        }

        // 최소/최대 숙박일 체크
        if (listing.min_nights && nights < listing.min_nights) {
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: `최소 ${listing.min_nights}박 이상 예약 가능합니다.`
          });
        }

        if (listing.max_nights && nights > listing.max_nights) {
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: `최대 ${listing.max_nights}박까지 예약 가능합니다.`
          });
        }

        // 최대 인원 체크
        if (guest_count > listing.max_occupancy) {
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: `최대 ${listing.max_occupancy}명까지 예약 가능합니다.`
          });
        }

        // 🔒 날짜별 가용성 체크 (FOR UPDATE로 동시성 제어)
        const availabilityQuery = `
          SELECT COUNT(*) as booking_count
          FROM bookings
          WHERE listing_id = ?
            AND status NOT IN ('cancelled', 'rejected')
            AND (
              (start_date <= ? AND end_date > ?) OR
              (start_date < ? AND end_date >= ?) OR
              (start_date >= ? AND end_date <= ?)
            )
          FOR UPDATE
        `;

        const availabilityResult = await connection.execute(availabilityQuery, [
          listing_id,
          checkin_date, checkin_date,
          checkout_date, checkout_date,
          checkin_date, checkout_date
        ]);

        const bookingCount = availabilityResult.rows[0]?.booking_count || 0;
        if (bookingCount > 0) {
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: '선택하신 날짜에 이미 예약이 있습니다. 다른 날짜를 선택해주세요.'
          });
        }

        // 🔒 가격 검증 (서버에서 재계산)
        const basePrice = parseFloat(listing.base_price_per_night || listing.price_from) || 0;
        const weekendSurcharge = parseFloat(listing.weekend_surcharge) || 0;

        // 간단한 가격 계산 (실제로는 주말/주중 구분 필요)
        const roomPrice = basePrice * nights;
        const extraPersonFee = guest_count > listing.max_occupancy ?
          (guest_count - listing.max_occupancy) * 20000 * nights : 0;
        const breakfastFee = listing.breakfast_included ? 0 : 0; // 조식 미포함 시 추가 요금
        const taxAmount = Math.floor(roomPrice * 0.10); // 부가세 10%
        const serviceCharge = Math.floor(roomPrice * 0.10); // 봉사료 10%
        const serverCalculatedTotal = roomPrice + extraPersonFee + breakfastFee + taxAmount + serviceCharge;

        console.log(`🔒 [Stay Booking] 서버 측 가격 재계산:
          - 객실료: ${basePrice}원 × ${nights}박 = ${roomPrice}원
          - 추가 인원: ${extraPersonFee}원
          - 세금: ${taxAmount}원
          - 봉사료: ${serviceCharge}원
          - 서버 계산 합계: ${serverCalculatedTotal}원
          - 클라이언트 값: ${total_price}원`);

        // 클라이언트가 보낸 가격과 서버 계산이 다르면 거부
        if (total_price !== undefined && Math.abs(serverCalculatedTotal - total_price) > 1) {
          await connection.execute('ROLLBACK');
          console.error(`❌ [Stay Booking] 가격 조작 감지!
            - 클라이언트 total_price: ${total_price}원
            - 서버 계산 total: ${serverCalculatedTotal}원
            - 차이: ${Math.abs(serverCalculatedTotal - total_price)}원`);

          return res.status(400).json({
            success: false,
            error: 'PRICE_TAMPERED',
            message: '예약 금액이 조작되었습니다. 페이지를 새로고침해주세요.'
          });
        }

        // 예약 번호 및 확인 코드 생성
        const bookingNumber = generateBookingNumber();
        const confirmationCode = generateConfirmationCode();

        // customer_info JSON 생성
        const customerInfo = {
          name: guest_name,
          email: guest_email,
          phone: guest_phone,
          guest_count: guest_count
        };

        // 예약 생성 (서버 검증된 가격 사용)
        const insertQuery = `
          INSERT INTO bookings (
            listing_id,
            user_id,
            booking_number,
            start_date,
            end_date,
            guest_count,
            customer_info,
            special_requests,
            total_amount,
            status,
            payment_status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW())
        `;

        const insertResult = await connection.execute(insertQuery, [
          listing_id,
          user_id,
          bookingNumber,
          checkin_date,
          checkout_date,
          guest_count,
          JSON.stringify(customerInfo),
          special_requests,
          serverCalculatedTotal // 서버 계산 가격 사용
        ]);

        // 🔒 트랜잭션 커밋
        await connection.execute('COMMIT');

        console.log('✅ [Accommodation Booking] 예약 생성:', {
          booking_number: bookingNumber,
          listing: listing.title,
          nights: nights,
          total_price: serverCalculatedTotal
        });

        return res.status(201).json({
          success: true,
          booking: {
            id: insertResult.insertId,
            booking_number: bookingNumber,
            confirmation_code: confirmationCode,
            listing_name: listing.title,
            vendor_name: listing.vendor_name,
            checkin_date,
            checkout_date,
            nights,
            guest_count,
            room_price: roomPrice,
            extra_person_fee: extraPersonFee,
            breakfast_fee: breakfastFee,
            tax_amount: taxAmount,
            service_charge: serviceCharge,
            total_price: serverCalculatedTotal,
            status: 'pending',
            payment_status: 'pending'
          }
        });

      } catch (innerError) {
        // 트랜잭션 롤백
        await connection.execute('ROLLBACK');
        throw innerError;
      }

    } catch (error) {
      console.error('❌ [Accommodation Booking] 예약 생성 실패:', error);
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
          error: 'user_id가 필요합니다.'
        });
      }

      const query = `
        SELECT
          b.*,
          l.title as listing_title,
          l.address as listing_address,
          l.images as listing_images,
          p.business_name as vendor_name,
          p.phone as vendor_phone
        FROM bookings b
        LEFT JOIN listings l ON b.listing_id = l.id
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE b.user_id = ? AND l.category = 'stay'
        ORDER BY b.created_at DESC
      `;

      const result = await connection.execute(query, [user_id]);

      const bookings = (result.rows || []).map(booking => ({
        ...booking,
        customer_info: booking.customer_info ?
          (typeof booking.customer_info === 'string' ?
            JSON.parse(booking.customer_info) : booking.customer_info) : {},
        listing_images: booking.listing_images ?
          (typeof booking.listing_images === 'string' ?
            JSON.parse(booking.listing_images) : booking.listing_images) : []
      }));

      return res.status(200).json({
        success: true,
        bookings
      });

    } catch (error) {
      console.error('❌ [Accommodation Bookings GET] Error:', error);
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
