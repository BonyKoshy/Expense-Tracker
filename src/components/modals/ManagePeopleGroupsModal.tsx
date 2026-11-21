import { useState } from 'react';
import { X, Plus, Users, UserPlus, Edit2, Trash2 } from 'lucide-react';
import type { Person, Group } from '@/types';
import { db, safeDeletePerson } from '@/db';
import { formatINR } from '@/utils/formatters';

interface ManagePeopleGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  groups: Group[];
  onSuccess?: (msg: string) => void;
}

export function ManagePeopleGroupsModal({
  isOpen,
  onClose,
  people,
  groups,
  onSuccess,
}: ManagePeopleGroupsModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'people' | 'groups'>('people');

  // Person form state
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personUpi, setPersonUpi] = useState('');
  const [personAvatar, setPersonAvatar] = useState('👤');
  const [personNotes, setPersonNotes] = useState('');

  // Group form state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEditPerson = (p: Person) => {
    setEditingPersonId(p.id);
    setPersonName(p.name);
    setPersonPhone(p.phone || '');
    setPersonUpi(p.upiId || '');
    setPersonAvatar(p.avatar || '👤');
    setPersonNotes(p.notes || '');
  };

  const resetPersonForm = () => {
    setEditingPersonId(null);
    setPersonName('');
    setPersonPhone('');
    setPersonUpi('');
    setPersonAvatar('👤');
    setPersonNotes('');
    setError(null);
  };

  const startEditGroup = (g: Group) => {
    setEditingGroupId(g.id);
    setGroupName(g.name);
    setGroupDesc(g.description || '');
    setGroupMemberIds(g.memberIds || []);
  };

  const resetGroupForm = () => {
    setEditingGroupId(null);
    setGroupName('');
    setGroupDesc('');
    setGroupMemberIds([]);
    setError(null);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!personName.trim()) {
      setError('Friend name is required.');
      return;
    }

    try {
      if (editingPersonId) {
        await db.people.update(editingPersonId, {
          name: personName.trim(),
          phone: personPhone.trim() || undefined,
          upiId: personUpi.trim() || undefined,
          avatar: personAvatar,
          notes: personNotes.trim() || undefined,
          updatedAt: new Date().toISOString(),
        });
        if (onSuccess) onSuccess(`Updated profile for ${personName}.`);
      } else {
        const newPerson: Person = {
          id: `person_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: personName.trim(),
          phone: personPhone.trim() || undefined,
          upiId: personUpi.trim() || undefined,
          netBalance: 0,
          avatar: personAvatar,
          notes: personNotes.trim() || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.people.add(newPerson);
        if (onSuccess) onSuccess(`Added friend "${personName}".`);
      }
      resetPersonForm();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save person');
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!groupName.trim()) {
      setError('Group name is required.');
      return;
    }

    try {
      if (editingGroupId) {
        await db.groups.update(editingGroupId, {
          name: groupName.trim(),
          description: groupDesc.trim() || undefined,
          memberIds: groupMemberIds,
          updatedAt: new Date().toISOString(),
        });
        if (onSuccess) onSuccess(`Group "${groupName}" updated.`);
      } else {
        const newGroup: Group = {
          id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: groupName.trim(),
          description: groupDesc.trim() || undefined,
          memberIds: groupMemberIds,
          defaultSplitType: 'equal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.groups.add(newGroup);
        if (onSuccess) onSuccess(`Created group "${groupName}".`);
      }
      resetGroupForm();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save group');
    }
  };

  const handleDeletePerson = async (p: Person) => {
    setError(null);
    try {
      if (Math.abs(p.netBalance || 0) > 0.001) {
        setError(
          `Cannot delete "${p.name}" because they have an active unsettled balance of ${formatINR(
            Math.abs(p.netBalance)
          )}. Please settle all balances before removing this friend.`
        );
        return;
      }
      if (window.confirm(`Are you sure you want to delete friend "${p.name}"?`)) {
        await safeDeletePerson(db, p.id);
        if (editingPersonId === p.id) resetPersonForm();
        if (onSuccess) onSuccess(`Friend "${p.name}" removed.`);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete person');
    }
  };

  const handleDeleteGroup = async (g: Group) => {
    setError(null);
    try {
      if (window.confirm(`Are you sure you want to delete group "${g.name}"?`)) {
        await db.groups.delete(g.id);
        if (editingGroupId === g.id) resetGroupForm();
        if (onSuccess) onSuccess(`Group "${g.name}" removed.`);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete group');
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
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e2e2e7] m-0">
                Friends &amp; Groups
              </h2>
              <p className="text-xs text-[#90929d] mt-0.5">
                Friends, UPI IDs, and GPay group memberships
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

        {/* M3 Segmented Navigation Chips */}
        <div className="px-5 pt-3 pb-2 border-b border-[#23252c] flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('people')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
              activeSubTab === 'people'
                ? 'bg-[#1a2536] text-[#d3e3fd]'
                : 'bg-[#1a1c22] text-[#90929d] hover:text-[#e2e2e7]'
            }`}
          >
            Friends ({people.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('groups')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
              activeSubTab === 'groups'
                ? 'bg-[#1a2536] text-[#d3e3fd]'
                : 'bg-[#1a1c22] text-[#90929d] hover:text-[#e2e2e7]'
            }`}
          >
            Groups ({groups.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-[#2b1b1d] border border-[#48282b] text-[#f2b8b5] text-xs">
              {error}
            </div>
          )}

          {activeSubTab === 'people' && (
            <>
              {/* Add / Edit Person Form */}
              <form
                onSubmit={handleSavePerson}
                className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#a8c7fa]">
                    {editingPersonId ? 'Edit Friend' : 'Add New Friend'}
                  </span>
                  {editingPersonId && (
                    <button
                      type="button"
                      onClick={resetPersonForm}
                      className="text-xs text-[#90929d] hover:text-[#e2e2e7]"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Friend Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Sneha, Rahul"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Avatar Emoji
                    </label>
                    <select
                      value={personAvatar}
                      onChange={(e) => setPersonAvatar(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                    >
                      <option value="👤">👤 Person</option>
                      <option value="👨‍💼">👨‍💼 Office</option>
                      <option value="👩‍💻">👩‍💻 Tech / Flat</option>
                      <option value="👨‍🎓">👨‍🎓 Roommate</option>
                      <option value="🤝">🤝 Friend</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      UPI ID (for GPay settlement)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., sneha@okaxis"
                      value={personUpi}
                      onChange={(e) => setPersonUpi(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={personPhone}
                      onChange={(e) => setPersonPhone(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Room 514 flatmate"
                      value={personNotes}
                      onChange={(e) => setPersonNotes(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{editingPersonId ? 'Update' : 'Add Friend'}</span>
                  </button>
                </div>
              </form>

              {/* People List */}
              <div className="space-y-2">
                {people.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-[#111216] border border-[#23252c] flex items-center justify-between hover:bg-[#1a1c22]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#1a1c22] flex items-center justify-center text-lg">
                        {p.avatar || '👤'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#e2e2e7]">
                            {p.name}
                          </span>
                          {p.upiId && (
                            <span className="text-[10px] font-mono text-[#a8c7fa]">
                              {p.upiId}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#90929d]">
                          Balance:{' '}
                          <span
                            className={
                              p.netBalance > 0
                                ? 'text-[#ffb77c] font-semibold'
                                : p.netBalance < 0
                                ? 'text-[#f2b8b5] font-semibold'
                                : 'text-[#90929d]'
                            }
                          >
                            {p.netBalance > 0
                              ? `Owes you ${formatINR(p.netBalance)}`
                              : p.netBalance < 0
                              ? `You owe ${formatINR(Math.abs(p.netBalance))}`
                              : 'Settled (₹0)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditPerson(p)}
                        className="p-1.5 text-[#90929d] hover:text-[#e2e2e7] rounded-full hover:bg-[#1a1c22]"
                        title="Edit person"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePerson(p)}
                        className="p-1.5 text-[#90929d] hover:text-[#f2b8b5] rounded-full hover:bg-[#1a1c22]"
                        title="Delete person"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSubTab === 'groups' && (
            <>
              {/* Add / Edit Group Form */}
              <form
                onSubmit={handleSaveGroup}
                className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#a8c7fa]">
                    {editingGroupId ? 'Edit Group' : 'Create GPay Group'}
                  </span>
                  {editingGroupId && (
                    <button
                      type="button"
                      onClick={resetGroupForm}
                      className="text-xs text-[#90929d] hover:text-[#e2e2e7]"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., 514, PG Common"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      placeholder="PG Flatmates bill splits"
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Member selection chips */}
                <div>
                  <label className="text-xs font-medium text-[#c4c6cf] block mb-1.5">
                    Select Members
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {people.map((p) => {
                      const isIncluded = groupMemberIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (isIncluded) {
                              setGroupMemberIds(groupMemberIds.filter((id) => id !== p.id));
                            } else {
                              setGroupMemberIds([...groupMemberIds, p.id]);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            isIncluded
                              ? 'bg-[#1a2536] text-[#d3e3fd]'
                              : 'bg-[#1a1c22] text-[#90929d] hover:text-[#e2e2e7]'
                          }`}
                        >
                          <span>{p.avatar || '👤'}</span>
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{editingGroupId ? 'Update' : 'Save'}</span>
                  </button>
                </div>
              </form>

              {/* Groups List */}
              <div className="space-y-2">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-2xl bg-[#111216] border border-[#23252c] flex items-center justify-between hover:bg-[#1a1c22]/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#e2e2e7]">{g.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1a1c22] text-[#90929d]">
                          {g.memberIds.length} members
                        </span>
                      </div>
                      {g.description && (
                        <p className="text-xs text-[#90929d] mt-0.5">{g.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditGroup(g)}
                        className="p-1.5 text-[#90929d] hover:text-[#e2e2e7] rounded-full hover:bg-[#1a1c22]"
                        title="Edit group"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(g)}
                        className="p-1.5 text-[#90929d] hover:text-[#f2b8b5] rounded-full hover:bg-[#1a1c22]"
                        title="Delete group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
