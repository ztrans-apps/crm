'use client';

import { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/stores/toast-store';

interface Role {
  id: string;
  role_name: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  roles?: string[];
}

interface UserFormModalProps {
  user?: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserFormModal({ user, isOpen, onClose, onSuccess }: UserFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role_id: '',
  });

  // Load roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await fetch('/api/rbac/roles');
        if (response.ok) {
          const data = await response.json();
          setRoles(data.roles || []);
        }
      } catch (error) {
        console.error('Failed to load roles:', error);
      }
    };

    if (isOpen) {
      loadRoles();
    }
  }, [isOpen]);

  // Load user detail when editing
  useEffect(() => {
    if (!user) {
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role_id: '',
      });
      return;
    }

    if (roles.length === 0) return;

    // Get first role ID - find the role that matches user's first role name
    let userRoleId = '';
    
    if (user.roles && user.roles.length > 0) {
      const userRoleName = user.roles[0];
      const matchedRole = roles.find(r => r.role_name === userRoleName);
      
      if (matchedRole) {
        userRoleId = matchedRole.id;
      }
    }

    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '',
      role_id: userRoleId,
    });
  }, [user, roles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = user ? `/api/users/${user.id}` : '/api/users';
      const method = user ? 'PUT' : 'POST';

      const body: any = {
        full_name: formData.full_name,
        email: formData.email,
        role_ids: formData.role_id ? [formData.role_id] : [],
      };

      // Only include password for new users or if password is provided
      if (!user || formData.password) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save user');
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error('Failed to save user');
    } finally {
      setLoading(false);
    }
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-vx-surface rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-vx-border">
          <h2 className="text-xl font-semibold text-vx-text">
            {user ? 'Edit User' : 'Tambah User'}
          </h2>
          <button
            onClick={onClose}
            className="text-vx-text-muted hover:text-vx-text-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Masukkan nama lengkap"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {user && <span className="text-xs text-vx-text-muted">(kosongkan jika tidak ingin mengubah)</span>}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Masukkan password"
              required={!user}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vx-text-muted pointer-events-none" />
              <select
                id="role"
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="pl-10 pr-4 py-2 w-full border border-vx-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vx-purple/30 bg-vx-surface"
                required
              >
                <option value="">Pilih Role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-vx-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.role_id}
              className="bg-vx-purple hover:bg-vx-purple/90"
            >
              {loading ? 'Menyimpan...' : user ? 'Update' : 'Tambah'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
