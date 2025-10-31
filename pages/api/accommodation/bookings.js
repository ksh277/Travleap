/**
 * 사용자용 - 숙박 예약 API
 * POST /api/accommodation/bookings - 예약 생성
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
        special_requests = ''
      } = req.body;

      // 필수 필드 검증
      if (!user_id || !listing_id || !checkin_date || !checkout_date || !guest_name || !guest_email || !guest_phone || !guest_count) {
        return res.status(400).json({
          success: false,
          error: '필수 정보를 모두 입력해주세요.'
        });
      }

      // 숙박 정보 조회
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
      `;

      const listingResult = await connection.execute(listingQuery, [listing_id]);

      if (!listingResult.rows || listingResult.rows.length === 0) {
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
        return res.status(400).json({
          success: false,
          error: '체크아웃일은 체크인일보다 이후여야 합니다.'
        });
      }

      // 최소/최대 숙박일 체크
      if (listing.min_nights && nights < listing.min_nights) {
        return res.status(400).json({
          success: false,
          error: `최소 ${listing.min_nights}박 이상 예약 가능합니다.`
        });
      }

      if (listing.max_nights && nights > listing.max_nights) {
        return res.status(400).json({
          success: false,
          error: `최대 ${listing.max_nights}박까지 예약 가능합니다.`
        });
      }

      // 최대 인원 체크
      if (guest_count > listing.max_occupancy) {
        return res.status(400).json({
          success: false,
          error: `최대 ${listing.max_occupancy}명까지 예약 가능합니다.`
        });
      }

      // TODO: 날짜별 가용성 체크

      // 가격 계산
      const basePrice = listing.base_price_per_night || listing.price_from;
      const weekendSurcharge = listing.weekend_surcharge || 0;

      // 간단한 가격 계산 (실제로는 주말/주중 구분 필요)
      const roomPrice = basePrice * nights;
      const extraPersonFee = guest_count > listing.max_occupancy ? (guest_count - listing.max_occupancy) * 20000 * nights : 0;
      const breakfastFee = listing.breakfast_included ? 0 : 0; // 조식 미포함 시 추가 요금
      const taxAmount = Math.floor(roomPrice * 0.10); // 부가세 10%
      const serviceCharge = Math.floor(roomPrice * 0.10); // 봉사료 10%
      const totalPrice = roomPrice + extraPersonFee + breakfastFee + taxAmount + serviceCharge;

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

      // 예약 생성
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
        totalPrice
      ]);

      console.log('✅ [Accommodation Booking] 예약 생성:', {
        booking_number: bookingNumber,
        listing: listing.title,
        nights: nights,
        total_price: totalPrice
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
          total_price: totalPrice,
          status: 'pending',
          payment_status: 'pending'
        }
      });

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
          error: '사용자 ID가 필요합니다.'
        });
      }

      const query = `
        SELECT
          b.id,
          b.booking_number,
          b.start_date as checkin_date,
          b.end_date as checkout_date,
          DATEDIFF(b.end_date, b.start_date) as nights,
          b.guest_count,
          b.customer_info,
          b.special_requests,
          b.total_amount as total_price,
          b.status,
          b.payment_status,
          b.created_at,
          l.id as listing_id,
          l.title as listing_name,
          l.room_type,
          l.bed_type,
          l.images,
          l.location as city,
          l.address,
          l.max_occupancy as capacity,
          l.wifi_available,
          l.breakfast_included,
          p.business_name as vendor_name,
          p.logo as vendor_logo,
          p.check_in_time,
          p.check_out_time
        FROM bookings b
        LEFT JOIN listings l ON b.listing_id = l.id
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE b.user_id = ? AND l.category = 'stay'
        ORDER BY b.created_at DESC
      `;

      const result = await connection.execute(query, [user_id]);

      const bookings = (result.rows || []).map(booking => {
        let customerInfo = {};
        let images = [];

        try {
          if (booking.customer_info) {
            customerInfo = typeof booking.customer_info === 'string' ? JSON.parse(booking.customer_info) : booking.customer_info;
          }
        } catch (e) {
          console.warn('customer_info parsing failed:', booking.id);
        }

        try {
          if (booking.images) {
            images = typeof booking.images === 'string' ? JSON.parse(booking.images) : booking.images;
          }
        } catch (e) {
          console.warn('images parsing failed:', booking.id);
        }

        return {
          id: booking.id,
          booking_number: booking.booking_number,
          listing: {
            id: booking.listing_id,
            name: booking.listing_name,
            room_type: booking.room_type,
            bed_type: booking.bed_type,
            thumbnail_url: images.length > 0 ? images[0] : null,
            images: images,
            city: booking.city,
            address: booking.address,
            capacity: booking.capacity,
            wifi_available: booking.wifi_available,
            breakfast_included: booking.breakfast_included
          },
          vendor_name: booking.vendor_name,
          vendor_logo: booking.vendor_logo,
          checkin_date: booking.checkin_date,
          checkout_date: booking.checkout_date,
          check_in_time: booking.check_in_time,
          check_out_time: booking.check_out_time,
          nights: booking.nights,
          guest_count: booking.guest_count,
          total_price: booking.total_price,
          status: booking.status,
          payment_status: booking.payment_status,
          special_requests: booking.special_requests,
          customer_info: customerInfo,
          created_at: booking.created_at
        };
      });

      return res.status(200).json({
        success: true,
        bookings
      });

    } catch (error) {
      console.error('❌ [Accommodation Booking] 예약 조회 실패:', error);
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
