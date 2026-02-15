import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined',
  mode: import.meta.env.MODE,
  allEnvKeys: Object.keys(import.meta.env)
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorDetails = `
Environment Variables Durumu:
- VITE_SUPABASE_URL: ${supabaseUrl ? 'Tanımlı ✓' : 'Tanımsız ✗'}
- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Tanımlı ✓' : 'Tanımsız ✗'}
- Build Mode: ${import.meta.env.MODE}

Netlify'da Environment Variables Ayarlama:
1. Netlify Dashboard'a gidin
2. Site Settings > Environment Variables
3. Şu değişkenleri ekleyin (VITE_ prefix'i önemli!):
   - Key: VITE_SUPABASE_URL
     Value: https://knhluhzjqnukrctauhec.supabase.co

   - Key: VITE_SUPABASE_ANON_KEY
     Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaGx1aHpqcW51a3JjdGF1aGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTE3NDMsImV4cCI6MjA4NjY2Nzc0M30.uNZR2nX-DLWYhpW43xb2m1HQ2meJ5lF7862aqH5rJus

4. "Save" butonuna tıklayın
5. Site'ı yeniden deploy edin (Deploys > Trigger deploy > Clear cache and deploy)

ÖNEMLİ: Environment variables ekledikten sonra MUTLAKA yeniden deploy etmelisiniz!
  `;

  throw new Error(errorDetails);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
