import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { StickyNote, Lock, Users, LogOut, UserCog } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { supabase } from '../lib/supabase';

function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

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
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex space-x-4">
            <Link
              to="/personal"
              className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                isActive('/personal')
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <StickyNote className="w-5 h-5 mr-2" />
              Personal Notes
            </Link>

            <Link
              to="/locked"
              className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                isActive('/locked')
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Lock className="w-5 h-5 mr-2" />
              Locked Notes
            </Link>

            <Link
              to="/group"
              className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                isActive('/group')
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Group Notes
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                  isActive('/admin')
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <UserCog className="w-5 h-5 mr-2" />
                Admin
              </Link>
            )}
          </div>

          <button
            onClick={() => signOut()}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;