import { db, type FinanceTrackerDatabase } from '@/db';
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Transaction,
  TransactionSplit,
  AccountType,
} from '@/types';

export interface CashewImportResult {
  accountsAdded: number;
  categoriesAdded: number;
  subcategoriesAdded: number;
  peopleAdded: number;
  transactionsAdded: number;
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
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
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 1 || currentRow[0] !== '') {
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

const KNOWN_PEOPLE = [
  { name: 'Rijosh', avatar: '👨‍💻', group: '514' },
  { name: 'Jithu', avatar: '👨‍🎓', group: '514' },
  { name: 'Sreerag', avatar: '👨‍💼', group: '514' },
  { name: 'Alan', avatar: '👨‍🔬', group: '514' },
  { name: 'Rohan', avatar: '👨‍🎨', group: '514' },
  { name: 'Akhil', avatar: '👨‍🔧', group: 'PG' },
  { name: 'Arunima', avatar: '👩‍💼', group: 'PG' },
  { name: 'Amal', avatar: '👨‍🚀', group: 'PG' },
  { name: 'Aishwarya', avatar: '👩‍💻', group: 'PG' },
];

export async function importCashewCSV(
  csvText: string,
  database: FinanceTrackerDatabase = db
): Promise<CashewImportResult> {
  const allRows = parseCSV(csvText);
  if (allRows.length <= 1) {
    throw new Error('CSV is empty or does not contain data rows.');
  }

  // Row format: account, amount, amount unpaid, currency, title, note, date, income, type, category name, subcategory name, color, icon, emoji, budget, objective, extra
  const dataRows = allRows.slice(1).reverse(); // Process chronologically

  let accountsAdded = 0;
  let categoriesAdded = 0;
  let subcategoriesAdded = 0;
  let peopleAdded = 0;
  let transactionsAdded = 0;

  await database.transaction(
    'rw',
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
      let group514 = await database.groups.filter((g) => g.name === '514').first();
      if (!group514) {
        group514 = {
          id: 'group_514',
          name: '514',
          description: 'Room 514 Flatmates',
          memberIds: [],
          defaultSplitType: 'equal',
          icon: 'Home',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await database.groups.add(group514);
      }

      let groupPG = await database.groups.filter((g) => g.name === 'PG').first();
      if (!groupPG) {
        groupPG = {
          id: 'group_pg',
          name: 'PG',
          description: 'General PG Community',
          memberIds: [],
          defaultSplitType: 'equal',
          icon: 'Building',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await database.groups.add(groupPG);
      }

      // 2. Ensure Known People Exist
      const personMap = new Map<string, Person>();
      const existingPeople = await database.people.toArray();
      for (const p of existingPeople) {
        personMap.set(p.name.toLowerCase(), p);
      }

      for (const kp of KNOWN_PEOPLE) {
        if (!personMap.has(kp.name.toLowerCase())) {
          const newPerson: Person = {
            id: `person_${kp.name.toLowerCase()}`,
            name: kp.name,
            avatar: kp.avatar,
            netBalance: 0,
            groupIds: kp.group === '514' ? [group514.id, groupPG.id] : [groupPG.id],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await database.people.add(newPerson);
          personMap.set(kp.name.toLowerCase(), newPerson);
          peopleAdded++;
        }
      }

      // 3. Ensure Accounts Exist
      const accountMap = new Map<string, Account>();
      const existingAccounts = await database.accounts.toArray();
      for (const acc of existingAccounts) {
        accountMap.set(acc.name.toLowerCase(), acc);
      }

      for (const row of dataRows) {
        const rawAccountName = row[0]?.trim();
        if (!rawAccountName) continue;
        const lowerName = rawAccountName.toLowerCase();

        if (!accountMap.has(lowerName)) {
          let type: AccountType = 'bank';
          let color = '#0284c7';
          let icon = 'Building2';

          if (lowerName.includes('moneyback') || lowerName.includes('credit')) {
            type = 'credit_card';
            color = '#e11d48';
            icon = 'CreditCard';
          } else if (lowerName.includes('wallet') || lowerName.includes('amazon')) {
            type = 'wallet';
            color = '#ea580c';
            icon = 'Wallet';
          } else if (lowerName.includes('cash')) {
            type = 'cash';
            color = '#16a34a';
            icon = 'Banknote';
          } else if (lowerName.includes('rd') || lowerName.includes('savings')) {
            if (lowerName.includes('rd')) {
              type = 'investment';
              color = '#8b5cf6';
              icon = 'PiggyBank';
            } else {
              type = 'bank';
              color = '#0d9488';
              icon = 'Landmark';
            }
          }

          const newAccount: Account = {
            id: `acc_${rawAccountName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
            name: rawAccountName,
            type,
            balance: 0,
            currency: 'INR',
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

      for (const row of dataRows) {
        const catName = row[9]?.trim() || 'General';
        const subcatName = row[10]?.trim();
        const lowerCat = catName.toLowerCase();

        let cat = categoryMap.get(lowerCat);
        if (!cat) {
          cat = {
            id: `cat_${catName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
            name: catName,
            type: catName.toLowerCase() === 'income' ? 'income' : 'expense',
            icon: 'Folder',
            color: '#a8c7fa',
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
              id: `sub_${subcatName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
              categoryId: cat.id,
              name: subcatName,
              icon: 'Tag',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await database.subcategories.add(sub);
            subcatMap.set(subKey, sub);
            subcategoriesAdded++;
          }
        }
      }

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

        const note = rawNote || '';
        const title = rawTitle || note.split('\n')[0] || 'Transaction';
        const isIncome = isIncomeStr?.toLowerCase() === 'true';
        const amount = Math.abs(parseFloat(amountStr) || parseFloat(amountUnpaidStr) || 0);
        const account = accountMap.get(accountName?.toLowerCase() || '') || existingAccounts[0];
        const cat = categoryMap.get(catName?.toLowerCase() || '');
        const subcat = subcatName ? subcatMap.get(`${cat?.id}::${subcatName.toLowerCase()}`) : undefined;

        // Skip balance correction duplicate rows if amount is zero
        if (amount === 0) continue;

        // Format Date to ISO
        let isoDate = new Date().toISOString();
        if (rawDate) {
          const parsed = new Date(rawDate.replace(' ', 'T') + (rawDate.includes('Z') ? '' : 'Z'));
          if (!isNaN(parsed.getTime())) {
            isoDate = parsed.toISOString();
          }
        }

        // Detect if this is an internal transfer
        const isTransfer =
          note.includes('Transferred Balance') ||
          (catName === 'Balance Correction' && note.includes('→'));

        if (isTransfer) {
          // If note contains "A → B", let's check direction
          // Only add transfer once (from the outgoing side where amount was negative in CSV)
          const isOutflow = parseFloat(amountStr) < 0 || note.includes('Transfer Out');
          if (isOutflow) {
            // Find destination account from note
            let toAccId: string | undefined = undefined;
            if (note.includes('→')) {
              const destName = note.split('→')[1]?.trim().toLowerCase();
              if (destName) {
                const destAcc = Array.from(accountMap.values()).find((a) =>
                  destName.includes(a.name.toLowerCase())
                );
                if (destAcc) toAccId = destAcc.id;
              }
            }

            const txType =
              account.type === 'bank' && toAccId?.includes('credit')
                ? 'credit_card_payment'
                : 'transfer';

            const tx: Transaction = {
              id: `tx_cashew_${Date.now()}_${i}`,
              type: txType,
              title: title.trim() || 'Internal Account Transfer',
              date: isoDate,
              amount,
              accountId: account.id,
              toAccountId: toAccId,
              personalExpenseAmount: 0,
              isShared: false,
              paidByPersonId: 'user',
              splits: [],
              notes: note,
              createdAt: isoDate,
              updatedAt: isoDate,
            };
            await database.transactions.add(tx);
            transactionsAdded++;
          }
          continue;
        }

        // Detect Settlement / Repayment from friend
        const lowerTitle = title.toLowerCase();
        const lowerSubcat = (subcatName || '').toLowerCase();
        let matchedFriend: Person | undefined = undefined;

        for (const [pName, p] of personMap.entries()) {
          if (lowerTitle.includes(pName) || lowerTitle === pName) {
            matchedFriend = p;
            break;
          }
        }

        if (matchedFriend && (isIncome || lowerSubcat === 'repayment')) {
          // FRIEND SETTLEMENT (zero personal income, zero personal expense)
          const tx: Transaction = {
            id: `tx_cashew_${Date.now()}_${i}`,
            type: 'settlement_received',
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
          await database.transactions.add(tx);
          transactionsAdded++;
          continue;
        }

        // Detect Loan / Lent to friend
        if (matchedFriend && (lowerSubcat === 'lent' || !!parseFloat(amountUnpaidStr))) {
          const tx: Transaction = {
            id: `tx_cashew_${Date.now()}_${i}`,
            type: 'expense',
            title: `${matchedFriend.name} (Lent)`,
            date: isoDate,
            amount,
            accountId: account.id,
            personalExpenseAmount: 0, // Not a personal consumption expense
            isShared: false,
            paidByPersonId: 'user',
            splits: [{ personId: matchedFriend.id, amount, isSettled: false, notes: `Lent to ${matchedFriend.name}` }],
            notes: note || `Lent ₹${amount} to ${matchedFriend.name}`,
            createdAt: isoDate,
            updatedAt: isoDate,
          };
          await database.transactions.add(tx);
          transactionsAdded++;
          continue;
        }

        // Detect Shared Split Expense
        const isSharedSplit =
          note.toLowerCase().includes('split') ||
          note.toLowerCase().includes('shared purchase');

        if (isSharedSplit) {
          const splits: TransactionSplit[] = [];
          let userPersonalShare = amount;

          // Check if specific breakdown exists in note
          // e.g. "DMart purchase split: Bony ₹282.25, Jithu ₹381.25, Sreerag ₹212.25, Alan ₹99, Rijosh ₹530.25. Rijosh unpaid."
          // or "Dinner split – Bony ₹180, Alan ₹180, Rijosh ₹170, Jithu ₹204, Sreerag ₹180. All paid."
          // or "PG split – Akhil, Sreerag and Bony; ₹70 each. All settled."
          if (note.includes('₹70 each')) {
            userPersonalShare = 70;
            const akhil = personMap.get('akhil');
            const sreerag = personMap.get('sreerag');
            splits.push({ personId: 'user', amount: 70, isSettled: true });
            if (akhil) splits.push({ personId: akhil.id, amount: 70, isSettled: true });
            if (sreerag) splits.push({ personId: sreerag.id, amount: 70, isSettled: true });
          } else if (note.includes('₹43.75 each')) {
            userPersonalShare = 43.75;
            splits.push({ personId: 'user', amount: 43.75, isSettled: true });
            for (const name of ['rijosh', 'jithu', 'rohan']) {
              const p = personMap.get(name);
              if (p) splits.push({ personId: p.id, amount: 43.75, isSettled: true });
            }
          } else if (note.includes('DMart purchase split')) {
            userPersonalShare = 282.25;
            splits.push({ personId: 'user', amount: 282.25, isSettled: true });
            if (personMap.get('jithu')) splits.push({ personId: personMap.get('jithu')!.id, amount: 381.25, isSettled: true });
            if (personMap.get('sreerag')) splits.push({ personId: personMap.get('sreerag')!.id, amount: 212.25, isSettled: true });
            if (personMap.get('alan')) splits.push({ personId: personMap.get('alan')!.id, amount: 99.00, isSettled: true });
            if (personMap.get('rijosh')) splits.push({ personId: personMap.get('rijosh')!.id, amount: 530.25, isSettled: false });
          } else if (note.includes('Pepper Leaf') || note.includes('Dinner split')) {
            userPersonalShare = 180;
            splits.push({ personId: 'user', amount: 180, isSettled: true });
            if (personMap.get('alan')) splits.push({ personId: personMap.get('alan')!.id, amount: 180, isSettled: true });
            if (personMap.get('rijosh')) splits.push({ personId: personMap.get('rijosh')!.id, amount: 170, isSettled: true });
            if (personMap.get('jithu')) splits.push({ personId: personMap.get('jithu')!.id, amount: 204, isSettled: true });
            if (personMap.get('sreerag')) splits.push({ personId: personMap.get('sreerag')!.id, amount: 180, isSettled: true });
          } else if (note.includes('Fresh Town')) {
            userPersonalShare = 345;
            splits.push({ personId: 'user', amount: 345, isSettled: true });
            if (personMap.get('jithu')) splits.push({ personId: personMap.get('jithu')!.id, amount: 345, isSettled: true });
            if (personMap.get('rijosh')) splits.push({ personId: personMap.get('rijosh')!.id, amount: 345, isSettled: false });
          }

          const tx: Transaction = {
            id: `tx_cashew_${Date.now()}_${i}`,
            type: 'shared_expense',
            title,
            date: isoDate,
            amount,
            accountId: account.id,
            categoryId: cat?.id,
            subcategoryId: subcat?.id,
            personalExpenseAmount: userPersonalShare,
            isShared: true,
            groupId: group514.id,
            paidByPersonId: 'user',
            splits: splits.length > 0 ? splits : [{ personId: 'user', amount, isSettled: true }],
            notes: note,
            createdAt: isoDate,
            updatedAt: isoDate,
          };
          await database.transactions.add(tx);
          transactionsAdded++;
          continue;
        }

        // Standard Expense or Income
        const tx: Transaction = {
          id: `tx_cashew_${Date.now()}_${i}`,
          type: isIncome ? 'income' : 'expense',
          title,
          date: isoDate,
          amount,
          accountId: account.id,
          categoryId: cat?.id,
          subcategoryId: subcat?.id,
          personalExpenseAmount: isIncome ? 0 : amount,
          isShared: false,
          paidByPersonId: 'user',
          splits: [{ personId: 'user', amount, isSettled: true }],
          notes: note,
          createdAt: isoDate,
          updatedAt: isoDate,
        };
        await database.transactions.add(tx);
        transactionsAdded++;
      }
    }
  );

  return {
    accountsAdded,
    categoriesAdded,
    subcategoriesAdded,
    peopleAdded,
    transactionsAdded,
  };
}
