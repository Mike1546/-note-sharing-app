import { create } from 'zustand';
import { supabase, isSupabaseConnected } from '../lib/supabase';

interface AuthState {
  user: any | null;
  setUser: (user: any | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  makeAdmin: (userId: string) => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  signIn: async (email, password) => {
    if (!isSupabaseConnected) {
      throw new Error("Supabase is not connected. Please connect to Supabase first.");
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    set({ user: data.user });
  },

  signUp: async (email, password, username) => {
    if (!isSupabaseConnected) {
      throw new Error("Supabase is not connected. Please connect to Supabase first.");
    }
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    if (authData.user) {
      // Check if this is the first user, if so, make them an admin
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const isFirstUser = count === 0;
      
      // Insert into profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ 
          id: authData.user.id, 
          username, 
          email,
          is_admin: isFirstUser
        }]);
      
      if (profileError) throw profileError;
      
      // If first user, also add to admin_users table
      if (isFirstUser) {
        const { error: adminError } = await supabase
          .from('admin_users')
          .insert([{ user_id: authData.user.id }]);
          
        if (adminError) console.error("Error adding to admin_users:", adminError);
      }
      
      set({ user: authData.user });
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
  },

  makeAdmin: async (userId: string) => {
    // Add to admin_users table
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert([{ user_id: userId }])
      .onConflict('user_id')
      .ignore();
      
    if (adminError) throw adminError;
  }
}));

export default useAuthStore;