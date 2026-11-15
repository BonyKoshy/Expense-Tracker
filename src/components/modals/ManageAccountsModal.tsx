import { useState } from 'react';
import { X, Plus, CreditCard, Landmark, Wallet, Banknote, Edit2, Archive } from 'lucide-react';
import type { Account, AccountType } from '@/types';
import { db } from '@/db';
import { formatINR } from '@/utils/formatters';

interface ManageAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess?: (msg: string) => void;
}

export function ManageAccountsModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: ManageAccountsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balanceStr, setBalanceStr] = useState('');
  const [creditLimitStr, setCreditLimitStr] = useState('');
  const [billingCycleDay, setBillingCycleDay] = useState('15');
  const [paymentDueDay, setPaymentDueDay] = useState('5');
  const [institution, setInstitution] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [isArchived, setIsArchived] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEdit = (acc: Account) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type);
    setBalanceStr(acc.balance.toString());
    setCreditLimitStr(acc.creditLimit ? acc.creditLimit.toString() : '');
    setBillingCycleDay(acc.billingCycleDay ? acc.billingCycleDay.toString() : '15');
    setPaymentDueDay(acc.paymentDueDay ? acc.paymentDueDay.toString() : '5');
    setInstitution(acc.institution || '');
    setAccountNumber(acc.accountNumber || '');
    setColor(acc.color || '#0284c7');
    setIsArchived(acc.isArchived || false);
    setIsDefault(acc.isDefault || false);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('bank');
    setBalanceStr('');
    setCreditLimitStr('');
    setBillingCycleDay('15');
    setPaymentDueDay('5');
    setInstitution('');
    setAccountNumber('');
    setColor('#0284c7');
    setIsArchived(false);
    setIsDefault(false);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter an account name.');
      return;
    }

    const balance = parseFloat(balanceStr) || 0;
    const creditLimit = creditLimitStr ? parseFloat(creditLimitStr) : undefined;

    try {
      if (editingId) {
        await db.accounts.update(editingId, {
          name: name.trim(),
          type,
          balance,
          creditLimit,
          billingCycleDay: parseInt(billingCycleDay) || undefined,
          paymentDueDay: parseInt(paymentDueDay) || undefined,
          institution: institution.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          color,
          isArchived,
          isDefault,
          updatedAt: new Date().toISOString(),
        });
        if (onSuccess) onSuccess(`Account "${name}" updated.`);
      } else {
        const newAccount: Account = {
          id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          type,
          balance,
          creditLimit,
          billingCycleDay: parseInt(billingCycleDay) || undefined,
          paymentDueDay: parseInt(paymentDueDay) || undefined,
          currency: 'INR',
          color,
          icon:
            type === 'credit_card'
              ? 'CreditCard'
              : type === 'cash'
              ? 'Banknote'
              : type === 'wallet'
              ? 'Wallet'
              : 'Landmark',
          isArchived: false,
          isDefault,
          institution: institution.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.accounts.add(newAccount);
        if (onSuccess) onSuccess(`New account "${name}" created.`);
      }
      resetForm();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save account');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">
                Accounts &amp; Wallets Manager
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Add bank accounts, credit cards with statement cycles, and digital wallets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {/* Add / Edit Form */}
          <form
            onSubmit={handleSave}
            className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                {editingId ? 'Edit Account' : 'Add New Account'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., HDFC Salary, Canara Savings"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Account Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="bank">Bank Account</option>
                  <option value="credit_card">Credit Card (Liability)</option>
                  <option value="wallet">Digital Wallet (Amazon Pay, Paytm)</option>
                  <option value="cash">Physical Cash</option>
                  <option value="investment">Investment (RD/MF/Stocks)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {type === 'credit_card' ? 'Current Outstanding (₹)' : 'Current Balance (₹)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={balanceStr}
                  onChange={(e) => setBalanceStr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {type === 'credit_card' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100000"
                    value={creditLimitStr}
                    onChange={(e) => setCreditLimitStr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {type === 'credit_card' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Statement Day (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={billingCycleDay}
                      onChange={(e) => setBillingCycleDay(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Payment Due Day (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={paymentDueDay}
                      onChange={(e) => setPaymentDueDay(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Bank / Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g., HDFC Bank, SBI"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-12 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-400">{color}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700"
                />
                <span>Set as primary default account</span>
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>{editingId ? 'Update Account' : 'Save Account'}</span>
              </button>
            </div>
          </form>

          {/* Existing Accounts List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Existing Accounts ({accounts.length})
            </h3>
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg text-white"
                      style={{ backgroundColor: acc.color }}
                    >
                      {acc.type === 'credit_card' ? (
                        <CreditCard className="h-4 w-4" />
                      ) : acc.type === 'cash' ? (
                        <Banknote className="h-4 w-4" />
                      ) : acc.type === 'wallet' ? (
                        <Wallet className="h-4 w-4" />
                      ) : (
                        <Landmark className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {acc.name}
                        </span>
                        {acc.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                            Default
                          </span>
                        )}
                        {acc.isArchived && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-500">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {acc.institution || acc.type} • Balance: {formatINR(acc.balance)}
                        {acc.creditLimit && ` • Limit: ${formatINR(acc.creditLimit)}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEdit(acc)}
                      title="Edit Account"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        await db.accounts.update(acc.id, {
                          isArchived: !acc.isArchived,
                        });
                      }}
                      title={acc.isArchived ? 'Unarchive' : 'Archive'}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
