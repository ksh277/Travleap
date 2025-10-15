async function updatePassword() {
  const sql = "UPDATE users SET password_hash = '$2b$10$JUKoK.3Y69dE5rVOJpgCvuNnDO0Ce5SUb61m/ae0kdBfAVsrcPciC', updated_at = NOW() WHERE email = 'manager@shinan.com'";

  try {
    const response = await fetch('http://localhost:3004/api/db?action=query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params: [] })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ 비밀번호 업데이트 성공!');
      console.log('📋 결과:', result);
      console.log('\n🎉 manager@shinan.com의 새 비밀번호: ha1045');
    } else {
      console.error('❌ 업데이트 실패:', result);
    }
  } catch (error) {
    console.error('❌ 요청 실패:', error);
  }
}

updatePassword();
