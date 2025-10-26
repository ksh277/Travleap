/**
 * 데이터베이스 복구 스크립트
 *
 * 목적:
 * - 백업 파일로부터 데이터베이스를 복구
 * - 재해 복구 (Disaster Recovery)
 *
 * 사용법:
 * npx tsx scripts/restore-database.ts <backup-file-path>
 *
 * 예시:
 * npx tsx scripts/restore-database.ts backups/backup-2024-01-15-14-30.json
 *
 * ⚠️  주의사항:
 * - 복구 작업은 기존 데이터를 덮어씁니다!
 * - 운영 환경에서는 반드시 사전 백업 후 진행하세요
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../utils/database';

dotenv.config();

interface BackupData {
  timestamp: string;
  database: string;
  tables: Record<string, any[]>;
  metadata: {
    totalRows: number;
    backupSize: string;
    tablesBackedUp: string[];
  };
}

/**
 * 백업 파일 읽기
 */
function loadBackupFile(filePath: string): BackupData {
  console.log(\`📂 Loading backup file: \${filePath}\`);

  if (!fs.existsSync(filePath)) {
    throw new Error(\`Backup file not found: \${filePath}\`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const backup: BackupData = JSON.parse(fileContent);

  console.log(\`✅ Backup file loaded:\`);
  console.log(\`  Timestamp: \${backup.timestamp}\`);
  console.log(\`  Tables: \${backup.metadata.tablesBackedUp.length}\`);
  console.log(\`  Total Rows: \${backup.metadata.totalRows.toLocaleString()}\`);
  console.log(\`  Size: \${backup.metadata.backupSize}\n\`);

  return backup;
}

/**
 * 테이블 데이터 복구
 */
async function restoreTable(tableName: string, rows: any[]): Promise<number> {
  if (rows.length === 0) {
    console.log(\`  ⏭️  \${tableName}: No data to restore\`);
    return 0;
  }

  console.log(\`  📥 Restoring table: \${tableName} (\${rows.length} rows)...\`);

  try {
    // ⚠️ 기존 데이터 삭제 (주의!)
    // await db.execute(\`TRUNCATE TABLE \${tableName}\`);

    // 대신 DELETE 사용 (외래 키 제약조건 고려)
    await db.execute(\`DELETE FROM \${tableName}\`);

    let restoredCount = 0;

    // 배치로 INSERT (1000개씩)
    const batchSize = 100;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      for (const row of batch) {
        const columns = Object.keys(row);
        const values = Object.values(row);

        const placeholders = columns.map(() => '?').join(', ');
        const columnNames = columns.join(', ');

        try {
          await db.execute(
            \`INSERT INTO \${tableName} (\${columnNames}) VALUES (\${placeholders})\`,
            values
          );
          restoredCount++;
        } catch (insertError) {
          console.warn(\`    ⚠️ Failed to insert row:\`, insertError instanceof Error ? insertError.message : String(insertError));
        }
      }
    }

    console.log(\`  ✅ \${tableName}: \${restoredCount}/\${rows.length} rows restored\`);
    return restoredCount;

  } catch (error) {
    console.error(\`  ❌ Error restoring \${tableName}:\`, error instanceof Error ? error.message : String(error));
    return 0;
  }
}

/**
 * 전체 데이터베이스 복구
 */
async function restoreDatabase(backup: BackupData): Promise<void> {
  console.log('🗄️  Starting database restore...\n');

  let totalRestored = 0;

  for (const tableName of backup.metadata.tablesBackedUp) {
    const rows = backup.tables[tableName] || [];
    const restored = await restoreTable(tableName, rows);
    totalRestored += restored;
  }

  console.log('\n📊 Restore Summary:');
  console.log(\`  Tables Restored: \${backup.metadata.tablesBackedUp.length}\`);
  console.log(\`  Total Rows Restored: \${totalRestored.toLocaleString()}\`);
  console.log(\`  Original Total Rows: \${backup.metadata.totalRows.toLocaleString()}\`);
}

/**
 * 사용자 확인
 */
function confirmRestore(backup: BackupData): boolean {
  console.log('\n⚠️  WARNING: This operation will DELETE existing data!\n');
  console.log('Restore Details:');
  console.log(\`  Backup Date: \${backup.timestamp}\`);
  console.log(\`  Tables: \${backup.metadata.tablesBackedUp.join(', ')}\`);
  console.log(\`  Total Rows: \${backup.metadata.totalRows.toLocaleString()}\n\`);

  // 자동 확인 (스크립트 실행 시 인자로 --confirm 전달 필요)
  const args = process.argv.slice(2);

  if (args.includes('--confirm')) {
    console.log('✅ Auto-confirmed via --confirm flag\n');
    return true;
  }

  console.error('❌ Restore cancelled: Please add --confirm flag to proceed');
  console.error('   Example: npx tsx scripts/restore-database.ts backups/backup.json --confirm\n');
  return false;
}

/**
 * 메인 실행
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('   DATABASE RESTORE SCRIPT');
    console.log('═══════════════════════════════════════════\n');

    // 1. 백업 파일 경로 확인
    const args = process.argv.slice(2);
    const backupFilePath = args.find(arg => !arg.startsWith('--'));

    if (!backupFilePath) {
      throw new Error('Backup file path is required\nUsage: npx tsx scripts/restore-database.ts <backup-file-path> --confirm');
    }

    // 2. 백업 파일 로드
    const backup = loadBackupFile(backupFilePath);

    // 3. 사용자 확인
    if (!confirmRestore(backup)) {
      process.exit(1);
    }

    // 4. 데이터베이스 복구
    await restoreDatabase(backup);

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ Restore completed successfully!');
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Restore failed:', error instanceof Error ? error.message : String(error));
    console.error(error);
    process.exit(1);
  }
}

// 스크립트 실행
main();
