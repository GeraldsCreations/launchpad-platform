const { DataSource } = require('typeorm');

async function checkToken() {
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
    const tokens = await dataSource.query(
      `SELECT * FROM tokens WHERE symbol = 'OPUMP' ORDER BY "createdAt" DESC LIMIT 1`
    );

    if (tokens.length > 0) {
      console.log('🎉 Open Pump Token Found in Database!');
      console.log('=====================================\n');
      const token = tokens[0];
      
      console.log('Token Details:');
      console.log(`  ID: ${token.id}`);
      console.log(`  Name: ${token.name}`);
      console.log(`  Symbol: ${token.symbol}`);
      console.log(`  Creator: ${token.creator}`);
      console.log(`  Mint Address: ${token.address}`);
      console.log(`  Bonding Curve: ${token.bondingCurve}`);
      console.log(`  Current Price: ${token.currentPrice}`);
      console.log(`  Market Cap: ${token.marketCap}`);
      console.log(`  Graduated: ${token.graduated}`);
      console.log(`  Created At: ${token.createdAt}`);
      console.log('');
      console.log('Full Token Data:');
      console.log(JSON.stringify(token, null, 2));
    } else {
      console.log('❌ OPUMP token not found in database\n');
      
      // Check all recent tokens
      const recent = await dataSource.query(
        `SELECT id, name, symbol, creator, address, "createdAt" 
         FROM tokens 
         ORDER BY "createdAt" DESC 
         LIMIT 5`
      );
      
      console.log('📋 Recent tokens:');
      if (recent.length > 0) {
        console.table(recent);
      } else {
        console.log('  No tokens in database yet');
      }
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

checkToken();
