/**
 * 활동 로그 조회 API
 * GET /api/admin/activity-logs - 관리자/사용자 활동 로그 조회
 *
 * admin_logs, login_history 테이블 활용
 */

const { connect } = require('@planetscale/database');
const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { type, user_id, action, start_date, end_date, limit = 100 } = req.query;

    const logs = [];

    // 1. 관리자 활동 로그 조회 (PlanetScale - admin_logs)
    if (!type || type === 'admin') {
      try {
        const connection = connect({ url: process.env.DATABASE_URL });

        let query = 'SELECT * FROM admin_logs WHERE 1=1';
        const params = [];

        if (user_id) {
          query += ' AND user_id = ?';
          params.push(user_id);
        }

        if (action) {
          query += ' AND action = ?';
          params.push(action);
        }

        if (start_date) {
          query += ' AND created_at >= ?';
          params.push(start_date);
        }

        if (end_date) {
          query += ' AND created_at <= ?';
          params.push(end_date);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const result = await connection.execute(query, params);

        if (result.rows) {
          const adminLogs = result.rows.map(log => ({
            ...log,
            log_type: 'admin',
            log_source: 'admin_logs'
          }));
          logs.push(...adminLogs);
        }

        console.log(`✅ 관리자 로그 ${result.rows?.length || 0}개 조회`);
      } catch (adminError) {
        console.warn('⚠️  admin_logs 조회 실패:', adminError.message);
      }
    }

    // 2. 사용자 로그인 로그 조회 (Neon - login_history)
    if (!type || type === 'login') {
      try {
        const sql = neon(process.env.NEON_DATABASE_URL);

        // 파라미터 배열 구성
        const queryParams = [];
        const conditions = [];

        let baseQuery = `
          SELECT
            lh.id,
            lh.user_id,
            u.email,
            u.name,
            lh.login_type,
            lh.ip_address,
            lh.user_agent,
            lh.created_at
          FROM login_history lh
          LEFT JOIN users u ON lh.user_id = u.id
          WHERE 1=1
        `;

        if (user_id) {
          queryParams.push(user_id);
          conditions.push(`lh.user_id = $${queryParams.length}`);
        }

        if (start_date) {
          queryParams.push(start_date);
          conditions.push(`lh.created_at >= $${queryParams.length}`);
        }

        if (end_date) {
          queryParams.push(end_date);
          conditions.push(`lh.created_at <= $${queryParams.length}`);
        }

        if (conditions.length > 0) {
          baseQuery += ' AND ' + conditions.join(' AND ');
        }

        queryParams.push(parseInt(limit));
        baseQuery += ` ORDER BY lh.created_at DESC LIMIT $${queryParams.length}`;

        const loginLogs = await sql(baseQuery, queryParams);

        const formattedLoginLogs = loginLogs.map(log => ({
          id: log.id,
          user_id: log.user_id,
          action: 'login',
          details: `${log.login_type} 로그인 - ${log.email}`,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          created_at: log.created_at,
          log_type: 'login',
          log_source: 'login_history',
          user_email: log.email,
          user_name: log.name
        }));

        logs.push(...formattedLoginLogs);

        console.log(`✅ 로그인 로그 ${loginLogs.length}개 조회`);
      } catch (loginError) {
        console.warn('⚠️  login_history 조회 실패:', loginError.message);
      }
    }

    // 로그 정렬 (최신순)
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 통계 계산
    const stats = {
      total_logs: logs.length,
      admin_logs: logs.filter(l => l.log_type === 'admin').length,
      login_logs: logs.filter(l => l.log_type === 'login').length,
      unique_users: [...new Set(logs.map(l => l.user_id).filter(Boolean))].length
    };

    return res.status(200).json({
      success: true,
      data: logs.slice(0, parseInt(limit)),
      stats,
      filters: {
        type,
        user_id,
        action,
        start_date,
        end_date,
        limit
      }
    });

  } catch (error) {
    console.error('❌ 활동 로그 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
