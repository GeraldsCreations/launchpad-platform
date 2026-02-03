const { DataSource } = require('typeorm');

async function listTables() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: '148.251.73.61',
    port: 5433,
    username: 'postgres',
    password: 'PtimeHtravelP05',
    database: 'pumpbots',
    synchronize: false,
    logging: false,
    ssl: false
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // List all tables in public schema
    const tables = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );

    console.log('📋 Tables in database:');
    console.table(tables);

    // Also check for tokens in the first table found
    if (tables.length > 0) {
      console.log('\n🔍 Checking first table for data...');
      const firstTable = tables[0].table_name;
      const count = await dataSource.query(`SELECT COUNT(*) FROM "${firstTable}"`);
      console.log(`Table "${firstTable}" has ${count[0].count} rows`);
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listTables();
