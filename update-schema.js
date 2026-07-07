const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'smart_kitchen'
  });

  try {
    await conn.query('ALTER TABLE recipes ADD COLUMN source VARCHAR(255) DEFAULT "catalog"');
    console.log('Added source column');
  } catch (e) {
    console.log('source column already exists or error:', e.message);
  }

  try {
    await conn.query('ALTER TABLE recipes ADD COLUMN externalId VARCHAR(255) NULL');
    console.log('Added externalId column');
  } catch (e) {
    console.log('externalId column already exists or error:', e.message);
  }

  try {
    await conn.query('CREATE UNIQUE INDEX idx_externalId ON recipes(externalId)');
    console.log('Created unique index on externalId');
  } catch (e) {
    console.log('Index already exists or error:', e.message);
  }

  try {
    await conn.query('CREATE INDEX idx_source ON recipes(source)');
    console.log('Created index on source');
  } catch (e) {
    console.log('Index already exists or error:', e.message);
  }

  console.log('Schema updated successfully!');
  await conn.end();
})();
