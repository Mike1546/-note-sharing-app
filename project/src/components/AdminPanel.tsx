import React, { useState, useEffect } from 'react';
import { UserCog, Shield, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/authStore';

interface User {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

function AdminPanel() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchUsers();
  }, []);

  async function checkAdminStatus() {
    try {
      // Check if user is in admin_users table
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsAdmin(!!data);
    } catch (err: any) {
      console.error('Error checking admin status:', err);
      setError('Failed to verify admin privileges');
    }
  }

  async function fetchUsers() {
    try {
      setLoading(true);
      // Get all profiles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          created_at,
          email
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get admin status from admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id');
        
      if (adminError) throw adminError;
      
      // Combine the data
      const adminIds = new Set(adminData?.map(a => a.user_id) || []);
      const usersWithAdmin = data?.map(u => ({
        ...u,
        is_admin: adminIds.has(u.id)
      })) || [];
      
      setUsers(usersWithAdmin);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdminStatus(userId: string, currentStatus: boolean) {
    try {
      if (currentStatus) {
        // Remove from admin_users
        const { error } = await supabase
          .from('admin_users')
          .delete()
          .eq('user_id', userId);
          
        if (error) throw error;
      } else {
        // Add to admin_users
        const { error } = await supabase
          .from('admin_users')
          .insert([{ user_id: userId }]);
          
        if (error) throw error;
      }
      
      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_admin: !currentStatus } : u
      ));
    } catch (err: any) {
      console.error('Error updating admin status:', err);
      setError('Failed to update admin status');
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete from admin_users if they're an admin
      const { error: adminError } = await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', userId);
        
      // We can ignore errors if they're not an admin
      
      // Delete user's notes
      const { error: notesError } = await supabase
        .from('notes')
        .delete()
        .eq('owner_id', userId);

      if (notesError) throw notesError;
      
      // Delete user's group memberships
      const { error: membershipError } = await supabase
        .from('group_members')
        .delete()
        .eq('user_id', userId);

      if (membershipError) throw membershipError;
      
      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;
      
      // Update local state
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">You don't have permission to access the admin panel.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <UserCog className="w-6 h-6 text-indigo-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg font-medium leading-6 text-gray-900">User Management</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Manage user accounts and admin privileges
          </p>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">{user.id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_admin 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.is_admin ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                        className={`inline-flex items-center p-1 border border-transparent rounded-full ${
                          user.is_admin 
                            ? 'text-yellow-600 hover:bg-yellow-100' 
                            : 'text-green-600 hover:bg-green-100'
                        }`}
                        title={user.is_admin ? 'Remove admin' : 'Make admin'}
                      >
                        {user.is_admin ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </button>
                      {user.id !== user?.id && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full text-red-600 hover:bg-red-100"
                          title="Delete user"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;