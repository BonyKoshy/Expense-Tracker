import {
  Users,
  Tags,
  Repeat,
  ShieldCheck,
  RefreshCw,
  Plus,
  ChevronRight,
  Landmark,
  UserPlus,
  FolderPlus,
  HardDriveDownload,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Group,
  RecurringCommitment,
} from '@/types';

interface SettingsViewProps {
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  people: Person[];
  groups: Group[];
  recurringCommitments: RecurringCommitment[];
  onOpenAccounts: () => void;
  onOpenPeople: () => void;
  onOpenCategories: () => void;
  onOpenRecurring: () => void;
  onOpenBackup: () => void;
  onOpenCashewImport?: () => void;
  onResetData: () => void;
}

export function SettingsView({
  accounts,
  categories,
  subcategories,
  people,
  groups,
  recurringCommitments,
  onOpenAccounts,
  onOpenPeople,
  onOpenCategories,
  onOpenRecurring,
  onOpenBackup,
  onOpenCashewImport,
  onResetData,
}: SettingsViewProps) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-6">
      {/* Group 1: Financial & Entity Management */}
      <div className="bg-[#1e2026] border border-[#2d3139] rounded-[28px] overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-[#2d3139]/60">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a8c7fa]">
            Entity &amp; Taxonomy Management
          </span>
        </div>

        <div className="divide-y divide-[#282a30]">
          {/* Accounts & Cards */}
          <div
            onClick={onOpenAccounts}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#282a30]/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#282a30] text-[#a8c7fa] flex items-center justify-center shrink-0 border border-[#33353c]">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e9] group-hover:text-[#a8c7fa] transition-colors">
                  Accounts &amp; Cards
                </div>
                <div className="text-xs text-[#8e9099] mt-0.5">
                  {accounts.length} accounts configured • Bank accounts, credit cards, wallets
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAccounts();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#282a30] hover:bg-[#33353c] text-[#d3e3fd] text-xs font-medium border border-[#33353c] transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-[#a8c7fa]" />
                <span>Add Account</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#8e9099] group-hover:text-[#e2e2e9] transition-colors" />
            </div>
          </div>

          {/* People & Groups */}
          <div
            onClick={onOpenPeople}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#282a30]/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#282a30] text-[#ffb77c] flex items-center justify-center shrink-0 border border-[#33353c]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e9] group-hover:text-[#ffb77c] transition-colors">
                  Friends &amp; GPay Groups
                </div>
                <div className="text-xs text-[#8e9099] mt-0.5">
                  {people.length} friends, {groups.length} groups (e.g. `514`, `PG`) • UPI handles
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPeople();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#282a30] hover:bg-[#33353c] text-[#ffb77c] text-xs font-medium border border-[#33353c] transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Friend</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#8e9099] group-hover:text-[#e2e2e9] transition-colors" />
            </div>
          </div>

          {/* Categories & Subcategories */}
          <div
            onClick={onOpenCategories}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#282a30]/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#282a30] text-[#a8dab5] flex items-center justify-center shrink-0 border border-[#33353c]">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e9] group-hover:text-[#a8dab5] transition-colors">
                  Categories &amp; Subcategories
                </div>
                <div className="text-xs text-[#8e9099] mt-0.5">
                  {categories.length} categories, {subcategories.length} subcategories (Tea, Snacks, Mess, etc.)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCategories();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#282a30] hover:bg-[#33353c] text-[#a8dab5] text-xs font-medium border border-[#33353c] transition-colors"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>Add Category</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#8e9099] group-hover:text-[#e2e2e9] transition-colors" />
            </div>
          </div>

          {/* Recurring Commitments */}
          <div
            onClick={onOpenRecurring}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#282a30]/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#282a30] text-[#d0bcff] flex items-center justify-center shrink-0 border border-[#33353c]">
                <Repeat className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e9] group-hover:text-[#d0bcff] transition-colors">
                  Recurring Commitments &amp; EMIs
                </div>
                <div className="text-xs text-[#8e9099] mt-0.5">
                  {recurringCommitments.length} commitments • Phone EMIs (6M), 2-Year RDs, PG Rent
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenRecurring();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#282a30] hover:bg-[#33353c] text-[#d0bcff] text-xs font-medium border border-[#33353c] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Commitment</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#8e9099] group-hover:text-[#e2e2e9] transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Group 2: Backup, Data & Security */}
      <div className="bg-[#1e2026] border border-[#2d3139] rounded-[28px] overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-[#2d3139]/60">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a8c7fa]">
            Security &amp; Local Storage
          </span>
        </div>

        <div className="divide-y divide-[#282a30]">
          {/* Encrypted Backup */}
          <div
            onClick={onOpenBackup}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#282a30]/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#1e2a22] text-[#a8dab5] flex items-center justify-center shrink-0 border border-[#2e4d38]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e9] group-hover:text-[#a8dab5] transition-colors">
                  Encrypted Backup &amp; Restore
                </div>
                <div className="text-xs text-[#8e9099] mt-0.5">
                  Web Crypto API AES-GCM 256-bit password-protected JSON export &amp; import
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBackup();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e2a22] hover:bg-[#28382d] text-[#a8dab5] text-xs font-medium border border-[#2e4d38] transition-colors"
              >
                <HardDriveDownload className="h-3.5 w-3.5" />
                <span>Backup</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#8e9099] group-hover:text-[#e2e2e9] transition-colors" />
            </div>
          </div>

          {/* Import Cashew CSV */}
          <div
            onClick={onOpenCashewImport || onOpenBackup}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#282a30]/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#14231b] text-[#a8dab5] flex items-center justify-center shrink-0 border border-[#234b32]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e9] group-hover:text-[#a8dab5] transition-colors">
                  Import Cashew CSV Export
                </div>
                <div className="text-xs text-[#8e9099] mt-0.5">
                  Migrate transactions from cashew-*.csv, automatically fixing shared PG splits and friend repayments
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenCashewImport) onOpenCashewImport();
                  else onOpenBackup();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#14231b] hover:bg-[#1e3629] text-[#a8dab5] text-xs font-medium border border-[#234b32] transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#8e9099] group-hover:text-[#e2e2e9] transition-colors" />
            </div>
          </div>

          {/* Reset Database */}
          <div
            onClick={onResetData}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#282a30]/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#371e1d] text-[#ffb4ab] flex items-center justify-center shrink-0 border border-[#60201f]">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e9] group-hover:text-[#ffb4ab] transition-colors">
                  Reset to Default PG Demo State
                </div>
                <div className="text-xs text-[#8e9099] mt-0.5">
                  Restores initial accounts, categories, groups `514` &amp; `PG`, and sample split
                </div>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-[#8e9099] group-hover:text-[#e2e2e9] transition-colors" />
          </div>
        </div>
      </div>

      {/* Group 3: App Architecture Information */}
      <div className="bg-[#1e2026] border border-[#2d3139] rounded-[28px] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-[#282a30] text-[#a8c7fa] flex items-center justify-center">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e2e9] m-0">
              FinTrack PWA Architecture
            </h3>
            <span className="text-[11px] text-[#8e9099]">
              Android 17 Material 3 • Dexie.js (IndexedDB) • Local-First
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#2d3139] text-xs">
          <div className="bg-[#191b20] p-2.5 rounded-2xl border border-[#282a30]">
            <div className="text-[#8e9099] text-[10px]">Database Engine</div>
            <div className="text-[#e2e2e9] font-medium mt-0.5">Dexie.js v4</div>
          </div>
          <div className="bg-[#191b20] p-2.5 rounded-2xl border border-[#282a30]">
            <div className="text-[#8e9099] text-[10px]">Data Privacy</div>
            <div className="text-[#a8dab5] font-medium mt-0.5">100% On-Device</div>
          </div>
          <div className="bg-[#191b20] p-2.5 rounded-2xl border border-[#282a30] col-span-2 sm:col-span-1">
            <div className="text-[#8e9099] text-[10px]">PWA Status</div>
            <div className="text-[#d3e3fd] font-medium mt-0.5">Offline Ready</div>
          </div>
        </div>
      </div>
    </div>
  );
}
