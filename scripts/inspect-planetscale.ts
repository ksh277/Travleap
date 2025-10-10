/**
 * PlanetScale DB 검사 스크립트
 * 모든 테이블, 컬럼, 샘플 데이터를 확인
 */

import { connect } from '@planetscale/database';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const connection = connect({
  host: process.env.VITE_PLANETSCALE_HOST!,
  username: process.env.VITE_PLANETSCALE_USERNAME!,
  password: process.env.VITE_PLANETSCALE_PASSWORD!
});

async function inspectDatabase() {
  console.log('🔍 PlanetScale 데이터베이스 검사 시작...\n');

  try {
    // 1. 모든 테이블 가져오기
    console.log('📋 테이블 목록 가져오는 중...');
    const tablesResult = await connection.execute('SHOW TABLES');
    const tables = tablesResult.rows.map((row: any) => Object.values(row)[0]) as string[];

    console.log(`✅ 총 ${tables.length}개 테이블 발견:\n`);
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

    // 2. 각 테이블의 상세 정보 가져오기
    const detailedInfo: any = {
      totalTables: tables.length,
      tables: {},
      timestamp: new Date().toISOString()
    };

    for (const table of tables) {
      console.log(`\n📊 테이블: ${table}`);
      console.log('-'.repeat(80));

      try {
        // 컬럼 정보
        const describeResult = await connection.execute(`DESCRIBE \`${table}\``);
        const columns = describeResult.rows;

        console.log(`\n컬럼 (${columns.length}개):`);
        columns.forEach((col: any) => {
          console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
        });

        // 데이터 개수
        const countResult = await connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
        const totalRows = (countResult.rows[0] as any).count;

        console.log(`\n총 데이터: ${totalRows}행`);

        // 샘플 데이터
        const sampleResult = await connection.execute(`SELECT * FROM \`${table}\` LIMIT 3`);
        const sampleData = sampleResult.rows;

        if (sampleData.length > 0) {
          console.log(`\n샘플 데이터 (${sampleData.length}행):`);
          sampleData.forEach((row: any, idx: number) => {
            console.log(`  [${idx + 1}]`, JSON.stringify(row, null, 2));
          });
        } else {
          console.log('\n샘플 데이터: (비어있음)');
        }

        // 상세 정보 저장
        detailedInfo.tables[table] = {
          columns: columns,
          totalRows: totalRows,
          sampleData: sampleData
        };

      } catch (error) {
        console.error(`❌ 테이블 ${table} 검사 실패:`, error);
        detailedInfo.tables[table] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      console.log('\n' + '='.repeat(80));
    }

    // 3. 결과를 파일로 저장
    const outputPath = path.join(process.cwd(), 'planetscale-inspection-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(detailedInfo, null, 2), 'utf-8');

    console.log(`\n\n✅ 검사 완료!`);
    console.log(`📄 결과 파일: ${outputPath}`);
    console.log(`\n총 ${tables.length}개 테이블 검사 완료\n`);

  } catch (error) {
    console.error('❌ 데이터베이스 검사 실패:', error);
    process.exit(1);
  }
}

// 실행
inspectDatabase();
