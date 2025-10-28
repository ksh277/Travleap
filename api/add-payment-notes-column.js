const { connect } = require('@planetscale/database');

async function addPaymentNotesColumn() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 payments 테이블에 notes 컬럼 추가 중...');

    // notes 컬럼 추가 (JSON 데이터 저장용)
    await connection.execute(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);

    console.log('✅ notes 컬럼 추가 완료');

    // 확인
    const result = await connection.execute(`
      SHOW COLUMNS FROM payments LIKE 'notes'
    `);

    if (result.rows && result.rows.length > 0) {
      console.log('✅ notes 컬럼이 성공적으로 추가되었습니다:', result.rows[0]);
    } else {
      console.log('⚠️ notes 컬럼 확인 실패 (이미 존재하거나 추가되지 않음)');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  try {
    await addPaymentNotesColumn();
    return res.status(200).json({
      success: true,
      message: 'notes 컬럼이 성공적으로 추가되었습니다.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// CLI에서 직접 실행
if (require.main === module) {
  addPaymentNotesColumn()
    .then(() => {
      console.log('✅ 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 실패:', error);
      process.exit(1);
    });
}
