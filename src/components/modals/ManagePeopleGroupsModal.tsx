import { useState } from 'react';
import { X, Plus, Users, UserPlus, Edit2 } from 'lucide-react';
import type { Person, Group } from '@/types';
import { db } from '@/db';
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">
                People &amp; GPay Groups Manager
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage friends, UPI addresses, and shared flat/group memberships
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

        {/* Sub-tab navigation */}
        <div className="px-5 pt-3 border-b border-slate-800 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('people')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeSubTab === 'people'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Friends &amp; Flatmates ({people.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('groups')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeSubTab === 'groups'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            GPay &amp; PG Groups ({groups.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {activeSubTab === 'people' && (
            <>
              {/* Add / Edit Person Form */}
              <form
                onSubmit={handleSavePerson}
                className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {editingPersonId ? 'Edit Friend Details' : 'Add New Friend'}
                  </span>
                  {editingPersonId && (
                    <button
                      type="button"
                      onClick={resetPersonForm}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Friend Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Sneha, Rahul"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Avatar Emoji
                    </label>
                    <select
                      value={personAvatar}
                      onChange={(e) => setPersonAvatar(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="👤">👤 Default Person</option>
                      <option value="👨‍💼">👨‍💼 Office Mate</option>
                      <option value="👩‍💻">👩‍💻 Techie / Flatmate</option>
                      <option value="👨‍🎓">👨‍🎓 Roommate</option>
                      <option value="🧑‍🍳">🧑‍🍳 Mess Cook</option>
                      <option value="🤝">🤝 Friend</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      UPI ID (for easy settlements)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., sneha@okaxis"
                      value={personUpi}
                      onChange={(e) => setPersonUpi(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={personPhone}
                      onChange={(e) => setPersonPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Room 514 roommate"
                      value={personNotes}
                      onChange={(e) => setPersonNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{editingPersonId ? 'Update Friend' : 'Add Friend'}</span>
                  </button>
                </div>
              </form>

              {/* People List */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Registered Friends ({people.length})
                </h3>
                {people.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-lg border border-slate-700">
                        {p.avatar || '👤'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {p.name}
                          </span>
                          {p.upiId && (
                            <span className="text-[10px] font-mono text-indigo-400">
                              {p.upiId}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Net balance:{' '}
                          <span
                            className={
                              p.netBalance > 0
                                ? 'text-amber-400 font-bold'
                                : p.netBalance < 0
                                ? 'text-rose-400 font-bold'
                                : 'text-slate-400'
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

                    <button
                      onClick={() => startEditPerson(p)}
                      title="Edit Friend"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
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
                className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    {editingGroupId ? 'Edit Group' : 'Create GPay / PG Group'}
                  </span>
                  {editingGroupId && (
                    <button
                      type="button"
                      onClick={resetGroupForm}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., 514, PG Common, Goa Trip"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., PG Flatmates groceries split"
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Member selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Select Group Members
                  </label>
                  <div className="flex flex-wrap gap-2">
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                            isIncluded
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
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
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{editingGroupId ? 'Update Group' : 'Save Group'}</span>
                  </button>
                </div>
              </form>

              {/* Groups List */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Existing Groups ({groups.length})
                </h3>
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{g.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {g.memberIds.length} members
                        </span>
                      </div>
                      {g.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{g.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => startEditGroup(g)}
                      title="Edit Group"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
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
