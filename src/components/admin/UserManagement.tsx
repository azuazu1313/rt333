import React, { useState, useEffect } from 'react';
import { Search, Loader2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  user_role: string;
  is_suspended: boolean;
}

interface PendingChange {
  user_role?: string;
  is_suspended?: boolean;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { userData } = useAuth();

  useEffect(() => {
    if (userData?.user_role === 'admin') {
      fetchUsers();
    }
  }, [currentPage, roleFilter, userData]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Verify admin role before querying
      if (userData?.user_role !== 'admin') {
        throw new Error('Admin permissions required');
      }

      // Start with a base query
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' });
      
      // Apply search filter if provided
      if (searchQuery.trim() !== '') {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      
      // Apply role filter if not 'all'
      if (roleFilter !== 'all') {
        // Map 'driver' filter to 'partner' role in database
        const dbRole = roleFilter === 'driver' ? 'partner' : roleFilter;
        query = query.eq('user_role', dbRole);
      }
      
      // Get the total count first
      const { count, error: countError } = await query;
      
      if (countError) throw countError;
      setTotalCount(count || 0);
      
      // Then get the paginated results
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * usersPerPage, currentPage * usersPerPage - 1);

      if (error) throw error;
      
      console.log('Fetched users:', data);
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch users. Please try again.",
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
        user_role: newRole
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
      
      // Refresh the user list after saving changes
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save changes. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle search form submission
  const handleSearch = () => {
    setCurrentPage(1); // Reset to page 1 when searching
    fetchUsers();
  };

  const filteredUsers = users;
  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const totalPages = Math.ceil(totalCount / usersPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold">User Management</h2>
        <div className="flex items-center space-x-4 flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1); // Reset to first page when changing filter
            }}
            className="px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
            <option value="driver">Driver</option>
            <option value="support">Support</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
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
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={pendingChanges[user.id]?.user_role ?? user.user_role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                        pendingChanges[user.id]?.user_role ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <option value="customer">Customer</option>
                      <option value="admin">Admin</option>
                      <option value="partner">Driver</option>
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
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalCount > usersPerPage && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Showing {Math.min((currentPage - 1) * usersPerPage + 1, totalCount)} to {Math.min(currentPage * usersPerPage, totalCount)} of {totalCount} users
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded border ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-3 py-1 bg-white border rounded">
              {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1 rounded border ${
                currentPage >= totalPages 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

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