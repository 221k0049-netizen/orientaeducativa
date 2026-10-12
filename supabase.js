/* ============================================================
   NAIMA OS · CONALEP Mérida I — Conexión Oficial con Supabase
   Archivo de Configuración y Cliente de Base de Datos
   ============================================================ */

/**
 * 🔑 CREDENCIALES OFICIALES DE SUPABASE
 */
const SUPABASE_URL = 'https://rhlefdylkzrniiznsnkq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJobGVmZHlsa3pybmlpem5zbmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjYxNDgsImV4cCI6MjEwNzM0MjE0OH0.wjiJwK7vT0MU0MO4zg994ItyPXKc4URY7hzwtJlP1XU';

/* ---------- Función de limpieza de URL ---------- */
function getNormalizedUrl(url) {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

/* ---------- Inicialización del Cliente Oficial ---------- */
// NOTA CRÍTICA: No usar 'let supabase' para evitar conflicto con la variable global 'var supabase' del CDN
var supabaseClientInstance = null;
var cleanUrl = getNormalizedUrl(SUPABASE_URL);

try {
  var sbLib = (typeof window !== 'undefined' && window.supabase) ? window.supabase : (typeof supabase !== 'undefined' ? supabase : null);
  if (sbLib && typeof sbLib.createClient === 'function' && cleanUrl && SUPABASE_ANON_KEY) {
    supabaseClientInstance = sbLib.createClient(cleanUrl, SUPABASE_ANON_KEY.trim());
    console.log('✅ Supabase conectado exitosamente a:', cleanUrl);
  }
} catch (error) {
  console.error('❌ Error al inicializar cliente de Supabase:', error);
  supabaseClientInstance = null;
}

/**
 * Comprueba si las credenciales de Supabase están configuradas y activas
 */
function isSupabaseConnected() {
  return Boolean(
    supabaseClientInstance &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.trim().length > 0 &&
    SUPABASE_ANON_KEY.trim().length > 0 &&
    SUPABASE_URL.startsWith('http')
  );
}

// Exponer en el entorno global del navegador
if (typeof window !== 'undefined') {
  window.supabaseClient = supabaseClientInstance;
  window.isSupabaseConnected = isSupabaseConnected;
}

// Soporte para entornos Node / módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    supabase: supabaseClientInstance,
    isSupabaseConnected
  };
}
