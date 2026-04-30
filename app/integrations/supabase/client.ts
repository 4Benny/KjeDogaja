import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://viatqtevcpvhnmqvzwvd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpYXRxdGV2Y3B2aG5tcXZ6d3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjI0NTksImV4cCI6MjA4NDk5ODQ1OX0.8OvA64ESioGuc7_QCplQLbqNH12Y0jnNiRQ6NzDYvTY";

// Hybrid storage for auth tokens - use SecureStore on native, AsyncStorage as fallback
// This ensures tokens persist reliably on Android and iOS
const hybridStorage = {
  getItem: async (key: string) => {
    try {
      // Try SecureStore first (more reliable on Android)
      const value = await SecureStore.getItemAsync(key);
      if (value) return value;
    } catch (err) {
      console.debug('[Auth] SecureStore read failed, trying AsyncStorage:', key);
    }
    
    // Fallback to AsyncStorage
    try {
      return await AsyncStorage.getItem(key);
    } catch (err) {
      console.error('[Auth] Storage read failed for key:', key, err);
      return null;
    }
  },
  
  setItem: async (key: string, value: string) => {
    try {
      // Always save to both for redundancy
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.debug('[Auth] SecureStore write failed, using AsyncStorage:', key);
    }
    
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.error('[Auth] Storage write failed for key:', key, err);
      throw err;
    }
  },
  
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.debug('[Auth] SecureStore delete failed:', key);
    }
    
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.error('[Auth] Storage removal failed for key:', key, err);
    }
  },
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: hybridStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

