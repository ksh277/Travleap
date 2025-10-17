import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
  const conn = connect({ url: process.env.DATABASE_URL! });

  const emails = [
    'admin@test.com',
    'admin@shinan.com',
    'manager@shinan.com',
    'user@test.com',
    'vendor@test.com'
  ];

  console.log('📊 Checking users in database...\n');

  const result = await conn.execute(
    `SELECT id, email, name, role, password_hash
     FROM users
     WHERE email IN (?, ?, ?, ?, ?)`,
    emails
  );

  console.log(`Found ${result.rows.length} users:\n`);

  result.rows.forEach((user: any) => {
    console.log(`✓ ${user.email}`);
    console.log(`  - Name: ${user.name}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - Has Password Hash: ${user.password_hash ? 'Yes' : 'No'}`);
    if (user.password_hash) {
      console.log(`  - Hash Format: ${user.password_hash.substring(0, 10)}...`);
    }
    console.log('');
  });

  console.log(`\nTotal: ${result.rows.length}/${emails.length} accounts found`);
}

checkUsers().catch(console.error);
