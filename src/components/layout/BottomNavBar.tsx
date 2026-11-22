import { Home, PieChart, Receipt, Users } from "lucide-react";
import type { NavigationTab } from "./TopAppBar";

interface BottomNavBarProps {
  activeTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
}

export function BottomNavBar({ activeTab, onNavigate }: BottomNavBarProps) {
  const destinations: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: "home", label: "Home", icon: <Home className="h-5 w-5" /> },
    { id: "budget", label: "Budget", icon: <PieChart className="h-5 w-5" /> },
    {
      id: "transactions",
      label: "Transactions",
      icon: <Receipt className="h-5 w-5" />,
    },
    { id: "splits", label: "Splits", icon: <Users className="h-5 w-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#16171c]/95 backdrop-blur-md border-t border-[#23252c] px-3 py-2 flex items-center justify-around shadow-2xl min-h-[64px]">
      {destinations.map((dest) => {
        const isActive = activeTab === dest.id;
        return (
          <button
            key={dest.id}
            type="button"
            onClick={() => onNavigate(dest.id)}
            className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[96px] active:scale-95 transition-transform"
          >
            <div
              className={`px-5 py-1.5 rounded-full transition-all flex items-center justify-center ${
                isActive
                  ? "bg-[#1a2536] text-[#d3e3fd]"
                  : "text-[#c4c6cf] group-hover:text-[#e2e2e7]"
              }`}
            >
              {dest.icon}
            </div>
            <span
              className={`text-xs font-semibold transition-colors ${
                isActive ? "text-[#d3e3fd]" : "text-[#90929d]"
              }`}
            >
              {dest.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
