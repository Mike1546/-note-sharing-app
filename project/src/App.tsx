import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Lock, Users, StickyNote, Database, UserCog } from 'lucide-react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import PersonalNotes from './components/PersonalNotes';
import LockedNotes from './components/LockedNotes';
import GroupNotes from './components/GroupNotes';
import AdminPanel from './components/AdminPanel';
import useAuthStore from './stores/authStore';
import { isSupabaseConnected, supabase } from './lib/supabase';

function App() {
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    if (isSupabaseConnected) {
      // Check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setUser(session.user);
        }
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user || null);
        }
      );

      return () => subscription.unsubscribe();
    }
  }, [setUser]);

  if (!isSupabaseConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center">
            <Database className="h-16 w-16 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connect to Supabase
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please click the "Connect to Supabase" button in the top right corner to set up your database connection.
          </p>
          <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  This application requires a Supabase connection to function properly. Once connected, you'll be able to create and manage your notes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/personal" element={<PersonalNotes />} />
            <Route path="/locked" element={<LockedNotes />} />
            <Route path="/group" element={<GroupNotes />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/" element={<Navigate to="/personal" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;