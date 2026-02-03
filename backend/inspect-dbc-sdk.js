/**
 * Inspect Meteora DBC SDK structure
 * Check for creator fee claimer parameters
 */

const dbc = require('@meteora-ag/dynamic-bonding-curve-sdk');

console.log('=== Meteora DBC SDK Exports ===\n');

// List all exports
console.log('Available exports:');
Object.keys(dbc).forEach(key => {
  console.log(`  - ${key}`);
});

console.log('\n=== buildCurveWithMarketCap Interface ===\n');

// Try to get function signature
console.log('Function:', dbc.buildCurveWithMarketCap.toString().substring(0, 500));

console.log('\n=== Checking for Fee-Related Types ===\n');

// Look for fee-related exports
const feeRelated = Object.keys(dbc).filter(key => 
  key.toLowerCase().includes('fee') || 
  key.toLowerCase().includes('claim') ||
  key.toLowerCase().includes('creator')
);

console.log('Fee-related exports:');
feeRelated.forEach(key => {
  console.log(`  - ${key}:`, typeof dbc[key]);
});

console.log('\n=== Partner Service Interface ===\n');

// Check PartnerService methods
if (dbc.PartnerService) {
  console.log('PartnerService methods:');
  console.log(Object.getOwnPropertyNames(dbc.PartnerService.prototype));
}

console.log('\n=== Creator Service Interface ===\n');

// Check CreatorService methods
if (dbc.CreatorService) {
  console.log('CreatorService methods:');
  console.log(Object.getOwnPropertyNames(dbc.CreatorService.prototype));
}

console.log('\n=== Pool Service Interface ===\n');

// Check PoolService methods
if (dbc.PoolService) {
  console.log('PoolService methods:');
  console.log(Object.getOwnPropertyNames(dbc.PoolService.prototype));
}

console.log('\nDone!');
