/**
 * 데이터베이스 백업 스크립트
 *
 * 목적:
 * - PlanetScale 데이터베이스의 중요 데이터를 JSON 파일로 백업
 * - 정기적인 백업 자동화 (cron job 권장)
 *
 * 사용법:
 * npx tsx scripts/backup-database.ts
 *
 * 백업 대상 테이블:
 * - users, listings, bookings, payments, reviews 등
 *
 * 백업 파일 위치:
 * - backups/backup-YYYY-MM-DD-HH-mm.json
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

// 백업할 테이블 목록
const TABLES_TO_BACKUP = [
  'users',
  'listings',
  'bookings',
  'payments',
  'reviews',
  'partners',
  'banners',
  'blogs',
  'blog_comments',
  'cart_items',
  'feature_flags',
  'payment_events',
  'booking_logs'
];

/**
 * 테이블 데이터 백업
 */
async function backupTable(tableName: string): Promise<any[]> {
  try {
    console.log(\`  📦 Backing up table: \${tableName}...\`);

    const rows = await db.query(\`SELECT * FROM \${tableName}\`);

    console.log(\`  ✅ \${tableName}: \${rows.length} rows backed up\`);
    return rows;
  } catch (error) {
    console.error(\`  ❌ Error backing up \${tableName}:\`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * 전체 데이터베이스 백업
 */
async function backupDatabase(): Promise<BackupData | null> {
  console.log('🗄️  Starting database backup...\n');

  const backup: BackupData = {
    timestamp: new Date().toISOString(),
    database: 'PlanetScale Database',
    tables: {},
    metadata: {
      totalRows: 0,
      backupSize: '0 KB',
      tablesBackedUp: []
    }
  };

  let totalRows = 0;

  for (const tableName of TABLES_TO_BACKUP) {
    const rows = await backupTable(tableName);

    if (rows.length > 0) {
      backup.tables[tableName] = rows;
      backup.metadata.tablesBackedUp.push(tableName);
      totalRows += rows.length;
    }
  }

  backup.metadata.totalRows = totalRows;

  // 백업 파일 크기 계산
  const backupString = JSON.stringify(backup, null, 2);
  const backupSizeKB = (backupString.length / 1024).toFixed(2);
  const backupSizeMB = (parseFloat(backupSizeKB) / 1024).toFixed(2);

  backup.metadata.backupSize = parseFloat(backupSizeMB) > 1
    ? \`\${backupSizeMB} MB\`
    : \`\${backupSizeKB} KB\`;

  console.log('\n📊 Backup Summary:');
  console.log(\`  Total Tables: \${backup.metadata.tablesBackedUp.length}\`);
  console.log(\`  Total Rows: \${backup.metadata.totalRows.toLocaleString()}\`);
  console.log(\`  Backup Size: \${backup.metadata.backupSize}\`);

  return backup;
}

/**
 * 백업 파일 저장
 */
function saveBackup(backup: BackupData): string {
  // backups 디렉토리 생성
  const backupsDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true});
    console.log(\`\n📁 Created backups directory: \${backupsDir}\`);
  }

  // 백업 파일명 생성 (backup-2024-01-15-14-30.json)
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '-')
    .substring(0, 16);

  const backupFileName = \`backup-\${timestamp}.json\`;
  const backupFilePath = path.join(backupsDir, backupFileName);

  // 백업 파일 저장
  fs.writeFileSync(backupFilePath, JSON.stringify(backup, null, 2), 'utf-8');

  console.log(\`\n✅ Backup saved successfully:\`);
  console.log(\`  File: \${backupFilePath}\`);
  console.log(\`  Size: \${backup.metadata.backupSize}\`);

  return backupFilePath;
}

/**
 * 오래된 백업 파일 정리 (7일 이상)
 */
function cleanupOldBackups(retentionDays: number = 7) {
  const backupsDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupsDir)) {
    return;
  }

  console.log(\`\n🧹 Cleaning up backups older than \${retentionDays} days...\`);

  const files = fs.readdirSync(backupsDir);
  const now = Date.now();
  let deletedCount = 0;

  files.forEach(file => {
    if (!file.startsWith('backup-') || !file.endsWith('.json')) {
      return;
    }

    const filePath = path.join(backupsDir, file);
    const stats = fs.statSync(filePath);
    const fileAgeMs = now - stats.mtimeMs;
    const fileAgeDays = fileAgeMs / (1000 * 60 * 60 * 24);

    if (fileAgeDays > retentionDays) {
      fs.unlinkSync(filePath);
      console.log(\`  🗑️  Deleted: \${file} (\${fileAgeDays.toFixed(1)} days old)\`);
      deletedCount++;
    }
  });

  if (deletedCount === 0) {
    console.log(\`  ✅ No old backups to delete\`);
  } else {
    console.log(\`  ✅ Deleted \${deletedCount} old backup(s)\`);
  }
}

/**
 * 메인 실행
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('   DATABASE BACKUP SCRIPT');
    console.log('═══════════════════════════════════════════\n');

    // 1. 데이터베이스 백업
    const backup = await backupDatabase();

    if (!backup) {
      throw new Error('Backup failed');
    }

    // 2. 백업 파일 저장
    saveBackup(backup);

    // 3. 오래된 백업 정리
    cleanupOldBackups(7);

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ Backup completed successfully!');
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Backup failed:', error instanceof Error ? error.message : String(error));
    console.error(error);
    process.exit(1);
  }
}

// 스크립트 실행
main();
