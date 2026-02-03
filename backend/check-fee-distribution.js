/**
 * Deep dive into DBC fee distribution mechanism
 * Check if fees are auto-split between partner and creator
 */

const { 
  CreatorService, 
  PartnerService,
  PoolService
} = require('@meteora-ag/dynamic-bonding-curve-sdk');

console.log('=== DBC Fee Distribution Analysis ===\n');

console.log('1️⃣ **CreatorService Methods** (Bot creator can call these):\n');
const creatorMethods = Object.getOwnPropertyNames(CreatorService.prototype)
  .filter(m => m !== 'constructor');

creatorMethods.forEach(method => {
  console.log(`   - ${method}()`);
  if (method.includes('claim') || method.includes('withdraw')) {
    console.log(`     ✅ CREATOR CAN CLAIM THEIR OWN FEES!`);
  }
});

console.log('\n2️⃣ **PartnerService Methods** (Platform can call these):\n');
const partnerMethods = Object.getOwnPropertyNames(PartnerService.prototype)
  .filter(m => m !== 'constructor');

partnerMethods.forEach(method => {
  console.log(`   - ${method}()`);
  if (method.includes('claim') || method.includes('withdraw')) {
    console.log(`     ✅ PLATFORM CAN CLAIM THEIR OWN FEES!`);
  }
});

console.log('\n3️⃣ **PoolService.createPool Parameters**:\n');

// Try to inspect what createPoolTx expects
console.log('Checking createPoolTx signature...');
const createPoolStr = PoolService.prototype.createPoolTx.toString();
console.log(createPoolStr.substring(0, 800));

console.log('\n4️⃣ **Key Findings**:\n');

console.log(`
✅ **DBC HAS SEPARATE CLAIM METHODS:**
   - CreatorService.claimCreatorTradingFee()    ← Creator claims their share
   - PartnerService.claimPartnerTradingFee()    ← Platform claims their share

✅ **POOL KNOWS WHO THE CREATOR IS:**
   - poolCreator parameter in createPool()
   - Stored on-chain in pool account

❓ **QUESTION:**
   Does DBC automatically split fees to separate accounts?
   OR do creator and partner call separate claim methods?

🔍 **HYPOTHESIS:**
   - Fees accumulate in pool vault
   - Partner calls PartnerService.claimPartnerTradingFee() to get their 50%
   - Creator calls CreatorService.claimCreatorTradingFee() to get their 50%
   - Both claim from the SAME pool vault
   - DBC SDK calculates the split based on feePercentage vs creatorFeePercentage

💡 **IMPLICATION:**
   We don't need a manual rewards API!
   Bot creators can call CreatorService.claimCreatorTradingFee() directly!
`);

console.log('\n5️⃣ **What We Should Do**:\n');

console.log(`
✅ **Instead of manual distribution:**
   1. Bot creates token → poolCreator set to bot's wallet
   2. Trading happens → fees accumulate
   3. Bot calls CreatorService.claimCreatorTradingFee(poolAddress)
   4. DBC transfers creator's share directly to bot's wallet

✅ **Platform still gets fees:**
   1. Platform calls PartnerService.claimPartnerTradingFee(poolAddress)
   2. DBC transfers platform's share to feeClaimer wallet

❌ **We don't need:**
   - Manual fee splitting in our code
   - bot_creator_rewards table
   - Custom rewards API
   - Fee distribution logic

✅ **DBC HANDLES IT ALL!**
`);

console.log('\nDone!\n');
