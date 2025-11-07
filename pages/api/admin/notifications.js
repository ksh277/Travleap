/**
 * 관리자 알림 API
 * GET /api/admin/notifications - 알림 목록 조회
 * POST /api/admin/notifications - 알림 생성 (시스템용)
 * PATCH /api/admin/notifications/:id - 알림 읽음 처리
 * DELETE /api/admin/notifications/:id - 알림 삭제
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');
const { withStandardRateLimit } = require('../../utils/rate-limit-middleware.cjs');

async function handler(req, res) {
  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // ✅ admin_notifications 테이블 생성 (없는 경우)
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        metadata JSON,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_priority (priority),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at)
      )
    `);
  } catch (error) {
    console.error('❌ [Admin Notifications] 테이블 생성 실패:', error);
  }

  // GET: 알림 목록 조회
  if (req.method === 'GET') {
    try {
      const { unread_only, limit = 50 } = req.query;

      let query = `
        SELECT * FROM admin_notifications
      `;

      if (unread_only === 'true') {
        query += ' WHERE is_read = FALSE';
      }

      query += ' ORDER BY created_at DESC LIMIT ?';

      const result = await connection.execute(query, [parseInt(limit)]);

      // 읽지 않은 알림 개수
      const unreadResult = await connection.execute(`
        SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = FALSE
      `);

      const unreadCount = unreadResult.rows?.[0]?.count || 0;

      return res.status(200).json({
        success: true,
        data: result.rows || [],
        unreadCount
      });
    } catch (error) {
      console.error('❌ [Admin Notifications] GET error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST: 알림 생성 (시스템에서 호출)
  if (req.method === 'POST') {
    try {
      const { type, priority = 'MEDIUM', title, message, metadata } = req.body;

      if (!type || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'type, title, message are required'
        });
      }

      await connection.execute(`
        INSERT INTO admin_notifications (type, priority, title, message, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        type,
        priority,
        title,
        message,
        metadata ? JSON.stringify(metadata) : null
      ]);

      console.log(`✅ [Admin Notifications] 알림 생성: ${title}`);

      return res.status(200).json({
        success: true,
        message: 'Notification created'
      });
    } catch (error) {
      console.error('❌ [Admin Notifications] POST error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // PATCH: 알림 읽음 처리
  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'id is required'
        });
      }

      await connection.execute(`
        UPDATE admin_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE id = ?
      `, [id]);

      console.log(`✅ [Admin Notifications] 알림 읽음 처리: ${id}`);

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('❌ [Admin Notifications] PATCH error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // DELETE: 알림 삭제
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'id is required'
        });
      }

      await connection.execute(`
        DELETE FROM admin_notifications WHERE id = ?
      `, [id]);

      console.log(`✅ [Admin Notifications] 알림 삭제: ${id}`);

      return res.status(200).json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('❌ [Admin Notifications] DELETE error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}

// 올바른 미들웨어 순서: CORS → RateLimit → Auth
module.exports = withSecureCors(
  withStandardRateLimit(
    withAuth(handler, { requireAuth: true, requireAdmin: true })
  )
);
