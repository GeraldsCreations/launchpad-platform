const { DataSource } = require('typeorm');

async function updateToken() {
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

    // Update OPUMP token with real addresses
    const result = await dataSource.query(
      `UPDATE tokens 
       SET address = $1, "bondingCurve" = $2, "totalSupply" = $3
       WHERE symbol = 'OPUMP'
       RETURNING *`,
      [
        '3Ryp1G1Z661cL5ahNeEDYVwFQBgqLY7LRC4U9wwDU7hA', // Real mint address
        '3Ryp1G1Z661cL5ahNeEDYVwFQBgqLY7LRC4U9wwDU7hA', // Use same for bonding curve
        '1000000000' // 1 billion tokens
      ]
    );

    if (result.length > 0) {
      console.log('🎉 Token updated with real on-chain addresses!');
      console.log('=====================================\n');
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('❌ Token not found');
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateToken();
