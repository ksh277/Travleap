const { connect } = require('@planetscale/database');

/**
 * 관광지 게이트 검증 API
 * POST /api/tourist/gate-verify
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { ticket_number, gate_name } = req.body;

    if (!ticket_number) {
      return res.status(400).json({
        success: false,
        error: '티켓 번호가 필요합니다.'
      });
    }

    // 티켓 조회
    const result = await connection.execute(
      `SELECT
        et.*,
        a.name as attraction_name
       FROM entry_tickets et
       INNER JOIN attractions a ON et.attraction_id = a.id
       WHERE et.ticket_number = ?`,
      [ticket_number]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: '유효하지 않은 티켓입니다.'
      });
    }

    const ticket = result.rows[0];
    const today = new Date().toISOString().split('T')[0];

    // 상태별 검증
    if (ticket.status === 'canceled' || ticket.status === 'refunded') {
      return res.status(200).json({
        success: true,
        valid: false,
        message: '취소된 티켓입니다.',
        reason: 'CANCELED'
      });
    }

    if (ticket.payment_status !== 'paid') {
      return res.status(200).json({
        success: true,
        valid: false,
        message: '결제가 완료되지 않은 티켓입니다.',
        reason: 'PAYMENT_PENDING'
      });
    }

    if (ticket.status === 'expired') {
      return res.status(200).json({
        success: true,
        valid: false,
        message: '만료된 티켓입니다.',
        reason: 'EXPIRED'
      });
    }

    // 날짜 확인
    const validDate = ticket.valid_date.toISOString().split('T')[0];
    if (today !== validDate) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: `이 티켓은 ${validDate}에만 사용 가능합니다.`,
        reason: 'INVALID_DATE',
        valid_date: validDate
      });
    }

    // 이미 사용된 티켓
    if (ticket.entry_scanned) {
      return res.status(200).json({
        success: true,
        valid: true,
        message: '이미 입장한 티켓입니다.',
        reason: 'ALREADY_SCANNED',
        entry_scanned_at: ticket.entry_scanned_at,
        entry_count: ticket.entry_count
      });
    }

    // 유효한 티켓 - 입장 처리
    await connection.execute(
      `UPDATE entry_tickets
       SET entry_scanned = TRUE,
           entry_scanned_at = NOW(),
           entry_gate = ?,
           entry_count = entry_count + 1,
           status = 'used',
           updated_at = NOW()
       WHERE id = ?`,
      [gate_name || 'Gate 1', ticket.id]
    );

    console.log(`✅ [Tourist Gate Verify] 입장 처리: ${ticket_number}`);

    return res.status(200).json({
      success: true,
      valid: true,
      message: '입장이 승인되었습니다.',
      reason: 'VALID',
      data: {
        ticket_number,
        ticket_type: ticket.ticket_type,
        attraction_name: ticket.attraction_name,
        valid_date: validDate
      }
    });

  } catch (error) {
    console.error('❌ [Tourist Gate Verify API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
