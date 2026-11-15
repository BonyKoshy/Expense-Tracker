# FinTrack PWA 💸 (The Cashew Killer)

> **A local-first, Progressive Web App engineered with React 19, Vite, TypeScript, Tailwind CSS v4, and Dexie.js (IndexedDB).**  
> Designed with a native **Stock Android 17 / Material 3 (Material You)** design language, featuring clean tonal surfaces, bottom navigation, and zero AI-slop color gradients.

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Dexie.js](https://img.shields.io/badge/Dexie.js-v4_(IndexedDB)-green.svg)](https://dexie.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable_%26_Offline-orange.svg)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 💡 The Problem FinTrack Solves

Traditional personal finance apps like **Cashew** are rigidly designed for single-individual accounting. They critically break down when faced with real-world Indian living situations: **shared PG flat expenses, bulk bill swiping, and asynchronous GPay/UPI group settlements**.

### The Traditional App Failure:
1. **Double-Counted Expenses:** When you pay a bulk bill of **₹1,505** at DMart on your credit card for 5 PG flatmates:
   - Traditional apps record a **₹1,505 personal expense**, blowing up your monthly grocery budget.
2. **Artificial "Income" on Repayments:** When Rahul repays his **₹305.50** share via GPay:
   - Traditional apps record a **₹305.50 Income**, falsifying your cash flow and tax tracking.
3. **Misleading Bank Balances:** Showing a ₹45,000 bank balance makes you feel solvent, while failing to subtract upcoming rent (₹8,500), Phone EMI (₹2,499), 2-year RD (₹3,000), and unbilled credit card bills (₹1,505).

---

## ⚡ The Cashew Killer Architecture

FinTrack solves this with a **pure double-entry receivable/payable engine**:

| Scenario | What Traditional Apps Do | How FinTrack Solves It (The Right Way) |
| :--- | :--- | :--- |
| **Swiping ₹1,505 at DMart for 5 people** | Records ₹1,505 personal expense | **Personal Expense:** Increases *only* by your personal share (**₹282.25**).<br>**Receivables:** Friends owe you **₹1,222.75** (`netBalance` booked).<br>**Liability:** Credit Card outstanding increases by full **₹1,505.00**. |
| **Friend repays ₹305.50 via GPay UPI** | Records ₹305.50 as "Income" | **Liquid Balance:** Increases by ₹305.50 in HDFC Salary.<br>**Friend Receivable:** Reduces by ₹305.50 (cleared to ₹0).<br>**Expense/Income Impact:** **₹0.00** (Pure asset transfer). |
| **Friend pays dinner on your behalf** | Untracked or manually hacked | **Personal Expense:** Recorded in Food & Dining.<br>**Bank Account:** Untouched.<br>**Friend Payable:** You now owe the friend your share. |

---

## 🧠 "Available to Spend" Intelligence Engine

FinTrack never shows a naive bank balance. Instead, it computes your true, disposable spending liquidity:

$$\text{Available to Spend} = \text{Total Liquid Balances} - (\text{Reserved Commitments} + \text{Unbilled CC Liability} + \text{Net Money Owed to Others})$$

Where:
- **Total Liquid Balances:** $\sum (\text{Bank Accounts} + \text{Physical Cash} + \text{Digital Wallets})$
- **Reserved Commitments:** Active duration-bound EMIs, RDs, and Rent for the current cycle.
- **Unbilled CC Liability:** Total outstanding liability across credit cards.
- **Net Money Owed to Others:** $\max(0, \sum \text{Payables} - \sum \text{Receivables})$

---

## 🎨 Stock Android 17 / Material 3 Design Language

FinTrack is completely styled in **Material 3 (Material You)**, rejecting artificial AI gradients and neon glowing blurs in favor of authentic Material design:

- **Tonal Palette:** Deep OLED surfaces (`#111318`, `#1e2026`, `#282a30`) with soft Google Pixel blue accents (`#a8c7fa`, `#253a5c`, `#d3e3fd`).
- **Fixed Bottom Navigation Bar:** Ergonomic 5-destination bottom bar with Material You rounded pill indicators:
  1. **Home:** Overview, Available to Spend intelligence card, and recent transaction feed.
  2. **Splits:** PG Flatmates ledger, group split balances, and 1-click GPay settlement simulation.
  3. **Accounts:** Multi-account balances, credit card limit gauges, and recurring commitments toggle.
  4. **Analytics:** Recharts spending donut and friend receivables bar distribution.
  5. **Settings:** Centralized entity hub to manage accounts, friends, groups, categories, and backups.
- **Material 3 Extended FAB:** Floating action button (`+ New Transaction`) docked above the bottom bar.
- **Bottom Sheet Dialogs:** Outlined text fields, top drag handles (`rounded-full`), and rounded pill buttons.

---

## 🔐 Local-First & Zero-Knowledge Security

- **Dexie.js (IndexedDB):** 100% of your data lives in your browser's IndexedDB. No remote database, no tracking, zero cloud latency.
- **AES-GCM 256-bit Encrypted Backup:** Export password-protected `.json` backups encrypted via the browser's native **Web Crypto API** using PBKDF2 (100,000 rounds) and AES-GCM 256-bit encryption.
- **Plain JSON Audits:** One-click export for spreadsheet auditing or manual migrations.

---

## 🏗️ Tech Stack

- **Core Framework:** React 19 + TypeScript + Vite 6
- **Styling:** Tailwind CSS v4 + Material 3 design tokens
- **Local Database:** Dexie.js v4 (`dexie` + `dexie-react-hooks`)
- **Visual Analytics:** Recharts v3
- **Icons:** Lucide React
- **PWA Service Worker:** `vite-plugin-pwa` with Workbox offline precaching

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [npm](https://www.npmjs.com/) (v10+)

### Installation
```bash
# Clone the repository
git clone https://github.com/BonyKoshy/Expense-Tracker.git
cd Expense-Tracker

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Automated Accounting Verification Test
Run the automated invariant verification suite that mathematically verifies the DMart 5-person split and the GPay debt clearance:
```bash
npm run test:accounting
```

### Production Build & PWA Generation
```bash
npm run build
npm run preview
```

---

## 📂 Real-World PG Dataset & Cashew CSV Migration

FinTrack comes pre-seeded with authentic, relatable PG living data modeled directly from real-world flat expense sharing:
- **Real Accounts:** `HDFC Bank` (Salary/UPI), `CANARA Bank` (Savings/PF Buffer), `HDFC MoneyBack+` (Credit Card Liability), `Amazon Pay Wallet`, `CASH`, and `ICCSL RD` (Recurring Deposit).
- **Room 514 & PG Community:** Flatmates (`Rijosh`, `Jithu`, `Sreerag`, `Alan`, `Rohan`) and PG friends (`Akhil`, `Arunima`, `Amal`, `Aishwarya`).
- **Real Shared Bill Splits:**
  - **DMart Grocery Split (₹1,505.00):** Bony's share: ₹282.25; Jithu: ₹381.25 (settled); Sreerag: ₹212.25 (settled); Alan: ₹99.00 (settled); Rijosh: ₹530.25 (unpaid receivable).
  - **Pepper Leaf Dinner (₹914.00):** Bony: ₹180; Alan: ₹180; Rijosh: ₹170; Jithu: ₹204; Sreerag: ₹180 (All settled).
  - **Masala Dosa (₹210.00):** Bony ₹70, Akhil ₹70, Sreerag ₹70.
  - **Thekku Island (₹175.00):** Bony ₹43.75, Rijosh ₹43.75, Jithu ₹43.75, Rohan ₹43.75.
- **In-Browser Cashew CSV Importer:**
  - Got a `cashew-*.csv` backup from the Cashew mobile app?
  - Open **Settings** -> **Import Cashew CSV Export** (or **Backup & Restore** -> **Cashew CSV** tab) to migrate your accounts, categories, and transactions in seconds.
  - FinTrack automatically repairs Cashew's broken split and repayment records on-the-fly!

---

## 🗄️ Database Schema (Dexie.js)

```
+------------------------------------------------------------------------+
|                          FinanceTrackerDB                              |
+------------------------------------------------------------------------+
| accounts             -> id, name, type, balance, creditLimit, cycleDay |
| categories           -> id, name, type, color, icon                    |
| subcategories        -> id, categoryId, name                           |
| people               -> id, name, phone, upiId, netBalance             |
| groups               -> id, name, memberIds, defaultSplitType          |
| transactions         -> id, type, date, amount, accountId, categoryId, |
|                         personalExpenseAmount, isShared, splits[]      |
| recurringCommitments -> id, name, type, amount, installments, isActive |
+------------------------------------------------------------------------+
```

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for details.

---

## 👨‍💻 Author
Built with ❤️ by [Bony Koshy](https://github.com/BonyKoshy).
