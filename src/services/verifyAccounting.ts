import {
  INITIAL_ACCOUNTS,
  INITIAL_PEOPLE,
  INITIAL_RECURRING_COMMITMENTS,
  INITIAL_TRANSACTIONS,
} from '../db/seeds';
import {
  calculateAvailableToSpend,
  calculateTransactionDeltas,
} from './accountingEngine';

console.log('--- FinTrack Accounting Engine Verification (Real Cashew Data) ---');

// 1. Verify Available to Spend Calculation
const breakdown = calculateAvailableToSpend(
  INITIAL_ACCOUNTS,
  INITIAL_RECURRING_COMMITMENTS,
  INITIAL_PEOPLE
);

console.log('\n[1] Available to Spend Breakdown:');
console.log('  Total Liquid Balances:  ₹' + breakdown.totalLiquidBalances.toFixed(2));
console.log('  Reserved Commitments:   ₹' + breakdown.reservedCommitments.toFixed(2));
console.log('  Unbilled CC Liability:  ₹' + breakdown.unbilledCCLiability.toFixed(2));
console.log('  Total Receivables:      ₹' + breakdown.totalReceivables.toFixed(2));
console.log('  Total Payables:         ₹' + breakdown.totalPayables.toFixed(2));
console.log('  Net Owed To Others:     ₹' + breakdown.netMoneyOwedToOthers.toFixed(2));
console.log('  ------------------------------------------');
console.log('  AVAILABLE TO SPEND:     ₹' + breakdown.availableToSpend.toFixed(2));
console.log('  TOTAL NET WORTH:        ₹' + breakdown.totalNetWorth.toFixed(2));

// Total liquid = 6145.33 (HDFC) + 12973.00 (Canara) + 236.11 (Amazon Pay) + 344.44 (Cash) = 19698.88
// Reserved = 8500 (Rent) + 3610 (EMI) + 3000 (RD) = 15110.00
// Unbilled CC = 4397.61 (HDFC MoneyBack+)
// Available to spend = 19698.88 - 15110.00 - 4397.61 = 191.27
const expectedLiquid = 19698.88;
const expectedReserved = 15110.00;
const expectedCC = 4397.61;
const expectedAvailable = Math.round((expectedLiquid - expectedReserved - expectedCC) * 100) / 100;

if (Math.abs(breakdown.totalLiquidBalances - expectedLiquid) > 0.01) {
  throw new Error(`Expected liquid balance ${expectedLiquid}, got ${breakdown.totalLiquidBalances}`);
}
if (Math.abs(breakdown.availableToSpend - expectedAvailable) > 0.01) {
  throw new Error(`Expected Available to Spend ${expectedAvailable}, got ${breakdown.availableToSpend}`);
}

// 2. Verify Shared Expense (DMart Split)
const dmartTx = INITIAL_TRANSACTIONS.find((tx) => tx.id === 'tx_dmart_split_001')!;
const dmartDeltas = calculateTransactionDeltas(dmartTx);

console.log('\n[2] DMart Bulk Split Deltas:');
console.log('  Total Bill Amount:      ₹' + dmartTx.amount.toFixed(2));
console.log('  Personal Expense Share: ₹' + dmartTx.personalExpenseAmount.toFixed(2));
console.log('  Account (CC) Delta:    ', Array.from(dmartDeltas.accountDeltas.entries()));
console.log('  People Deltas:         ', Array.from(dmartDeltas.peopleDeltas.entries()));

const friendSharesSum = Array.from(dmartDeltas.peopleDeltas.values()).reduce((a, b) => a + b, 0);
console.log('  Sum of Friend Shares:   ₹' + friendSharesSum.toFixed(2));

if (Math.abs(dmartTx.personalExpenseAmount + friendSharesSum - dmartTx.amount) > 0.001) {
  throw new Error('Split mismatch: personal share + friend shares != total amount');
}
if (dmartDeltas.peopleDeltas.get('person_rijosh') !== 530.25) {
  throw new Error('Rijosh split should be 530.25');
}

// 3. Verify Asynchronous GPay Settlement
const sreeragSettlementTx = INITIAL_TRANSACTIONS.find((tx) => tx.id === 'tx_sreerag_dmart_settle')!;
const settlementDeltas = calculateTransactionDeltas(sreeragSettlementTx);

console.log('\n[3] Sreerag GPay Settlement Deltas:');
console.log('  Personal Expense Share: ₹' + sreeragSettlementTx.personalExpenseAmount.toFixed(2) + ' (MUST BE ZERO)');
console.log('  Account (HDFC Bank) Delta:', Array.from(settlementDeltas.accountDeltas.entries()));
console.log('  People (Sreerag) Delta:  ', Array.from(settlementDeltas.peopleDeltas.entries()));

if (sreeragSettlementTx.personalExpenseAmount !== 0) {
  throw new Error('Settlement cannot count as expense or income!');
}
if (settlementDeltas.accountDeltas.get('acc_hdfc_salary') !== 212.25) {
  throw new Error('HDFC Bank account should increase by 212.25');
}
if (settlementDeltas.peopleDeltas.get('person_sreerag') !== -212.25) {
  throw new Error('Sreerag receivable should decrease by 212.25');
}

// 4. Verify Credit Card Payment Deltas
const ccPaymentTx = INITIAL_TRANSACTIONS.find((tx) => tx.id === 'tx_cc_pay_012')!;
const ccDeltas = calculateTransactionDeltas(ccPaymentTx);
console.log('\n[4] Credit Card Bill Payment Deltas:');
console.log('  HDFC Bank Delta:        ', ccDeltas.accountDeltas.get('acc_hdfc_salary'));
console.log('  CC Inflow Delta:        ', ccDeltas.accountDeltas.get('acc_hdfc_credit_card'));

if (ccDeltas.accountDeltas.get('acc_hdfc_salary') !== -2488.00) {
  throw new Error('Bank account should decrease by 2488.00 on CC payment');
}
if (ccDeltas.accountDeltas.get('acc_hdfc_credit_card') !== 2488.00) {
  throw new Error('Credit card inflow delta should be 2488.00');
}

console.log('\n✅ All Accounting & Settlement Engine Invariants Passed Successfully with Real Cashew Data!');
