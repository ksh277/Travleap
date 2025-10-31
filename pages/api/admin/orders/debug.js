import { createConnection } from '../../../../db/db';
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  let connection;

  try {
    // 1. PlanetScale payments 테이블에서 최근 주문 조회
    connection = await createConnection();

    const paymentsResult = await connection.execute(`
      SELECT
        p.id,
        p.user_id,
        p.amount,
        p.payment_status,
        p.gateway_transaction_id as order_number,
        p.notes,
        p.created_at
      FROM payments p
      WHERE p.gateway_transaction_id LIKE 'ORDER_%'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    console.log('🔍 [Debug] PlanetScale payments 조회 결과:', paymentsResult.rows?.length || 0, '건');

    // 2. user_id 목록 수집
    const userIds = [...new Set((paymentsResult.rows || [])
      .map(order => order.user_id)
      .filter(Boolean))];

    console.log('🔍 [Debug] 수집된 user_id 목록:', userIds);

    // 3. Neon DB에서 사용자 정보 조회
    let neonUsers = [];
    let neonError = null;

    if (userIds.length > 0) {
      try {
        const sql = neon(process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL);
        const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
        const query = `SELECT id, name, email, phone, created_at FROM users WHERE id IN (${placeholders})`;

        console.log('🔍 [Debug] Neon 쿼리:', query);
        console.log('🔍 [Debug] Neon 파라미터:', userIds);

        neonUsers = await sql(query, userIds);

        console.log('🔍 [Debug] Neon DB 사용자 조회 결과:', neonUsers.length, '건');
        console.log('🔍 [Debug] Neon DB 사용자 데이터:', neonUsers);
      } catch (error) {
        neonError = {
          message: error.message,
          code: error.code,
          stack: error.stack
        };
        console.error('❌ [Debug] Neon DB 조회 실패:', error);
      }
    }

    // 4. 모든 users 테이블 데이터 조회 (어떤 사용자가 있는지 확인)
    let allNeonUsers = [];
    try {
      const sql = neon(process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL);
      allNeonUsers = await sql`SELECT id, name, email, phone, created_at FROM users ORDER BY id LIMIT 20`;
      console.log('🔍 [Debug] Neon DB 전체 사용자 수:', allNeonUsers.length);
    } catch (error) {
      console.error('❌ [Debug] Neon DB 전체 사용자 조회 실패:', error);
    }

    // 5. 특정 주문 상세 조회 (최신 주문)
    const specificOrder = await connection.execute(`
      SELECT
        p.id,
        p.user_id,
        p.amount,
        p.payment_status,
        p.gateway_transaction_id,
        p.notes,
        p.booking_id,
        p.created_at,
        b.shipping_name,
        b.shipping_phone,
        b.shipping_address,
        b.shipping_address_detail,
        b.shipping_zipcode,
        b.order_number as booking_order_number
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.gateway_transaction_id LIKE '%1761922261162%'
         OR p.gateway_transaction_id LIKE 'ORDER_%'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    // 6. order_number로 bookings 직접 조회
    const bookingsByOrderNumber = await connection.execute(`
      SELECT
        b.id,
        b.order_number,
        b.booking_number,
        b.shipping_name,
        b.shipping_phone,
        b.shipping_address,
        b.shipping_address_detail,
        b.shipping_zipcode,
        b.created_at
      FROM bookings b
      WHERE b.order_number LIKE '%1761922261162%'
         OR b.order_number LIKE 'ORDER_%'
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    console.log('🔍 [Debug] 특정 주문 조회 결과:', specificOrder.rows?.length || 0, '건');
    console.log('🔍 [Debug] order_number로 조회한 bookings:', bookingsByOrderNumber.rows?.length || 0, '건');

    // 7. 사용자 매핑 생성
    const userMap = new Map();
    neonUsers.forEach(user => {
      userMap.set(user.id, user);
    });

    // 8. 조인된 데이터 생성
    const joinedData = (paymentsResult.rows || []).map(order => {
      const user = userMap.get(order.user_id);
      return {
        order_id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        user_name: user?.name || null,
        user_email: user?.email || null,
        user_found: !!user,
        amount: order.amount,
        payment_status: order.payment_status,
        created_at: order.created_at
      };
    });

    // 8. 환경 변수 확인 (민감한 정보는 마스킹)
    const envCheck = {
      POSTGRES_DATABASE_URL: !!process.env.POSTGRES_DATABASE_URL ? '설정됨 (길이: ' + process.env.POSTGRES_DATABASE_URL.length + ')' : '없음',
      DATABASE_URL: !!process.env.DATABASE_URL ? '설정됨 (길이: ' + process.env.DATABASE_URL.length + ')' : '없음',
      MYSQL_DATABASE_URL: !!process.env.MYSQL_DATABASE_URL ? '설정됨 (길이: ' + process.env.MYSQL_DATABASE_URL.length + ')' : '없음'
    };

    // 응답 생성
    const response = {
      timestamp: new Date().toISOString(),
      summary: {
        total_orders_checked: paymentsResult.rows?.length || 0,
        unique_user_ids: userIds.length,
        users_found_in_neon: neonUsers.length,
        total_users_in_neon: allNeonUsers.length,
        orders_with_user_info: joinedData.filter(o => o.user_found).length,
        orders_without_user_info: joinedData.filter(o => !o.user_found).length
      },
      environment: envCheck,
      database_connections: {
        planetscale_connected: !!connection,
        neon_error: neonError
      },
      data: {
        user_ids_in_payments: userIds,
        users_in_neon: neonUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone
        })),
        all_users_in_neon: allNeonUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone
        })),
        recent_orders: joinedData,
        specific_order: specificOrder.rows?.[0] ? {
          ...specificOrder.rows[0],
          user_found_in_neon: userMap.has(specificOrder.rows[0].user_id),
          user_data: userMap.get(specificOrder.rows[0].user_id) || null
        } : null,
        specific_order_all: specificOrder.rows || [],
        bookings_by_order_number: bookingsByOrderNumber.rows || []
      },
      diagnosis: {
        problem_type: null,
        reason: null,
        solution: null
      }
    };

    // 진단 수행
    if (userIds.length === 0) {
      response.diagnosis = {
        problem_type: 'NO_USER_IDS',
        reason: 'payments 테이블에 user_id가 전혀 저장되지 않고 있습니다',
        solution: 'api/orders.js의 주문 생성 로직에서 userId가 제대로 저장되고 있는지 확인 필요'
      };
    } else if (neonError) {
      response.diagnosis = {
        problem_type: 'NEON_CONNECTION_ERROR',
        reason: 'Neon PostgreSQL 연결 실패: ' + neonError.message,
        solution: '환경 변수 POSTGRES_DATABASE_URL 또는 DATABASE_URL 확인 필요'
      };
    } else if (neonUsers.length === 0 && userIds.length > 0) {
      response.diagnosis = {
        problem_type: 'USERS_NOT_IN_NEON',
        reason: `payments에 user_id(${userIds.join(', ')})가 있지만 Neon DB users 테이블에 해당 사용자가 없습니다`,
        solution: allNeonUsers.length > 0
          ? `Neon DB에는 총 ${allNeonUsers.length}명의 사용자가 있지만 주문한 user_id와 일치하지 않습니다. 실제 사용자 ID: ${allNeonUsers.map(u => u.id).join(', ')}`
          : 'Neon DB users 테이블이 비어있습니다. 회원가입 또는 데이터 마이그레이션 필요'
      };
    } else if (joinedData.filter(o => !o.user_found).length > 0) {
      const missingUserIds = joinedData.filter(o => !o.user_found).map(o => o.user_id);
      response.diagnosis = {
        problem_type: 'PARTIAL_USER_DATA_MISSING',
        reason: `일부 주문의 user_id(${missingUserIds.join(', ')})가 Neon DB에 없습니다`,
        solution: '해당 user_id를 가진 사용자가 Neon DB에 존재하는지 확인하거나, 올바른 user_id로 업데이트 필요'
      };
    } else {
      response.diagnosis = {
        problem_type: 'DATA_OK_CHECK_FRONTEND',
        reason: '데이터베이스와 API 로직은 정상입니다. 프론트엔드 또는 캐싱 문제일 수 있습니다',
        solution: '브라우저 캐시 삭제 후 재시도, 또는 AdminPage.tsx의 데이터 표시 로직 확인'
      };
    }

    await connection.end();

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ [Debug] 전체 에러:', error);

    if (connection) {
      await connection.end();
    }

    return res.status(500).json({
      error: 'Debug endpoint failed',
      message: error.message,
      stack: error.stack
    });
  }
}
