import React, { useState, useEffect } from 'react';
import { Search, Loader2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_suspended: boolean;
}

interface PendingChange {
  role?: string;
  is_suspended?: boolean;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        role: newRole
      }
    }));
  };

  const toggleUserStatus = (userId: string, currentStatus: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        is_suspended: !currentStatus
      }
    }));
  };

  const saveChanges = async () => {
    setIsSaving(true);
    const updates = [];
    let hasError = false;

    try {
      for (const [userId, changes] of Object.entries(pendingChanges)) {
        const { error } = await supabase
          .from('users')
          .update(changes)
          .eq('id', userId);

        if (error) {
          console.error(`Error updating user ${userId}:`, error);
          hasError = true;
          continue;
        }

        updates.push(userId);
      }

      // Update local state
      setUsers(users.map(user => {
        if (pendingChanges[user.id]) {
          return {
            ...user,
            ...pendingChanges[user.id]
          };
        }
        return user;
      }));

      // Clear pending changes for successful updates
      const newPendingChanges = { ...pendingChanges };
      updates.forEach(userId => delete newPendingChanges[userId]);
      setPendingChanges(newPendingChanges);

      toast({
        variant: hasError ? "destructive" : "default",
        title: hasError ? "Partial Success" : "Success",
        description: hasError 
          ? "Some changes were saved, but others failed. Please try again."
          : "All changes were saved successfully.",
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save changes. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
            <option value="driver">Driver</option>
            <option value="support">Support</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={pendingChanges[user.id]?.role ?? user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className={`text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                      pendingChanges[user.id]?.role ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                    <option value="driver">Driver</option>
                    <option value="support">Support</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    (pendingChanges[user.id]?.is_suspended ?? user.is_suspended)
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {(pendingChanges[user.id]?.is_suspended ?? user.is_suspended) ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => toggleUserStatus(user.id, pendingChanges[user.id]?.is_suspended ?? user.is_suspended)}
                    className={`font-medium ${
                      (pendingChanges[user.id]?.is_suspended ?? user.is_suspended)
                        ? 'text-green-600 hover:text-green-700'
                        : 'text-red-600 hover:text-red-700'
                    }`}
                  >
                    {(pendingChanges[user.id]?.is_suspended ?? user.is_suspended) ? 'Reactivate' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save Changes Button */}
      {hasPendingChanges && (
        <div className="fixed bottom-8 right-8">
          <button
            onClick={saveChanges}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagement;