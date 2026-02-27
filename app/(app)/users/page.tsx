'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  Users, 
  UserCheck, 
  Clock,
  Edit,
  Trash2,
  Mail,
  Shield,
  Filter,
  Smartphone
} from 'lucide-react';
import UserFormModal from './components/UserFormModal';
import UserSessionsModal from './components/UserSessionsModal';
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard';

interface User {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  roles?: string[];
  status?: 'online' | 'offline' | 'away';
  active_chats?: number;
  total_chats?: number;
  created_at: string;
}

export default function AgentsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [selectedUserForSessions, setSelectedUserForSessions] = useState<{ id: string; name: string } | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    activeChats: 0,
  });

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (response.ok) {
        const result = await response.json();
        const usersArray = Array.isArray(result.users) ? result.users : [];
        setUsers(usersArray);
        setFilteredUsers(usersArray);
        
        // Calculate stats
        setStats({
          total: usersArray.length,
          online: usersArray.filter((u: User) => u.status === 'online').length,
          activeChats: usersArray.reduce((sum: number, u: User) => sum + (u.active_chats || 0), 0),
        });
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Search and role filter
  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => 
        user.roles?.includes(roleFilter)
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Yakin ingin menghapus user ${user.full_name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleModalSuccess = () => {
    loadUsers();
  };

  const handleAssignSessions = (user: User) => {
    setSelectedUserForSessions({ id: user.id, name: user.full_name });
    setIsSessionsModalOpen(true);
  };

  const handleSessionsModalClose = () => {
    setIsSessionsModalOpen(false);
    setSelectedUserForSessions(null);
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-vx-text-muted';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      default:
        return 'Offline';
    }
  };

  return (
    <PermissionGuard 
      permission={['agent.view']}
      fallback={
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      }
    >
    <div className="h-full bg-vx-surface-elevated p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vx-text">Users</h1>
        <p className="text-sm text-vx-text-secondary mt-1">Kelola semua user dan role mereka</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-vx-surface rounded-lg shadow-sm p-5 border border-vx-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-vx-text-secondary">Total User</p>
              <p className="text-3xl font-bold text-vx-text mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-vx-purple/10 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-vx-purple" />
            </div>
          </div>
        </div>

        <div className="bg-vx-surface rounded-lg shadow-sm p-5 border border-vx-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-vx-text-secondary">User Online</p>
              <p className="text-3xl font-bold text-vx-text mt-1">{stats.online}</p>
            </div>
            <div className="w-12 h-12 bg-vx-teal/10 rounded-lg flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-vx-teal" />
            </div>
          </div>
        </div>

        <div className="bg-vx-surface rounded-lg shadow-sm p-5 border border-vx-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-vx-text-secondary">Chat Aktif</p>
              <p className="text-3xl font-bold text-vx-text mt-1">{stats.activeChats}</p>
            </div>
            <div className="w-12 h-12 bg-vx-purple/10 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-vx-purple" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-vx-surface rounded-lg shadow-sm border border-vx-border mb-4">
        <div className="p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vx-text-muted" />
            <Input
              placeholder="Cari user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vx-text-muted pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-vx-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vx-purple/30 bg-vx-surface"
            >
              <option value="all">Semua Role</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>
          <Button onClick={handleAddUser} className="bg-vx-purple hover:bg-vx-purple/90">
            <Plus className="h-4 w-4 mr-2" />
            Tambah User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-vx-surface rounded-lg shadow-sm border border-vx-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vx-purple"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-vx-text-muted">
            <Users className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery || roleFilter !== 'all' ? 'Tidak ada user yang ditemukan' : 'Belum ada user'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-vx-surface-elevated border-b border-vx-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Bergabung
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-vx-surface divide-y divide-vx-border">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-vx-surface-hover transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {getInitial(user.full_name)}
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(user.status)} rounded-full border-2 border-vx-surface`}></div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-vx-text">{user.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-vx-text-secondary">
                        <Mail className="h-3.5 w-3.5 mr-1.5 text-vx-text-muted" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-vx-purple/10 text-vx-purple"
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-vx-text-muted">No role</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'online' 
                          ? 'bg-vx-teal/10 text-vx-teal' 
                          : user.status === 'away'
                          ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                          : 'bg-vx-surface-hover text-vx-text'
                      }`}>
                        {getStatusText(user.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-vx-text-muted">
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAssignSessions(user)}
                          className="p-2 text-vx-purple hover:bg-vx-purple/5 rounded-lg transition-colors"
                          title="Assign WhatsApp Sessions"
                        >
                          <Smartphone className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-vx-purple hover:bg-vx-purple/5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserFormModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* User Sessions Modal */}
      {selectedUserForSessions && (
        <UserSessionsModal
          isOpen={isSessionsModalOpen}
          onClose={handleSessionsModalClose}
          userId={selectedUserForSessions.id}
          userName={selectedUserForSessions.name}
        />
      )}
    </div>
    </PermissionGuard>
  );
}
