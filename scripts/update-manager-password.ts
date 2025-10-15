import { db } from '../utils/database';

async function updateManagerPassword() {
  try {
    console.log('🔄 manager@shinan.com 비밀번호 업데이트 시작...');

    // 현재 사용자 정보 확인
    const currentUser = await db.select('users', { email: 'manager@shinan.com' });

    if (!currentUser || currentUser.length === 0) {
      console.error('❌ manager@shinan.com 계정을 찾을 수 없습니다.');
      process.exit(1);
    }

    console.log('📋 현재 계정 정보:', {
      id: currentUser[0].id,
      email: currentUser[0].email,
      name: currentUser[0].name,
      role: currentUser[0].role
    });

    // 비밀번호 업데이트
    const newPasswordHash = '$2b$10$JUKoK.3Y69dE5rVOJpgCvuNnDO0Ce5SUb61m/ae0kdBfAVsrcPciC';

    await db.update(
      'users',
      currentUser[0].id,
      {
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      }
    );

    console.log('✅ 비밀번호 업데이트 완료!');

    // 업데이트 확인
    const updatedUser = await db.select('users', { email: 'manager@shinan.com' });
    console.log('📋 업데이트된 계정:', {
      id: updatedUser[0].id,
      email: updatedUser[0].email,
      name: updatedUser[0].name,
      updated_at: updatedUser[0].updated_at
    });

    console.log('\n🎉 manager@shinan.com의 새 비밀번호: ha1045');

    process.exit(0);
  } catch (error) {
    console.error('❌ 비밀번호 업데이트 실패:', error);
    process.exit(1);
  }
}

updateManagerPassword();
