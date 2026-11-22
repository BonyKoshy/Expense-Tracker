# Personal Finance PWA (Cashew Killer) - Master Specifications & Tracking

A high-performance, local-first Progressive Web App built with React, Vite, TypeScript, Tailwind CSS, and Dexie.js (IndexedDB). Designed specifically to overcome the rigidity of traditional expense trackers (like Cashew) by supporting **complex PG shared expenses**, **asynchronous GPay group settlements**, **pure receivable/payable accounting**, and a dynamic **"Available to Spend"** financial intelligence engine.

---

## 🎯 Architecture Pillars & Core Rules

### 1. Extensibility & Dynamic Management

- **Accounts:** Dynamic creation, editing, and archiving. Supports Bank accounts, Credit Cards, Digital Wallets, Physical Cash, and Investments.
- **Categories & Subcategories:** Multi-tier taxonomy (e.g., `Food & Dining` -> `Tea & Coffee`, `Snacks`, `Dining Out`, `Groceries`). Fully customizable by the user.
- **People & Groups:** First-class relationship tracking. Friends can belong to multiple groups (e.g., `514`, `PG`, `Goa Trip`). Real-time calculated receivable (they owe me) and payable (I owe them) balances.

### 2. The Core Shared-Expense & Settlement Engine (The "Cashew Killer")

- **Bulk Split Math:**
  - When paying a bulk bill (e.g., ₹1,505 on HDFC Credit Card at DMart) split among $N$ people:
    - **Personal Expense:** Increases _only_ by user's personal share (e.g., ₹282.25).
    - **Receivables:** Friend shares are booked as receivables (`netBalance` increases for each friend).
    - **Source Account / Liability:** The source account is charged the full bill amount (₹1,505). If paid via Credit Card, credit liability increases by ₹1,505.
- **Asynchronous Settlements & Repayments:**
  - When a friend repays via GPay / UPI, liquid balance increases and their receivable decreases.
  - When user pays back a friend, liquid balance decreases and payable decreases.
  - **CRUCIAL ACCOUNTING RULE:** Friend settlements and debt repayments are **never** recorded as Income or Expenses. They are pure balance/receivable transfers.

### 3. "Available to Spend" Financial Metric

Traditional apps show simple bank balances, giving a false sense of liquidity. FinTrack calculates:
$$\text{Available to Spend} = \text{Total Liquid Balances} - (\text{Reserved Commitments} + \text{Unbilled CC Liability} + \text{Net Money Owed to Others})$$

Where:

- $\text{Total Liquid Balances} = \text{Bank Accounts} + \text{Cash} + \text{Wallets}$
- $\text{Reserved Commitments} = \sum \text{Active recurring commitments for current period (Rent, RD, EMIs)}$
- $\text{Unbilled CC Liability} = \text{Total outstanding credit card balance}$
- $\text{Net Money Owed to Others} = \max(0, \sum \text{Payables} - \sum \text{Receivables})$

### 4. Duration-Aware Recurring Commitments Engine

- Supports fixed duration commitments (e.g., Phone EMI: 6 months, Recurring Deposit: 24 months, PG Rent: ongoing monthly).
- Tracks paid vs. remaining installments, automatically expiring or updating remaining liability.

### 5. Local-First & Encrypted Security

- Dexie.js (IndexedDB) for zero-latency offline operation.
- Password-protected encrypted JSON/CSV backup & restore using Web Crypto API (AES-GCM 256-bit + PBKDF2).

---

## 🗄️ Dexie.js Database Entities

```
+-------------------------------------------------------------+
|                        FinanceDB                            |
+-------------------------------------------------------------+
| - accounts:             id, name, type, isArchived          |
| - categories:           id, name, type                      |
| - subcategories:        id, categoryId, name                |
| - people:               id, name, netBalance                |
| - groups:               id, name                            |
| - transactions:         id, type, date, accountId,          |
|                         categoryId, groupId, isShared,      |
|                         paidByPersonId                      |
| - recurringCommitments: id, name, type, accountId, isActive |
+-------------------------------------------------------------+
```

---

## 📋 Implementation Roadmap & Progress

- [x] **Phase 1: Project Scaffolding & Database Schema**
  - [x] Initialize Vite + React + TypeScript + Tailwind CSS
  - [x] Configure Tailwind CSS v4 and PWA plugin (`vite-plugin-pwa`)
  - [x] Define full TypeScript interfaces (`Account`, `Category`, `Subcategory`, `Person`, `Group`, `Transaction`, `TransactionSplit`, `RecurringCommitment`)
  - [x] Create Dexie.js database schema with indexed queries
  - [x] Seed realistic initial dataset (HDFC, Canara, Credit Card, DMart split sample, GPay groups `514` & `PG`)

- [x] **Phase 2: Accounting Engine & Core Calculations**
  - [x] Pure transaction calculator (no double-counting, split allocation)
  - [x] Dynamic "Available to Spend" engine
  - [x] Duration-aware recurring commitments calculator
  - [x] Net worth and cash flow balance calculators

- [x] **Phase 3: State Management & Offline Backup Utilities**
  - [x] Dexie live reactive hooks (`useLiveQuery`)
  - [x] Encrypted JSON export & import (AES-GCM 256-bit + PBKDF2)
  - [x] Plain JSON export/import utility for external spreadsheet audit

- [x] **Phase 4: Extensibility Management Views**
  - [x] Account Manager (Add/Edit/Archive accounts, CC limits, statement cycles)
  - [x] Category & Subcategory Taxonomy Editor (Icons, colors, parent-child links)
  - [x] People & Groups Manager (Friend profiles, UPI IDs, group memberships)

- [x] **Phase 5: Dynamic Transaction Modal & Split Calculator**
  - [x] Universal transaction form supporting 7 distinct transaction types
  - [x] Interactive Shared Expense Splitter (Equal, Custom ₹, or Itemized)
  - [x] Friend settlement recorder (instant receivable/payable clearance)

- [x] **Phase 6: Dashboards & Analytics**
  - [x] Home Financial Overview (Available to Spend card, quick actions, recent activity)
  - [x] Shared Expenses & PG Settlement Dashboard (Who owes whom, group balances)
  - [x] Budgets & Recurring Commitments Tracker (RD, EMI progress bars)
  - [x] Recharts Analytics (Spending breakdown, friend receivables distribution)

- [x] **Phase 7: PWA Polish & Offline Verification**
  - [x] Service worker registration & manifest generation via `vite-plugin-pwa`
  - [x] Responsive mobile-first touch UI (dark mode native with floating action button)

- [x] **Phase 8: Real Cashew Dataset Synchronization & In-Browser CSV Importer**
  - [x] Analyzed user's real Cashew export CSV (`cashew-2026-11-09-21-16-28-277959.csv`)
  - [x] Synchronized seed data with exact accounts (HDFC Bank, CANARA Bank, HDFC MoneyBack+, Amazon Pay Wallet, CASH, ICCSL RD), real people (Rijosh, Jithu, Sreerag, Alan, Rohan, Akhil, Arunima, Amal, Aishwarya), Room 514 / PG groups, and authentic transactions
  - [x] Implemented native in-browser Cashew CSV Importer (`src/services/cashewImporter.ts`) and direct Settings / Backup modal migration tab
  - [x] Verified 100% accounting invariants with automated test runner (`npm run test:accounting`)
