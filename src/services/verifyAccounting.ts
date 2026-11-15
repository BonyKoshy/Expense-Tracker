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

console.log('--- FinTrack Accounting Engine Verification ---');

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

if (breakdown.availableToSpend !== 45146.00) {
  throw new Error(`Expected Available to Spend to be 45146.00, got ${breakdown.availableToSpend}`);
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

// 3. Verify Asynchronous GPay Settlement
const rahulSettlementTx = INITIAL_TRANSACTIONS.find((tx) => tx.id === 'tx_rahul_settlement_002')!;
const settlementDeltas = calculateTransactionDeltas(rahulSettlementTx);

console.log('\n[3] Rahul GPay Settlement Deltas:');
console.log('  Personal Expense Share: ₹' + rahulSettlementTx.personalExpenseAmount.toFixed(2) + ' (MUST BE ZERO)');
console.log('  Account (Salary) Delta:', Array.from(settlementDeltas.accountDeltas.entries()));
console.log('  People (Rahul) Delta:  ', Array.from(settlementDeltas.peopleDeltas.entries()));

if (rahulSettlementTx.personalExpenseAmount !== 0) {
  throw new Error('Settlement cannot count as expense or income!');
}
if (settlementDeltas.accountDeltas.get('acc_hdfc_salary') !== 305.50) {
  throw new Error('HDFC Salary account should increase by 305.50');
}
if (settlementDeltas.peopleDeltas.get('person_rahul') !== -305.50) {
  throw new Error('Rahul receivable should decrease by 305.50');
}

console.log('\n✅ All Accounting & Settlement Engine Invariants Passed Successfully!');
