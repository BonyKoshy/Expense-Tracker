import { useState } from "react";

interface UserNameModalProps {
  isOpen: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export function UserNameModal({
  isOpen,
  initialName,
  onClose,
  onSave,
}: UserNameModalProps) {
  const [nameInput, setNameInput] = useState(initialName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim() || "Bony";
    onSave(cleanName);
  };

  const hasStoredName = Boolean(localStorage.getItem("fintrack_user_name"));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="text-center space-y-1.5">
          <div className="h-12 w-12 rounded-2xl bg-[#1a2536] text-[#a8c7fa] flex items-center justify-center mx-auto text-xl font-bold border border-[#283a54]">
            👋
          </div>
          <h2 className="text-lg font-semibold text-[#e2e2e7]">
            Welcome to FinTrack
          </h2>
          <p className="text-xs text-[#90929d]">What should we call you?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#c4c6cf] mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-base text-[#e2e2e7] placeholder-[#90929d] focus:outline-none min-h-[48px]"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {hasStoredName && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-[#e2e2e7] font-medium text-sm border border-[#262830] transition-colors min-h-[46px] active:scale-95"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#0d2238] font-semibold text-sm transition-colors shadow-sm min-h-[46px] active:scale-95"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
