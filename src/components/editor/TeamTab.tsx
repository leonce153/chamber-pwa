import { useState } from 'react';
import { useCollaborators, useAvailableUsers, type CollaboratorWithProfile } from '@/hooks/useCollaborators';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  Users,
  UserPlus,
  Crown,
  UserCog,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  ChevronDown } from
'lucide-react';

type App = Tables<'apps'>;
type Profile = Tables<'profiles'>;

interface TeamTabProps {
  app: App;
}

export function TeamTab({ app }: TeamTabProps) {
  const { collaborators, loading, addCollaborator, updateCollaboratorRole, removeCollaborator } =
  useCollaborators(app.id);
  const { users: availableUsers, loading: loadingUsers } = useAvailableUsers();
  const { user, role: currentUserRole } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<string | null>(null);

  const isAppOwner = app.user_id === user?.id;
  const canManageTeam = isAppOwner || currentUserRole === 'owner';

  // Filter out users who are already collaborators or the owner
  const eligibleUsers = availableUsers.filter(
    (u) =>
    u.id !== app.user_id &&
    !collaborators.some((c) => c.user_id === u.id)
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return UserCog;
      case 'editor':
        return Pencil;
      default:
        return Users;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-secondary/20 text-secondary';
      case 'editor':
        return 'bg-success/20 text-success';
      default:
        return 'bg-muted/20 text-muted';
    }
  };

  const handleAddCollaborator = async (userId: string, role: 'admin' | 'editor') => {
    await addCollaborator(userId, role);
    setShowAddModal(false);
  };

  const handleUpdateRole = async (collaboratorId: string, newRole: 'admin' | 'editor') => {
    await updateCollaboratorRole(collaboratorId, newRole);
    setEditingCollaborator(null);
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    await removeCollaborator(collaboratorId);
  };

  if (loading) {
    return (
      <div data-ev-id="ev_8572596108" className="max-w-4xl flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  return (
    <div data-ev-id="ev_b1d0636f7e" className="max-w-4xl flex flex-col gap-8">
      {/* Header */}
      <section data-ev-id="ev_f88958af74" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_e9e4caeed1" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center justify-between">
          <div data-ev-id="ev_b9a5a58067" className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 data-ev-id="ev_d028baacd9" className="text-lg font-semibold text-text">Team Members</h2>
            <span data-ev-id="ev_bb7c9cfe66" className="bg-primary/20 text-primary text-sm font-medium px-2 py-0.5 rounded-full">
              {collaborators.length + 1}
            </span>
          </div>
          {canManageTeam &&
          <button data-ev-id="ev_aaf125f961"
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors">

              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          }
        </div>

        <div data-ev-id="ev_70e1518382" className="p-6">
          <p data-ev-id="ev_50d0ae1a88" className="text-muted mb-6">
            Manage who has access to this app. Admins can edit the app and manage editors. Editors
            can send push notifications, view analytics, and view app users.
          </p>

          {/* Team List */}
          <div data-ev-id="ev_1a11672ece" className="flex flex-col gap-3">
            {/* Owner */}
            <div data-ev-id="ev_9dcfe28e5c" className="flex items-center justify-between p-4 bg-surface-elevated border border-border rounded-lg">
              <div data-ev-id="ev_1c8225271a" className="flex items-center gap-3">
                <div data-ev-id="ev_27ea05de27" className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-warning" />
                </div>
                <div data-ev-id="ev_74d010da5d">
                  <p data-ev-id="ev_200b15a549" className="font-medium text-text">
                    {isAppOwner ? 'You' : 'Owner'}
                  </p>
                  <p data-ev-id="ev_15a386111c" className="text-sm text-muted">App Owner - Full access</p>
                </div>
              </div>
              <span data-ev-id="ev_0b2bd9f1d8" className="bg-warning/20 text-warning text-sm font-medium px-3 py-1 rounded-full">
                Owner
              </span>
            </div>

            {/* Collaborators */}
            {collaborators.map((collab) => {
              const RoleIcon = getRoleIcon(collab.role);
              const isEditing = editingCollaborator === collab.id;

              return (
                <div data-ev-id="ev_437d8ff398"
                key={collab.id}
                className="flex items-center justify-between p-4 bg-surface-elevated border border-border rounded-lg">

                  <div data-ev-id="ev_70f7767396" className="flex items-center gap-3">
                    <div data-ev-id="ev_cca8f88200"
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColor(
                      collab.role
                    )}`}>

                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div data-ev-id="ev_0d0bb39ae3">
                      <p data-ev-id="ev_ad1886e8af" className="font-medium text-text">
                        {collab.profile?.full_name || collab.profile?.email || 'Unknown User'}
                      </p>
                      <p data-ev-id="ev_63fdfa6b5f" className="text-sm text-muted">
                        {collab.profile?.email}
                      </p>
                    </div>
                  </div>

                  <div data-ev-id="ev_e58d29792c" className="flex items-center gap-2">
                    {isEditing ?
                    <div data-ev-id="ev_3664df1a8a" className="flex items-center gap-2">
                        <select data-ev-id="ev_a50a148713"
                      defaultValue={collab.role}
                      onChange={(e) =>
                      handleUpdateRole(collab.id, e.target.value as 'admin' | 'editor')
                      }
                      className="bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary">

                          <option data-ev-id="ev_05f935e22f" value="admin">Admin</option>
                          <option data-ev-id="ev_c7b258581d" value="editor">Editor</option>
                        </select>
                        <button data-ev-id="ev_333035544d"
                      onClick={() => setEditingCollaborator(null)}
                      className="p-1.5 text-muted hover:text-text transition-colors">

                          <X className="w-4 h-4" />
                        </button>
                      </div> :

                    <>
                        <span data-ev-id="ev_3a20c67516"
                      className={`text-sm font-medium px-3 py-1 rounded-full ${getRoleColor(
                        collab.role
                      )}`}>

                          {collab.role.charAt(0).toUpperCase() + collab.role.slice(1)}
                        </span>
                        {canManageTeam &&
                      <>
                            <button data-ev-id="ev_93214f6e2b"
                        onClick={() => setEditingCollaborator(collab.id)}
                        className="p-2 text-muted hover:text-text hover:bg-border rounded-lg transition-colors">

                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button data-ev-id="ev_3a8efa3d2c"
                        onClick={() => handleRemoveCollaborator(collab.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">

                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                      }
                      </>
                    }
                  </div>
                </div>);

            })}

            {collaborators.length === 0 &&
            <div data-ev-id="ev_98350cf01e" className="text-center py-8 text-muted">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p data-ev-id="ev_d8d6c6a74d">No team members yet</p>
                {canManageTeam &&
              <p data-ev-id="ev_047db48502" className="text-sm mt-1">Click "Add Member" to invite someone</p>
              }
              </div>
            }
          </div>
        </div>
      </section>

      {/* Permissions Reference */}
      <section data-ev-id="ev_0df414cd4e" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_5ed086b9a8" className="px-6 py-4 border-b border-border">
          <h3 data-ev-id="ev_c7d9207033" className="font-semibold text-text">Role Permissions</h3>
        </div>
        <div data-ev-id="ev_b1f55b454e" className="p-6">
          <div data-ev-id="ev_6b1dd0d605" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-ev-id="ev_7cb0791848" className="p-4 bg-surface-elevated rounded-lg border border-border">
              <div data-ev-id="ev_526b99a531" className="flex items-center gap-2 mb-3">
                <UserCog className="w-5 h-5 text-secondary" />
                <h4 data-ev-id="ev_055531a6fa" className="font-medium text-text">Admin</h4>
              </div>
              <ul data-ev-id="ev_850c8dab5d" className="flex flex-col gap-2 text-sm text-muted">
                <li data-ev-id="ev_d113ce3ba2">✓ Edit app design and features</li>
                <li data-ev-id="ev_5e3a524a90">✓ Send push notifications</li>
                <li data-ev-id="ev_98c63eee8f">✓ View analytics</li>
                <li data-ev-id="ev_e58f56f36b">✓ View app users</li>
                <li data-ev-id="ev_cfc2ec6bbe">✓ Add/remove editors</li>
              </ul>
            </div>
            <div data-ev-id="ev_5434542186" className="p-4 bg-surface-elevated rounded-lg border border-border">
              <div data-ev-id="ev_f3ad8b1333" className="flex items-center gap-2 mb-3">
                <Pencil className="w-5 h-5 text-success" />
                <h4 data-ev-id="ev_4fb17b8445" className="font-medium text-text">Editor</h4>
              </div>
              <ul data-ev-id="ev_a46c420d0e" className="flex flex-col gap-2 text-sm text-muted">
                <li data-ev-id="ev_58669f39fe">✓ Send push notifications</li>
                <li data-ev-id="ev_6826d0fb4e">✓ View analytics</li>
                <li data-ev-id="ev_b3e5729c0b">✓ View app users</li>
                <li data-ev-id="ev_a0167180c0">✗ Cannot edit app</li>
                <li data-ev-id="ev_054181502d">✗ Cannot manage team</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Add Member Modal */}
      {showAddModal &&
      <AddMemberModal
        users={eligibleUsers}
        loading={loadingUsers}
        onAdd={handleAddCollaborator}
        onClose={() => setShowAddModal(false)} />

      }
    </div>);

}

function AddMemberModal({
  users,
  loading,
  onAdd,
  onClose





}: {users: Profile[];loading: boolean;onAdd: (userId: string, role: 'admin' | 'editor') => void;onClose: () => void;}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'editor'>('editor');
  const [adding, setAdding] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    if (!selectedUser) return;
    setAdding(true);
    onAdd(selectedUser.id, selectedRole);
  };

  return (
    <div data-ev-id="ev_f595d55a4c" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_693aac8262" className="bg-surface border border-border rounded-xl w-full max-w-md p-6">
        <div data-ev-id="ev_141dc42dc7" className="flex items-center justify-between mb-4">
          <h2 data-ev-id="ev_19ed1cf51d" className="text-xl font-semibold text-text">Add Team Member</h2>
          <button data-ev-id="ev_45dcd5ba55"
          onClick={onClose}
          className="p-2 text-muted hover:text-text hover:bg-border rounded-lg transition-colors">

            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div data-ev-id="ev_2af2565b96" className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input data-ev-id="ev_8a4ee8345d"
          type="text"
          placeholder="Search users by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

        </div>

        {/* User List */}
        <div data-ev-id="ev_71bf94f8fb" className="max-h-64 overflow-y-auto mb-4 border border-border rounded-lg">
          {loading ?
          <div data-ev-id="ev_271285521e" className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div> :
          filteredUsers.length === 0 ?
          <div data-ev-id="ev_a927837345" className="text-center py-8 text-muted">
              <p data-ev-id="ev_5e13206fb0">No users found</p>
            </div> :

          filteredUsers.map((user) =>
          <button data-ev-id="ev_6338a01241"
          key={user.id}
          onClick={() => setSelectedUser(user)}
          className={`w-full flex items-center gap-3 p-3 text-left hover:bg-surface-elevated transition-colors border-b border-border last:border-b-0 ${
          selectedUser?.id === user.id ? 'bg-primary/10' : ''}`
          }>

                <div data-ev-id="ev_34f6b4ea76" className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                  {(user.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                </div>
                <div data-ev-id="ev_87c42bd9c7" className="flex-1 min-w-0">
                  <p data-ev-id="ev_956771cf9a" className="font-medium text-text truncate">
                    {user.full_name || 'No name'}
                  </p>
                  <p data-ev-id="ev_ff741e79d9" className="text-sm text-muted truncate">{user.email}</p>
                </div>
                {selectedUser?.id === user.id &&
            <div data-ev-id="ev_282c3c1e69" className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <span data-ev-id="ev_b97c158853" className="text-white text-xs">✓</span>
                  </div>
            }
              </button>
          )
          }
        </div>

        {/* Role Selection */}
        {selectedUser &&
        <div data-ev-id="ev_1d1bbf8535" className="mb-4">
            <label data-ev-id="ev_6de0a0a8fa" className="block text-sm font-medium text-text mb-1.5">Role</label>
            <select data-ev-id="ev_398aae6b97"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'editor')}
          className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-primary">

              <option data-ev-id="ev_708fea3a05" value="editor">Editor - Send push, view analytics & users</option>
              <option data-ev-id="ev_d807c65403" value="admin">Admin - Full edit access + manage editors</option>
            </select>
          </div>
        }

        {/* Actions */}
        <div data-ev-id="ev_6fe1a9b7c8" className="flex gap-3">
          <button data-ev-id="ev_fa0d87f990"
          type="button"
          onClick={onClose}
          className="flex-1 bg-surface-elevated hover:bg-border text-text font-medium py-2.5 px-4 rounded-lg transition-colors">

            Cancel
          </button>
          <button data-ev-id="ev_7d5d2e2165"
          onClick={handleAdd}
          disabled={!selectedUser || adding}
          className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">

            {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Member'}
          </button>
        </div>
      </div>
    </div>);

}