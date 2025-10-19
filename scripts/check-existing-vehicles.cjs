const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkVehicles() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'travleap',
    ssl: { rejectUnauthorized: true }
  });

  const [rows] = await connection.execute(`
    SELECT vehicle_class, transmission, fuel_type
    FROM rentcar_vehicles
    LIMIT 5
  `);

  console.log('\n📋 Existing vehicle values:');
  rows.forEach((row, i) => {
    console.log(`  ${i + 1}. Class: "${row.vehicle_class}", Trans: "${row.transmission}", Fuel: "${row.fuel_type}"`);
  });

  await connection.end();
}

checkVehicles().catch(console.error);
