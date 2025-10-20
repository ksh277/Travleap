#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkCategories() {
  const connection = connect({
    url: process.env.DATABASE_URL
  });

  const result = await connection.execute('SELECT id, name_ko, slug FROM categories ORDER BY id');
  console.log('Categories in database:');
  console.log(JSON.stringify(result.rows, null, 2));
}

checkCategories();
