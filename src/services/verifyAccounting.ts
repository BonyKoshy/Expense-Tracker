import type { Account, Person, RecurringCommitment, Transaction } from '../types';
import {
  calculateAvailableToSpend,
  calculateTransactionDeltas,
  applyAccountBalanceDelta,
  revertAccountBalanceDelta,
} from './accountingEngine';
import {
  allocateEqualSplit,
  validateSplitReconciliation,
} from '../utils/money';

console.log('--- FinTrack Accounting Engine Verification (User Rule Specification) ---');

// Test fixtures to verify accounting invariants
const TEST_ACCOUNTS: Account[] = [
  { id: 'acc_hdfc_salary', name: 'HDFC Bank', type: 'bank', balance: 6145.33, currency: 'INR', color: '#0284c7', icon: 'Building2', isArchived: false, isDefault: true, createdAt: '', updatedAt: '' },
  { id: 'acc_canara_savings', name: 'CANARA Bank', type: 'bank', balance: 12973.00, currency: 'INR', color: '#9fd5cb', icon: 'Landmark', isArchived: false, createdAt: '', updatedAt: '' },
  { id: 'acc_hdfc_credit_card', name: 'HDFC MoneyBack+', type: 'credit_card', balance: 4397.61, creditLimit: 100000, billingCycleDay: 15, paymentDueDay: 5, currency: 'INR', color: '#f2b8b5', icon: 'CreditCard', isArchived: false, createdAt: '', updatedAt: '' },
  { id: 'acc_amazon_pay', name: 'Amazon Pay Wallet', type: 'wallet', balance: 236.11, currency: 'INR', color: '#f3b791', icon: 'Wallet', isArchived: false, createdAt: '', updatedAt: '' },
  { id: 'acc_cash', name: 'CASH', type: 'cash', balance: 344.44, currency: 'INR', color: '#a8dab5', icon: 'Banknote', isArchived: false, createdAt: '', updatedAt: '' },
  { id: 'acc_iccsl_rd', name: 'ICCSL RD', type: 'investment', balance: 3000.00, currency: 'INR', color: '#d0bcff', icon: 'PiggyBank', isArchived: false, createdAt: '', updatedAt: '' },
];

const TEST_RECURRING_COMMITMENTS: RecurringCommitment[] = [
  { id: 'rec_phone_emi', name: 'Phone EMI', type: 'emi', amount: 3610.00, frequency: 'monthly', accountId: 'acc_hdfc_salary', categoryId: 'cat_debt', isActive: true, isReservedCommitment: true, dayOfMonth: 5, startDate: '2026-01-01', paidInstallments: 0, createdAt: '', updatedAt: '' },
  { id: 'rec_iccsl_rd', name: 'ICCSL Recurring Deposit', type: 'recurring_investment', amount: 500.00, frequency: 'monthly', accountId: 'acc_hdfc_salary', categoryId: 'cat_investments', isActive: true, isReservedCommitment: true, dayOfMonth: 10, startDate: '2026-01-01', paidInstallments: 0, createdAt: '', updatedAt: '' },
  { id: 'rec_pg_rent', name: 'PG Monthly Rent', type: 'recurring_expense', amount: 8000.00, frequency: 'monthly', accountId: 'acc_hdfc_salary', categoryId: 'cat_expenses', isActive: true, isReservedCommitment: true, dayOfMonth: 1, startDate: '2026-01-01', paidInstallments: 0, createdAt: '', updatedAt: '' },
];

const TEST_PEOPLE: Person[] = [
  { id: 'person_rijosh', name: 'Rijosh', netBalance: 530.25, createdAt: '', updatedAt: '' },
  { id: 'person_jithu', name: 'Jithu', netBalance: 25.33, createdAt: '', updatedAt: '' },
  { id: 'person_amal', name: 'Amal', netBalance: 1000.00, createdAt: '', updatedAt: '' },
  { id: 'person_sreerag', name: 'Sreerag', netBalance: 0, createdAt: '', updatedAt: '' },
];

const TEST_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_dmart_split_001',
    title: 'DMart Supermarket',
    amount: 1505.00,
    personalExpenseAmount: 282.25,
    type: 'shared_expense',
    date: '2026-11-01T17:30:00Z',
    accountId: 'acc_hdfc_credit_card',
    categoryId: 'cat_groceries',
    isShared: true,
    paidByPersonId: 'user',
    splits: [
      { personId: 'user', amount: 282.25, isSettled: true },
      { personId: 'person_rijosh', amount: 530.25, isSettled: false },
      { personId: 'person_sreerag', amount: 212.25, isSettled: false },
      { personId: 'person_alan', amount: 99.00, isSettled: false },
      { personId: 'person_jithu', amount: 381.25, isSettled: false },
    ],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'tx_sreerag_dmart_settle',
    title: 'GPay Settlement from Sreerag',
    amount: 212.25,
    personalExpenseAmount: 0.00,
    type: 'settlement_received',
    date: '2026-11-03T11:00:00Z',
    accountId: 'acc_hdfc_salary',
    paidByPersonId: 'person_sreerag',
    isShared: false,
    splits: [],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'tx_cc_pay_012',
    title: 'Credit Card Bill Auto-Debit',
    amount: 2488.00,
    personalExpenseAmount: 0.00,
    type: 'credit_card_payment',
    date: '2026-11-05T09:00:00Z',
    accountId: 'acc_hdfc_salary',
    toAccountId: 'acc_hdfc_credit_card',
    isShared: false,
    paidByPersonId: 'user',
    splits: [],
    createdAt: '',
    updatedAt: '',
  },
];

// 1. Verify Available to Spend & The 4 Hero Cards
const breakdown = calculateAvailableToSpend(
  TEST_ACCOUNTS,
  TEST_RECURRING_COMMITMENTS,
  TEST_PEOPLE
);

console.log('\n[1] Hero Card Financial Metrics:');
console.log('  HDFC Bank Balance:      ₹' + breakdown.hdfcBalance.toFixed(2));
console.log('  CC Liability (Card 1):  ₹' + breakdown.unbilledCCLiability.toFixed(2));
console.log('  Net Money Owned (Card 2): ₹' + breakdown.netMoneyOwned.toFixed(2) + ' (HDFC + Amazon Wallet + Cash)');
console.log('  Lent to Friends (Card 3): ₹' + breakdown.lent.toFixed(2) + ' (Amount to Receive)');
console.log('  Total Net Worth (Card 4): ₹' + breakdown.totalNetWorth.toFixed(2));
console.log('  Savings (Canara + RD):  ₹' + breakdown.savingsBalance.toFixed(2));
console.log('  HDFC Commitments:       ₹' + breakdown.hdfcReservedCommitments.toFixed(2));
console.log('  ------------------------------------------');
console.log('  AVAILABLE TO SPEND:     ₹' + breakdown.availableToSpend.toFixed(2));

// Invariants
// 1. Net Money Owned = HDFC (6145.33) + Amazon (236.11) + Cash (344.44) = 6725.88
if (Math.abs(breakdown.netMoneyOwned - 6725.88) > 0.01) {
  throw new Error(`Expected Net Money Owned to be 6725.88, got ${breakdown.netMoneyOwned}`);
}

// 2. Lent = 1555.58 (Rijosh 530.25 + Amal 1000 + Jithu 25.33)
if (Math.abs(breakdown.lent - 1555.58) > 0.01) {
  throw new Error(`Expected Lent to be 1555.58, got ${breakdown.lent}`);
}

// 3. CC Liability = 4397.61
if (Math.abs(breakdown.unbilledCCLiability - 4397.61) > 0.01) {
  throw new Error(`Expected CC Liability to be 4397.61, got ${breakdown.unbilledCCLiability}`);
}

// 4. Net Worth = 19856.85
if (Math.abs(breakdown.totalNetWorth - 19856.85) > 0.01) {
  throw new Error(`Expected Net Worth to be 19856.85, got ${breakdown.totalNetWorth}`);
}

// 5. Savings = Canara (12973.00) + RD (3000.00) = 15973.00
if (Math.abs(breakdown.savingsBalance - 15973.00) > 0.01) {
  throw new Error(`Expected Savings Balance to be 15973.00, got ${breakdown.savingsBalance}`);
}

// 2. Verify Shared Expense (DMart Split)
const dmartTx = TEST_TRANSACTIONS.find((tx) => tx.id === 'tx_dmart_split_001')!;
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
const sreeragSettlementTx = TEST_TRANSACTIONS.find((tx) => tx.id === 'tx_sreerag_dmart_settle')!;
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
const ccPaymentTx = TEST_TRANSACTIONS.find((tx) => tx.id === 'tx_cc_pay_012')!;
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

// 5. Verify Monetary Precision & Equal Split Allocation Invariant
console.log('\n[5] Monetary Precision & Split Remainder Allocation:');
const equalSplitSample = allocateEqualSplit(100.00, ['user', 'friend_1', 'friend_2']);
console.log('  ₹100 split 3 ways:', equalSplitSample.map(s => `₹${s.amount}`));
const recon = validateSplitReconciliation(100.00, equalSplitSample);
if (!recon.isValid || equalSplitSample[0].amount !== 33.34 || equalSplitSample[1].amount !== 33.33 || equalSplitSample[2].amount !== 33.33) {
  throw new Error('Equal split allocation failed exact paise reconciliation');
}
console.log('  Sum of split shares:', equalSplitSample.reduce((a, b) => a + b.amount, 0), '(Must be 100.00)');

// 6. Verify Standardized Credit Card Sign Convention & Balance Adjustments
console.log('\n[6] Standardized Credit Card Sign Convention:');
let initialCCLiability = 4397.61;
// Charge ₹1505 (cashflow delta = -1505) -> increases liability
let afterSwipeLiability = applyAccountBalanceDelta(initialCCLiability, -1505.00, 'credit_card');
console.log('  Initial Liability:        ₹' + initialCCLiability);
console.log('  After ₹1505 swipe:        ₹' + afterSwipeLiability);
if (afterSwipeLiability !== 5902.61) {
  throw new Error(`Expected CC liability after swipe to be 5902.61, got ${afterSwipeLiability}`);
}

// CC Payment ₹2488 (cashflow delta = +2488) -> decreases liability
let afterPaymentLiability = applyAccountBalanceDelta(afterSwipeLiability, 2488.00, 'credit_card');
console.log('  After ₹2488 bill payment: ₹' + afterPaymentLiability);
if (afterPaymentLiability !== 3414.61) {
  throw new Error(`Expected CC liability after payment to be 3414.61, got ${afterPaymentLiability}`);
}

// Revert payment: should go back to 5902.61
let revertedLiability = revertAccountBalanceDelta(afterPaymentLiability, 2488.00, 'credit_card');
if (revertedLiability !== 5902.61) {
  throw new Error(`Expected reverted CC liability to be 5902.61, got ${revertedLiability}`);
}

console.log('\n✅ All Accounting & Settlement Engine Invariants Passed Successfully!');
