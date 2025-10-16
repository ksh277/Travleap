/**
 * 관리자 계정 생성 스크립트
 *
 * 사용법:
 * tsx scripts/create-admin.ts
 *
 * 또는 환경변수로 직접 지정:
 * ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecureP@ss123 tsx scripts/create-admin.ts
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../utils/database.js';
import * as readline from 'readline';

// 콘솔 입력 인터페이스
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 프로미스 기반 질문 함수
function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// 이메일 형식 검증
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 비밀번호 강도 검증
function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '비밀번호에 최소 1개의 대문자가 필요합니다.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '비밀번호에 최소 1개의 소문자가 필요합니다.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '비밀번호에 최소 1개의 숫자가 필요합니다.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: '비밀번호에 최소 1개의 특수문자가 필요합니다.' };
  }
  return { valid: true };
}

async function createAdmin() {
  console.log('\n🔐 관리자 계정 생성 스크립트\n');

  // 환경변수 모드인지 확인
  const isEnvMode = !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);

  try {
    // 1. 이메일 입력
    let email = process.env.ADMIN_EMAIL;
    if (!email) {
      email = await question('관리자 이메일 주소: ');
    }

    if (!isValidEmail(email)) {
      console.error('❌ 유효하지 않은 이메일 형식입니다.');
      if (!isEnvMode) rl.close();
      process.exit(1);
    }

    // 2. 이메일 중복 체크
    console.log('\n📋 기존 관리자 계정 확인 중...');
    const existingAdmins = await db.query(
      'SELECT * FROM users WHERE email = ? AND role = ?',
      [email, 'admin']
    );

    if (existingAdmins && existingAdmins.length > 0) {
      console.log('⚠️  이미 관리자 계정이 존재합니다:');
      console.log(`   - 이메일: ${existingAdmins[0].email}`);
      console.log(`   - 이름: ${existingAdmins[0].name}`);
      console.log(`   - 생성일: ${existingAdmins[0].created_at}`);

      let overwrite = 'yes';
      if (!isEnvMode) {
        overwrite = await question('\n기존 계정을 삭제하고 새로 생성하시겠습니까? (yes/no): ');
      } else {
        console.log('환경변수 모드: 기존 계정을 자동으로 덮어씁니다.');
      }

      if (overwrite.toLowerCase() !== 'yes') {
        console.log('❌ 취소되었습니다.');
        if (!isEnvMode) rl.close();
        process.exit(0);
      }

      // 기존 계정 삭제
      await db.query('DELETE FROM users WHERE email = ?', [email]);
      console.log('✅ 기존 계정 삭제 완료');
    }

    // 3. 비밀번호 입력
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      password = await question('관리자 비밀번호 (최소 8자, 대소문자+숫자+특수문자 포함): ');
    }

    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      console.error(`❌ ${passwordCheck.message}`);
      if (!isEnvMode) rl.close();
      process.exit(1);
    }

    // 4. 이름 입력
    let name = process.env.ADMIN_NAME || '관리자';
    if (!process.env.ADMIN_NAME && !isEnvMode) {
      const inputName = await question('관리자 이름 (기본값: 관리자): ');
      if (inputName.trim()) {
        name = inputName.trim();
      }
    }

    // 5. 전화번호 입력 (선택)
    let phone = process.env.ADMIN_PHONE || '';
    if (!process.env.ADMIN_PHONE && !isEnvMode) {
      const inputPhone = await question('전화번호 (선택사항, Enter로 건너뛰기): ');
      phone = inputPhone.trim();
    }

    console.log('\n🔐 비밀번호 해싱 중...');
    const salt = await bcrypt.genSalt(12); // 보안을 위해 12 rounds 사용
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('✅ 비밀번호 해싱 완료');

    // 6. 관리자 계정 생성
    console.log('\n📝 관리자 계정 생성 중...');

    const adminUser = {
      user_id: `admin_${Date.now()}`,
      email,
      password_hash: hashedPassword,
      name,
      phone,
      role: 'admin',
      status: 'active',
      provider: 'local',
      preferred_language: 'ko',
      preferred_currency: 'KRW',
      marketing_consent: false
    };

    await db.query(
      `INSERT INTO users (
        user_id, email, password_hash, name, phone, role,
        status, provider, preferred_language, preferred_currency,
        marketing_consent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminUser.user_id,
        adminUser.email,
        adminUser.password_hash,
        adminUser.name,
        adminUser.phone,
        adminUser.role,
        adminUser.status,
        adminUser.provider,
        adminUser.preferred_language,
        adminUser.preferred_currency,
        adminUser.marketing_consent
      ]
    );

    console.log('\n✅ 관리자 계정이 성공적으로 생성되었습니다!\n');
    console.log('📋 계정 정보:');
    console.log(`   - 이메일: ${email}`);
    console.log(`   - 이름: ${name}`);
    console.log(`   - 역할: admin`);
    if (phone) {
      console.log(`   - 전화번호: ${phone}`);
    }
    console.log('\n🔑 로그인 정보:');
    console.log(`   이메일: ${email}`);
    console.log(`   비밀번호: ${password.replace(/./g, '*')}`);
    console.log('\n⚠️  비밀번호를 안전한 곳에 보관하세요!\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    if (!isEnvMode) rl.close();
    process.exit(1);
  } finally {
    if (!isEnvMode) rl.close();
  }
}

// 스크립트 실행
createAdmin()
  .then(() => {
    console.log('✨ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });
