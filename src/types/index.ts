export type AccountType =
  | 'bank'
  | 'credit_card'
  | 'wallet'
  | 'cash'
  | 'investment'
  | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number; // Liquid balance for bank/cash/wallet; Current unbilled liability for credit_card
  initialBalance?: number; // Starting balance when account was created (for ledger reconciliation)
  creditLimit?: number; // Only for credit_card
  billingCycleDay?: number; // Day of month (1-31) when statement is generated
  paymentDueDay?: number; // Day of month (1-31) when CC payment is due
  currency: string; // Default: 'INR'
  color: string;
  icon: string;
  isArchived: boolean;
  isDefault?: boolean;
  accountNumber?: string; // Masked representation, e.g. "••4589"
  institution?: string; // e.g. "HDFC Bank", "Canara Bank"
  createdAt: string;
  updatedAt: string;
}

export type CategoryType = 'expense' | 'income' | 'both';

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  monthlyBudget?: number;
  isDefault?: boolean;
  subcategories?: Subcategory[];
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  upiId?: string;
  // Net balance from perspective of user:
  // Positive (> 0): Friend owes me (Receivable)
  // Negative (< 0): I owe friend (Payable)
  // Zero (= 0): All settled
  netBalance: number;
  avatar?: string;
  groupIds?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string; // e.g. "514", "PG Flatmates", "Goa Trip"
  description?: string;
  memberIds: string[]; // List of Person IDs belonging to this group
  defaultSplitType: 'equal' | 'exact' | 'percentage' | 'shares';
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'expense' // Standard personal expense
  | 'income' // Standard personal income
  | 'transfer' // Inter-account transfer (e.g. HDFC -> Amazon Pay)
  | 'shared_expense' // Split expense (e.g. DMart grocery split among 5 people)
  | 'settlement_received' // Friend repays user (Pure asset transfer, NOT income)
  | 'settlement_paid' // User repays friend (Pure debt settlement, NOT expense)
  | 'credit_card_payment'; // Payment from bank account to credit card

export type SplitMode = 'equal' | 'exact' | 'percentage' | 'shares';

export interface TransactionSplit {
  personId: string; // 'user' for current user, or Person.id for friends
  amount: number; // Allocated split amount in INR
  shares?: number; // e.g. 1 share vs 2 shares
  percentage?: number; // e.g. 25%
  isSettled: boolean; // True if this particular split share has been settled
  notes?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  date: string; // ISO date format YYYY-MM-DD or full timestamp
  amount: number; // Total transaction amount (e.g. ₹1,505.00 for DMart bulk purchase)
  accountId: string; // Paying account or receiving account
  toAccountId?: string; // Destination account for transfers or CC payments
  categoryId?: string;
  subcategoryId?: string;
  // CRUCIAL: For shared expenses, personalExpenseAmount is ONLY user's share (e.g. ₹282.25)
  // The rest (amount - personalExpenseAmount) represents receivables from friends.
  personalExpenseAmount: number;
  isShared: boolean;
  groupId?: string; // Associated GPay or PG group
  // 'user' if paid by user, or Person.id if a friend paid the bill on user's behalf
  paidByPersonId: string;
  splits: TransactionSplit[];
  notes?: string;
  tags?: string[];
  receiptImage?: string;
  isRecurring?: boolean;
  recurringCommitmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RecurringCommitmentType =
  | 'recurring_expense' // Ongoing commitment like Rent, Internet
  | 'recurring_investment' // Fixed duration investment like 2-year RD
  | 'emi'; // Fixed installment debt repayment like Phone EMI

export interface RecurringCommitment {
  id: string;
  name: string; // e.g. "Phone EMI (6M)", "2-Year RD", "PG Rent 514"
  type: RecurringCommitmentType;
  amount: number;
  accountId: string;
  categoryId: string;
  subcategoryId?: string;
  frequency: 'monthly' | 'weekly' | 'yearly';
  dayOfMonth: number; // 1-31
  startDate: string;
  endDate?: string;
  totalInstallments?: number; // e.g. 6 for 6 months, 24 for 2-year RD
  paidInstallments: number; // Tracks installments completed
  remainingAmount?: number; // Remaining balance to be paid
  isReservedCommitment: boolean; // If true, reserved in "Available to Spend" formula
  isActive: boolean;
  autoRecord?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableToSpendBreakdown {
  totalLiquidBalances: number; // Bank accounts + Cash + Wallets
  reservedCommitments: number; // Total reserved commitments
  hdfcReservedCommitments: number; // Reserved commitments specifically from HDFC
  unbilledCCLiability: number; // Total unpaid credit card balances (HDFC MoneyBack+)
  totalReceivables: number; // Money friends owe to user (positive net balances)
  totalPayables: number; // Money user owes to friends (negative net balances)
  netMoneyOwedToOthers: number; // max(0, totalPayables - totalReceivables)
  availableToSpend: number; // HDFC Balance - CC Liability - HDFC Reserved Commitments
  totalNetWorth: number; // Liquid Balances + Investments + Receivables - (CC Liability + Payables)
  netMoneyOwned: number; // Entire balance of HDFC + Amazon Wallet + Cash
  lent: number; // Entire amount user needs to receive from friends
  savingsBalance: number; // Total accumulated savings (Canara Bank + RD investments)
  hdfcBalance: number;
  primaryBankName?: string;
  canaraBalance: number;
  amazonWalletBalance: number;
  cashBalance: number;
  totalInvestments: number;
}
