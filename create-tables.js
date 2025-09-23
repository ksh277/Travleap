import { connect } from '@planetscale/database';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  url: process.env.VITE_PLANETSCALE_HOST?.replace(/'/g, '') || '',
  username: process.env.VITE_PLANETSCALE_USERNAME || '',
  password: process.env.VITE_PLANETSCALE_PASSWORD || ''
};

async function createTables() {
  console.log('=== 신안 여행 플랫폼 데이터베이스 테이블 생성 ===\n');

  try {
    const conn = connect(config);

    // SQL 파일 읽기
    const sqlContent = readFileSync('./database_schema_complete.sql', 'utf8');

    // SQL 명령어들을 분리 (세미콜론 기준)
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '');

    console.log(`총 ${sqlCommands.length}개의 SQL 명령어를 실행합니다...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];

      try {
        // CREATE TABLE, INSERT, CREATE INDEX, CREATE VIEW 명령어만 실행
        if (command.toUpperCase().includes('CREATE TABLE') ||
            command.toUpperCase().includes('INSERT INTO') ||
            command.toUpperCase().includes('CREATE INDEX') ||
            command.toUpperCase().includes('CREATE VIEW')) {

          console.log(`[${i + 1}/${sqlCommands.length}] 실행 중...`);

          await conn.execute(command);
          successCount++;

          // 테이블 생성인 경우 테이블명 출력
          if (command.toUpperCase().includes('CREATE TABLE')) {
            const tableName = command.match(/CREATE TABLE (\w+)/i)?.[1];
            console.log(`✅ 테이블 생성 완료: ${tableName}`);
          } else if (command.toUpperCase().includes('INSERT INTO')) {
            const tableName = command.match(/INSERT INTO (\w+)/i)?.[1];
            console.log(`✅ 초기 데이터 삽입 완료: ${tableName}`);
          } else if (command.toUpperCase().includes('CREATE INDEX')) {
            const indexName = command.match(/CREATE INDEX (\w+)/i)?.[1];
            console.log(`✅ 인덱스 생성 완료: ${indexName}`);
          } else if (command.toUpperCase().includes('CREATE VIEW')) {
            const viewName = command.match(/CREATE VIEW (\w+)/i)?.[1];
            console.log(`✅ 뷰 생성 완료: ${viewName}`);
          }
        }
      } catch (error) {
        errorCount++;
        console.log(`❌ 실행 실패:`, error.message);

        // 중요한 에러가 아닌 경우 계속 진행
        if (error.message.includes('already exists') ||
            error.message.includes('Duplicate entry')) {
          console.log(`⚠️ 이미 존재하는 항목 - 계속 진행합니다.`);
        }
      }
    }

    console.log('\n=== 실행 결과 ===');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);

    // 최종 테이블 목록 확인
    console.log('\n=== 생성된 테이블 목록 ===');
    const tables = await conn.execute('SHOW TABLES');
    tables.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${Object.values(row)[0]}`);
    });

    console.log(`\n🎉 총 ${tables.rows.length}개의 테이블이 생성되었습니다!`);

  } catch (error) {
    console.error('❌ 데이터베이스 연결 또는 스키마 생성 실패:', error);
  }
}

createTables();