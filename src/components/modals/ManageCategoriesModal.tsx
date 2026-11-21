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
  const [catColor, setCatColor] = useState('#1a2536');

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#16171c] border border-[#23252c] rounded-t-[28px] sm:rounded-[28px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150">
        <div className="w-10 h-1 rounded-full bg-[#23252c] mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#23252c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#1a1c22] text-[#a8c7fa] border border-[#262830]">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e2e2e7] m-0">
                Categories &amp; Tags
              </h2>
              <p className="text-xs text-[#90929d] mt-0.5">
                Expense and income category structure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-[#c4c6cf] hover:text-[#e2e2e7] hover:bg-[#1a1c22] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-[#2b1b1d] border border-[#48282b] text-[#f2b8b5] text-xs">
              {error}
            </div>
          )}

          {/* Add Category Form */}
          <form
            onSubmit={handleAddCategory}
            className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 sm:p-5 space-y-3"
          >
            <span className="text-xs font-semibold text-[#a8c7fa] block">
              Add Category
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Category name"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1.5">
                  Type
                </label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as CategoryType)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1.5">
                  Color
                </label>
                <div className="flex items-center gap-3 h-[46px]">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="h-10 w-14 rounded-xl border border-[#23252c] bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-[#90929d]">{catColor}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] text-sm font-semibold flex items-center gap-2 transition-colors active:scale-95"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Save Category</span>
              </button>
            </div>
          </form>

          {/* Add Subcategory Form */}
          <form
            onSubmit={handleAddSubcategory}
            className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 sm:p-5 space-y-3"
          >
            <span className="text-xs font-semibold text-[#a8c7fa] block">
              Add Subcategory
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1.5">
                  Parent Category
                </label>
                <select
                  value={selectedParentCatId}
                  onChange={(e) => setSelectedParentCatId(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1.5">
                  Subcategory Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Subcategory name"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] text-sm font-semibold flex items-center gap-2 transition-colors active:scale-95"
              >
                <Tag className="h-4 w-4" />
                <span>Save Subcategory</span>
              </button>
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            {categories.map((c) => {
              const subs = subcategories.filter((s) => s.categoryId === c.id);
              return (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-[#111216] border border-[#23252c]"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-sm font-semibold text-[#e2e2e7]">{c.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#1a1c22] text-[#90929d] uppercase ml-auto">
                      {c.type}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 pl-4">
                    {subs.map((s) => (
                      <span
                        key={s.id}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1a1c22] text-[#c4c6cf]"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
