/**
 * 사용자용 - 숙박 검색/목록 API
 * GET /api/accommodation/listings - 숙박 목록 (검색, 필터링)
 * GET /api/accommodation/listings?id=123 - 특정 숙박 상세 조회
 */

const { connect } = require('@planetscale/database');

const STAY_CATEGORY_ID = 1857; // stay 카테고리 ID

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  if (req.method === 'GET') {
    try {
      const {
        id,
        keyword,
        city,
        lodging_type,
        room_type,
        min_price,
        max_price,
        checkin_date,
        checkout_date,
        guests,
        amenities, // wifi,parking,pool 등
        star_rating,
        sort_by = 'popular', // popular, price_low, price_high, rating, newest
        limit = 20,
        offset = 0
      } = req.query;

      // 특정 숙박 상세 조회
      if (id) {
        const query = `
          SELECT
            l.id,
            l.id as listing_id,
            l.partner_id,
            l.title as name,
            l.description_md as description,
            l.room_code,
            l.room_number,
            l.room_type,
            l.floor,
            l.bed_type,
            l.bed_count,
            l.size_sqm,
            l.base_price_per_night,
            l.price_from,
            l.weekend_surcharge,
            l.view_type,
            l.has_balcony,
            l.breakfast_included,
            l.wifi_available,
            l.tv_available,
            l.minibar_available,
            l.air_conditioning,
            l.heating,
            l.bathroom_type,
            l.max_occupancy as capacity,
            l.min_nights,
            l.max_nights,
            l.location as city,
            l.address,
            l.images,
            l.amenities,
            l.is_active,
            l.created_at,
            p.id as vendor_id,
            p.business_name as vendor_name,
            p.logo as vendor_logo,
            p.check_in_time,
            p.check_out_time,
            p.policies,
            COUNT(DISTINCT b.id) as total_bookings
          FROM listings l
          LEFT JOIN partners p ON l.partner_id = p.id
          LEFT JOIN bookings b ON l.id = b.listing_id
            AND b.status IN ('confirmed', 'completed')
          WHERE l.id = ? AND l.category = 'stay' AND l.is_active = 1
          GROUP BY l.id
        `;

        const result = await connection.execute(query, [id]);

        if (!result.rows || result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '숙박을 찾을 수 없습니다.'
          });
        }

        const listing = result.rows[0];

        // JSON 필드 파싱
        const formattedListing = {
          ...listing,
          images: listing.images ? (typeof listing.images === 'string' ? JSON.parse(listing.images) : listing.images) : [],
          amenities: listing.amenities ? (typeof listing.amenities === 'string' ? JSON.parse(listing.amenities) : listing.amenities) : {},
          policies: listing.policies ? (typeof listing.policies === 'string' ? JSON.parse(listing.policies) : listing.policies) : {}
        };

        return res.status(200).json({
          success: true,
          listing: formattedListing
        });
      }

      // 목록 조회
      let query = `
        SELECT
          l.id,
          l.id as listing_id,
          l.partner_id,
          l.partner_id as vendor_id,
          l.title as name,
          l.description_md as description,
          l.room_code,
          l.room_number,
          l.room_type,
          l.floor,
          l.bed_type,
          l.bed_count,
          l.size_sqm,
          l.max_occupancy as capacity,
          l.base_price_per_night,
          l.price_from,
          l.weekend_surcharge,
          l.view_type,
          l.has_balcony,
          l.breakfast_included,
          l.wifi_available,
          l.tv_available,
          l.minibar_available,
          l.air_conditioning,
          l.heating,
          l.bathroom_type,
          l.location as city,
          l.address,
          l.images,
          l.amenities,
          l.min_nights,
          l.max_nights,
          l.is_active,
          p.business_name as vendor_name,
          p.logo as vendor_logo,
          p.check_in_time,
          p.check_out_time,
          p.policies,
          COUNT(DISTINCT b.id) as total_bookings
        FROM listings l
        LEFT JOIN partners p ON l.partner_id = p.id
        LEFT JOIN bookings b ON l.id = b.listing_id
          AND b.status IN ('confirmed', 'completed')
        WHERE l.category = 'stay' AND l.category_id = ? AND l.is_active = 1
      `;

      const params = [STAY_CATEGORY_ID];

      // 키워드 검색
      if (keyword) {
        query += ` AND (l.title LIKE ? OR l.description_md LIKE ? OR l.location LIKE ?)`;
        const searchTerm = `%${keyword}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // 도시 필터
      if (city) {
        query += ` AND l.location LIKE ?`;
        params.push(`%${city}%`);
      }

      // 객실 타입 필터
      if (room_type) {
        query += ` AND l.room_type = ?`;
        params.push(room_type);
      }

      // 가격 필터
      if (min_price) {
        query += ` AND l.price_from >= ?`;
        params.push(parseInt(min_price));
      }

      if (max_price) {
        query += ` AND l.price_from <= ?`;
        params.push(parseInt(max_price));
      }

      // 인원 필터
      if (guests) {
        query += ` AND l.max_occupancy >= ?`;
        params.push(parseInt(guests));
      }

      // 편의시설 필터 (JSON 필드)
      if (amenities) {
        const amenitiesList = amenities.split(',');
        amenitiesList.forEach(amenity => {
          switch (amenity.trim()) {
            case 'wifi':
              query += ` AND l.wifi_available = 1`;
              break;
            case 'breakfast':
              query += ` AND l.breakfast_included = 1`;
              break;
            case 'balcony':
              query += ` AND l.has_balcony = 1`;
              break;
            case 'tv':
              query += ` AND l.tv_available = 1`;
              break;
            case 'ac':
              query += ` AND l.air_conditioning = 1`;
              break;
          }
        });
      }

      // 날짜별 가용성 체크 (예약이 겹치는 숙박 제외)
      if (checkin_date && checkout_date) {
        query += `
          AND l.id NOT IN (
            SELECT listing_id
            FROM bookings
            WHERE status NOT IN ('cancelled', 'rejected')
              AND (
                (start_date <= ? AND end_date > ?)
                OR (start_date < ? AND end_date >= ?)
                OR (start_date >= ? AND end_date <= ?)
              )
          )
        `;
        params.push(
          checkin_date, checkin_date,
          checkout_date, checkout_date,
          checkin_date, checkout_date
        );
      }

      query += ` GROUP BY l.id`;

      // 정렬
      switch (sort_by) {
        case 'price_low':
          query += ` ORDER BY l.price_from ASC`;
          break;
        case 'price_high':
          query += ` ORDER BY l.price_from DESC`;
          break;
        case 'rating':
          query += ` ORDER BY total_bookings DESC`; // TODO: 실제 평점 필드 추가 시 변경
          break;
        case 'newest':
          query += ` ORDER BY l.created_at DESC`;
          break;
        case 'popular':
        default:
          query += ` ORDER BY total_bookings DESC`;
          break;
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await connection.execute(query, params);

      // 가용성 체크 함수
      const checkAvailability = async (listingId) => {
        // 날짜가 제공되지 않으면 항상 available
        if (!checkin_date || !checkout_date) {
          return true;
        }

        // 해당 숙박에 겹치는 예약이 있는지 확인
        const availabilityQuery = `
          SELECT COUNT(*) as conflicting_bookings
          FROM bookings
          WHERE listing_id = ?
            AND status NOT IN ('cancelled', 'rejected')
            AND (
              (start_date <= ? AND end_date > ?)
              OR (start_date < ? AND end_date >= ?)
              OR (start_date >= ? AND end_date <= ?)
            )
        `;

        const availResult = await connection.execute(availabilityQuery, [
          listingId,
          checkin_date, checkin_date,
          checkout_date, checkout_date,
          checkin_date, checkout_date
        ]);

        return (availResult.rows[0]?.conflicting_bookings || 0) === 0;
      };

      // JSON 필드 파싱 및 가용성 체크
      const listingsWithAvailability = await Promise.all(
        (result.rows || []).map(async (listing) => {
          let images = [];
          let amenitiesObj = {};

          try {
            if (listing.images) {
              images = typeof listing.images === 'string' ? JSON.parse(listing.images) : listing.images;
            }
          } catch (e) {
            console.warn('Images parsing failed:', listing.id);
          }

          try {
            if (listing.amenities) {
              amenitiesObj = typeof listing.amenities === 'string' ? JSON.parse(listing.amenities) : listing.amenities;
            }
          } catch (e) {
            console.warn('Amenities parsing failed:', listing.id);
          }

          return {
            ...listing,
            images,
            amenities: amenitiesObj,
            is_available: await checkAvailability(listing.id)
          };
        })
      );

      const listings = listingsWithAvailability;

      // 전체 개수 조회
      let countQuery = `
        SELECT COUNT(DISTINCT l.id) as total
        FROM listings l
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE l.category = 'stay' AND l.category_id = ? AND l.is_active = 1
      `;

      const countParams = [STAY_CATEGORY_ID];

      if (keyword) {
        countQuery += ` AND (l.title LIKE ? OR l.description_md LIKE ? OR l.location LIKE ?)`;
        const searchTerm = `%${keyword}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (city) {
        countQuery += ` AND l.location LIKE ?`;
        countParams.push(`%${city}%`);
      }

      if (room_type) {
        countQuery += ` AND l.room_type = ?`;
        countParams.push(room_type);
      }

      if (min_price) {
        countQuery += ` AND l.price_from >= ?`;
        countParams.push(parseInt(min_price));
      }

      if (max_price) {
        countQuery += ` AND l.price_from <= ?`;
        countParams.push(parseInt(max_price));
      }

      if (guests) {
        countQuery += ` AND l.max_occupancy >= ?`;
        countParams.push(parseInt(guests));
      }

      if (amenities) {
        const amenitiesList = amenities.split(',');
        amenitiesList.forEach(amenity => {
          switch (amenity.trim()) {
            case 'wifi':
              countQuery += ` AND l.wifi_available = 1`;
              break;
            case 'breakfast':
              countQuery += ` AND l.breakfast_included = 1`;
              break;
            case 'balcony':
              countQuery += ` AND l.has_balcony = 1`;
              break;
            case 'tv':
              countQuery += ` AND l.tv_available = 1`;
              break;
            case 'ac':
              countQuery += ` AND l.air_conditioning = 1`;
              break;
          }
        });
      }

      // 날짜별 가용성 체크 (예약이 겹치는 숙박 제외)
      if (checkin_date && checkout_date) {
        countQuery += `
          AND l.id NOT IN (
            SELECT listing_id
            FROM bookings
            WHERE status NOT IN ('cancelled', 'rejected')
              AND (
                (start_date <= ? AND end_date > ?)
                OR (start_date < ? AND end_date >= ?)
                OR (start_date >= ? AND end_date <= ?)
              )
          )
        `;
        countParams.push(
          checkin_date, checkin_date,
          checkout_date, checkout_date,
          checkin_date, checkout_date
        );
      }

      const countResult = await connection.execute(countQuery, countParams);
      const total = countResult.rows[0]?.total || 0;

      return res.status(200).json({
        success: true,
        listings,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: parseInt(offset) + listings.length < total
        }
      });

    } catch (error) {
      console.error('❌ [Accommodation Listings API] Error:', error);
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
