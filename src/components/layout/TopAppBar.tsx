import { ArrowLeft, Settings } from 'lucide-react';

export type NavigationTab = 'home' | 'budget' | 'transactions' | 'splits' | 'settings';

interface TopAppBarProps {
  activeTab: NavigationTab;
  previousTab: NavigationTab;
  userName: string;
  recurringCount: number;
  transactionsCount: number;
  peopleCount: number;
  onNavigate: (tab: NavigationTab) => void;
  onBackFromSettings: () => void;
}

export function TopAppBar({
  activeTab,
  userName,
  recurringCount,
  transactionsCount,
  peopleCount,
  onNavigate,
  onBackFromSettings,
}: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#0e0f12]/95 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#1c1d22]">
      {activeTab === 'settings' ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackFromSettings}
            className="p-2 -ml-1 rounded-full hover:bg-[#1a1c22] text-[#e2e2e7] transition-colors flex items-center justify-center"
            title="Go back"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-[#e2e2e7] m-0">
              Settings
            </h1>
            <p className="text-[11px] text-[#90929d] m-0">
              Taxonomy, friends &amp; backups
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#e2e2e7] m-0">
              {activeTab === 'home'
                ? `Hi, ${userName}`
                : activeTab === 'budget'
                ? 'Budget & Commitments'
                : activeTab === 'transactions'
                ? 'Transactions'
                : 'Shared Splits'}
            </h1>
            <p className="text-[11px] text-[#90929d] m-0">
              {activeTab === 'home'
                ? 'Available to Spend & Live Liquidity'
                : activeTab === 'budget'
                ? `${recurringCount} commitments • Accounts & limits`
                : activeTab === 'transactions'
                ? `${transactionsCount} entries across months`
                : `${peopleCount} friends • Group ledgers & GPay`}
            </p>
          </div>
        </div>
      )}

      {/* Clean Right Actions */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16171c] border border-[#23252c] text-[#a8dab5] text-[11px] font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-[#a8dab5]" />
          <span>On-Device</span>
        </div>

        {activeTab !== 'settings' && (
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="p-2.5 rounded-full bg-[#16171c] hover:bg-[#202228] text-[#c4c6cf] hover:text-[#e2e2e7] border border-[#23252c] transition-colors active:scale-95"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}
