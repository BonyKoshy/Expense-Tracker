import { useState } from 'react';
import { X, Tags, FolderPlus, Tag } from 'lucide-react';
import type { Category, Subcategory, CategoryType } from '@/types';
import { db } from '@/db';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  subcategories: Subcategory[];
  onSuccess?: (msg: string) => void;
}

export function ManageCategoriesModal({
  isOpen,
  onClose,
  categories,
  subcategories,
  onSuccess,
}: ManageCategoriesModalProps) {
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<CategoryType>('expense');
  const [catColor, setCatColor] = useState('#f97316');

  // Subcategory form
  const [selectedParentCatId, setSelectedParentCatId] = useState(
    categories[0]?.id || ''
  );
  const [subName, setSubName] = useState('');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!catName.trim()) {
      setError('Category name is required.');
      return;
    }

    try {
      const newCat: Category = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: catName.trim(),
        type: catType,
        icon: 'Tag',
        color: catColor,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.categories.add(newCat);
      setCatName('');
      if (onSuccess) onSuccess(`Category "${newCat.name}" added.`);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to add category');
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!subName.trim()) {
      setError('Subcategory name is required.');
      return;
    }
    if (!selectedParentCatId) {
      setError('Please select a parent category.');
      return;
    }

    try {
      const newSub: Subcategory = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        categoryId: selectedParentCatId,
        name: subName.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.subcategories.add(newSub);
      setSubName('');
      if (onSuccess) onSuccess(`Subcategory "${newSub.name}" created.`);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to add subcategory');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">
                Categories &amp; Subcategories Manager
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize your spending taxonomy (e.g. Food &gt; Tea, Snacks, Mess)
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
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Add Category Form */}
          <form
            onSubmit={handleAddCategory}
            className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400 block">
              Add New Category
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Electronics, Fitness"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Type
                </label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as CategoryType)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="h-8 w-12 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-400">{catColor}</span>
                </div>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Save Category</span>
              </button>
            </div>
          </form>

          {/* Add Subcategory Form */}
          <form
            onSubmit={handleAddSubcategory}
            className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
              Add New Subcategory
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Parent Category
                </label>
                <select
                  value={selectedParentCatId}
                  onChange={(e) => setSelectedParentCatId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Subcategory Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Tea & Chai, Samosas, Uber Cab"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Tag className="h-4 w-4" />
                <span>Save Subcategory</span>
              </button>
            </div>
          </form>

          {/* Existing Categories Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              All Configured Categories ({categories.length})
            </h3>
            <div className="space-y-2">
              {categories.map((c) => {
                const subs = subcategories.filter((s) => s.categoryId === c.id);
                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-sm font-bold text-white">{c.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase ml-auto">
                        {c.type}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 pl-5">
                      {subs.length === 0 ? (
                        <span className="text-[11px] text-slate-600 italic">
                          No subcategories
                        </span>
                      ) : (
                        subs.map((s) => (
                          <span
                            key={s.id}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800"
                          >
                            {s.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
