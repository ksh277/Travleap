/**
 * 자동 차단 해제 크론잡
 *
 * 실행 주기: 매 시간 (0분마다)
 *
 * 기능:
 * - rentcar_vehicle_blocks에서 ends_at < NOW()인 활성 차단을 자동 해제
 * - is_active = 0, resolved_at = NOW(), resolved_by = 'SYSTEM' 업데이트
 *
 * 사용법:
 * - node-cron 또는 시스템 crontab으로 실행
 * - 0 * * * * node api/rentcar/cron/auto-resolve-blocks.js
 */

const { db } = require('../../utils/database.cjs');

async function autoResolveExpiredBlocks() {
  console.log('🔄 [Auto Resolve] Starting auto-resolve job...');
  console.log(`⏰ [Auto Resolve] Current time: ${new Date().toISOString()}`);

  try {
    // 1. 만료된 활성 차단 조회
    const expiredBlocks = await db.query(`
      SELECT
        id,
        vehicle_id,
        starts_at,
        ends_at,
        block_reason,
        notes
      FROM rentcar_vehicle_blocks
      WHERE is_active = 1
        AND ends_at <= NOW()
      ORDER BY ends_at ASC
    `);

    if (expiredBlocks.length === 0) {
      console.log('✅ [Auto Resolve] No expired blocks to resolve.');
      return { success: true, resolved: 0 };
    }

    console.log(`📋 [Auto Resolve] Found ${expiredBlocks.length} expired block(s).`);

    // 2. 각 차단 해제
    let resolvedCount = 0;
    const errors = [];

    for (const block of expiredBlocks) {
      try {
        await db.execute(`
          UPDATE rentcar_vehicle_blocks
          SET
            is_active = 0,
            resolved_at = NOW(),
            resolved_by = 'SYSTEM_AUTO_RESOLVE',
            updated_at = NOW()
          WHERE id = ?
        `, [block.id]);

        resolvedCount++;

        console.log(`✅ [Auto Resolve] Resolved block #${block.id}:
          - Vehicle: ${block.vehicle_id}
          - Period: ${block.starts_at} ~ ${block.ends_at}
          - Reason: ${block.block_reason}
          - Notes: ${block.notes || 'N/A'}`
        );

      } catch (error) {
        console.error(`❌ [Auto Resolve] Failed to resolve block #${block.id}:`, error.message);
        errors.push({
          block_id: block.id,
          error: error.message
        });
      }
    }

    // 3. 결과 로그
    console.log(`
╔═══════════════════════════════════════════╗
║   Auto-Resolve Job Complete               ║
╠═══════════════════════════════════════════╣
║  Total Expired: ${expiredBlocks.length.toString().padEnd(27)}║
║  Resolved:      ${resolvedCount.toString().padEnd(27)}║
║  Failed:        ${errors.length.toString().padEnd(27)}║
╚═══════════════════════════════════════════╝
    `);

    if (errors.length > 0) {
      console.error('❌ [Auto Resolve] Errors:', errors);
    }

    return {
      success: true,
      resolved: resolvedCount,
      failed: errors.length,
      errors
    };

  } catch (error) {
    console.error('❌ [Auto Resolve] Critical error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI에서 직접 실행 시
if (require.main === module) {
  (async () => {
    console.log('🚀 [Auto Resolve] Starting standalone execution...');
    const result = await autoResolveExpiredBlocks();
    console.log('🏁 [Auto Resolve] Job finished:', result);
    process.exit(result.success ? 0 : 1);
  })();
}

module.exports = { autoResolveExpiredBlocks };
