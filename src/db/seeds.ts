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
    name: 'HDFC Bank',
    type: 'bank',
    balance: 0,
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
    name: 'CANARA Bank',
    type: 'bank',
    balance: 0,
    currency: 'INR',
    color: '#9fd5cb', // Pastel Teal Mint
    icon: 'Landmark',
    isArchived: false,
    accountNumber: '••1932',
    institution: 'Canara Bank',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_hdfc_credit_card',
    name: 'HDFC MoneyBack+',
    type: 'credit_card',
    balance: 0,
    creditLimit: 100000,
    billingCycleDay: 15,
    paymentDueDay: 5,
    currency: 'INR',
    color: '#f2b8b5', // Pastel Coral
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
    balance: 0,
    currency: 'INR',
    color: '#f3b791', // Pastel Peach
    icon: 'Wallet',
    isArchived: false,
    institution: 'Amazon Pay',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_cash',
    name: 'CASH',
    type: 'cash',
    balance: 0,
    currency: 'INR',
    color: '#a8dab5', // Pastel Sage
    icon: 'Banknote',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_iccsl_rd',
    name: 'ICCSL RD',
    type: 'investment',
    balance: 0,
    currency: 'INR',
    color: '#d0bcff', // Pastel Lavender
    icon: 'PiggyBank',
    isArchived: false,
    institution: 'ICCSL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat_food',
    name: 'Food',
    type: 'expense',
    icon: 'Utensils',
    color: '#f3b791', // Pastel Peach
    monthlyBudget: 4000,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_groceries',
    name: 'Groceries',
    type: 'expense',
    icon: 'ShoppingCart',
    color: '#a8dab5', // Pastel Sage
    monthlyBudget: 3000,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_expenses',
    name: 'Expenses & Housing',
    type: 'expense',
    icon: 'Home',
    color: '#d0bcff', // Pastel Lavender
    monthlyBudget: 9000,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_transport',
    name: 'Transportation',
    type: 'expense',
    icon: 'Car',
    color: '#9fd3e6', // Pastel Ice Cyan
    monthlyBudget: 1500,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_shopping',
    name: 'Shopping',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#eedc96', // Pastel Buttercup
    monthlyBudget: 2500,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_entertainment',
    name: 'Entertainment',
    type: 'expense',
    icon: 'Film',
    color: '#e2b6e8', // Pastel Orchid
    monthlyBudget: 1500,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_financial',
    name: 'Financial Charges',
    type: 'expense',
    icon: 'Coins',
    color: '#bec6dc', // Pastel Slate
    monthlyBudget: 500,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_debt',
    name: 'Debt & EMIs',
    type: 'expense',
    icon: 'Smartphone',
    color: '#f2b8b5', // Pastel Coral
    monthlyBudget: 0,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_investments',
    name: 'Investments & Savings',
    type: 'expense',
    icon: 'TrendingUp',
    color: '#a1e5c0', // Pastel Mint
    monthlyBudget: 5000,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_income',
    name: 'Income',
    type: 'income',
    icon: 'ArrowDownLeft',
    color: '#a8dab5', // Pastel Sage
    monthlyBudget: 0,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_SUBCATEGORIES: Subcategory[] = [
  // Food
  { id: 'sub_tea', categoryId: 'cat_food', name: 'Tea', icon: 'Coffee', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_resturant', categoryId: 'cat_food', name: 'Resturant & dining', icon: 'UtensilsCrossed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_snacks', categoryId: 'cat_food', name: 'Snacks & Beverages', icon: 'Soup', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Groceries
  { id: 'sub_dmart', categoryId: 'cat_groceries', name: 'DMart & Supermarket', icon: 'ShoppingCart', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_daily_needs', categoryId: 'cat_groceries', name: 'Daily Essentials', icon: 'Package', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Housing & Living
  { id: 'sub_rent', categoryId: 'cat_expenses', name: 'Rent', icon: 'KeyRound', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_maintenance', categoryId: 'cat_expenses', name: 'Maintenance', icon: 'Wrench', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Transport
  { id: 'sub_travel_reimb', categoryId: 'cat_transport', name: 'Travel Reimbursement', icon: 'CarTaxiFront', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_commute', categoryId: 'cat_transport', name: 'Cab & Transit', icon: 'Train', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Shopping
  { id: 'sub_electronics', categoryId: 'cat_shopping', name: 'Electronics & Gadgets', icon: 'Laptop', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_household', categoryId: 'cat_shopping', name: 'Household Essentials', icon: 'ShoppingBag', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Entertainment
  { id: 'sub_digital', categoryId: 'cat_entertainment', name: 'Digital purchases', icon: 'Smartphone', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Financial Charges
  { id: 'sub_card_fee', categoryId: 'cat_financial', name: 'Card fee', icon: 'CreditCard', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Debt & EMIs
  { id: 'sub_phone_emi', categoryId: 'cat_debt', name: 'Phone EMI', icon: 'Smartphone', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_cc_payment', categoryId: 'cat_debt', name: 'Credit Card Bill Payment', icon: 'CreditCard', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Investments
  { id: 'sub_iccsl_rd', categoryId: 'cat_investments', name: 'ICCSL RD', icon: 'PiggyBank', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_pf_buffer', categoryId: 'cat_investments', name: 'Savings / PF Buffer', icon: 'TrendingUp', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Income
  { id: 'sub_salary', categoryId: 'cat_income', name: 'Salary', icon: 'Briefcase', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sub_cashback', categoryId: 'cat_income', name: 'Cashback', icon: 'Gift', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

// Clean state: No dummy friends, groups, recurring commitments, or transactions!
export const INITIAL_PEOPLE: Person[] = [];
export const INITIAL_GROUPS: Group[] = [];
export const INITIAL_RECURRING_COMMITMENTS: RecurringCommitment[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
