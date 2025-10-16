import 'dotenv/config';
import { db } from '../utils/database.js';

async function checkTable() {
  try {
    const result = await db.query('DESCRIBE users');
    console.log('Users table structure:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTable();
