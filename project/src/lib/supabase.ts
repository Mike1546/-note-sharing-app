import { createClient } from '@supabase/supabase-js';

// Define fallback values for when environment variables are not available
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase credentials are available
export const isSupabaseConnected = 
  typeof supabaseUrl === 'string' && 
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0;

// Create a mock client if credentials are not available
const createMockClient = () => {
  const mockFn = () => ({
    data: null,
    error: new Error('Supabase is not connected')
  });
  
  return {
    auth: {
      getUser: mockFn,
      getSession: mockFn,
      signInWithPassword: mockFn,
      signUp: mockFn,
      signOut: mockFn
    },
    from: () => ({
      select: () => ({
        eq: mockFn,
        order: mockFn,
        single: mockFn
      }),
      insert: mockFn,
      update: mockFn,
      delete: mockFn
    })
  };
};

// Create either a real client or a mock client
export const supabase = isSupabaseConnected 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient() as any;