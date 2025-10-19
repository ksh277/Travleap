/**
 * 렌트카 예약 API
 * GET /api/rentcar/bookings - 예약 목록 조회
 * POST /api/rentcar/bookings - 예약 생성
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 예약 목록 조회
    if (req.method === 'GET') {
      const { vendor_id } = req.query;

      let sql = `
        SELECT
          b.*,
          v.brand, v.model, v.display_name, v.vehicle_class, v.thumbnail_url,
          ve.business_name as vendor_business_name, ve.brand_name as vendor_brand_name, ve.contact_phone as vendor_phone,
          pl.name as pickup_location_name, pl.address as pickup_location_address, pl.phone as pickup_location_phone,
          dl.name as dropoff_location_name, dl.address as dropoff_location_address, dl.phone as dropoff_location_phone
        FROM rentcar_bookings b
        INNER JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        INNER JOIN rentcar_vendors ve ON b.vendor_id = ve.id
        INNER JOIN rentcar_locations pl ON b.pickup_location_id = pl.id
        INNER JOIN rentcar_locations dl ON b.dropoff_location_id = dl.id
        WHERE 1=1
      `;
      const params = [];

      if (vendor_id) {
        sql += ` AND b.vendor_id = ?`;
        params.push(vendor_id);
      }

      sql += ` ORDER BY b.created_at DESC`;

      const bookings = await connection.execute(sql, params);

      // 데이터 구조화
      const formatted = (bookings.rows || []).map((row) => ({
        id: row.id,
        booking_number: row.booking_number,
        vendor_id: row.vendor_id,
        vehicle_id: row.vehicle_id,
        user_id: row.user_id,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
        pickup_location_id: row.pickup_location_id,
        dropoff_location_id: row.dropoff_location_id,
        pickup_date: row.pickup_date,
        pickup_time: row.pickup_time,
        dropoff_date: row.dropoff_date,
        dropoff_time: row.dropoff_time,
        daily_rate_krw: row.daily_rate_krw,
        rental_days: row.rental_days,
        subtotal_krw: row.subtotal_krw,
        insurance_krw: row.insurance_krw,
        extras_krw: row.extras_krw,
        tax_krw: row.tax_krw,
        discount_krw: row.discount_krw,
        total_krw: row.total_krw,
        status: row.status,
        payment_status: row.payment_status,
        special_requests: row.special_requests,
        created_at: row.created_at,
        updated_at: row.updated_at,
        vehicle: {
          brand: row.brand,
          model: row.model,
          display_name: row.display_name,
          vehicle_class: row.vehicle_class,
          thumbnail_url: row.thumbnail_url
        },
        vendor: {
          business_name: row.vendor_business_name,
          brand_name: row.vendor_brand_name,
          contact_phone: row.vendor_phone
        },
        pickup_location: {
          name: row.pickup_location_name,
          address: row.pickup_location_address,
          phone: row.pickup_location_phone
        },
        dropoff_location: {
          name: row.dropoff_location_name,
          address: row.dropoff_location_address,
          phone: row.dropoff_location_phone
        }
      }));

      return res.status(200).json({
        success: true,
        data: formatted
      });
    }

    // POST - 예약 생성
    if (req.method === 'POST') {
      const {
        vendor_id,
        vehicle_id,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        pickup_location_id,
        dropoff_location_id,
        pickup_date,
        pickup_time,
        dropoff_date,
        dropoff_time,
        special_requests
      } = req.body;

      // 1. 차량 정보 조회
      const vehicle = await connection.execute(`
        SELECT daily_rate_krw FROM rentcar_vehicles WHERE id = ?
      `, [vehicle_id]);

      if (!vehicle.rows || vehicle.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '차량을 찾을 수 없습니다.'
        });
      }

      const dailyRate = vehicle.rows[0].daily_rate_krw;

      // 2. 대여 일수 계산
      const pickupDateObj = new Date(pickup_date);
      const dropoffDateObj = new Date(dropoff_date);
      const rentalDays = Math.ceil((dropoffDateObj.getTime() - pickupDateObj.getTime()) / (1000 * 60 * 60 * 24));

      if (rentalDays <= 0) {
        return res.status(400).json({
          success: false,
          error: '반납일은 픽업일보다 이후여야 합니다.'
        });
      }

      // 3. 가격 계산
      const subtotal = dailyRate * rentalDays;
      const tax = Math.round(subtotal * 0.1); // 10% 세금
      const total = subtotal + tax;

      // 4. 예약번호 생성
      const bookingNumber = `RC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // 5. 예약 생성
      const result = await connection.execute(`
        INSERT INTO rentcar_bookings (
          booking_number, vendor_id, vehicle_id, user_id,
          customer_name, customer_email, customer_phone,
          pickup_location_id, dropoff_location_id,
          pickup_date, pickup_time, dropoff_date, dropoff_time,
          daily_rate_krw, rental_days, subtotal_krw, tax_krw, total_krw,
          special_requests, status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
      `, [
        bookingNumber, vendor_id, vehicle_id, user_id,
        customer_name, customer_email, customer_phone,
        pickup_location_id, dropoff_location_id,
        pickup_date, pickup_time, dropoff_date, dropoff_time,
        dailyRate, rentalDays, subtotal, tax, total,
        special_requests || null
      ]);

      return res.status(200).json({
        success: true,
        data: { id: result.insertId, booking_number: bookingNumber },
        message: '예약이 생성되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Bookings API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
