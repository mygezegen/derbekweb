import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://twktxzhsrobccqmheotf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a3R4emhzcm9iY2NxbWhlb3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODI4MTgsImV4cCI6MjA4Njc1ODgxOH0.AIrHUSnZVumPIKAPJDS0Ou9_obUkMm2_a7-jX0EF99c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {},
  },
});
