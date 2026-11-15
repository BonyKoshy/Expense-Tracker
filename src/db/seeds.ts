import type {
  Account,
  Category,
  Subcategory,
  Person,
  Group,
  Transaction,
  RecurringCommitment,
} from '@/types';

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc_hdfc_salary',
    name: 'HDFC Salary',
    type: 'bank',
    balance: 45000,
    currency: 'INR',
    color: '#0284c7', // Sky 600
    icon: 'Building2',
    isArchived: false,
    isDefault: true,
    accountNumber: '••8421',
    institution: 'HDFC Bank',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_canara_savings',
    name: 'Canara Savings',
    type: 'bank',
    balance: 12500,
    currency: 'INR',
    color: '#0d9488', // Teal 600
    icon: 'Landmark',
    isArchived: false,
    accountNumber: '••1932',
    institution: 'Canara Bank',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_hdfc_credit_card',
    name: 'HDFC MoneyBack+ Credit Card',
    type: 'credit_card',
    balance: 1505, // Current outstanding / unbilled liability
    creditLimit: 100000,
    billingCycleDay: 15,
    paymentDueDay: 5,
    currency: 'INR',
    color: '#e11d48', // Rose 600
    icon: 'CreditCard',
    isArchived: false,
    accountNumber: '••9012',
    institution: 'HDFC Bank',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_amazon_pay',
    name: 'Amazon Pay Wallet',
    type: 'wallet',
    balance: 750,
    currency: 'INR',
    color: '#ea580c', // Orange 600
    icon: 'Wallet',
    isArchived: false,
    institution: 'Amazon Pay',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_cash',
    name: 'Cash in Hand',
    type: 'cash',
    balance: 2400,
    currency: 'INR',
    color: '#16a34a', // Green 600
    icon: 'Banknote',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat_food',
    name: 'Food & Dining',
    type: 'expense',
    icon: 'Utensils',
    color: '#f97316', // Orange 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_housing',
    name: 'Housing & Living',
    type: 'expense',
    icon: 'Home',
    color: '#8b5cf6', // Violet 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_utilities',
    name: 'Utilities & Bills',
    type: 'expense',
    icon: 'Zap',
    color: '#eab308', // Yellow 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_transport',
    name: 'Transport & Travel',
    type: 'expense',
    icon: 'Car',
    color: '#06b6d4', // Cyan 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_shopping',
    name: 'Shopping & Essentials',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#ec4899', // Pink 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_entertainment',
    name: 'Entertainment & Outings',
    type: 'expense',
    icon: 'Film',
    color: '#a855f7', // Purple 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_health',
    name: 'Healthcare & Fitness',
    type: 'expense',
    icon: 'HeartPulse',
    color: '#ef4444', // Red 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_investments',
    name: 'Investments & Savings',
    type: 'expense',
    icon: 'TrendingUp',
    color: '#10b981', // Emerald 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_debt',
    name: 'Debt & EMIs',
    type: 'expense',
    icon: 'Coins',
    color: '#64748b', // Slate 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_income',
    name: 'Income & Inflow',
    type: 'income',
    icon: 'ArrowDownLeft',
    color: '#22c55e', // Green 500
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_SUBCATEGORIES: Subcategory[] = [
  // Food & Dining
  { id: 'sub_tea', categoryId: 'cat_food', name: 'Tea & Snacks', icon: 'Coffee', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_dining', categoryId: 'cat_food', name: 'Dining Out', icon: 'UtensilsCrossed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_groceries', categoryId: 'cat_food', name: 'Groceries & Supermarket', icon: 'ShoppingCart', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_mess', categoryId: 'cat_food', name: 'PG Mess & Tiffin', icon: 'Soup', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Housing & Living
  { id: 'sub_rent', categoryId: 'cat_housing', name: 'PG Rent', icon: 'KeyRound', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_maintenance', categoryId: 'cat_housing', name: 'Maintenance', icon: 'Wrench', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_laundry', categoryId: 'cat_housing', name: 'Laundry', icon: 'Shirt', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Utilities
  { id: 'sub_electricity', categoryId: 'cat_utilities', name: 'Electricity', icon: 'Zap', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_wifi', categoryId: 'cat_utilities', name: 'Wi-Fi & Internet', icon: 'Wifi', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_recharge', categoryId: 'cat_utilities', name: 'Mobile Recharge', icon: 'Smartphone', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Transport
  { id: 'sub_metro', categoryId: 'cat_transport', name: 'Metro & Train', icon: 'Train', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_fuel', categoryId: 'cat_transport', name: 'Fuel & Petrol', icon: 'Fuel', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_cab', categoryId: 'cat_transport', name: 'Cab & Auto', icon: 'CarTaxiFront', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Shopping
  { id: 'sub_electronics', categoryId: 'cat_shopping', name: 'Electronics & Gadgets', icon: 'Laptop', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_clothing', categoryId: 'cat_shopping', name: 'Clothing & Footwear', icon: 'ShoppingBag', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_personal_care', categoryId: 'cat_shopping', name: 'Personal Care', icon: 'Sparkles', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Investments
  { id: 'sub_rd', categoryId: 'cat_investments', name: 'Recurring Deposit (RD)', icon: 'PiggyBank', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_sip', categoryId: 'cat_investments', name: 'Mutual Fund SIP', icon: 'TrendingUp', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Debt & EMIs
  { id: 'sub_phone_emi', categoryId: 'cat_debt', name: 'Phone EMI', icon: 'Smartphone', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_cc_payment', categoryId: 'cat_debt', name: 'Credit Card Bill Payment', icon: 'CreditCard', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Income
  { id: 'sub_salary', categoryId: 'cat_income', name: 'Monthly Salary', icon: 'Briefcase', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_cashback', categoryId: 'cat_income', name: 'Cashback & Rewards', icon: 'Gift', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const INITIAL_PEOPLE: Person[] = [
  {
    id: 'person_rahul',
    name: 'Rahul',
    phone: '+91 98765 43210',
    upiId: 'rahul@oksbi',
    // Rahul originally owed ₹305.50 from DMart and repaid ₹305.50 -> netBalance is 0
    netBalance: 0,
    avatar: '👨‍💼',
    groupIds: ['group_514', 'group_pg'],
    notes: 'PG Roommate in 514',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'person_sneha',
    name: 'Sneha',
    phone: '+91 98765 43211',
    upiId: 'sneha@okaxis',
    // Sneha owes ₹305.50 from DMart
    netBalance: 305.50,
    avatar: '👩‍💻',
    groupIds: ['group_514'],
    notes: 'PG 514 Resident',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'person_ankit',
    name: 'Ankit',
    phone: '+91 98765 43212',
    upiId: 'ankit@icici',
    // Ankit owes ₹305.50 from DMart
    netBalance: 305.50,
    avatar: '👨‍🎓',
    groupIds: ['group_514', 'group_pg'],
    notes: 'PG Roommate in 514',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'person_vikram',
    name: 'Vikram',
    phone: '+91 98765 43213',
    upiId: 'vikram@paytm',
    // Vikram owes ₹306.25 from DMart
    netBalance: 306.25,
    avatar: '👨‍💻',
    groupIds: ['group_pg'],
    notes: 'PG Resident',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'group_514',
    name: '514',
    description: 'Flat/Room 514 PG Flatmates & Shared Groceries',
    memberIds: ['person_rahul', 'person_sneha', 'person_ankit'],
    defaultSplitType: 'equal',
    icon: 'Home',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'group_pg',
    name: 'PG',
    description: 'General PG Common Expenses & Community Events',
    memberIds: ['person_rahul', 'person_sneha', 'person_ankit', 'person_vikram'],
    defaultSplitType: 'equal',
    icon: 'Building',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_RECURRING_COMMITMENTS: RecurringCommitment[] = [
  {
    id: 'rec_phone_emi',
    name: 'Phone EMI (6 Months)',
    type: 'emi',
    amount: 2499,
    accountId: 'acc_hdfc_salary',
    categoryId: 'cat_debt',
    subcategoryId: 'sub_phone_emi',
    frequency: 'monthly',
    dayOfMonth: 10,
    startDate: '2026-09-10',
    endDate: '2027-02-10',
    totalInstallments: 6,
    paidInstallments: 2,
    remainingAmount: 9996, // 4 * 2499
    isReservedCommitment: true,
    isActive: true,
    autoRecord: false,
    notes: 'OnePlus 12 EMI on HDFC',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec_2year_rd',
    name: '2-Year Recurring Deposit',
    type: 'recurring_investment',
    amount: 3000,
    accountId: 'acc_canara_savings',
    categoryId: 'cat_investments',
    subcategoryId: 'sub_rd',
    frequency: 'monthly',
    dayOfMonth: 1,
    startDate: '2026-04-01',
    endDate: '2028-03-01',
    totalInstallments: 24,
    paidInstallments: 7,
    remainingAmount: 51000, // 17 * 3000
    isReservedCommitment: true,
    isActive: true,
    autoRecord: false,
    notes: 'Canara Bank RD @ 7.1% p.a.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rec_pg_rent',
    name: 'PG Room Rent 514',
    type: 'recurring_expense',
    amount: 8500,
    accountId: 'acc_hdfc_salary',
    categoryId: 'cat_housing',
    subcategoryId: 'sub_rent',
    frequency: 'monthly',
    dayOfMonth: 5,
    startDate: '2026-01-05',
    paidInstallments: 11,
    isReservedCommitment: true,
    isActive: true,
    autoRecord: false,
    notes: 'Room 514 monthly rent including maintenance',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Bulk DMart shared expense
  {
    id: 'tx_dmart_split_001',
    type: 'shared_expense',
    title: 'DMart Monthly PG Essentials & Groceries',
    date: '2026-11-10T19:30:00.000Z',
    amount: 1505.00,
    accountId: 'acc_hdfc_credit_card',
    categoryId: 'cat_food',
    subcategoryId: 'sub_groceries',
    personalExpenseAmount: 282.25, // Only user's share counted in personal expenses!
    isShared: true,
    groupId: 'group_514',
    paidByPersonId: 'user', // User paid full ₹1505 on credit card
    splits: [
      { personId: 'user', amount: 282.25, isSettled: true, notes: "User's personal groceries" },
      { personId: 'person_rahul', amount: 305.50, isSettled: true, notes: 'Rice, spices & tea' },
      { personId: 'person_sneha', amount: 305.50, isSettled: false, notes: 'Snacks & cleaning supplies' },
      { personId: 'person_ankit', amount: 305.50, isSettled: false, notes: 'Dairy & breakfast' },
      { personId: 'person_vikram', amount: 306.25, isSettled: false, notes: 'Household items & detergent' },
    ],
    notes: 'Bulk payment on HDFC Credit Card. ₹282.25 personal expense; ₹1222.75 booked as receivables from friends.',
    tags: ['dmart', 'groceries', 'pg-split', '514'],
    createdAt: '2026-11-10T19:30:00.000Z',
    updatedAt: '2026-11-10T19:30:00.000Z',
  },
  // Asynchronous settlement from Rahul via GPay
  {
    id: 'tx_rahul_settlement_002',
    type: 'settlement_received',
    title: 'Rahul GPay Settlement for DMart',
    date: '2026-11-12T14:15:00.000Z',
    amount: 305.50,
    accountId: 'acc_hdfc_salary', // Deposited directly into HDFC Salary account
    personalExpenseAmount: 0, // CRUCIAL RULE: Zero expense, zero income!
    isShared: false,
    groupId: 'group_514',
    paidByPersonId: 'person_rahul',
    splits: [
      { personId: 'person_rahul', amount: 305.50, isSettled: true, notes: 'Cleared DMart share' },
    ],
    notes: 'Settlement received from Rahul via GPay UPI. Liquid balance increased by ₹305.50, Rahul receivable reduced to ₹0.',
    tags: ['gpay', 'settlement', 'repayment'],
    createdAt: '2026-11-12T14:15:00.000Z',
    updatedAt: '2026-11-12T14:15:00.000Z',
  },
  // Standard Cash personal expense
  {
    id: 'tx_chai_snacks_003',
    type: 'expense',
    title: 'Chai Point & Evening Snacks',
    date: '2026-11-14T17:45:00.000Z',
    amount: 65.00,
    accountId: 'acc_cash',
    categoryId: 'cat_food',
    subcategoryId: 'sub_tea',
    personalExpenseAmount: 65.00,
    isShared: false,
    paidByPersonId: 'user',
    splits: [
      { personId: 'user', amount: 65.00, isSettled: true },
    ],
    notes: 'Ginger chai and samosa near office',
    tags: ['tea', 'office', 'cash'],
    createdAt: '2026-11-14T17:45:00.000Z',
    updatedAt: '2026-11-14T17:45:00.000Z',
  },
];
