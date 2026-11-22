import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  parseCSV,
  parseDynamicSplits,
  importCashewCSV,
  previewCashewCSV,
} from "./cashewImporter";
import { FinanceTrackerDatabase } from "../db";
import type { Person, Account } from "../types";

describe("Cashew Importer Engine Comprehensive Suite (cashewImporter.test.ts)", () => {
  let db: FinanceTrackerDatabase;

  beforeEach(async () => {
    db = new FinanceTrackerDatabase(
      `test_cashew_${Date.now()}_${Math.random()}`,
    );
    await db.open();
  });

  it("parses standard and escaped RFC 4180 CSV rows correctly", () => {
    const csvContent =
      "Date,Amount,Title,Category,Account\n" +
      "2024-11-20,150.00,Lunch,Food,HDFC\n" +
      '2024-11-20,1505.00,"DMart, Groceries & Rice",Groceries,"HDFC, Credit Card"\n' +
      '2024-11-20,500.00,"Dinner at ""Tandoor"" restaurant",Dining,Cash';

    const rows = parseCSV(csvContent);
    expect(rows.length).toBe(4);

    expect(rows[1]).toEqual(["2024-11-20", "150.00", "Lunch", "Food", "HDFC"]);
    expect(rows[2]).toEqual([
      "2024-11-20",
      "1505.00",
      "DMart, Groceries & Rice",
      "Groceries",
      "HDFC, Credit Card",
    ]);
    expect(rows[3]).toEqual([
      "2024-11-20",
      "500.00",
      'Dinner at "Tandoor" restaurant',
      "Dining",
      "Cash",
    ]);
  });

  it("dynamically parses equal splits pattern from notes (e.g. ₹X each)", () => {
    const personMap = new Map<string, Person>();
    personMap.set("sreerag", {
      id: "p_sreerag",
      name: "Sreerag",
      netBalance: 0,
      createdAt: "",
      updatedAt: "",
    });
    personMap.set("alan", {
      id: "p_alan",
      name: "Alan",
      netBalance: 0,
      createdAt: "",
      updatedAt: "",
    });

    const note = "DMart split – Sreerag, Alan; ₹350 each";
    const result = parseDynamicSplits(note, 1050, personMap);

    expect(result.userPersonalShare).toBe(350);
    expect(result.splits.length).toBe(3); // User + Sreerag + Alan
  });

  it("dynamically parses named split amounts from notes", () => {
    const personMap = new Map<string, Person>();
    personMap.set("sreerag", {
      id: "p_sreerag",
      name: "Sreerag",
      netBalance: 0,
      createdAt: "",
      updatedAt: "",
    });
    personMap.set("alan", {
      id: "p_alan",
      name: "Alan",
      netBalance: 0,
      createdAt: "",
      updatedAt: "",
    });

    const note = "Dinner: Sreerag ₹250, Alan ₹150";
    const result = parseDynamicSplits(note, 1000, personMap);

    // Total friend shares = 400, personal share = 1000 - 400 = 600
    expect(result.userPersonalShare).toBe(600);
    expect(
      result.splits.some((s) => s.personId === "p_sreerag" && s.amount === 250),
    ).toBe(true);
    expect(
      result.splits.some((s) => s.personId === "p_alan" && s.amount === 150),
    ).toBe(true);
  });

  it("throws descriptive error on empty or header-only CSV files", async () => {
    await expect(importCashewCSV("", db)).rejects.toThrow(/CSV is empty/);
    await expect(importCashewCSV("Account,Amount,Title\n", db)).rejects.toThrow(
      /CSV is empty/,
    );
  });

  it("correctly handles special characters, commas in quotes, and Indian currency symbols", async () => {
    const csv =
      "Account,Amount,Amount (Unpaid),Type,Title,Note,Date,Is Income?,Tags,Category,Subcategory\n" +
      'HDFC Salary,1505.00,,Expense,"DMart, Groceries & ""Spices""","PG split – Sreerag, Alan; ₹350 each",2024-11-20 18:30:00,false,"food,pg",Food,Groceries\n';

    const res = await importCashewCSV(csv, db);
    expect(res.transactionsAdded).toBe(1);

    const txs = await db.transactions.toArray();
    expect(txs.length).toBe(1);
    expect(txs[0].title).toBe('DMart, Groceries & "Spices"');
    expect(txs[0].personalExpenseAmount).toBe(350);
  });

  it("prevents duplicate transactions when the same CSV is imported twice", async () => {
    const csv =
      "Account,Amount,Amount (Unpaid),Type,Title,Note,Date,Is Income?,Tags,Category,Subcategory\n" +
      "HDFC Salary,500.00,,Expense,Coffee & Snacks,,2024-11-20 10:00:00,false,,Food,Snacks\n" +
      "HDFC Salary,1200.00,,Expense,Dinner with team,,2024-11-20 20:00:00,false,,Food,Dinner\n";

    // First import
    const res1 = await importCashewCSV(csv, db);
    expect(res1.transactionsAdded).toBe(2);
    expect(res1.duplicatesSkipped).toBe(0);

    // Second import of the identical file
    const res2 = await importCashewCSV(csv, db);
    expect(res2.transactionsAdded).toBe(0);
    expect(res2.duplicatesSkipped).toBe(2);

    // Total in database must remain exactly 2
    const totalTxs = await db.transactions.count();
    expect(totalTxs).toBe(2);
  });

  it("auto-heals and updates account and friend balances during import", async () => {
    const existingBank: Account = {
      id: "acc_hdfc_salary",
      name: "HDFC Salary",
      type: "bank",
      balance: 10000,
      initialBalance: 10000,
      currency: "INR",
      color: "#0284c7",
      icon: "landmark",
      isArchived: false,
      createdAt: "",
      updatedAt: "",
    };
    await db.accounts.add(existingBank);

    const csv =
      "Account,Amount,Amount (Unpaid),Type,Title,Note,Date,Is Income?,Tags,Category,Subcategory\n" +
      "HDFC Salary,2000.00,,Expense,Office Supplies,,2024-11-20 12:00:00,false,,Work,Stationery\n";

    await importCashewCSV(csv, db);

    const bankAfter = await db.accounts.get("acc_hdfc_salary");
    // Balance automatically reconciled from 10,000 - 2,000 = 8,000
    expect(bankAfter?.balance).toBe(8000);
  });

  it("previews CSV metadata accurately without mutating database records", async () => {
    const csv =
      "Account,Amount,Amount (Unpaid),Type,Title,Note,Date,Is Income?,Tags,Category,Subcategory\n" +
      "New Bank,5000.00,,Expense,Air Tickets,,2024-11-15 08:00:00,false,,Travel,Flights\n" +
      "New Bank,3000.00,,Expense,Hotel Booking,,2024-11-18 14:00:00,false,,Travel,Lodging\n";

    const preview = await previewCashewCSV(csv, db);
    expect(preview.totalRows).toBe(2);
    expect(preview.validRows).toBe(2);
    expect(preview.duplicateRows).toBe(0);
    expect(preview.newAccounts).toContain("New Bank");
    expect(preview.totalVolume).toBe(8000);

    // Database must not have been mutated
    const txCount = await db.transactions.count();
    expect(txCount).toBe(0);
  });
});
