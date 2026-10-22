import {createClient} from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const cloudConfigured = Boolean(url || key);
export let configurationError = '';
export let supabase = null;
if (cloudConfigured) {
  try {
    if (!url || !key) throw new Error('Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
      throw new Error('Use a URL HTTPS do seu projeto Supabase (https://seu-projeto.supabase.co).');
    }
    // Only publishable/legacy anon keys belong in a browser bundle.
    if (!key.startsWith('sb_publishable_')) {
      let payload;
      try { payload = JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); } catch {}
      if (payload?.role !== 'anon') throw new Error('Use a chave publishable ou anon pública, nunca uma chave secret/service_role.');
    }
    supabase = createClient(url,key);
  } catch (error) { configurationError = error.message; }
}
