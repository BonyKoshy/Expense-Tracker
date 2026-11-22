import { useState } from "react";
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
  PiggyBank,
  Smartphone,
  Download,
  CheckCircle2,
  Save,
  Bell,
  BellRing,
  Clock,
  AlertCircle,
  Check,
} from "lucide-react";
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Group,
  RecurringCommitment,
} from "@/types";
import { formatINR } from "@/utils/formatters";
import {
  getReminderSettings,
  saveReminderSettings,
  requestNotificationPermission,
  sendTestNotification,
  getNotificationPermission,
  isNotificationSupported,
  type NotificationPermissionState,
} from "@/utils/notifications";

interface SettingsViewProps {
  userName?: string;
  onEditName?: () => void;
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  people: Person[];
  groups: Group[];
  recurringCommitments: RecurringCommitment[];
  overallMonthlyBudget: number;
  onUpdateOverallBudget: (amount: number) => void;
  onUpdateCategoryBudget: (categoryId: string, monthlyBudget: number) => void;
  installPrompt?: any;
  isAppInstalled?: boolean;
  onInstallApp?: () => void;
  onOpenAccounts: () => void;
  onOpenPeople: () => void;
  onOpenCategories: () => void;
  onOpenRecurring: () => void;
  onOpenBackup: () => void;
  onOpenCashewImport?: () => void;
  onResetData: () => void;
}

export function SettingsView({
  userName,
  onEditName,
  accounts,
  categories,
  subcategories,
  people,
  groups,
  recurringCommitments,
  overallMonthlyBudget,
  onUpdateOverallBudget,
  onUpdateCategoryBudget,
  installPrompt,
  isAppInstalled,
  onInstallApp,
  onOpenAccounts,
  onOpenPeople,
  onOpenCategories,
  onOpenRecurring,
  onOpenBackup,
  onOpenCashewImport,
  onResetData,
}: SettingsViewProps) {
  // Local state for editing overall monthly budget
  const [editingOverallBudget, setEditingOverallBudget] = useState(
    overallMonthlyBudget.toString(),
  );
  const [overallSaved, setOverallSaved] = useState(false);

  // Local state for per-category budgets
  const [categoryBudgetInputs, setCategoryBudgetInputs] = useState<
    Record<string, string>
  >(() => {
    const map: Record<string, string> = {};
    for (const cat of categories) {
      if (cat.type === "expense") {
        map[cat.id] = (cat.monthlyBudget || 0).toString();
      }
    }
    return map;
  });
  const [savedCategoryId, setSavedCategoryId] = useState<string | null>(null);

  const handleSaveOverallBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(editingOverallBudget) || 0;
    onUpdateOverallBudget(val);
    setOverallSaved(true);
    setTimeout(() => setOverallSaved(false), 2500);
  };

  const handleCategoryInputChange = (catId: string, val: string) => {
    setCategoryBudgetInputs((prev) => ({ ...prev, [catId]: val }));
  };

  const handleSaveCategoryBudget = (catId: string) => {
    const val = parseFloat(categoryBudgetInputs[catId] || "0") || 0;
    onUpdateCategoryBudget(catId, val);
    setSavedCategoryId(catId);
    setTimeout(() => setSavedCategoryId(null), 2000);
  };

  // Push Notification Reminder state
  const [reminderSettings, setReminderSettings] = useState(() =>
    getReminderSettings(),
  );
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>(() => getNotificationPermission());
  const [testNotificationStatus, setTestNotificationStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });
  const [timeSavedNotice, setTimeSavedNotice] = useState(false);

  const handleToggleReminder = async () => {
    if (!isNotificationSupported()) {
      setTestNotificationStatus({
        type: "error",
        message: "Push notifications are not supported in this browser.",
      });
      return;
    }

    if (!reminderSettings.enabled) {
      let perm = getNotificationPermission();
      if (perm !== "granted") {
        perm = await requestNotificationPermission();
        setPermissionState(perm);
      }

      if (perm === "granted") {
        const updated = saveReminderSettings({ enabled: true });
        setReminderSettings(updated);
        setTestNotificationStatus({
          type: "success",
          message: `Daily reminder enabled for ${updated.time}!`,
        });
        setTimeout(
          () => setTestNotificationStatus({ type: null, message: "" }),
          4000,
        );
      } else if (perm === "denied") {
        setTestNotificationStatus({
          type: "error",
          message:
            "Notifications are blocked in your browser or phone settings.",
        });
      }
    } else {
      const updated = saveReminderSettings({ enabled: false });
      setReminderSettings(updated);
      setTestNotificationStatus({
        type: "success",
        message: "Daily reminder turned off.",
      });
      setTimeout(
        () => setTestNotificationStatus({ type: null, message: "" }),
        3000,
      );
    }
  };

  const handleTimeChange = (newTime: string) => {
    if (!newTime) return;
    const updated = saveReminderSettings({ time: newTime });
    setReminderSettings(updated);
    setTimeSavedNotice(true);
    setTimeout(() => setTimeSavedNotice(false), 2000);
  };

  const handleSendTestNotification = async () => {
    setTestNotificationStatus({
      type: "loading",
      message: "Sending test notification...",
    });
    const res = await sendTestNotification();
    const currentPerm = getNotificationPermission();
    setPermissionState(currentPerm);

    if (res.success) {
      setTestNotificationStatus({
        type: "success",
        message: "Test notification sent! Check your notification shade.",
      });
    } else {
      setTestNotificationStatus({
        type: "error",
        message: res.message,
      });
    }
    setTimeout(() => {
      setTestNotificationStatus((prev) =>
        prev.type === "loading" ? { type: null, message: "" } : prev,
      );
    }, 6000);
  };

  // Calculate sum of category budgets
  const sumOfCategoryBudgets = categories
    .filter((c) => c.type === "expense")
    .reduce((sum, c) => {
      const inputVal = categoryBudgetInputs[c.id];
      const val =
        inputVal !== undefined
          ? parseFloat(inputVal) || 0
          : c.monthlyBudget || 0;
      return sum + val;
    }, 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-6">
      {/* 1. Profile & Name Card */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#1a2536] text-[#d3e3fd] flex items-center justify-center font-bold text-lg border border-[#2e405b]">
            {userName ? userName.charAt(0).toUpperCase() : "B"}
          </div>
          <div>
            <div className="text-sm font-semibold text-[#e2e2e7]">
              Hi, {userName || "Bony"}
            </div>
            <div className="text-xs text-[#90929d] mt-0.5">
              Personal Profile • Customized App Greeting
            </div>
          </div>
        </div>

        {onEditName && (
          <button
            type="button"
            onClick={onEditName}
            className="px-3.5 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-xs font-medium text-[#e2e2e7] border border-[#262830] transition-colors"
          >
            Change Name
          </button>
        )}
      </div>

      {/* 2. Android PWA Test Version Installer Card */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#1a2536] text-[#a8c7fa] flex items-center justify-center shrink-0 border border-[#2e405b]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#e2e2e7]">
                Android PWA App (v1.0 Test Version)
              </div>
              <div className="text-xs text-[#90929d] mt-0.5">
                Install as a standalone native-like Android app on your phone
              </div>
            </div>
          </div>

          {isAppInstalled ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#15241b] text-[#a8dab5] text-xs font-medium border border-[#223a2b]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Installed (Standalone)</span>
            </div>
          ) : installPrompt && onInstallApp ? (
            <button
              type="button"
              onClick={onInstallApp}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#062e6f] text-xs font-semibold shadow-md active:scale-95 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Install Android App</span>
            </button>
          ) : (
            <span className="text-[11px] text-[#90929d] bg-[#111216] px-2.5 py-1 rounded-full border border-[#1e2026]">
              Add via Chrome Menu ⋮ &gt; Install App
            </span>
          )}
        </div>
      </div>

      {/* 3. Daily Expense Reminder (Push Notifications) */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#23252c]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#261f36] text-[#d0bcff] flex items-center justify-center shrink-0 border border-[#392c4b]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
                  Daily Expense Reminder
                </h3>
                {reminderSettings.enabled && permissionState === "granted" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#15241b] text-[#a8dab5] border border-[#223a2b]">
                    Active at {reminderSettings.time}
                  </span>
                ) : permissionState === "denied" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#2b1b1d] text-[#f2b8b5] border border-[#48282b]">
                    Blocked
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#111216] text-[#90929d] border border-[#1e2026]">
                    Off
                  </span>
                )}
              </div>
              <p className="text-xs text-[#90929d] mt-0.5">
                On-device daily notification reminding you to record
                today&apos;s spending &amp; PG splits
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={reminderSettings.enabled}
            onClick={handleToggleReminder}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              reminderSettings.enabled && permissionState === "granted"
                ? "bg-[#a8c7fa]"
                : "bg-[#23252c]"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                reminderSettings.enabled && permissionState === "granted"
                  ? "translate-x-5 bg-[#062e6f]"
                  : "translate-x-0 bg-[#90929d]"
              }`}
            />
          </button>
        </div>

        {/* Time Selector & Controls */}
        <div className="space-y-3">
          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#a8c7fa]" />
                <span className="text-xs font-semibold text-[#e2e2e7]">
                  Reminder Time
                </span>
                {timeSavedNotice && (
                  <span className="text-[10px] text-[#a8dab5] font-medium flex items-center gap-1 animate-pulse">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#90929d] mt-0.5">
                Choose the best time each evening to log your expenses
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="time"
                value={reminderSettings.time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="bg-[#16171c] border border-[#23252c] focus:border-[#a8c7fa] rounded-full px-3 py-1.5 text-xs font-mono text-[#e2e2e7] focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-[#90929d] mr-1">
              Quick Presets:
            </span>
            {[
              { label: "8:00 PM", value: "20:00" },
              { label: "9:00 PM (Default)", value: "21:00" },
              { label: "10:00 PM", value: "22:00" },
              { label: "11:00 PM", value: "23:00" },
            ].map((preset) => {
              const isSelected = reminderSettings.time === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleTimeChange(preset.value)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all ${
                    isSelected
                      ? "bg-[#1a2536] text-[#a8c7fa] border-[#2e405b]"
                      : "bg-[#111216] text-[#90929d] border-[#1e2026] hover:text-[#e2e2e7] hover:border-[#262830]"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Notification Actions & Status Banner */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendTestNotification}
                className="px-4 py-2 rounded-full bg-[#1a2536] hover:bg-[#223147] text-[#d3e3fd] text-xs font-semibold border border-[#2e405b] flex items-center gap-2 transition-all active:scale-95"
              >
                <BellRing className="h-4 w-4 text-[#a8c7fa]" />
                <span>Send Test Notification</span>
              </button>
            </div>

            {testNotificationStatus.type && (
              <div
                className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
                  testNotificationStatus.type === "success"
                    ? "bg-[#15241b] text-[#a8dab5] border-[#223a2b]"
                    : testNotificationStatus.type === "error"
                      ? "bg-[#2b1b1d] text-[#f2b8b5] border-[#48282b]"
                      : "bg-[#1a1c22] text-[#d3e3fd] border-[#262830]"
                }`}
              >
                {testNotificationStatus.type === "success" && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                )}
                {testNotificationStatus.type === "error" && (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{testNotificationStatus.message}</span>
              </div>
            )}
          </div>

          {/* Permission Blocked Warning */}
          {permissionState === "denied" && (
            <div className="bg-[#2b1b1d] border border-[#48282b] rounded-2xl p-3 flex items-start gap-2.5 text-xs text-[#f2b8b5]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#f2b8b5]" />
              <div className="space-y-1">
                <div className="font-semibold">Notifications are blocked</div>
                <div className="text-[11px] text-[#f2b8b5]/80">
                  Your browser or phone is blocking notifications for FinTrack.
                  To enable reminders: tap the lock or site settings icon in the
                  Chrome URL bar (or open Android Settings &gt; Apps &gt;
                  FinTrack &gt; Notifications) and set to <strong>Allow</strong>
                  .
                </div>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="text-[11px] text-[#90929d] flex items-center gap-1.5 pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#a8dab5] shrink-0" />
            <span>
              100% On-Device: No external servers or telemetry are used.
              Scheduled locally on your device.
            </span>
          </div>
        </div>
      </div>

      {/* 4. Monthly Budgets & Category Limits Configuration */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#23252c]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#15241b] text-[#a8dab5] flex items-center justify-center shrink-0 border border-[#223a2b]">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
                Monthly Spending Budgets &amp; Limits
              </h3>
              <p className="text-xs text-[#90929d] mt-0.5">
                Configure your overall monthly spend ceiling and individual
                category budgets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#90929d]">Sum of categories:</span>
            <span className="font-mono font-semibold text-[#e2e2e7]">
              {formatINR(sumOfCategoryBudgets)}
            </span>
          </div>
        </div>

        {/* Overall Monthly Spend Target Input */}
        <form
          onSubmit={handleSaveOverallBudget}
          className="bg-[#111216] border border-[#1e2026] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <div className="text-xs font-semibold text-[#e2e2e7]">
              Total Monthly Spending Ceiling
            </div>
            <div className="text-[11px] text-[#90929d] mt-0.5">
              Maximum personal consumption target per calendar month
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#90929d]">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={editingOverallBudget}
                onChange={(e) => setEditingOverallBudget(e.target.value)}
                className="w-32 bg-[#16171c] border border-[#23252c] focus:border-[#a8c7fa] rounded-full pl-7 pr-3 py-1.5 text-xs font-mono text-[#e2e2e7] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-full bg-[#1a2536] hover:bg-[#223147] text-[#d3e3fd] text-xs font-semibold border border-[#2e405b] flex items-center gap-1.5 transition-colors"
            >
              {overallSaved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#a8dab5]" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 text-[#a8c7fa]" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Per-Category Budgets Grid */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#90929d]">
            Per-Category Ceilings (₹ / Month)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categories
              .filter((c) => c.type === "expense")
              .map((cat) => {
                const currentVal =
                  categoryBudgetInputs[cat.id] ??
                  (cat.monthlyBudget || 0).toString();
                const isSaved = savedCategoryId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs font-medium text-[#e2e2e7] truncate">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#90929d]">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={currentVal}
                          onChange={(e) =>
                            handleCategoryInputChange(cat.id, e.target.value)
                          }
                          onBlur={() => handleSaveCategoryBudget(cat.id)}
                          className="w-24 bg-[#16171c] border border-[#23252c] focus:border-[#a8c7fa] rounded-full pl-6 pr-2.5 py-1 text-xs font-mono text-[#e2e2e7] focus:outline-none text-right"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveCategoryBudget(cat.id)}
                        className={`p-1.5 rounded-full border transition-colors ${
                          isSaved
                            ? "bg-[#15241b] text-[#a8dab5] border-[#223a2b]"
                            : "bg-[#1a1c22] text-[#90929d] hover:text-[#e2e2e7] border-[#262830]"
                        }`}
                        title="Save limit"
                      >
                        {isSaved ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 4. Group 1: Financial & Entity Management */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-[#23252c]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a8c7fa]">
            Entity &amp; Taxonomy Management
          </span>
        </div>

        <div className="divide-y divide-[#1c1d22]">
          {/* Accounts & Cards */}
          <div
            onClick={onOpenAccounts}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#1a1c22]/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#1a1c22] text-[#a8c7fa] flex items-center justify-center shrink-0 border border-[#262830]">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e7] group-hover:text-[#a8c7fa] transition-colors">
                  Accounts &amp; Cards
                </div>
                <div className="text-xs text-[#90929d] mt-0.5">
                  {accounts.length} accounts configured • Bank accounts, credit
                  cards, wallets
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-[#d3e3fd] text-xs font-medium border border-[#262830] transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-[#a8c7fa]" />
                <span>Add Account</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#90929d] group-hover:text-[#e2e2e7] transition-colors" />
            </div>
          </div>

          {/* People & Groups */}
          <div
            onClick={onOpenPeople}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#1a1c22]/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#2a1f17] text-[#ffb787] flex items-center justify-center shrink-0 border border-[#422e1e]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e7] group-hover:text-[#ffb787] transition-colors">
                  Friends &amp; GPay Groups
                </div>
                <div className="text-xs text-[#90929d] mt-0.5">
                  {people.length} friends, {groups.length} groups (e.g. `514`,
                  `PG`) • UPI handles
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2a1f17] hover:bg-[#382a20] text-[#ffb787] text-xs font-medium border border-[#422e1e] transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Friend</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#90929d] group-hover:text-[#e2e2e7] transition-colors" />
            </div>
          </div>

          {/* Categories & Subcategories */}
          <div
            onClick={onOpenCategories}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#1a1c22]/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#15241b] text-[#a8dab5] flex items-center justify-center shrink-0 border border-[#223a2b]">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e7] group-hover:text-[#a8dab5] transition-colors">
                  Categories &amp; Subcategories
                </div>
                <div className="text-xs text-[#90929d] mt-0.5">
                  {categories.length} categories, {subcategories.length}{" "}
                  subcategories (Tea, Snacks, Mess, etc.)
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#15241b] hover:bg-[#1f3627] text-[#a8dab5] text-xs font-medium border border-[#223a2b] transition-colors"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>Add Category</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#90929d] group-hover:text-[#e2e2e7] transition-colors" />
            </div>
          </div>

          {/* Recurring Commitments */}
          <div
            onClick={onOpenRecurring}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#1a1c22]/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#231c2e] text-[#d0bcff] flex items-center justify-center shrink-0 border border-[#392c4b]">
                <Repeat className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e7] group-hover:text-[#d0bcff] transition-colors">
                  Recurring Commitments &amp; EMIs
                </div>
                <div className="text-xs text-[#90929d] mt-0.5">
                  {recurringCommitments.length} commitments • Phone EMIs, RDs,
                  PG Rent
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#231c2e] hover:bg-[#322742] text-[#d0bcff] text-xs font-medium border border-[#392c4b] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Commitment</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#90929d] group-hover:text-[#e2e2e7] transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Group 2: Backup, Data & Security */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] overflow-hidden">
        <div className="px-5 pt-4 pb-2 border-b border-[#23252c]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a8c7fa]">
            Security &amp; Local Storage
          </span>
        </div>

        <div className="divide-y divide-[#1c1d22]">
          {/* Encrypted Backup */}
          <div
            onClick={onOpenBackup}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#1a1c22]/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#15241b] text-[#a8dab5] flex items-center justify-center shrink-0 border border-[#223a2b]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e7] group-hover:text-[#a8dab5] transition-colors">
                  Encrypted Backup &amp; Restore
                </div>
                <div className="text-xs text-[#90929d] mt-0.5">
                  Web Crypto API AES-GCM 256-bit password-protected JSON export
                  &amp; import
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#15241b] hover:bg-[#1f3627] text-[#a8dab5] text-xs font-medium border border-[#223a2b] transition-colors"
              >
                <HardDriveDownload className="h-3.5 w-3.5" />
                <span>Backup</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#90929d] group-hover:text-[#e2e2e7] transition-colors" />
            </div>
          </div>

          {/* Import Cashew CSV */}
          <div
            onClick={onOpenCashewImport || onOpenBackup}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#1a1c22]/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#15241b] text-[#a8dab5] flex items-center justify-center shrink-0 border border-[#223a2b]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e7] group-hover:text-[#a8dab5] transition-colors">
                  Import Cashew CSV Export
                </div>
                <div className="text-xs text-[#90929d] mt-0.5">
                  Migrate transactions from cashew-*.csv, automatically fixing
                  shared PG splits and friend repayments
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#15241b] hover:bg-[#1f3627] text-[#a8dab5] text-xs font-medium border border-[#223a2b] transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>
              <ChevronRight className="h-5 w-5 text-[#90929d] group-hover:text-[#e2e2e7] transition-colors" />
            </div>
          </div>

          {/* Factory Reset App Option */}
          <div
            onClick={onResetData}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#1a1c22]/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-[#2b1b1d] text-[#f2b8b5] flex items-center justify-center shrink-0 border border-[#48282b]">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#e2e2e7] group-hover:text-[#f2b8b5] transition-colors">
                  Reset App &amp; Clear All Data
                </div>
                <div className="text-xs text-[#90929d] mt-0.5">
                  Wipes all transactions, people, commitments, and resets
                  account balances to clean zero state
                </div>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-[#90929d] group-hover:text-[#e2e2e7] transition-colors" />
          </div>
        </div>
      </div>

      {/* 6. Group 3: App Architecture Information */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-[#1a1c22] border border-[#262830] text-[#a8c7fa] flex items-center justify-center">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
              FinTrack PWA Architecture
            </h3>
            <span className="text-[11px] text-[#90929d]">
              Android 17 Material 3 • Dexie.js (IndexedDB) • Local-First
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#23252c] text-xs">
          <div className="bg-[#111216] p-2.5 rounded-2xl border border-[#1e2026]">
            <div className="text-[#90929d] text-[10px]">Database Engine</div>
            <div className="text-[#e2e2e7] font-medium mt-0.5">Dexie.js v4</div>
          </div>
          <div className="bg-[#111216] p-2.5 rounded-2xl border border-[#1e2026]">
            <div className="text-[#90929d] text-[10px]">Data Privacy</div>
            <div className="text-[#a8dab5] font-medium mt-0.5">
              100% On-Device
            </div>
          </div>
          <div className="bg-[#111216] p-2.5 rounded-2xl border border-[#1e2026] col-span-2 sm:col-span-1">
            <div className="text-[#90929d] text-[10px]">PWA Status</div>
            <div className="text-[#d3e3fd] font-medium mt-0.5">
              {isAppInstalled ? "Installed Standalone" : "Offline Ready"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
