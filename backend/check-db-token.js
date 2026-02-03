const { DataSource } = require('typeorm');

async function checkToken() {
  // Initialize database connection (using actual config)
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

    // Query for Open Pump token
    const result = await dataSource.query(
      `SELECT * FROM token WHERE symbol = 'OPUMP' ORDER BY "createdAt" DESC LIMIT 1`
    );

    if (result.length > 0) {
      console.log('🎉 Open Pump Token Found in Database!');
      console.log('=====================================\n');
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('❌ Token not found in database');
      
      // Check all recent tokens
      console.log('\n📋 Recent tokens (last 10):');
      const recent = await dataSource.query(
        `SELECT id, name, symbol, creator, "createdAt" FROM token ORDER BY "createdAt" DESC LIMIT 10`
      );
      console.table(recent);
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error(error);
  }
}

checkToken();
