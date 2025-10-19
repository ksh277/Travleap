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
    if (req.method === 'GET') {
      const { vendor_id } = req.query;

      let sql = `
        SELECT
          b.*,
          v.brand, v.model, v.display_name, v.vehicle_class, v.thumbnail_url,
          ve.business_name as vendor_business_name, ve.brand_name as vendor_brand_name
        FROM rentcar_bookings b
        INNER JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        INNER JOIN rentcar_vendors ve ON b.vendor_id = ve.id
        WHERE 1=1
      `;
      const params = [];

      if (vendor_id) {
        sql += ` AND b.vendor_id = ?`;
        params.push(vendor_id);
      }

      sql += ` ORDER BY b.created_at DESC`;

      const bookings = await connection.execute(sql, params);

      const formatted = (bookings.rows || []).map((row) => ({
        ...row,
        vehicle: {
          brand: row.brand,
          model: row.model,
          display_name: row.display_name,
          vehicle_class: row.vehicle_class,
          thumbnail_url: row.thumbnail_url
        },
        vendor: {
          business_name: row.vendor_business_name,
          brand_name: row.vendor_brand_name
        }
      }));

      return res.status(200).json({
        success: true,
        data: formatted
      });
    }

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

      const pickupDateObj = new Date(pickup_date);
      const dropoffDateObj = new Date(dropoff_date);
      const rentalDays = Math.ceil((dropoffDateObj.getTime() - pickupDateObj.getTime()) / (1000 * 60 * 60 * 24));

      if (rentalDays <= 0) {
        return res.status(400).json({
          success: false,
          error: '반납일은 픽업일보다 이후여야 합니다.'
        });
      }

      const subtotal = dailyRate * rentalDays;
      const tax = Math.round(subtotal * 0.1);
      const total = subtotal + tax;

      const bookingNumber = `RC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

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
