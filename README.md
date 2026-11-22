# FinTrack 💸

> **A modern, offline-first personal finance & expense intelligence Progressive Web App.**  
> Built from the ground up with React 19, TypeScript, Tailwind CSS, Dexie.js (IndexedDB), and a clean Material 3 design system.

[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vitejs.dev/)
[![Dexie.js](<https://img.shields.io/badge/Dexie.js-v4_(IndexedDB)-2ea44f.svg>)](https://dexie.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable_%26_Offline-f59e0b.svg)](https://web.dev/progressive-web-apps/)
[![CI/CD](https://github.com/BonyKoshy/Expense-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/BonyKoshy/Expense-Tracker/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Overview

**FinTrack** is an independent, purpose-built personal finance operating system engineered for real-world personal spending, multi-account liquidity management, and shared group expenses.

Traditional budgeting apps struggle when personal finances intersect with shared living—swiping a large credit card bill for flatmates corrupts your monthly budget, and friends repaying their share gets falsely logged as "income." FinTrack solves this at the architectural level with a double-entry receivable/payable engine that keeps your personal expenses, friend debts, and account balances cleanly separated and mathematically accurate.

100% of your data remains strictly on your device using IndexedDB, guaranteeing total privacy, instant offline performance, and zero cloud lock-in.

---

## ✨ Key Features

### 🧮 Integrated Calculator Transaction Entry

- **Live Keypad & Expression Evaluator:** Add amounts directly with a full mathematical keypad (`+`, `-`, `×`, `÷`) and real-time computation preview before proceeding.
- **Two-Step Guided Flow:** Enter and compute the exact amount first, then seamlessly select category, account, tags, and split details.

### 👥 Precision Group Splits & Debt Ledger

- **Accurate Personal Accounting:** When you swipe for a group, only your personal share affects your expense analytics. Friends' shares are booked directly to individual debt ledgers.
- **Pending Due Drill-Down:** Click any person to inspect all pending transactions contributing to their outstanding balance.
- **One-Click Settlement:** Log repayments in a tap without distorting your income or cash flow reports.
- **Third-Party Bill Handling:** Accurately track situations where a friend pays a bill on your behalf.

### 🧠 "Available to Spend" Liquidity Engine

Never get caught off-guard by a superficial bank balance. FinTrack dynamically computes your true disposable liquidity:

$$\text{Available to Spend} = \text{Liquid Assets} - (\text{Reserved Commitments} + \text{Unbilled Credit Liabilities} + \text{Net Monies Owed})$$

- Deducts upcoming monthly rent, loan EMIs, and recurring deposits.
- Accounts for current unbilled credit card liabilities.
- Prevents overspending before fixed commitments come due.

### 📊 Monthly Budgeting & Daily Spend Allowance

- **Dynamic Daily Allowance:** Calculates exactly how much you can safely spend per day based on remaining budget and remaining days in the month (`Remaining ÷ Days Left`).
- **Tea & Chai Tracker:** Dedicated micro-category widget to keep tabs on daily tea breaks, coffee runs, and quick refreshments alongside the broader Food & Dining budget.
- **Category Caps & Alert Thresholds:** Visual progress meters with automated warning states at 80% and 100% utilization.

### 💳 Complete Multi-Account Management

- **Account Types:** Bank Accounts (Savings/Salary), Credit Cards, Cash, Digital Wallets, and Fixed/Recurring Deposits.
- **Credit Card Intelligence:** Statement cycle day alerts, total credit limit monitoring, and automated credit card bill payment transfers.
- **Commitments & EMIs:** Track active loans and recurring subscriptions with installment counts, remaining tenures, and cycle dates.

### 🔒 Local-First, Zero-Knowledge Privacy

- **100% Client-Side:** Powered by Dexie.js (IndexedDB). Your financial transactions never leave your device or hit a remote server.
- **Military-Grade Encrypted Backups:** Export and import password-protected backups encrypted via the native browser **Web Crypto API** using **PBKDF2** (100,000 iterations) and **AES-GCM 256-bit** encryption.
- **Data Portability:** Full JSON and CSV export/import capabilities for complete data ownership.

### 📱 Native PWA & Material 3 Interface

- **Installable Progressive Web App:** Installs natively on Android, iOS, Windows, and macOS with full offline capabilities via Service Workers.
- **Clean Material 3 Theme:** Deep dark-mode OLED surfaces, ergonomic bottom navigation, tactile touch targets, and Geist typography.

---

## 🏗️ Architecture & Technology Stack

| Layer                  | Technologies                                                                       |
| :--------------------- | :--------------------------------------------------------------------------------- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript 5.8](https://www.typescriptlang.org/) |
| **Build Tooling**      | [Vite 6](https://vitejs.dev/) + `@vite-pwa/plugin`                                 |
| **Styling & Design**   | [Tailwind CSS v4](https://tailwindcss.com/) + Material 3 Tokens + Geist Sans/Mono  |
| **Database**           | [Dexie.js v4](https://dexie.org/) (IndexedDB wrapper with live reactive hooks)     |
| **Visualizations**     | [Recharts v3](https://recharts.org/)                                               |
| **Cryptography**       | Browser Native Web Crypto API (PBKDF2 + AES-GCM 256)                               |
| **Icons**              | [Lucide React](https://lucide.dev/)                                                |
| **CI / CD Pipeline**   | GitHub Actions (Typecheck, Oxlint, Vitest, Accounting Invariants, Build Gate)      |

---

## 🗄️ Database Schema

FinTrack uses a normalized client-side schema managed through Dexie:

```
+-------------------------------------------------------------------------------+
|                               FinanceTrackerDB                                |
+-------------------------------------------------------------------------------+
| accounts             -> id, name, type, balance, creditLimit, cycleDay        |
| categories           -> id, name, type, color, icon, monthlyLimit             |
| subcategories        -> id, categoryId, name                                  |
| people               -> id, name, phone, upiId, netBalance                    |
| groups               -> id, name, memberIds, defaultSplitType                 |
| transactions         -> id, type, date, amount, accountId, categoryId,        |
|                         personalExpenseAmount, isShared, splits[], notes      |
| recurringCommitments -> id, name, type, amount, installments, isActive        |
+-------------------------------------------------------------------------------+
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or higher recommended)
- [npm](https://www.npmjs.com/) (v10 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/BonyKoshy/Expense-Tracker.git
cd Expense-Tracker

# Install dependencies
npm install
```

### Development

Start the local development server with Hot Module Replacement:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

### Verification & Testing

FinTrack includes a comprehensive quality gate verifying TypeScript types, linting rules, unit tests, and financial accounting invariants:

```bash
# Run all verification checks (typecheck + lint + tests + accounting invariants + build)
npm run verify

# Run unit tests with Vitest
npm test

# Run financial accounting invariant test suite
npm run test:accounting
```

### Production Build

```bash
# Build the production bundle with offline PWA service workers
npm run build

# Preview the production build locally
npm run preview
```

---

## 🛡️ CI/CD Quality Gate

Every commit pushed to the repository is automatically validated by our multi-stage GitHub Actions pipeline:

1. **Code Integrity & Type Check:** Strict `tsc --noEmit`, Oxlint analysis, and secret leak scanning.
2. **Financial Accounting & Unit Tests:** Vitest test suite and double-entry arithmetic invariant verifications.
3. **Production Build & PWA Audit:** Production minification and PWA asset/manifest validation.
4. **Deployment Gate:** Automatic continuous deployment via Netlify.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author

Designed and built with care by [Bony Koshy](https://github.com/BonyKoshy).
