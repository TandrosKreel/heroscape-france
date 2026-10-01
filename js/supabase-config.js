// Configuration Supabase - Heroscape France

const SUPABASE_URL = 'https://yhpazuslssejitmneqgs.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Jm2rwPVK6V42ee2AeTGqSA_a1YawMgL';

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
