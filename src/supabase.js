// ════════════════════════════════════════════════════════════
// SUPABASE CONFIG
// ════════════════════════════════════════════════════════════
var SUPABASE_URL = 'https://ytoopikqfmiomgfzhoem.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0b29waWtxZm1pb21nZnpob2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDc4MzgsImV4cCI6MjEwMDIyMzgzOH0.64f5RJm2eVGmYd2PlIM125brirxNP0eG-YfX8NT-pls';

var supabase = null;
var supabaseReady = false;
try {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseReady = true;
  }
} catch(e) {
  console.warn('Supabase init failed:', e.message);
}

// ════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════
var APP = { user: null, currentPage: 'dashboard', charts: {}, surveyTab: 'garating' };

// ════════════════════════════════════════════════════════════
// BOOT — Check Supabase Auth session OR public page
// ════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════
// AUTH — Supabase Auth Login
// ════════════════════════════════════════════════════════════
