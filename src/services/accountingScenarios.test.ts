import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { FinanceTrackerDatabase, safeDeleteAccount } from "../db";
import {
  recordTransaction,
  deleteTransaction,
  updateTransaction,
  calculateAvailableToSpend,
  reconcileAllBalances,
} from "./accountingEngine";
import type {
  Account,
  Person,
  Transaction,
  RecurringCommitment,
} from "../types";

describe("Accounting Engine Comprehensive Real-DB Scenarios (accountingScenarios.test.ts)", () => {
  let db: FinanceTrackerDatabase;

  const hdfcBank: Account = {
    id: "acc_hdfc",
    name: "HDFC Salary Bank",
    type: "bank",
    balance: 50000,
    initialBalance: 50000,
    currency: "INR",
    color: "#0284c7",
    icon: "landmark",
    isDefault: true,
    isArchived: false,
    createdAt: "",
    updatedAt: "",
  };

  const sbiBank: Account = {
    id: "acc_sbi",
    name: "SBI Secondary Bank",
    type: "bank",
    balance: 10000,
    currency: "INR",
    color: "#0284c7",
    icon: "landmark",
    isArchived: false,
    createdAt: "",
    updatedAt: "",
  };

  const amazonWallet: Account = {
    id: "acc_amazon",
    name: "Amazon Pay Wallet",
    type: "wallet",
    balance: 500,
    currency: "INR",
    color: "#f59e0b",
    icon: "wallet",
    isArchived: false,
    createdAt: "",
    updatedAt: "",
  };

  const hdfcCreditCard: Account = {
    id: "acc_cc",
    name: "HDFC Credit Card",
    type: "credit_card",
    balance: 5000, // ₹5,000 existing liability
    creditLimit: 100000,
    currency: "INR",
    color: "#ef4444",
    icon: "credit-card",
    isArchived: false,
    createdAt: "",
    updatedAt: "",
  };

  const friendSreerag: Person = {
    id: "person_sreerag",
    name: "Sreerag",
    netBalance: 0,
    createdAt: "",
    updatedAt: "",
  };

  const friendAlan: Person = {
    id: "person_alan",
    name: "Alan",
    netBalance: 0,
    createdAt: "",
    updatedAt: "",
  };

  beforeEach(async () => {
    db = new FinanceTrackerDatabase(
      `test_scenarios_${Date.now()}_${Math.random()}`,
    );
    await db.open();

    await db.accounts.bulkAdd([
      hdfcBank,
      sbiBank,
      amazonWallet,
      hdfcCreditCard,
    ]);
    await db.people.bulkAdd([friendSreerag, friendAlan]);
  });

  it("1. Bank-to-Bank Transfer: decrements source and increments destination without income/expense", async () => {
    const tx: Transaction = {
      id: "tx_b2b",
      type: "transfer",
      title: "Move funds to SBI",
      date: new Date().toISOString(),
      amount: 5000,
      accountId: "acc_hdfc",
      toAccountId: "acc_sbi",
      personalExpenseAmount: 0,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      createdAt: "",
      updatedAt: "",
    };

    await recordTransaction(db, tx);

    const afterHdfc = await db.accounts.get("acc_hdfc");
    const afterSbi = await db.accounts.get("acc_sbi");

    expect(afterHdfc?.balance).toBe(45000); // 50,000 - 5,000
    expect(afterSbi?.balance).toBe(15000); // 10,000 + 5,000
  });

  it("2. Bank-to-Wallet Transfer: loads digital wallet accurately", async () => {
    const tx: Transaction = {
      id: "tx_b2w",
      type: "transfer",
      title: "Load Amazon Wallet",
      date: new Date().toISOString(),
      amount: 1500,
      accountId: "acc_hdfc",
      toAccountId: "acc_amazon",
      personalExpenseAmount: 0,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      createdAt: "",
      updatedAt: "",
    };

    await recordTransaction(db, tx);

    const afterHdfc = await db.accounts.get("acc_hdfc");
    const afterWallet = await db.accounts.get("acc_amazon");

    expect(afterHdfc?.balance).toBe(48500); // 50,000 - 1,500
    expect(afterWallet?.balance).toBe(2000); // 500 + 1,500
  });

  it("3. Credit-Card Purchases and Refunds: swipe increases liability; refund decreases liability", async () => {
    // Purchase of ₹2,500 on CC
    const purchaseTx: Transaction = {
      id: "tx_cc_purchase",
      type: "expense",
      title: "Electronics Store Purchase",
      date: new Date().toISOString(),
      amount: 2500,
      accountId: "acc_cc",
      personalExpenseAmount: 2500,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      createdAt: "",
      updatedAt: "",
    };

    await recordTransaction(db, purchaseTx);
    let cc = await db.accounts.get("acc_cc");
    expect(cc?.balance).toBe(7500); // Liability increased: 5,000 + 2,500 = 7,500

    // Refund / Cashback of ₹1,000 on CC
    const refundTx: Transaction = {
      id: "tx_cc_refund",
      type: "income",
      title: "Merchant Refund",
      date: new Date().toISOString(),
      amount: 1000,
      accountId: "acc_cc",
      personalExpenseAmount: 0,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      createdAt: "",
      updatedAt: "",
    };

    await recordTransaction(db, refundTx);
    cc = await db.accounts.get("acc_cc");
    expect(cc?.balance).toBe(6500); // Liability decreased: 7,500 - 1,000 = 6,500
  });

  it("4. Credit-Card Bill Payment: decreases bank balance and decreases CC liability", async () => {
    // Pay ₹4,000 of CC bill from HDFC
    const billPayTx: Transaction = {
      id: "tx_cc_bill_pay",
      type: "credit_card_payment",
      title: "HDFC CC Bill Payment",
      date: new Date().toISOString(),
      amount: 4000,
      accountId: "acc_hdfc",
      toAccountId: "acc_cc",
      personalExpenseAmount: 0,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      createdAt: "",
      updatedAt: "",
    };

    await recordTransaction(db, billPayTx);

    const bank = await db.accounts.get("acc_hdfc");
    const cc = await db.accounts.get("acc_cc");

    expect(bank?.balance).toBe(46000); // 50,000 - 4,000
    expect(cc?.balance).toBe(1000); // Liability dropped: 5,000 - 4,000 = 1,000
  });

  it("5. Shared purchases with equal and itemized splits", async () => {
    // ₹3,000 dinner bill paid by user on HDFC bank
    // Split: User = ₹1,000, Sreerag = ₹1,000, Alan = ₹1,000
    const sharedTx: Transaction = {
      id: "tx_shared_dinner",
      type: "shared_expense",
      title: "Team Dinner",
      date: new Date().toISOString(),
      amount: 3000,
      accountId: "acc_hdfc",
      personalExpenseAmount: 1000,
      isShared: true,
      paidByPersonId: "user",
      splits: [
        { personId: "user", amount: 1000, isSettled: true },
        { personId: "person_sreerag", amount: 1000, isSettled: false },
        { personId: "person_alan", amount: 1000, isSettled: false },
      ],
      createdAt: "",
      updatedAt: "",
    };

    await recordTransaction(db, sharedTx);

    const bank = await db.accounts.get("acc_hdfc");
    const sreerag = await db.people.get("person_sreerag");
    const alan = await db.people.get("person_alan");

    expect(bank?.balance).toBe(47000); // 50,000 - 3,000
    expect(sreerag?.netBalance).toBe(1000); // Sreerag owes user 1,000
    expect(alan?.netBalance).toBe(1000); // Alan owes user 1,000
  });

  it("6 & 7. Partial and Full Friend Settlements: clears debt with zero income/expense distortion", async () => {
    // Setup initial debt: Sreerag owes ₹1,000
    await db.people.update("person_sreerag", { netBalance: 1000 });

    // Partial settlement: Sreerag pays ₹400 via GPay
    const partialSettleTx: Transaction = {
      id: "tx_partial_settle",
      type: "settlement_received",
      title: "Sreerag GPay Settlement (Partial)",
      date: new Date().toISOString(),
      amount: 400,
      accountId: "acc_hdfc",
      personalExpenseAmount: 0, // MUST BE ZERO
      isShared: false,
      paidByPersonId: "person_sreerag",
      splits: [{ personId: "person_sreerag", amount: 400, isSettled: true }],
      createdAt: "",
      updatedAt: "",
    };

    await recordTransaction(db, partialSettleTx);

    let bank = await db.accounts.get("acc_hdfc");
    let sreerag = await db.people.get("person_sreerag");

    expect(bank?.balance).toBe(50400); // 50,000 + 400
    expect(sreerag?.netBalance).toBe(600); // 1,000 - 400 = 600 remaining debt

    // Full settlement: Sreerag pays remaining ₹600
    const fullSettleTx: Transaction = {
      id: "tx_full_settle",
      type: "settlement_received",
      title: "Sreerag GPay Settlement (Final)",
      date: new Date().toISOString(),
      amount: 600,
      accountId: "acc_hdfc",
      personalExpenseAmount: 0, // MUST BE ZERO
      isShared: false,
      paidByPersonId: "person_sreerag",
      splits: [{ personId: "person_sreerag", amount: 600, isSettled: true }],
      createdAt: "",
      updatedAt: "",
    };

    await recordTransaction(db, fullSettleTx);

    bank = await db.accounts.get("acc_hdfc");
    sreerag = await db.people.get("person_sreerag");

    expect(bank?.balance).toBe(51000); // 50,400 + 600
    expect(sreerag?.netBalance).toBe(0); // Fully settled (₹0)
  });

  it("8 & 9. Transaction Editing and Deletion: reverses balance deltas without leakage", async () => {
    // Spend ₹2,000 from HDFC
    const initialTx: Transaction = {
      id: "tx_edit_test",
      type: "expense",
      title: "Shopping",
      date: new Date().toISOString(),
      amount: 2000,
      accountId: "acc_hdfc",
      personalExpenseAmount: 2000,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      createdAt: "",
      updatedAt: "",
    };

    await recordTransaction(db, initialTx);
    let bank = await db.accounts.get("acc_hdfc");
    expect(bank?.balance).toBe(48000); // 50,000 - 2,000

    // Edit transaction: change amount to ₹3,500
    const updatedTx: Transaction = {
      ...initialTx,
      amount: 3500,
      personalExpenseAmount: 3500,
    };

    await updateTransaction(db, initialTx, updatedTx);
    bank = await db.accounts.get("acc_hdfc");
    expect(bank?.balance).toBe(46500); // 50,000 - 3,500

    // Delete transaction: cleanly revert back to original 50,000
    await deleteTransaction(db, initialTx.id);
    bank = await db.accounts.get("acc_hdfc");
    expect(bank?.balance).toBe(50000); // Fully reverted
  });

  it("10 & 11. Recurring Commitments & Anti-Double-Deduction in Available to Spend", async () => {
    const rentCommitment: RecurringCommitment = {
      id: "comm_rent",
      name: "Flat Rent",
      type: "recurring_expense",
      amount: 15000,
      accountId: "acc_hdfc",
      categoryId: "cat_rent",
      frequency: "monthly",
      dayOfMonth: 5,
      startDate: "2024-01-01",
      isActive: true,
      isReservedCommitment: true,
      paidInstallments: 0,
      createdAt: "",
      updatedAt: "",
    };

    const accounts = await db.accounts.toArray();
    const people = await db.people.toArray();

    // 1. Before rent is paid:
    // HDFC = 50,000, CC Liability = 5,000, Reserved Rent = 15,000
    // Available to Spend = 50,000 - 5,000 - 15,000 = 30,000
    const beforePaymentBreakdown = calculateAvailableToSpend(
      accounts,
      [rentCommitment],
      people,
      [],
    );
    expect(beforePaymentBreakdown.availableToSpend).toBe(30000);
    expect(beforePaymentBreakdown.hdfcReservedCommitments).toBe(15000);

    // 2. Rent is paid on day 5: record transaction
    const rentTx: Transaction = {
      id: "tx_rent_payment",
      type: "expense",
      title: "Flat Rent Paid",
      date: new Date().toISOString(), // current month
      amount: 15000,
      accountId: "acc_hdfc",
      categoryId: "cat_rent",
      personalExpenseAmount: 15000,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      recurringCommitmentId: "comm_rent",
      createdAt: "",
      updatedAt: "",
    };
    await recordTransaction(db, rentTx);

    const accountsAfter = await db.accounts.toArray();
    const hdfcAfter = accountsAfter.find((a) => a.id === "acc_hdfc");
    expect(hdfcAfter?.balance).toBe(35000); // 50,000 - 15,000

    // 3. After rent is paid:
    // HDFC = 35,000, CC Liability = 5,000.
    // Since rent was already paid, it is NO LONGER DEDUCTED AGAIN.
    // Available to Spend = 35,000 - 5,000 - 0 = 30,000!
    const afterPaymentBreakdown = calculateAvailableToSpend(
      accountsAfter,
      [rentCommitment],
      people,
      [rentTx],
    );
    expect(afterPaymentBreakdown.availableToSpend).toBe(30000);
    expect(afterPaymentBreakdown.hdfcReservedCommitments).toBe(0); // Zero double deduction
  });

  it("12. Balance Reconciliation Auto-Heals any ledger drift", async () => {
    // Record legitimate transaction
    const tx: Transaction = {
      id: "tx_drift_test",
      type: "expense",
      title: "Groceries",
      date: new Date().toISOString(),
      amount: 1000,
      accountId: "acc_hdfc",
      personalExpenseAmount: 1000,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      createdAt: "",
      updatedAt: "",
    };
    await recordTransaction(db, tx);

    // Intentionally inject artificial balance drift
    await db.accounts.update("acc_hdfc", { balance: 9999 });

    // Run reconciliation engine
    const recon = await reconcileAllBalances(db);
    expect(recon.discrepanciesFound).toBeGreaterThan(0);

    // Reconciled balance must accurately reflect true ledger sum (50,000 - 1,000 = 49,000)
    const healed = await db.accounts.get("acc_hdfc");
    expect(healed?.balance).toBe(49000);
  });

  it("13. Safe account deletion works without index error on destination accounts (toAccountId)", async () => {
    // Record transfer where acc_sbi is the destination (toAccountId)
    const transferTx: Transaction = {
      id: "tx_transfer_to_sbi",
      type: "transfer",
      title: "Move funds to SBI",
      date: new Date().toISOString(),
      amount: 5000,
      accountId: "acc_hdfc",
      toAccountId: "acc_sbi",
      personalExpenseAmount: 0,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      createdAt: "",
      updatedAt: "",
    };
    await recordTransaction(db, transferTx);

    // Verify toAccountId indexed lookup works without SchemaError
    const destTxs = await db.transactions
      .where("toAccountId")
      .equals("acc_sbi")
      .toArray();
    expect(destTxs.length).toBe(1);
    expect(destTxs[0].id).toBe("tx_transfer_to_sbi");

    // Archive acc_sbi
    await safeDeleteAccount(db, "acc_sbi", "archive");
    const archivedAcc = await db.accounts.get("acc_sbi");
    expect(archivedAcc?.isArchived).toBe(true);

    // Permanently delete acc_amazon with cascade revert
    const deleteRes = await safeDeleteAccount(
      db,
      "acc_amazon",
      "cascade_revert",
    );
    expect(deleteRes.transactionsReverted).toBe(0);
    const deletedAcc = await db.accounts.get("acc_amazon");
    expect(deletedAcc).toBeUndefined();

    // Permanently delete acc_sbi which has linked transfer transaction
    const cascadeRes = await safeDeleteAccount(db, "acc_sbi", "cascade_revert");
    expect(cascadeRes.transactionsReverted).toBe(1);
    const deletedSbi = await db.accounts.get("acc_sbi");
    expect(deletedSbi).toBeUndefined();

    // Verify transfer was reverted and HDFC balance restored
    const hdfc = await db.accounts.get("acc_hdfc");
    expect(hdfc?.balance).toBe(50000);
  });
});
