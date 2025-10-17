import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  const conn = connect({ url: process.env.DATABASE_URL! });

  console.log('📋 Checking blog_posts schema...\n');

  const result = await conn.execute('DESCRIBE blog_posts');

  console.log('Columns:');
  result.rows.forEach((col: any) => {
    console.log(`- ${col.Field} (${col.Type})`);
  });
}

checkSchema().catch(console.error);
