import { db, type FinanceTrackerDatabase } from "../db";
import {
  reconcileAllBalances,
  calculateTransactionDeltas,
  applyAccountBalanceDelta,
} from "./accountingEngine";
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Transaction,
  TransactionSplit,
  AccountType,
} from "../types";
import { roundMoney, addMoney } from "../utils/money";

export interface CashewPreviewSummary {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  newAccounts: string[];
  newCategories: string[];
  newPeople: string[];
  dateRange: { start: string; end: string } | null;
  totalVolume: number;
}

export interface CashewImportResult {
  accountsAdded: number;
  categoriesAdded: number;
  subcategoriesAdded: number;
  peopleAdded: number;
  transactionsAdded: number;
  duplicatesSkipped: number;
}

/**
 * RFC 4180 compliant CSV parser.
 * Handles multiline quoted strings, escaped quotes (""), and varied CRLF / LF line endings.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.length > 1 || currentRow[0] !== "") {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

/**
 * Known default profile metadata for roommates/friends (for enhanced avatar/group defaults).
 * Any person not in this list will be created dynamically with generic avatars.
 */
const DEFAULT_PERSON_METADATA: Record<
  string,
  { avatar: string; defaultGroup: string }
> = {
  rijosh: { avatar: "👨‍💻", defaultGroup: "514" },
  jithu: { avatar: "👨‍🎓", defaultGroup: "514" },
  sreerag: { avatar: "👨‍💼", defaultGroup: "514" },
  alan: { avatar: "👨‍🔬", defaultGroup: "514" },
  rohan: { avatar: "👨‍🎨", defaultGroup: "514" },
  akhil: { avatar: "👨‍🔧", defaultGroup: "PG" },
  arunima: { avatar: "👩‍💼", defaultGroup: "PG" },
  amal: { avatar: "👨‍🚀", defaultGroup: "PG" },
  aishwarya: { avatar: "👩‍💻", defaultGroup: "PG" },
};

/**
 * Previews a Cashew CSV export without making any database mutations.
 * Returns statistics, detected entities, duplicate count, and date ranges.
 */
export async function previewCashewCSV(
  csvText: string,
  database: FinanceTrackerDatabase = db,
): Promise<CashewPreviewSummary> {
  const allRows = parseCSV(csvText);
  if (allRows.length <= 1) {
    throw new Error("CSV is empty or does not contain data rows.");
  }

  const dataRows = allRows.slice(1);
  const [existingAccounts, existingCategories, existingPeople, existingTxs] =
    await Promise.all([
      database.accounts.toArray(),
      database.categories.toArray(),
      database.people.toArray(),
      database.transactions.toArray(),
    ]);

  const existingAccountNames = new Set(
    existingAccounts.map((a) => a.name.toLowerCase()),
  );
  const existingCategoryNames = new Set(
    existingCategories.map((c) => c.name.toLowerCase()),
  );
  const existingPeopleNames = new Set(
    existingPeople.map((p) => p.name.toLowerCase()),
  );

  const newAccounts = new Set<string>();
  const newCategories = new Set<string>();
  const newPeople = new Set<string>();

  let duplicateRows = 0;
  let validRows = 0;
  let totalVolume = 0;
  let earliestDate: string | null = null;
  let latestDate: string | null = null;

  for (const row of dataRows) {
    const accountName = row[0]?.trim();
    const amountStr = row[1]?.trim();
    const amountUnpaidStr = row[2]?.trim();
    const rawTitle = row[4]?.trim();
    const rawNote = row[5]?.trim() || "";
    const rawDate = row[6]?.trim();
    const catName = row[9]?.trim();
    const subcatName = row[10]?.trim();

    const amount = roundMoney(
      Math.abs(parseFloat(amountStr) || parseFloat(amountUnpaidStr) || 0),
    );
    if (amount === 0) continue;

    validRows++;
    totalVolume = roundMoney(totalVolume + amount);

    if (accountName && !existingAccountNames.has(accountName.toLowerCase())) {
      newAccounts.add(accountName);
    }
    if (catName && !existingCategoryNames.has(catName.toLowerCase())) {
      newCategories.add(catName);
    }

    // Dynamic person discovery from title, note, or repayment subcategory
    const titleLower = (rawTitle || "").toLowerCase();
    const subcatLower = (subcatName || "").toLowerCase();
    if (subcatLower === "repayment" || subcatLower === "lent") {
      const candidateName = rawTitle ? rawTitle.split(" ")[0].trim() : "";
      if (
        candidateName &&
        !existingPeopleNames.has(candidateName.toLowerCase())
      ) {
        newPeople.add(candidateName);
      }
    }

    if (rawNote) {
      const itemized = Array.from(rawNote.matchAll(/([A-Za-z0-9_-]+)\s*₹/g));
      for (const m of itemized) {
        const name = m[1].trim();
        const lower = name.toLowerCase();
        if (
          lower !== "bony" &&
          lower !== "me" &&
          lower !== "user" &&
          !existingPeopleNames.has(lower)
        ) {
          newPeople.add(name);
        }
      }
    }

    // Check for duplicate transaction in database
    if (rawDate) {
      const parsed = new Date(
        rawDate.replace(" ", "T") + (rawDate.includes("Z") ? "" : "Z"),
      );
      if (!isNaN(parsed.getTime())) {
        const iso = parsed.toISOString();
        if (!earliestDate || iso < earliestDate) earliestDate = iso;
        if (!latestDate || iso > latestDate) latestDate = iso;

        const isDup = existingTxs.some(
          (tx) =>
            Math.abs(tx.amount - amount) < 0.01 &&
            (tx.date === iso || tx.date.slice(0, 10) === iso.slice(0, 10)) &&
            (tx.title.toLowerCase() === titleLower ||
              (rawTitle && tx.title.includes(rawTitle))),
        );
        if (isDup) duplicateRows++;
      }
    }
  }

  return {
    totalRows: dataRows.length,
    validRows,
    duplicateRows,
    newAccounts: Array.from(newAccounts),
    newCategories: Array.from(newCategories),
    newPeople: Array.from(newPeople),
    dateRange:
      earliestDate && latestDate
        ? { start: earliestDate, end: latestDate }
        : null,
    totalVolume,
  };
}

/**
 * Dynamically parses split breakdowns from transaction notes.
 * Supports patterns such as:
 * - "DMart split: Bony ₹282.25, Jithu ₹381.25, Sreerag ₹212.25"
 * - "PG split – Akhil, Sreerag and Bony; ₹70 each"
 * - "Bony ₹180, Alan ₹180, Rijosh ₹170, Jithu ₹204, Sreerag ₹180"
 */
export function parseDynamicSplits(
  note: string,
  totalAmount: number,
  personMap: Map<string, Person>,
): { splits: TransactionSplit[]; userPersonalShare: number } {
  const splits: TransactionSplit[] = [];
  let userPersonalShare = totalAmount;

  // Pattern 1: Equal split indicated by "₹X each"
  const eachMatch = note.match(/₹?([0-9.]+)\s*each/i);
  if (eachMatch) {
    const eachAmount = parseFloat(eachMatch[1]);
    if (!isNaN(eachAmount) && eachAmount > 0) {
      userPersonalShare = eachAmount;
      splits.push({ personId: "user", amount: eachAmount, isSettled: true });

      // Find all friend names mentioned in the note
      for (const [pName, person] of personMap.entries()) {
        const regex = new RegExp(`\\b${pName}\\b`, "i");
        if (regex.test(note)) {
          splits.push({
            personId: person.id,
            amount: eachAmount,
            isSettled: true,
          });
        }
      }

      if (splits.length > 1) {
        return { splits, userPersonalShare };
      }

      // If no friend names matched, check for "for N people" or calculate count from total
      const peopleMatch = note.match(
        /([0-9]+)\s*(?:people|friends|persons|roommates|flatmates)/i,
      );
      const totalCount = peopleMatch
        ? parseInt(peopleMatch[1], 10)
        : Math.round(totalAmount / eachAmount);
      if (totalCount > 1) {
        for (let i = 1; i < totalCount; i++) {
          splits.push({
            personId: `friend_${i}`,
            amount: eachAmount,
            isSettled: true,
          });
        }
        return { splits, userPersonalShare };
      }
    }
  }

  // Pattern 2: Itemized split amounts: Name ₹Amount
  // Matches "Bony ₹282.25", "Jithu ₹381.25", etc.
  const itemizedMatches = Array.from(
    note.matchAll(/([A-Za-z0-9_-]+)\s*₹\s*([0-9.]+)/g),
  );
  if (itemizedMatches.length >= 1) {
    let matchedUser = false;
    for (const match of itemizedMatches) {
      const name = match[1].trim().toLowerCase();
      const share = parseFloat(match[2]);
      if (isNaN(share)) continue;

      if (
        name === "bony" ||
        name === "me" ||
        name === "user" ||
        name === "self"
      ) {
        userPersonalShare = share;
        splits.push({ personId: "user", amount: share, isSettled: true });
        matchedUser = true;
      } else {
        const friend = personMap.get(name);
        if (friend) {
          const isUnpaid =
            note.toLowerCase().includes(`${name} unpaid`) ||
            note.toLowerCase().includes(`${name} due`);
          splits.push({
            personId: friend.id,
            amount: share,
            isSettled: !isUnpaid,
          });
        }
      }
    }

    if (splits.length > 0) {
      if (!matchedUser) {
        const friendTotal = splits.reduce(
          (sum, s) => roundMoney(sum + s.amount),
          0,
        );
        userPersonalShare = Math.max(0, roundMoney(totalAmount - friendTotal));
        splits.unshift({
          personId: "user",
          amount: userPersonalShare,
          isSettled: true,
        });
      }
      if (splits.length > 1) {
        return { splits, userPersonalShare };
      }
    }
  }

  return {
    splits: [{ personId: "user", amount: totalAmount, isSettled: true }],
    userPersonalShare: totalAmount,
  };
}

/**
 * Imports a Cashew CSV export into Dexie.js.
 * Automatically reconciles accounts, taxonomy, friends, and shared bill splits.
 * Detects and skips existing duplicate transactions to prevent double-counting.
 */
export async function importCashewCSV(
  csvText: string,
  database: FinanceTrackerDatabase = db,
): Promise<CashewImportResult> {
  const allRows = parseCSV(csvText);
  if (allRows.length <= 1) {
    throw new Error("CSV is empty or does not contain data rows.");
  }

  // Process rows chronologically (older rows first)
  const dataRows = allRows.slice(1).reverse();

  let accountsAdded = 0;
  let categoriesAdded = 0;
  let subcategoriesAdded = 0;
  let peopleAdded = 0;
  let transactionsAdded = 0;
  let duplicatesSkipped = 0;

  await database.transaction(
    "rw",
    [
      database.accounts,
      database.categories,
      database.subcategories,
      database.people,
      database.groups,
      database.transactions,
    ],
    async () => {
      // 1. Ensure Groups Exist
      let group514 = await database.groups
        .filter((g) => g.name === "514")
        .first();
      if (!group514) {
        group514 = {
          id: "group_514",
          name: "514",
          description: "Room 514 Flatmates",
          memberIds: [],
          defaultSplitType: "equal",
          icon: "Home",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await database.groups.add(group514);
      }

      let groupPG = await database.groups
        .filter((g) => g.name === "PG")
        .first();
      if (!groupPG) {
        groupPG = {
          id: "group_pg",
          name: "PG",
          description: "General PG Community",
          memberIds: [],
          defaultSplitType: "equal",
          icon: "Building",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await database.groups.add(groupPG);
      }

      // 2. Pre-load Existing Entities
      const personMap = new Map<string, Person>();
      const existingPeople = await database.people.toArray();
      for (const p of existingPeople) {
        personMap.set(p.name.toLowerCase(), p);
      }

      const accountMap = new Map<string, Account>();
      const existingAccounts = await database.accounts.toArray();
      for (const acc of existingAccounts) {
        accountMap.set(acc.name.toLowerCase(), acc);
      }

      const categoryMap = new Map<string, Category>();
      const existingCats = await database.categories.toArray();
      for (const c of existingCats) {
        categoryMap.set(c.name.toLowerCase(), c);
      }

      const subcatMap = new Map<string, Subcategory>();
      const existingSubcats = await database.subcategories.toArray();
      for (const s of existingSubcats) {
        subcatMap.set(`${s.categoryId}::${s.name.toLowerCase()}`, s);
      }

      const existingTxs = await database.transactions.toArray();

      // 3. Ensure Accounts Exist
      for (const row of dataRows) {
        const rawAccountName = row[0]?.trim();
        if (!rawAccountName) continue;
        const lowerName = rawAccountName.toLowerCase();

        if (!accountMap.has(lowerName)) {
          let type: AccountType = "bank";
          let color = "#0284c7";
          let icon = "Building2";

          if (lowerName.includes("moneyback") || lowerName.includes("credit")) {
            type = "credit_card";
            color = "#f2b8b5";
            icon = "CreditCard";
          } else if (
            lowerName.includes("wallet") ||
            lowerName.includes("amazon")
          ) {
            type = "wallet";
            color = "#f3b791";
            icon = "Wallet";
          } else if (lowerName.includes("cash")) {
            type = "cash";
            color = "#a8dab5";
            icon = "Banknote";
          } else if (
            lowerName.includes("rd") ||
            lowerName.includes("savings")
          ) {
            if (lowerName.includes("rd")) {
              type = "investment";
              color = "#d0bcff";
              icon = "PiggyBank";
            } else {
              type = "bank";
              color = "#9fd5cb";
              icon = "Landmark";
            }
          }

          const newAccount: Account = {
            id: `acc_${rawAccountName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`,
            name: rawAccountName,
            type,
            balance: 0,
            currency: "INR",
            color,
            icon,
            isArchived: false,
            institution: rawAccountName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await database.accounts.add(newAccount);
          accountMap.set(lowerName, newAccount);
          accountsAdded++;
        }
      }

      // 4. Ensure Categories & Subcategories Exist
      for (const row of dataRows) {
        const catName = row[9]?.trim() || "General";
        const subcatName = row[10]?.trim();
        const lowerCat = catName.toLowerCase();

        let cat = categoryMap.get(lowerCat);
        if (!cat) {
          cat = {
            id: `cat_${catName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`,
            name: catName,
            type: catName.toLowerCase() === "income" ? "income" : "expense",
            icon: "Folder",
            color: "#a8c7fa",
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await database.categories.add(cat);
          categoryMap.set(lowerCat, cat);
          categoriesAdded++;
        }

        if (subcatName) {
          const subKey = `${cat.id}::${subcatName.toLowerCase()}`;
          if (!subcatMap.has(subKey)) {
            const sub: Subcategory = {
              id: `sub_${subcatName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`,
              categoryId: cat.id,
              name: subcatName,
              icon: "Tag",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await database.subcategories.add(sub);
            subcatMap.set(subKey, sub);
            subcategoriesAdded++;
          }
        }
      }

      // Helper to dynamically get or create a Person
      const ensurePerson = async (name: string): Promise<Person> => {
        const cleanName = name.trim();
        const lower = cleanName.toLowerCase();
        let person = personMap.get(lower);
        if (!person) {
          const meta = DEFAULT_PERSON_METADATA[lower] || {
            avatar: "👤",
            defaultGroup: "PG",
          };
          const targetGroup = meta.defaultGroup === "514" ? group514 : groupPG;

          person = {
            id: `person_${lower.replace(/[^a-zA-Z0-9]/g, "_")}`,
            name: cleanName,
            avatar: meta.avatar,
            netBalance: 0,
            groupIds: [targetGroup.id],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await database.people.add(person);
          personMap.set(lower, person);
          peopleAdded++;

          // Add to group memberIds if not present
          if (!targetGroup.memberIds.includes(person.id)) {
            targetGroup.memberIds.push(person.id);
            await database.groups.update(targetGroup.id, {
              memberIds: targetGroup.memberIds,
              updatedAt: new Date().toISOString(),
            });
          }
        }
        return person;
      };

      // Helper to add transaction and synchronously update running balances
      const recordCashewTx = async (tx: Transaction) => {
        await database.transactions.add(tx);
        existingTxs.push(tx);
        transactionsAdded++;

        const { accountDeltas, peopleDeltas } = calculateTransactionDeltas(tx);
        for (const [accId, delta] of accountDeltas.entries()) {
          const acc =
            accountMap.get(accId) || (await database.accounts.get(accId));
          if (acc) {
            const newBal = applyAccountBalanceDelta(
              acc.balance || 0,
              delta,
              acc.type,
            );
            acc.balance = newBal;
            await database.accounts.update(acc.id, {
              balance: newBal,
              updatedAt: new Date().toISOString(),
            });
          }
        }
        for (const [pId, delta] of peopleDeltas.entries()) {
          const person = personMap.get(pId) || (await database.people.get(pId));
          if (person) {
            const newNet = addMoney(person.netBalance || 0, delta);
            person.netBalance = newNet;
            await database.people.update(person.id, {
              netBalance: newNet,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      };

      // 5. Build Transactions
      for (let i = 0; i < dataRows.length; i++) {
        const r = dataRows[i];
        const [
          accountName,
          amountStr,
          amountUnpaidStr,
          ,
          rawTitle,
          rawNote,
          rawDate,
          isIncomeStr,
          ,
          catName,
          subcatName,
        ] = r;

        const note = rawNote || "";
        const title = rawTitle || note.split("\n")[0] || "Transaction";
        const isIncome = isIncomeStr?.toLowerCase() === "true";
        const amount = roundMoney(
          Math.abs(parseFloat(amountStr) || parseFloat(amountUnpaidStr) || 0),
        );
        const account =
          accountMap.get(accountName?.toLowerCase() || "") ||
          existingAccounts[0];
        const cat = categoryMap.get(catName?.toLowerCase() || "");
        const subcat = subcatName
          ? subcatMap.get(`${cat?.id}::${subcatName.toLowerCase()}`)
          : undefined;

        if (amount === 0) continue;

        // Format Date to ISO
        let isoDate = new Date().toISOString();
        if (rawDate) {
          const parsed = new Date(
            rawDate.replace(" ", "T") + (rawDate.includes("Z") ? "" : "Z"),
          );
          if (!isNaN(parsed.getTime())) {
            isoDate = parsed.toISOString();
          }
        }

        // Duplicate Check: Check if transaction already exists
        const isDuplicate = existingTxs.some(
          (tx) =>
            Math.abs(tx.amount - amount) < 0.01 &&
            tx.date === isoDate &&
            tx.title.toLowerCase() === title.trim().toLowerCase(),
        );
        if (isDuplicate) {
          duplicatesSkipped++;
          continue;
        }

        // Detect Internal Transfer
        const isTransfer =
          note.includes("Transferred Balance") ||
          (catName === "Balance Correction" && note.includes("→"));

        if (isTransfer) {
          const isOutflow =
            parseFloat(amountStr) < 0 || note.includes("Transfer Out");
          if (isOutflow) {
            let toAccId: string | undefined = undefined;
            if (note.includes("→")) {
              const destName = note.split("→")[1]?.trim().toLowerCase();
              if (destName) {
                const destAcc = Array.from(accountMap.values()).find((a) =>
                  destName.includes(a.name.toLowerCase()),
                );
                if (destAcc) toAccId = destAcc.id;
              }
            }

            const txType =
              account.type === "bank" && toAccId?.includes("credit")
                ? "credit_card_payment"
                : "transfer";

            const tx: Transaction = {
              id: `tx_cashew_${Date.now()}_${i}`,
              type: txType,
              title: title.trim() || "Internal Account Transfer",
              date: isoDate,
              amount,
              accountId: account.id,
              toAccountId: toAccId,
              personalExpenseAmount: 0,
              isShared: false,
              paidByPersonId: "user",
              splits: [],
              notes: note,
              createdAt: isoDate,
              updatedAt: isoDate,
            };
            await recordCashewTx(tx);
          }
          continue;
        }

        // Detect Friend Settlement / Repayment
        const lowerTitle = title.toLowerCase();
        const lowerSubcat = (subcatName || "").toLowerCase();
        let matchedFriend: Person | undefined = undefined;

        for (const [pName, p] of personMap.entries()) {
          if (lowerTitle.includes(pName) || lowerTitle === pName) {
            matchedFriend = p;
            break;
          }
        }

        // If subcategory is repayment or lent, and no matched friend yet, discover from title
        if (
          !matchedFriend &&
          (lowerSubcat === "repayment" || lowerSubcat === "lent")
        ) {
          const candidateName = title.split(" ")[0].trim();
          if (candidateName && candidateName.length > 1) {
            matchedFriend = await ensurePerson(candidateName);
          }
        }

        if (matchedFriend && (isIncome || lowerSubcat === "repayment")) {
          // FRIEND SETTLEMENT: Zero personal income, zero personal expense
          const tx: Transaction = {
            id: `tx_cashew_${Date.now()}_${i}`,
            type: "settlement_received",
            title: `${matchedFriend.name} Settlement`,
            date: isoDate,
            amount,
            accountId: account.id,
            personalExpenseAmount: 0,
            isShared: false,
            groupId: matchedFriend.groupIds?.[0] || group514.id,
            paidByPersonId: matchedFriend.id,
            splits: [{ personId: matchedFriend.id, amount, isSettled: true }],
            notes: note || `Settlement received from ${matchedFriend.name}`,
            createdAt: isoDate,
            updatedAt: isoDate,
          };
          await recordCashewTx(tx);
          continue;
        }

        // Detect Loan / Lent to friend
        if (
          matchedFriend &&
          (lowerSubcat === "lent" || !!parseFloat(amountUnpaidStr))
        ) {
          const tx: Transaction = {
            id: `tx_cashew_${Date.now()}_${i}`,
            type: "expense",
            title: `${matchedFriend.name} (Lent)`,
            date: isoDate,
            amount,
            accountId: account.id,
            personalExpenseAmount: 0,
            isShared: false,
            paidByPersonId: "user",
            splits: [
              {
                personId: matchedFriend.id,
                amount,
                isSettled: false,
                notes: `Lent to ${matchedFriend.name}`,
              },
            ],
            notes: note || `Lent ₹${amount} to ${matchedFriend.name}`,
            createdAt: isoDate,
            updatedAt: isoDate,
          };
          await recordCashewTx(tx);
          continue;
        }

        // Detect Shared Split Expense dynamically
        const isSharedSplit =
          note.toLowerCase().includes("split") ||
          note.toLowerCase().includes("shared purchase");

        if (isSharedSplit) {
          // Ensure any friends mentioned in the note exist
          for (const word of note.split(/[\s,–:;]+/)) {
            const cleanWord = word.trim().toLowerCase();
            if (
              cleanWord.length > 2 &&
              DEFAULT_PERSON_METADATA[cleanWord] &&
              !personMap.has(cleanWord)
            ) {
              await ensurePerson(word.trim());
            }
          }

          const { splits, userPersonalShare } = parseDynamicSplits(
            note,
            amount,
            personMap,
          );

          const tx: Transaction = {
            id: `tx_cashew_${Date.now()}_${i}`,
            type: "shared_expense",
            title,
            date: isoDate,
            amount,
            accountId: account.id,
            categoryId: cat?.id,
            subcategoryId: subcat?.id,
            personalExpenseAmount: userPersonalShare,
            isShared: true,
            groupId: group514.id,
            paidByPersonId: "user",
            splits:
              splits.length > 0
                ? splits
                : [{ personId: "user", amount, isSettled: true }],
            notes: note,
            createdAt: isoDate,
            updatedAt: isoDate,
          };
          await recordCashewTx(tx);
          continue;
        }

        // Standard Expense or Income
        const tx: Transaction = {
          id: `tx_cashew_${Date.now()}_${i}`,
          type: isIncome ? "income" : "expense",
          title,
          date: isoDate,
          amount,
          accountId: account.id,
          categoryId: cat?.id,
          subcategoryId: subcat?.id,
          personalExpenseAmount: isIncome ? 0 : amount,
          isShared: false,
          paidByPersonId: "user",
          splits: [{ personId: "user", amount, isSettled: true }],
          notes: note,
          createdAt: isoDate,
          updatedAt: isoDate,
        };
        await recordCashewTx(tx);
      }
    },
  );

  // Automatically recalculate and sync account balances and friend net balances from newly imported transactions
  await reconcileAllBalances(database);

  return {
    accountsAdded,
    categoriesAdded,
    subcategoriesAdded,
    peopleAdded,
    transactionsAdded,
    duplicatesSkipped,
  };
}
