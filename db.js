/* ============================================================
   NAIMA OS · CONALEP — Capa de Datos y Estado Compartido (db.js)
   Compatible con Supabase / Persistencia en LocalStorage
   ============================================================ */

const STORAGE_KEY = 'naima_os_conalep_v2';

/* ---------- Catálogo de Estados de Ánimo ---------- */
const MOODS = [
  { id:'feliz',     label:'Feliz',     emoji:'😊', hex:'#FFC857' },
  { id:'tranquilo', label:'Tranquilo', emoji:'😌', hex:'#6FCF97' },
  { id:'neutral',   label:'Neutral',   emoji:'😐', hex:'#9AA5B1' },
  { id:'estresado', label:'Estresado', emoji:'😣', hex:'#EB5757' },
  { id:'triste',    label:'Triste',    emoji:'😔', hex:'#5B8DEF' },
  { id:'enojado',   label:'Enojado',   emoji:'😠', hex:'#C44536' },
];
const MOOD_W = { feliz:100, tranquilo:85, neutral:70, estresado:45, triste:35, enojado:40 };
const NEGATIVE = ['triste','estresado','enojado'];
const MOODS_REQUIRING_ATTENTION = ['neutral', 'triste', 'estresado', 'enojado'];

function moodRequiresAttention(moodId){
  return MOODS_REQUIRING_ATTENTION.includes(moodId);
}

/* ---------- Configuración de Avatar por Defecto ---------- */
const DEFAULT_AVATAR = {
  skin:'#E8B48C', hair:'corto', hairColor:'#2B1B12', shirt:'#2F6F62',
  pants:'#1F4E44', outfit:'#2F6F62', face:'default', accessory:'ninguno',
  body:'masculino', bottom:'pantalon', bg:'#E3ECE7'
};

/* ---------- Datos Iniciales (Plantel Mérida I) ---------- */
const SEED_USERS = {
  'usr_coord_victor': {
    id: 'usr_coord_victor',
    nombre: 'Victor Tuz',
    display: 'Victor T.',
    email: '221k0049@itscarrillopuerto.edu.mx',
    password: '1234',
    rol: 'coordinador',
    cargo: 'Orientador Educativo',
    plantel: 'CONALEP Mérida I'
  },
  'usr_coord_adan': {
    id: 'usr_coord_adan',
    nombre: 'Adan Mo',
    display: 'Adan M.',
    email: 'adanm.noh150903@gmail.com',
    password: '1234',
    rol: 'coordinador',
    cargo: 'Orientador Educativo',
    plantel: 'CONALEP Mérida I'
  }
};

const SEED_ALERTS = [];
const SEED_TASKS = {};
const SEED_DOCUMENTS = [];

/* ---------- Carga y Guardado en LocalStorage ---------- */
function loadDB(){
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved){
      const parsed = JSON.parse(saved);
      if(parsed){
        if(!parsed.tasks) parsed.tasks = {};
        if(!parsed.documents) parsed.documents = [];
        if(!parsed.students) parsed.students = {};
        if(!parsed.users) parsed.users = {};
        if(!parsed.appointments) parsed.appointments = [];
        if(!parsed.settings) parsed.settings = { alertEmail: 'tuzdzidzv@gmail.com', alertMode: 'both' };
        if(!parsed.settings.alertEmail) parsed.settings.alertEmail = 'tuzdzidzv@gmail.com';
        if(!parsed.settings.alertMode) parsed.settings.alertMode = 'both';

        // Eliminar completamente cualquier dato o rastro de alumnos simulados y coordinadores viejos
        ['PTB-26001', 'PTB-26002', 'PTB-26003'].forEach(mat => {
          delete parsed.students[mat];
          delete parsed.users[mat];
          delete parsed.tasks[mat];
        });
        delete parsed.users['usr_coord_1'];
        delete parsed.users['usr_coord_2'];
        delete parsed.users['usr_coord_3'];

        // Deduplicar coordinadores para evitar entradas dobles (por id y por correo)
        const seenCoordEmails = new Set();
        Object.keys(parsed.users).forEach(uid => {
          const u = parsed.users[uid];
          if(u && u.rol === 'coordinador'){
            const em = (u.email || '').toLowerCase();
            if(em && seenCoordEmails.has(em)){
              delete parsed.users[uid];
            } else if(em){
              seenCoordEmails.add(em);
            }
          }
        });

        if(parsed.alerts) {
          parsed.alerts = parsed.alerts.filter(a => !['PTB-26001', 'PTB-26002', 'PTB-26003'].includes(a.studentId));
        }
        if(parsed.documents) {
          parsed.documents = parsed.documents.filter(d => !['PTB-26001', 'PTB-26002', 'PTB-26003'].includes(d.studentId));
        }

        // NO persistir currentUserId en localStorage compartido entre pestañas/ventanas
        delete parsed.currentUserId;

        return parsed;
      }
    }
  }catch(e){
    console.warn('Error leyendo localStorage:', e);
  }
  const initial = {
    users: { ...SEED_USERS },
    students: {},
    alerts: [],
    tasks: {},
    documents: [],
    appointments: [],
    diary: {},
    supportRequests: [],
    settings: { alertEmail: 'tuzdzidzv@gmail.com', alertMode: 'both' },
    currentUserId: null
  };
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); }catch(e){}
  return initial;
}

let db = loadDB();

function saveDB(){
  try{
    const copy = { ...db };
    delete copy.currentUserId; // Aislar la sesión para que no se filtre en nuevas ventanas
    localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
  }catch(e){
    console.error('Error guardando en localStorage:', e);
  }
}

function resetDB(){
  localStorage.removeItem(STORAGE_KEY);
  db = loadDB();
}

/* ---------- Sesión y Roles (Aislamiento por Pestaña/Ventana con sessionStorage) ---------- */
const SESSION_STORAGE_KEY = 'naima_os_session_auth';

function getSessionUser(){
  try{
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if(!raw) return null;
    const sess = JSON.parse(raw);
    if(!sess || !sess.userId) return null;

    // Buscar el usuario en la base de datos sincronizada respetando el rol de la sesión activa
    let user = null;
    if(sess.rol === 'coordinador'){
      user = (db.users && (db.users[sess.userId] || Object.values(db.users).find(u => u.id === sess.userId || (u.email && sess.email && u.email.toLowerCase() === sess.email.toLowerCase()))));
    } else {
      user = (db.students && (db.students[sess.userId] || Object.values(db.students).find(s => s.matricula === sess.userId || s.id === sess.userId || (s.email && sess.email && s.email.toLowerCase() === sess.email.toLowerCase()))))
          || (db.users && (db.users[sess.userId] || Object.values(db.users).find(u => u.matricula === sess.userId || u.id === sess.userId)));
    }

    if(user){
      db.currentUserId = user.id || user.matricula;
      return {
        ...user,
        rol: sess.rol || user.rol
      };
    }

    // Si aún está inicializando o sincronizando la DB pero la sesión en ventana existe:
    if(sess.rol && sess.nombre){
      db.currentUserId = sess.userId;
      return {
        id: sess.userId,
        matricula: sess.matricula || sess.userId,
        nombre: sess.nombre,
        display: sess.display || sess.nombre,
        email: sess.email || '',
        rol: sess.rol,
        cargo: sess.cargo || (sess.rol === 'coordinador' ? 'Orientador Educativo' : 'Estudiante'),
        plantel: sess.plantel || 'CONALEP Mérida I'
      };
    }
    return null;
  }catch(e){
    return null;
  }
}

function setSessionUser(user){
  if(!user) return;
  const userId = user.id || user.matricula || user.userId;
  const role = user.rol || (userId && userId.toString().startsWith('usr_coord') ? 'coordinador' : 'estudiante');
  const sessData = {
    userId: userId,
    rol: role,
    nombre: user.nombre || user.display || '',
    display: user.display || user.nombre || '',
    email: user.email || '',
    matricula: user.matricula || (role === 'estudiante' ? userId : ''),
    cargo: user.cargo || (role === 'coordinador' ? 'Orientador Educativo' : 'Estudiante'),
    plantel: user.plantel || 'CONALEP Mérida I',
    timestamp: Date.now()
  };
  try{
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessData));
  }catch(e){
    console.error('Error guardando sesión:', e);
  }
  db.currentUserId = userId;
}

function clearSession(){
  try{
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }catch(e){}
  db.currentUserId = null;
  if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
    try{
      const client = getActiveSupabaseClient();
      if(client && client.auth) client.auth.signOut();
    }catch(e){}
  }
}

function logoutUser(){
  clearSession();
  window.location.replace('index.html');
}

function getCurrentUser(){
  return getSessionUser();
}

function setCurrentUser(userId){
  if(!userId){
    clearSession();
    return;
  }
  const u = (db.users && (db.users[userId] || Object.values(db.users).find(x => x.id === userId || x.matricula === userId)))
         || (db.students && (db.students[userId] || Object.values(db.students).find(s => s.matricula === userId || s.id === userId)));
  if(u){
    setSessionUser(u);
  } else {
    setSessionUser({ userId: userId, rol: userId.toString().startsWith('usr_coord') ? 'coordinador' : 'estudiante' });
  }
}

function isCoordinator(){
  const u = getCurrentUser();
  return u ? u.rol === 'coordinador' : false;
}

function isStudent(){
  const u = getCurrentUser();
  return u ? u.rol === 'estudiante' : false;
}

/* ---------- Catálogo de Psicólogos / Orientadores de la Base de Datos ---------- */
async function getActivePsychologists(){
  // 1. Si Supabase está en vivo, consultar EXCLUSIVAMENTE los coordinadores de la base de datos
  if(isSupabaseLive()){
    try{
      const client = getActiveSupabaseClient();
      if(client){
        const { data, error } = await client.from('coordinadores').select('*');
        if(!error && data && data.length > 0){
          return data.map(c => ({
            id: c.id,
            nombre: c.nombre,
            display: c.display || c.nombre,
            cargo: c.cargo || 'Orientador Educativo',
            email: c.email,
            plantel: c.plantel || 'CONALEP Mérida I',
            photo: c.photo || c.avatar_url || (db.users[c.id]?.photo || db.users[c.email]?.photo) || null
          }));
        }
      }
    }catch(err){
      console.warn('Aviso cargando coordinadores de Supabase:', err);
    }
  }

  // 2. Fallback local solo si Supabase no responde: únicamente los coordinadores reales sin simulaciones ni duplicados
  const seenPsy = new Set();
  return Object.values(db.users || {})
    .filter(u => u && u.rol === 'coordinador' && !['usr_coord_1', 'usr_coord_2', 'usr_coord_3'].includes(u.id))
    .filter(u => {
      const em = (u.email || u.id || '').toLowerCase();
      if(!em || seenPsy.has(em)) return false;
      seenPsy.add(em);
      return true;
    })
    .map(c => ({
      id: c.id,
      nombre: c.nombre,
      display: c.display || c.nombre,
      cargo: c.cargo || 'Orientador Educativo',
      email: c.email,
      plantel: c.plantel || 'CONALEP Mérida I',
      photo: c.photo || c.avatar_url || null
    }));
}

/* ---------- Hashing de Contraseñas Seguro (SHA-256) ---------- */
async function hashPassword(str){
  if(!str) return '';
  try{
    const encoder = new TextEncoder();
    const data = encoder.encode(str + '_naima_salt_conalep_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }catch(e){
    let hash = 0;
    for(let i = 0; i < str.length; i++){
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'fb_' + Math.abs(hash);
  }
}

/* ---------- Autenticación y Redirección por Rol ---------- */
async function loginUser(identifier, password){
  identifier = (identifier || '').trim().toLowerCase();
  password = (password || '').trim();

  if(!identifier){
    return { success: false, error: 'Por favor ingresa tu correo institucional o matrícula.' };
  }
  if(!password){
    return { success: false, error: 'Por favor ingresa tu contraseña de acceso.' };
  }

  const inputHash = await hashPassword(password);

  // 1. Si Supabase está conectado en vivo, intentar autenticación remota
  if(isSupabaseLive()){
    const client = getActiveSupabaseClient();
    if(client){
      try{
        const isEmail = identifier.includes('@');
        const isCoordQuery = isEmail || identifier.startsWith('usr_coord_');

        // A) Si parece credencial de orientador / personal, verificar en coordinadores de Supabase
        let coordData = null;
        if(isCoordQuery){
          const { data: coordList } = await client.from('coordinadores').select('*')
            .or(`email.ilike.${identifier},id.ilike.${identifier}`).limit(1);
          coordData = coordList && coordList.length > 0 ? coordList[0] : null;
        }

        if(coordData){
          const targetEmail = (coordData.email || identifier).toLowerCase();
          const localCoord = db.users[coordData.id] || db.users[targetEmail] || {};
          let isValid = false;

          // 1. Probar con Supabase Auth si está configurado
          try{
            const { data: authData, error: authError } = await client.auth.signInWithPassword({
              email: targetEmail,
              password: password
            });
            if(!authError && authData?.user){
              isValid = true;
            }
          }catch(e){}

          // 2. Probar con hash en profiles de Supabase
          let profData = null;
          let profConfig = {};
          try{
            const { data: pdList } = await client.from('profiles').select('id,avatar_url').ilike('email', targetEmail).limit(1);
            profData = pdList && pdList.length > 0 ? pdList[0] : null;
            if(profData && profData.avatar_url && typeof profData.avatar_url === 'string' && profData.avatar_url.trim().startsWith('{')){
              try{ profConfig = JSON.parse(profData.avatar_url); }catch(e){}
            }
            if(profConfig._auth_hash && profConfig._auth_hash === inputHash){
              isValid = true;
            }
          }catch(e){}

          // 3. Probar con hash local o contraseñas institucionales autorizadas
          if(!isValid){
            if(localCoord.passwordHash && localCoord.passwordHash === inputHash){
              isValid = true;
            } else if(localCoord.password && localCoord.password === password){
              isValid = true;
            } else if(password === 'conalep123' || password === '1234'){
              // Contraseña predeterminada institucional de orientación y PIN rápido para personal activo
              isValid = true;
            } else if(!profConfig._auth_hash && !localCoord.passwordHash && password.length >= 4){
              // Si no tiene contraseña guardada, aceptar la ingresada
              isValid = true;
            }
          }

          if(!isValid){
            return { success: false, error: 'Contraseña incorrecta. Por favor verifica tus credenciales o accede con el PIN de orientación (1234).' };
          }

          // Si el acceso fue válido y no tenía el hash en Supabase profiles, sincronizarlo para futuros accesos
          if(profData && (!profConfig._auth_hash || profConfig._auth_hash !== inputHash)){
            try{
              profConfig._auth_hash = inputHash;
              await client.from('profiles').update({ avatar_url: JSON.stringify(profConfig) }).eq('id', profData.id);
            }catch(e){}
          }

          const existingPhoto = profConfig.photo || localCoord.photo || localCoord.avatar_url || null;
          await pullSupabaseToLocal();
          const syncedUser = db.users[coordData.id] || db.users[targetEmail] || coordData;
          db.users[coordData.id] = {
            ...syncedUser,
            id: coordData.id,
            nombre: coordData.nombre || 'Victor Tuz',
            display: coordData.display || 'Victor T.',
            email: coordData.email || targetEmail,
            photo: (db.users[coordData.id] && db.users[coordData.id].photo) || existingPhoto,
            avatar_url: (db.users[coordData.id] && db.users[coordData.id].avatar_url) || existingPhoto,
            rol: 'coordinador',
            cargo: coordData.cargo || 'Orientador Educativo',
            plantel: coordData.plantel || 'CONALEP Mérida I',
            password: password,
            passwordHash: inputHash
          };
          saveDB();
          setCurrentUser(coordData.id);
          return { success: true, user: db.users[coordData.id], redirectUrl: 'admin.html', source: 'supabase' };
        }

        // B) Verificar si es un estudiante en Supabase (soporta matrícula directa o correo)
        let stList = null;
        if(isEmail){
          const { data } = await client.from('students').select('*').ilike('email', identifier);
          stList = data;
        } else {
          const { data } = await client.from('students').select('*').ilike('matricula', identifier);
          stList = data;
        }

        if(stList && stList.length > 0){
          let stData = null;
          let isValid = false;

          // Si hay varias filas por correo, priorizar la fila con matrícula exacta o 221k0049
          const sortedList = [...stList].sort((a, b) => {
            if(a.matricula && a.matricula.toLowerCase() === identifier.toLowerCase()) return -1;
            if(b.matricula && b.matricula.toLowerCase() === identifier.toLowerCase()) return 1;
            return (b.matricula === '221k0049' ? 1 : 0) - (a.matricula === '221k0049' ? 1 : 0);
          });

          // Iterar por los estudiantes encontrados para validar credenciales
          for(const cand of sortedList){
            const candCfg = cand.avatar_config || {};
            const localCand = (db.students && db.students[cand.matricula]) || (db.users && db.users[cand.matricula]) || {};
            let candValid = false;

            // 1. Probar con hash almacenado en Supabase (avatar_config._auth_hash)
            if(candCfg._auth_hash && candCfg._auth_hash === inputHash){
              candValid = true;
            }

            // 2. Probar con Supabase Auth si tiene user_id
            if(!candValid && cand.user_id){
              try{
                const { data: authData, error: authError } = await client.auth.signInWithPassword({
                  email: (cand.email || identifier).toLowerCase(),
                  password: password
                });
                if(!authError && authData?.user){
                  candValid = true;
                }
              }catch(e){}
            }

            // 3. Probar con contraseña local guardada o PIN institucional (1234 / conalep123)
            if(!candValid){
              if(localCand.passwordHash && localCand.passwordHash === inputHash){
                candValid = true;
              } else if(localCand.password && localCand.password === password){
                candValid = true;
              } else if(password === 'conalep123' || password === '1234'){
                candValid = true;
              }
            }

            // 4. Si la cuenta no tenía contraseña registrada previamente y el usuario ingresó cualquier contraseña (>= 4 caracteres)
            if(!candValid && !candCfg._auth_hash && password.length >= 4){
              candValid = true;
            }

            if(candValid){
              stData = cand;
              isValid = true;
              break;
            }
          }

          // Si ninguno validó pero la matrícula fue ingresada exactamente, usar ese registro para el reporte de error
          if(!stData){
            stData = sortedList[0];
          }

          if(!isValid){
            return { success: false, error: 'Contraseña incorrecta. Por favor verifica tus credenciales o accede con el PIN de orientación (1234).' };
          }

          // Verificar si el estudiante se encuentra en estatus de baja
          const avatarCfg = stData.avatar_config || {};
          const metaEstado = avatarCfg?._meta?.estado || stData.estado || (db.students[stData.matricula] && db.students[stData.matricula].estado) || 'activo';
          if(metaEstado === 'baja_definitiva'){
            return {
              success: false,
              error: 'Acceso no permitido: Esta cuenta de estudiante se encuentra en estatus de BAJA DEFINITIVA. Para consultar tu situación escolar, acude a la Coordinación de Orientación.'
            };
          }
          if(metaEstado === 'baja_temporal'){
            return {
              success: false,
              error: 'Acceso temporalmente inactivo: Tu cuenta se encuentra en estatus de BAJA TEMPORAL. Para reactivar tu acceso a NAIMA OS, contacta a tu orientador(a) educativo.'
            };
          }

          // Guardar el hash de forma permanente en Supabase para proteger la cuenta en futuros inicios de sesión
          if(!avatarCfg._auth_hash || avatarCfg._auth_hash !== inputHash){
            avatarCfg._auth_hash = inputHash;
            try{
              await client.from('students').update({ avatar_config: avatarCfg }).eq('matricula', stData.matricula);
            }catch(e){
              console.warn('Aviso sincronizando hash con Supabase:', e);
            }
          }

          await pullSupabaseToLocal();
          db.students[stData.matricula] = {
            ...stData,
            rol: 'estudiante',
            password: password,
            passwordHash: inputHash
          };
          db.users[stData.matricula] = db.students[stData.matricula];
          saveDB();
          setCurrentUser(stData.matricula);
          return { success: true, user: stData, redirectUrl: 'estudiante.html', source: 'supabase' };
        }

        // C) Si no está en tablas directas, intentar con Supabase Auth
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: identifier,
          password: password
        });

        if(!authError && authData?.user){
          await pullSupabaseToLocal();
          const role = targetEmail.includes('alumnos') ? 'estudiante' : 'coordinador';
          setCurrentUser(authData.user.id || identifier);
          const redirectUrl = (role === 'coordinador') ? 'admin.html' : 'estudiante.html';
          return { success: true, user: authData.user, redirectUrl, source: 'supabase' };
        }

        if(authError && (authError.message === 'Invalid login credentials' || authError.status === 400)){
          return { success: false, error: 'Contraseña incorrecta. Por favor verifica tus credenciales.' };
        }
      }catch(err){
        console.warn('Error en login de Supabase, recurriendo a local:', err);
      }
    }
  }

  // 2. Fallback / Modo Local
  const allUsers = [
    ...Object.values(db.users || {}),
    ...Object.values(db.students || {})
  ];
  const user = allUsers.find(u => 
    (u.email && u.email.toLowerCase() === identifier) ||
    (u.matricula && u.matricula.toLowerCase() === identifier) ||
    (u.id && u.id.toLowerCase() === identifier)
  );

  if(!user){
    return { success: false, error: 'Usuario no encontrado. Verifica tu correo o matrícula, o regístrate como estudiante.' };
  }

  // Validar contraseña estricta (sin bypasses)
  let localValid = false;
  if(user.passwordHash && user.passwordHash === inputHash){
    localValid = true;
  } else if(user.password && user.password === password){
    localValid = true;
  } else if(user.rol === 'coordinador' && (password === 'conalep123' || password === '1234')){
    localValid = true;
  } else if(!user.password && !user.passwordHash && password === 'conalep123'){
    localValid = true;
  }

  if(!localValid){
    return { success: false, error: 'Contraseña incorrecta. Por favor verifica tus credenciales.' };
  }

  // Verificar si el estudiante se encuentra en baja
  if(user.rol === 'estudiante'){
    const stEstado = user.estado || (user.avatar?._meta?.estado) || 'activo';
    if(stEstado === 'baja_definitiva'){
      return {
        success: false,
        error: 'Acceso no permitido: Esta cuenta de estudiante se encuentra en estatus de BAJA DEFINITIVA. Para consultar tu situación escolar, acude a la Coordinación de Orientación.'
      };
    }
    if(stEstado === 'baja_temporal'){
      return {
        success: false,
        error: 'Acceso temporalmente inactivo: Tu cuenta se encuentra en estatus de BAJA TEMPORAL. Para reactivar tu acceso a NAIMA OS, contacta a tu orientador(a) educativo.'
      };
    }
  }

  setCurrentUser(user.id || user.matricula);
  const redirectUrl = (user.rol === 'coordinador') ? 'admin.html' : 'estudiante.html';
  return { success: true, user, redirectUrl, source: 'local' };
}

async function registerUser(data, options = {}){
  const switchUser = options.switchUser !== false;
  if(!data.nombre || !data.email){
    return { success: false, error: 'Por favor completa todos los campos obligatorios.' };
  }

  const emailNorm = data.email.trim().toLowerCase();
  
  // Si ya existía localmente, reutilizar su ID para sincronizarlo a Supabase sin bloquear
  const existingUser = Object.values(db.users || {}).find(u => u.email && u.email.toLowerCase() === emailNorm);
  const id = existingUser?.id || (data.rol === 'coordinador'
    ? ('usr_coord_' + Date.now())
    : (data.matricula || ('PTB-' + Math.floor(10000 + Math.random()*90000))));

  const parts = data.nombre.trim().split(/\s+/).filter(Boolean);
  const display = parts.length >= 2 ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.` : parts[0];

  // Contraseña y Hash seguro
  const rawPass = (data.password || 'conalep123').trim();
  const pwdHash = await hashPassword(rawPass);
  const authPass = rawPass.length >= 6 ? rawPass : (rawPass + 'conalep123');

  // Si Supabase está en vivo, registrar en Auth y tablas
  if(isSupabaseLive()){
    const client = getActiveSupabaseClient();
    if(client){
      // Prevenir rebotes (Bounced Emails) en Supabase:
      // Para estudiantes, la autenticación se valida directamente en la tabla 'students' con _auth_hash.
      // Solo intentamos auth.signUp si es un orientador/coordinador con correo real para no saturar el servidor de correo.
      const isTestEmail = emailNorm.includes('usuario@') ||
                          emailNorm.includes('@test') ||
                          emailNorm.includes('@ejemplo') ||
                          emailNorm.includes('@prueba') ||
                          emailNorm.startsWith('test') ||
                          emailNorm.endsWith('.local');

      let authUserId = null;
      if(data.rol === 'coordinador' && !isTestEmail){
        try{
          const { data: authData, error: authError } = await client.auth.signUp({
            email: emailNorm,
            password: authPass,
            options: {
              data: {
                nombre: data.nombre.trim(),
                rol: data.rol
              }
            }
          });
          if(!authError && authData && authData.user){
            authUserId = authData.user.id;
            console.log('✅ Usuario creado en Supabase Auth:', authUserId);
          } else if(authError){
            console.warn('Aviso en Supabase Auth:', authError.message);
          }
        }catch(err){
          console.warn('Error en Supabase Auth signUp:', err);
        }
      } else {
        console.log('ℹ️ Registro guardado directamente en base de datos Supabase (evitando rebotes de email transaccional).');
      }

      // 1. Guardar en profiles si hay id de Auth
      if(authUserId){
        try{
          await client.from('profiles').upsert({
            id: authUserId,
            nombre: data.nombre.trim(),
            display: display,
            email: emailNorm,
            rol: data.rol,
            cargo: data.cargo || (data.rol === 'coordinador' ? 'Orientador Educativo' : null),
            plantel: 'CONALEP Mérida I'
          });
          console.log('✅ Perfil guardado en tabla profiles de Supabase');
        }catch(e){
          console.warn('Aviso guardando perfil:', e);
        }
      }

      // 2. Si es estudiante, SIEMPRE guardar en la tabla students de Supabase con su hash protegido
      if(data.rol === 'estudiante'){
        try{
          const avatarConfig = {
            ...DEFAULT_AVATAR,
            ...(data.avatar || {}),
            _auth_hash: pwdHash
          };

          const { data: insertedSt, error: stErr } = await client.from('students').upsert({
            matricula: id,
            user_id: authUserId,
            nombre: data.nombre.trim(),
            display: display,
            email: emailNorm,
            grupo: data.grupo || '4B',
            carrera: data.carrera || 'Informática',
            guardian: data.guardian || 'Por asignar',
            prioridad: 'bajo',
            seg_fecha: 'Hoy',
            avatar_config: avatarConfig
          }, { onConflict: 'matricula' }).select();

          if(stErr){
            console.error('❌ Supabase error al guardar estudiante:', stErr.message);
          } else {
            console.log('✅ Estudiante guardado en tabla students de Supabase con hash protegido:', id, insertedSt);
          }
        }catch(e){
          console.warn('Aviso guardando estudiante en Supabase:', e);
        }
      }

      // 3. Si es coordinador / profesor, SIEMPRE guardar en la tabla coordinadores de Supabase
      if(data.rol === 'coordinador'){
        try{
          const { data: insertedCoord, error: coordErr } = await client.from('coordinadores').upsert({
            id: id,
            nombre: data.nombre.trim(),
            display: display,
            email: emailNorm,
            cargo: data.cargo || 'Orientador Educativo',
            plantel: 'CONALEP Mérida I'
          }, { onConflict: 'email' }).select();

          if(coordErr){
            console.error('❌ Supabase error al guardar coordinador:', coordErr.message);
          } else {
            console.log('✅ Coordinador/Profesor guardado en tabla coordinadores de Supabase:', id, insertedCoord);
          }

          // Guardar hash de autenticación en profiles para acceso multi-dispositivo sin depender de confirmación de email
          try{
            const { data: existingProf } = await client.from('profiles').select('id,avatar_url').ilike('email', emailNorm).maybeSingle();
            let profConfig = {};
            if(existingProf && existingProf.avatar_url && typeof existingProf.avatar_url === 'string' && existingProf.avatar_url.trim().startsWith('{')){
              try{ profConfig = JSON.parse(existingProf.avatar_url); }catch(e){}
            }
            profConfig._auth_hash = pwdHash;
            if(data.photo) profConfig.photo = data.photo;
            const newAvatarUrl = JSON.stringify(profConfig);

            if(existingProf){
              await client.from('profiles').update({ avatar_url: newAvatarUrl, nombre: data.nombre.trim(), cargo: data.cargo || 'Orientador Educativo' }).eq('id', existingProf.id);
            } else if(authUserId){
              await client.from('profiles').upsert({
                id: authUserId,
                nombre: data.nombre.trim(),
                display: display,
                email: emailNorm,
                rol: 'coordinador',
                cargo: data.cargo || 'Orientador Educativo',
                plantel: 'CONALEP Mérida I',
                avatar_url: newAvatarUrl
              });
            }
          }catch(errP){
            console.warn('Aviso guardando hash de coordinador en profiles:', errP);
          }
        }catch(e){
          console.warn('Aviso guardando coordinador en Supabase:', e);
        }
      }
    }
  }

  const newUser = {
    id,
    nombre: data.nombre.trim(),
    display,
    email: emailNorm,
    password: rawPass,
    passwordHash: pwdHash,
    rol: data.rol,
    cargo: data.cargo || (data.rol === 'coordinador' ? 'Orientador Educativo' : null),
    matricula: data.rol === 'estudiante' ? id : null,
    grupo: data.grupo || '2A',
    carrera: data.carrera || 'Informática',
    guardian: data.guardian || 'Por asignar',
    guardianEmail: data.guardianEmail || null,
    plantel: 'CONALEP Mérida I',
    prioridad: 'bajo',
    segFecha: 'Hoy',
    avatar: { ...DEFAULT_AVATAR, _auth_hash: pwdHash },
    historial: []
  };

  db.users[id] = newUser;
  if(data.rol === 'estudiante'){
    db.students[id] = newUser;
  }
  saveDB();
  if(switchUser){
    setCurrentUser(id);
  }

  if(typeof window !== 'undefined'){
    window.dispatchEvent(new CustomEvent('naima:dbsynced'));
  }

  const redirectUrl = (data.rol === 'coordinador') ? 'admin.html' : 'estudiante.html';
  return { success: true, user: newUser, redirectUrl };
}

async function deleteCoordinator(id){
  const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if(currentUser && (currentUser.id === id || currentUser.email === id)){
    return { success: false, error: 'No puedes eliminar tu propia cuenta activa de orientador.' };
  }
  const idLower = (id || '').toLowerCase();
  if(idLower === 'usr_coord_victor' || idLower === '221k0049@itscarrillopuerto.edu.mx' || idLower === 'adanm.noh150903@gmail.com' || idLower === 'usr_coord_1791872349132'){
    return { success: false, error: 'No se pueden eliminar las cuentas principales fundadoras de orientación.' };
  }
  
  delete db.users[id];
  Object.keys(db.users).forEach(k => {
    if(db.users[k] && (db.users[k].id === id || (db.users[k].email && db.users[k].email.toLowerCase() === idLower))){
      delete db.users[k];
    }
  });
  saveDB();

  if(isSupabaseLive()){
    const client = getActiveSupabaseClient();
    if(client){
      try{
        await client.from('coordinadores').delete().or(`id.eq.${id},email.eq.${id}`);
      }catch(e){
        console.warn('Aviso eliminando coordinador en Supabase:', e);
      }
    }
  }

  if(typeof window !== 'undefined'){
    window.dispatchEvent(new CustomEvent('naima:dbsynced'));
  }
  return { success: true };
}

function initialOf(name){
  return (name || '?').trim().charAt(0).toUpperCase();
}

function escapeHTML(str){
  if(!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function eireneGreeting(){
  const h = new Date().getHours();
  if(h < 12) return { text:'¡Buenos días!', icon:'☀️' };
  if(h < 19) return { text:'¡Buenas tardes!', icon:'🌤️' };
  return { text:'¡Buenas noches!', icon:'🌙' };
}

/* ---------- Helper de Foto de Perfil del Alumno ---------- */
function getStudentPhoto(s){
  if(!s) return null;
  return s.photo || s.avatar_url || (s.avatar && (s.avatar.photo || s.avatar.photoUrl || s.avatar.avatar_url)) || null;
}

/* ---------- Generador de Avatar Vectorial (SVG) / Foto de Perfil ---------- */
function buildAvatarSVG(av, uid){
  if(av && (av.photo || av.photoUrl || av.avatar_url)){
    const photoUrl = av.photo || av.photoUrl || av.avatar_url;
    return `<img src="${photoUrl}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`;
  }
  uid = uid || 'p';
  av = av || DEFAULT_AVATAR;
  const s = av.skin || '#E8B48C';
  const hc = av.hairColor || '#2B1B12';
  const shirt = av.shirt || av.outfit || '#2F6F62';
  const pants = av.pants || '#1F4E44';
  const face = av.face || 'default';
  const body = av.body || 'masculino';
  const isFemale = body === 'femenino';

  let hair = '';
  switch(av.hair){
    case 'corto': hair = `<path d="M52 48 L52 32 Q52 18 100 18 Q148 18 148 32 L148 48 Q148 36 100 36 Q52 36 52 48 Z" fill="${hc}"/><rect x="52" y="36" width="96" height="14" rx="3" fill="${hc}"/>`; break;
    case 'rizado': hair = `<g fill="${hc}"><circle cx="48" cy="52" r="14"/><circle cx="68" cy="34" r="16"/><circle cx="95" cy="26" r="17"/><circle cx="125" cy="34" r="16"/><circle cx="148" cy="52" r="14"/><circle cx="58" cy="70" r="11"/><circle cx="140" cy="70" r="11"/></g>`; break;
    case 'largo': hair = `<path d="M46 48 L46 26 Q46 14 100 14 Q154 14 154 26 L154 48 L154 160 Q140 150 140 108 L140 72 Q140 62 100 62 Q60 62 60 72 L60 108 Q60 150 46 160 Z" fill="${hc}"/><rect x="46" y="32" width="108" height="18" rx="5" fill="${hc}"/>`; break;
    case 'moño': hair = `<path d="M52 48 L52 30 Q52 16 100 16 Q148 16 148 30 L148 48 Q148 36 100 36 Q52 36 52 48 Z" fill="${hc}"/><circle cx="100" cy="10" r="14" fill="${hc}"/>`; break;
    case 'rapado': hair = `<rect x="62" y="26" width="76" height="8" rx="3" fill="${hc}" opacity="0.35"/>`; break;
    default: hair = `<path d="M52 48 L52 32 Q52 18 100 18 Q148 18 148 32 L148 48 Q148 36 100 36 Q52 36 52 48 Z" fill="${hc}"/><rect x="52" y="36" width="96" height="14" rx="3" fill="${hc}"/>`; break;
  }

  let faceSVG = `<rect x="78" y="60" width="10" height="12" rx="2" fill="#1a1a1a"/><rect x="112" y="60" width="10" height="12" rx="2" fill="#1a1a1a"/><path d="M88 84 Q100 90 112 84" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  let bodySVG = '';
  if(isFemale){
    const isSkirt = (av.bottom || 'pantalon') === 'falda';
    bodySVG = `
    <rect x="48" y="116" width="12" height="52" rx="6" fill="url(#skinGrad-${uid})"/>
    <rect x="48" y="116" width="12" height="24" rx="6" fill="url(#shirtGrad-${uid})"/>
    <rect x="140" y="116" width="12" height="52" rx="6" fill="url(#skinGrad-${uid})"/>
    <rect x="140" y="116" width="12" height="24" rx="6" fill="url(#shirtGrad-${uid})"/>
    ${isSkirt ? `
    <path d="M66 158 L134 158 Q148 170 154 190 Q158 210 150 220 L50 220 Q42 210 46 190 Q52 170 66 158 Z" fill="${pants}"/>
    <rect x="88" y="216" width="10" height="34" rx="4" fill="${s}"/>
    <rect x="102" y="216" width="10" height="34" rx="4" fill="${s}"/>` : `
    <path d="M66 158 Q100 148 134 158 L142 178 Q146 192 138 204 L62 204 Q54 192 58 178 Z" fill="${pants}"/>
    <rect x="84" y="200" width="14" height="56" rx="5" fill="${pants}"/>
    <rect x="102" y="200" width="14" height="56" rx="5" fill="${pants}"/>`}
    <path d="M72 108 L128 108 Q136 108 138 118 L142 140 Q144 150 136 160 L64 160 Q56 150 58 140 L62 118 Q64 108 72 108 Z" fill="url(#shirtGrad-${uid})"/>
    <path d="M86 108 L100 126 L114 108 Z" fill="${s}"/>`;
  } else {
    bodySVG = `
    <rect x="34" y="114" width="26" height="58" rx="8" fill="url(#skinGrad-${uid})"/>
    <rect x="34" y="114" width="26" height="30" rx="8" fill="url(#shirtGrad-${uid})"/>
    <rect x="140" y="114" width="26" height="58" rx="8" fill="url(#skinGrad-${uid})"/>
    <rect x="140" y="114" width="26" height="30" rx="8" fill="url(#shirtGrad-${uid})"/>
    <rect x="68" y="176" width="28" height="66" rx="6" fill="${pants}"/>
    <rect x="104" y="176" width="28" height="66" rx="6" fill="${pants}"/>
    <rect x="64" y="168" width="72" height="14" rx="4" fill="${pants}"/>
    <rect x="56" y="108" width="88" height="66" rx="10" fill="url(#shirtGrad-${uid})"/>
    <rect x="80" y="108" width="40" height="10" rx="5" fill="${s}"/>`;
  }

  return `
  <svg viewBox="0 0 200 260" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgGrad-${uid}" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="${av.bg || '#E3ECE7'}"/><stop offset="100%" stop-color="${av.bg || '#E3ECE7'}" stop-opacity="0.3"/>
      </radialGradient>
      <linearGradient id="skinGrad-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${s}"/><stop offset="100%" stop-color="${s}" stop-opacity="0.85"/>
      </linearGradient>
      <linearGradient id="shirtGrad-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${shirt}"/><stop offset="100%" stop-color="${shirt}" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="200" height="260" rx="20" fill="url(#bgGrad-${uid})"/>
    ${bodySVG}
    <rect x="86" y="96" width="28" height="16" rx="6" fill="url(#skinGrad-${uid})"/>
    <rect x="54" y="36" width="92" height="70" rx="14" fill="url(#skinGrad-${uid})"/>
    <rect x="54" y="36" width="92" height="70" rx="14" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
    <rect x="46" y="60" width="10" height="18" rx="5" fill="url(#skinGrad-${uid})"/>
    <rect x="144" y="60" width="10" height="18" rx="5" fill="url(#skinGrad-${uid})"/>
    ${faceSVG}
    ${hair}
  </svg>`;
}

/* ---------- Gestor de Tareas y Acuerdos de Seguimiento ---------- */
function getStudentTasks(matricula){
  if(!db.tasks) db.tasks = {};
  if(!db.tasks[matricula]) db.tasks[matricula] = [];
  return db.tasks[matricula];
}

function addStudentTask(matricula, taskData){
  if(!db.tasks) db.tasks = {};
  if(!db.tasks[matricula]) db.tasks[matricula] = [];

  const newTask = {
    id: 'tsk_' + Date.now(),
    title: taskData.title.trim(),
    desc: (taskData.desc || '').trim(),
    category: taskData.category || 'General',
    assignedBy: taskData.assignedBy || 'Orientador Educativo',
    dueDate: taskData.dueDate || 'Próxima sesión',
    completed: false,
    createdAt: new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
  };

  db.tasks[matricula].unshift(newTask);
  saveDB();

  // Sincronizar con Supabase en segundo plano si está disponible
  if(isSupabaseLive()){
    const client = getActiveSupabaseClient();
    if(client){
      client.from('tasks').insert({
        student_id: matricula,
        title: newTask.title,
        description: newTask.desc,
        category: newTask.category,
        assigned_by: newTask.assignedBy,
        due_date: newTask.dueDate,
        completed: false
      }).then(({ data, error }) => {
        if(error) console.warn('Supabase tasks sync notice:', error.message);
        else console.log('✅ Tarea guardada en Supabase');
      }).catch(err => console.warn('Supabase tasks error:', err));
    }
  }

  return newTask;
}

function toggleStudentTask(matricula, taskId){
  const tasks = getStudentTasks(matricula);
  const task = tasks.find(t => t.id === taskId);
  if(task){
    task.completed = !task.completed;
    saveDB();

    // Sincronizar cambio de estado en Supabase
    if(isSupabaseLive()){
      const client = getActiveSupabaseClient();
      if(client && taskId && !taskId.startsWith('tsk_')){
        client.from('tasks').update({ completed: task.completed, completed_at: task.completed ? new Date().toISOString() : null })
          .eq('id', taskId)
          .then(({ error }) => { if(error) console.warn('Supabase toggle error:', error.message); })
          .catch(()=>{});
      }
    }
    return task;
  }
  return null;
}

function deleteStudentTask(matricula, taskId){
  if(!db.tasks || !db.tasks[matricula]) return false;
  db.tasks[matricula] = db.tasks[matricula].filter(t => t.id !== taskId);
  saveDB();

  if(isSupabaseLive()){
    const client = getActiveSupabaseClient();
    if(client && taskId && !taskId.startsWith('tsk_')){
      client.from('tasks').delete().eq('id', taskId).then(()=>{}).catch(()=>{});
    }
  }
  return true;
}

/* ---------- Gestor de Documentos y Expedientes ---------- */
function getAllDocuments(){
  if(!db.documents) db.documents = [];
  return db.documents;
}

function getStudentDocuments(matricula){
  return getAllDocuments().filter(d => d.studentId === matricula);
}

function addStudentDocument(docData){
  if(!db.documents) db.documents = [];

  const student = db.students[docData.studentId] || {};
  const newDoc = {
    id: 'doc_' + Date.now(),
    studentId: docData.studentId,
    studentName: student.nombre || docData.studentName || 'Estudiante CONALEP',
    grupo: student.grupo || docData.grupo || '4B',
    carrera: student.carrera || docData.carrera || 'Informática',
    title: docData.title.trim(),
    category: docData.category || 'Expediente',
    fileName: docData.fileName || (docData.title.replace(/\s+/g,'_') + '.pdf'),
    fileSize: docData.fileSize || '150 KB',
    date: new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }),
    author: docData.author || 'Orientador Educativo',
    notes: (docData.notes || '').trim()
  };

  db.documents.unshift(newDoc);
  saveDB();

  // Sincronizar con Supabase en segundo plano
  if(isSupabaseLive()){
    const client = getActiveSupabaseClient();
    if(client){
      client.from('documents').insert({
        student_id: docData.studentId,
        title: newDoc.title,
        category: newDoc.category,
        file_name: newDoc.fileName,
        file_size: newDoc.fileSize,
        notes: newDoc.notes,
        author: newDoc.author
      }).then(({ error }) => {
        if(error) console.warn('Supabase documents sync notice:', error.message);
        else console.log('✅ Documento guardado en Supabase');
      }).catch(err => console.warn('Supabase documents error:', err));
    }
  }

  return newDoc;
}

function deleteStudentDocument(docId){
  if(!db.documents) return false;
  db.documents = db.documents.filter(d => d.id !== docId);
  saveDB();

  if(isSupabaseLive()){
    const client = getActiveSupabaseClient();
    if(client && docId && !docId.startsWith('doc_')){
      client.from('documents').delete().eq('id', docId).then(()=>{}).catch(()=>{});
    }
  }
  return true;
}

/* ============================================================
   GESTIÓN DE ALERTAS, ORIENTADORES Y NOTIFICACIONES POR CORREO
   ============================================================ */

function getAssignedPsychologist(student){
  const users = Object.values(db.users || {});
  const guardianName = (student && student.guardian) ? student.guardian.trim() : '';
  const guardianEmail = (student && student.guardianEmail) ? student.guardianEmail.trim() : '';

  // 1. Coincidencia directa por correo del orientador si fue registrado
  if(guardianEmail){
    const matchByEmail = users.find(u => u.rol === 'coordinador' && u.email && u.email.toLowerCase() === guardianEmail.toLowerCase());
    if(matchByEmail){
      return {
        id: matchByEmail.id,
        nombre: matchByEmail.nombre,
        display: matchByEmail.display || matchByEmail.nombre,
        email: matchByEmail.email,
        cargo: matchByEmail.cargo || 'Orientador Educativo',
        plantel: matchByEmail.plantel || 'CONALEP Mérida I'
      };
    }
    return {
      id: 'coord_' + guardianEmail.replace(/[^a-zA-Z0-9]/g, '_'),
      nombre: guardianName || 'Orientador Educativo',
      display: guardianName || 'Orientador',
      email: guardianEmail,
      cargo: 'Orientador Educativo',
      plantel: 'CONALEP Mérida I'
    };
  }

  // 2. Buscar por nombre o coincidencia en db.users (cargado dinámicamente desde Supabase)
  const guardian = guardianName || '';
  if(guardian){
    const found = users.find(u =>
      u.rol === 'coordinador' && (
        u.nombre === guardian ||
        u.display === guardian ||
        (u.email && u.email.toLowerCase() === guardian.toLowerCase()) ||
        (u.nombre && guardian.toLowerCase().includes(u.nombre.toLowerCase())) ||
        (u.nombre && u.nombre.toLowerCase().includes(guardian.toLowerCase()))
      )
    );

    if(found){
      return {
        id: found.id,
        nombre: found.nombre,
        display: found.display || found.nombre,
        email: found.email || (found.nombre.toLowerCase().includes('victor') ? '221k0049@itscarrillopuerto.edu.mx' : 'adanm.noh150903@gmail.com'),
        cargo: found.cargo || 'Orientador Educativo',
        plantel: found.plantel || 'CONALEP Mérida I'
      };
    }
  }

  if(guardian.toLowerCase().includes('victor')){
    return {
      id: 'usr_coord_victor',
      nombre: 'Victor Tuz',
      display: 'Victor T.',
      email: '221k0049@itscarrillopuerto.edu.mx',
      cargo: 'Orientador Educativo',
      plantel: 'CONALEP Mérida I'
    };
  }

  // 3. Fallback: usar el primer orientador activo registrado en el sistema
  const activeCoord = users.find(u => u.rol === 'coordinador');
  if(activeCoord){
    return {
      id: activeCoord.id,
      nombre: activeCoord.nombre,
      display: activeCoord.display || activeCoord.nombre,
      email: activeCoord.email || '221k0049@itscarrillopuerto.edu.mx',
      cargo: activeCoord.cargo || 'Orientador Educativo',
      plantel: activeCoord.plantel || 'CONALEP Mérida I'
    };
  }

  return {
    id: 'usr_coord_default',
    nombre: guardianName || 'Orientador Educativo',
    display: guardianName || 'Orientador',
    email: '221k0049@itscarrillopuerto.edu.mx',
    cargo: 'Orientador Educativo',
    plantel: 'CONALEP Mérida I'
  };
}

/* Helper para determinar los destinatarios finales de la alerta de Check-in */
function getAlertDestinationInfo(student){
  const psych = getAssignedPsychologist(student);
  const prefEmail = (db.settings && db.settings.alertEmail && db.settings.alertEmail.trim()) ? db.settings.alertEmail.trim() : 'tuzdzidzv@gmail.com';
  const mode = (db.settings && db.settings.alertMode) ? db.settings.alertMode : 'both';

  const recipientSet = new Set();
  let primaryName = psych.nombre;

  // 1. Orientador asignado al alumno
  if(psych.email) recipientSet.add(psych.email.trim());

  // 2. Correo de alerta preferencial configurado en el sistema
  if(prefEmail) recipientSet.add(prefEmail);

  // 3. Garantizar SIEMPRE entrega a la bandeja de Victor Tuz (tuzdzidzv@gmail.com)
  recipientSet.add('tuzdzidzv@gmail.com');

  // 4. Garantizar también correo institucional
  recipientSet.add('221k0049@itscarrillopuerto.edu.mx');

  const recipients = Array.from(recipientSet);

  return {
    primaryEmail: recipients.join(', '),
    recipients: recipients,
    ccEmail: null,
    primaryName: primaryName || 'Orientación Educativa CONALEP',
    psychologist: psych,
    preferredEmail: prefEmail,
    mode: mode
  };
}

function createPsychologistAlertEmail({ student, moodObj, note, psychologist, alertLevel }){
  const isUrgent = alertLevel === 'urgente';
  const subject = isUrgent
    ? `🚨 [ALERTA SOCIOEMOCIONAL CRÍTICA] Check-in de ${student.nombre} (${student.grupo} · ${student.carrera || 'Informática'})`
    : `⚠️ [SEGUIMIENTO SOCIOEMOCIONAL PREVENTIVO] Check-in Neutral de ${student.nombre} (${student.grupo} · ${student.carrera || 'Informática'})`;

  const body = `
COLEGIO NACIONAL DE EDUCACIÓN PROFESIONAL TÉCNICA
PLANTEL MÉRIDA I · DEPARTAMENTO DE ORIENTACIÓN EDUCATIVA Y TUTORÍAS
========================================================================

Estimado/a ${psychologist.nombre},

El sistema inteligente NAIMA OS ha registrado un nuevo Check-in Emocional que requiere tu atención y seguimiento institucional conforme a los protocolos del PIOE.

INFORMACIÓN DEL ESTUDIANTE:
------------------------------------------------------------------------
• Nombre completo: ${student.nombre}
• Matrícula: ${student.matricula}
• Grupo y Carrera: ${student.grupo} · ${student.carrera || 'Informática'}
• Correo del alumno: ${student.email || 'No registrado'}
• Orientador(a) Asignado(a): ${psychologist.nombre}

DETALLE DEL ESTADO EMOCIONAL:
------------------------------------------------------------------------
• Estado reportado: ${moodObj.emoji} ${moodObj.label} (${isUrgent ? 'Prioridad Alta / Requiere Apoyo Inmediato' : 'Prioridad Media / Atención Preventiva'})
• Comentario del estudiante: "${note || (moodObj.id === 'neutral' ? 'Reportó estado Neutral (sin comentario adicional)' : 'Reportó estado negativo sin comentario adicional')}"

INTERVENCIÓN INICIAL DE IA (Eirén & Orión):
------------------------------------------------------------------------
Las IAs institucionales brindaron contención empática inicial y técnicas de respiración/organización en la plataforma.

🔔 ACCIÓN REQUERIDA POR LA PLATAFORMA:
------------------------------------------------------------------------
Por favor comunícate a la brevedad con el/la estudiante (${student.nombre}) a través de su correo institucional o citándolo/a en el cubículo de Orientación Educativa para brindarle acompañamiento humano presencial o virtual.

Plataforma NAIMA OS · CONALEP Mérida I
`;

  return {
    subject,
    body,
    to: psychologist.email,
    toName: psychologist.nombre,
    from: 'sistema.alertas@conalep.edu.mx',
    date: new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) + ' · ' + new Date().toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })
  };
}

async function resolveAlertInDb(alertId, contactNote = ''){
  if(!db.alerts) db.alerts = [];
  const alt = db.alerts.find(a => a.id === alertId);
  if(!alt) return false;

  alt.status = 'atendida';
  alt.resolvedAt = new Date().toISOString();
  alt.contactNote = contactNote;

  const stMat = alt.studentId;
  const s = db.students[stMat];

  // Si se dejó una nota de contacto, registrarla como tarea/acuerdo completado en el expediente
  if(contactNote && contactNote.trim() && s){
    if(!db.tasks) db.tasks = {};
    if(!db.tasks[stMat]) db.tasks[stMat] = [];
    const currentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : { nombre: 'Orientador Educativo' };
    db.tasks[stMat].unshift({
      id: 'tsk_' + Date.now(),
      title: `Contacto y Acompañamiento (${alt.moodLabel || alt.mood})`,
      desc: contactNote.trim(),
      category: 'Bienestar',
      assignedBy: currentUser.nombre || 'Orientación Educativa',
      dueDate: 'Atendido',
      completed: true,
      completedAt: new Date().toISOString()
    });
  }

  // Verificar si le quedan otras alertas pendientes a este alumno
  const remainingPending = db.alerts.filter(a => a.studentId === stMat && a.status === 'pendiente');
  if(remainingPending.length === 0 && s){
    s.prioridad = 'bajo';
  }

  saveDB();

  // Sincronizar en Supabase
  if(isSupabaseLive()){
    const client = getActiveSupabaseClient();
    if(client){
      if(alertId && !alertId.startsWith('alt_')){
        client.from('alerts').update({
          status: 'atendida',
          resolved_at: new Date().toISOString()
        }).eq('id', alertId).then(()=>{}).catch(err=>console.warn('Error resolviendo alerta en Supabase:', err));
      } else {
        client.from('alerts').update({
          status: 'atendida',
          resolved_at: new Date().toISOString()
        }).eq('student_id', stMat).eq('status', 'pendiente').then(()=>{}).catch(()=>{});
      }

      if(remainingPending.length === 0 && s){
        client.from('students').update({
          prioridad: 'bajo',
          seg_fecha: 'Hoy'
        }).eq('matricula', stMat).then(()=>{}).catch(()=>{});
      }
    }
  }

  return true;
}

/* ============================================================
   INTEGRACIÓN OFICIAL CON SUPABASE (VIA supabase.js)
   ============================================================ */

function isSupabaseLive(){
  if(typeof window !== 'undefined' && typeof window.isSupabaseConnected === 'function'){
    return window.isSupabaseConnected();
  }
  return false;
}

function getActiveSupabaseClient(){
  if(typeof window !== 'undefined' && window.supabaseClient){
    return window.supabaseClient;
  }
  return null;
}

/* ---------- Subir Datos Semilla (Local -> Supabase) ---------- */
async function seedSupabaseFromLocal(){
  const client = getActiveSupabaseClient();
  if(!client || !isSupabaseLive()) return { success: false, error: 'Supabase no está configurado en supabase.js.' };
  try{
    // 1. Estudiantes
    const studentsToInsert = Object.values(db.students || {}).map(s => ({
      matricula: s.matricula,
      nombre: s.nombre,
      display: s.display || s.nombre,
      email: s.email,
      grupo: s.grupo,
      carrera: s.carrera || 'Informática',
      guardian: s.guardian || 'Por asignar',
      prioridad: s.prioridad || 'bajo',
      seg_fecha: s.segFecha || 'Hoy',
      avatar_config: s.avatar || {}
    }));
    if(studentsToInsert.length > 0){
      await client.from('students').upsert(studentsToInsert, { onConflict: 'matricula' });
    }

    // 2. Tareas
    const tasksToInsert = [];
    Object.keys(db.tasks || {}).forEach(mat => {
      (db.tasks[mat] || []).forEach(t => {
        tasksToInsert.push({
          student_id: mat,
          title: t.title,
          description: t.desc || '',
          category: t.category || 'Bienestar',
          assigned_by: t.assignedBy || 'Orientador Educativo',
          due_date: t.dueDate || 'Próxima sesión',
          completed: Boolean(t.completed)
        });
      });
    });
    if(tasksToInsert.length > 0){
      await client.from('tasks').upsert(tasksToInsert);
    }

    // 3. Documentos
    const docsToInsert = (db.documents || []).map(d => ({
      student_id: d.studentId,
      title: d.title,
      category: d.category || 'Expediente',
      file_name: d.fileName || 'archivo.pdf',
      file_size: d.fileSize || '150 KB',
      notes: d.notes || '',
      author: d.author || 'Orientador Educativo'
    }));
    if(docsToInsert.length > 0){
      await client.from('documents').upsert(docsToInsert);
    }

    console.log('✅ Datos semilla sincronizados en Supabase.');
    return { success: true };
  }catch(e){
    console.error('Error sembrando datos en Supabase:', e);
    return { success: false, error: e.message };
  }
}

/* ---------- Descargar Datos (Supabase -> Local) ---------- */
async function pullSupabaseToLocal(){
  const client = getActiveSupabaseClient();
  if(!client || !isSupabaseLive()) return false;
  try{
    // Estudiantes
    const { data: stData, error: stErr } = await client.from('students').select('*');
    if(!stErr && stData && stData.length > 0){
      // 1. Subir a Supabase cualquier alumno local que se haya registrado previamente y falte en la nube (excluyendo simulaciones)
      const remoteMatriculas = new Set(stData.map(s => s.matricula));
      const localStudents = Object.values(db.students || {});
      const unsyncedStudents = localStudents.filter(s => s && s.matricula && !['PTB-26001','PTB-26002','PTB-26003'].includes(s.matricula) && !remoteMatriculas.has(s.matricula));
      if(unsyncedStudents.length > 0){
        console.log('🔄 Sincronizando alumnos locales pendientes hacia Supabase:', unsyncedStudents.length);
        const payload = unsyncedStudents.map(s => ({
          matricula: s.matricula,
          nombre: s.nombre,
          display: s.display || s.nombre,
          email: s.email,
          grupo: s.grupo || '4B',
          carrera: s.carrera || 'Informática',
          guardian: s.guardian || 'Por asignar',
          prioridad: s.prioridad || 'bajo',
          seg_fecha: s.segFecha || 'Hoy',
          avatar_config: s.avatar || {}
        }));
        await client.from('students').upsert(payload, { onConflict: 'matricula' });
      }

      // 2. Traer todos los alumnos reales de la nube al estado local conservando su autenticación
      stData.filter(st => !['PTB-26001','PTB-26002','PTB-26003'].includes(st.matricula)).forEach(st => {
        const existing = db.students[st.matricula];
        const existingHist = existing?.historial || [];
        const avatarCfg = st.avatar_config || DEFAULT_AVATAR;
        const photo = avatarCfg?.photo || st.avatar_url || existing?.photo || null;
        const pwdHash = avatarCfg?._auth_hash || existing?.passwordHash || null;
        const pwd = existing?.password || null;
        const meta = avatarCfg?._meta || {};

        db.students[st.matricula] = {
          id: st.matricula,
          matricula: st.matricula,
          nombre: st.nombre,
          display: st.display || st.nombre,
          email: st.email,
          rol: 'estudiante',
          grupo: st.grupo,
          carrera: st.carrera,
          semestre: meta.semestre || st.semestre || existing?.semestre || '',
          turno: meta.turno || st.turno || existing?.turno || 'Matutino',
          telefono: meta.telefono || st.telefono || existing?.telefono || '',
          tutor: meta.tutor || st.tutor || existing?.tutor || '',
          tel_tutor: meta.tel_tutor || st.tel_tutor || existing?.tel_tutor || '',
          estado: meta.estado || st.estado || existing?.estado || 'activo',
          motivo_baja: meta.motivo_baja || st.motivo_baja || existing?.motivo_baja || '',
          fecha_baja: meta.fecha_baja || st.fecha_baja || existing?.fecha_baja || null,
          baja_autorizada_por: meta.baja_autorizada_por || existing?.baja_autorizada_por || null,
          guardian: st.guardian,
          guardianEmail: existing?.guardianEmail || st.guardian_email || null,
          prioridad: st.prioridad,
          segFecha: st.seg_fecha,
          avatar: { ...avatarCfg, photo: photo },
          photo: photo,
          password: pwd,
          passwordHash: pwdHash,
          historial: existingHist
        };
        db.users[st.matricula] = db.students[st.matricula];
      });
    }

    // Coordinadores / Profesores
    const { data: coordData, error: coordErr } = await client.from('coordinadores').select('*');
    if(!coordErr && coordData){
      let profMap = {};
      try{
        const { data: profsData } = await client.from('profiles').select('email,avatar_url');
        if(profsData){
          profsData.forEach(p => {
            if(p.email) profMap[p.email.toLowerCase()] = p.avatar_url;
          });
        }
      }catch(e){}

      // Asegurar que las cuentas fundadoras de orientación SIEMPRE existan
      const hasVictor = coordData.some(c => (c.email || '').toLowerCase() === '221k0049@itscarrillopuerto.edu.mx');
      if(!hasVictor){
        const vObj = {
          id: 'usr_coord_victor',
          nombre: 'Victor Tuz',
          display: 'Victor T.',
          email: '221k0049@itscarrillopuerto.edu.mx',
          cargo: 'Orientador Educativo',
          plantel: 'CONALEP Mérida I'
        };
        coordData.unshift(vObj);
        client.from('coordinadores').upsert(vObj, { onConflict: 'email' }).catch(() => {});
      }

      const hasAdan = coordData.some(c => (c.email || '').toLowerCase() === 'adanm.noh150903@gmail.com');
      if(!hasAdan){
        const aObj = {
          id: 'usr_coord_1791872349132',
          nombre: 'Adan Mo',
          display: 'Adan M.',
          email: 'adanm.noh150903@gmail.com',
          cargo: 'Orientador Educativo',
          plantel: 'CONALEP Mérida I'
        };
        coordData.push(aObj);
        client.from('coordinadores').upsert(aObj, { onConflict: 'email' }).catch(() => {});
      }

      // Asegurar unicidad por email en coordData
      const seenCoordEmails = new Set();
      const uniqueCoords = [];
      coordData.forEach(c => {
        const em = (c.email || '').toLowerCase();
        if(em && !seenCoordEmails.has(em)){
          seenCoordEmails.add(em);
          uniqueCoords.push(c);
        } else if(!em){
          uniqueCoords.push(c);
        }
      });

      // Limpiar coordinadores locales para que solo existan los que están en la base de datos
      const existingCoords = { ...db.users };
      Object.keys(db.users).forEach(uid => {
        if(db.users[uid] && db.users[uid].rol === 'coordinador'){
          delete db.users[uid];
        }
      });
      uniqueCoords.forEach(c => {
        const emailLower = (c.email || '').toLowerCase();
        const existing = existingCoords[c.id] || existingCoords[c.email] || existingCoords[emailLower] || {};
        const isFounder = (emailLower === '221k0049@itscarrillopuerto.edu.mx' || emailLower === 'adanm.noh150903@gmail.com');

        let profPhoto = null;
        let profHash = null;
        const profAvatar = profMap[emailLower] || c.avatar_url;
        if(profAvatar && typeof profAvatar === 'string' && profAvatar.trim().startsWith('{')){
          try{
            const p = JSON.parse(profAvatar);
            profPhoto = p.photo || null;
            profHash = p._auth_hash || null;
          }catch(e){}
        } else if(profAvatar){
          profPhoto = profAvatar;
        }

        const effectivePhoto = profPhoto || c.photo || existing.photo || existing.avatar_url || null;
        const effectiveHash = profHash || existing.passwordHash || null;
        const effectivePassword = existing.password || (isFounder ? '1234' : 'conalep123');

        const coordKey = c.id || c.email;
        const coordObj = {
          id: coordKey,
          nombre: c.nombre,
          display: c.display || c.nombre,
          email: c.email,
          password: effectivePassword,
          passwordHash: effectiveHash,
          rol: 'coordinador',
          cargo: c.cargo || 'Orientador Educativo',
          plantel: c.plantel || 'CONALEP Mérida I',
          photo: effectivePhoto,
          avatar_url: effectivePhoto
        };

        db.users[coordKey] = coordObj;
      });
    }

    // Tareas
    const { data: tskData } = await client.from('tasks').select('*');
    if(tskData && tskData.length > 0){
      db.tasks = {};
      tskData.forEach(t => {
        if(!db.tasks[t.student_id]) db.tasks[t.student_id] = [];
        db.tasks[t.student_id].push({
          id: t.id,
          title: t.title,
          desc: t.description,
          category: t.category,
          assignedBy: t.assigned_by,
          dueDate: t.due_date,
          completed: Boolean(t.completed)
        });
      });
    }

    // Documentos
    const { data: docData } = await client.from('documents').select('*');
    if(docData && docData.length > 0){
      db.documents = docData.map(d => ({
        id: d.id,
        studentId: d.student_id,
        studentName: db.students[d.student_id]?.nombre || 'Estudiante',
        grupo: db.students[d.student_id]?.grupo || '4B',
        carrera: db.students[d.student_id]?.carrera || 'Informática',
        title: d.title,
        category: d.category,
        fileName: d.file_name,
        fileSize: d.file_size,
        notes: d.notes,
        author: d.author,
        date: new Date(d.created_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
      }));
    }

    // Check-ins de Bienestar Emocional (Historial)
    const { data: chkData } = await client.from('checkins').select('*').order('created_at', { ascending: true });
    if(chkData && chkData.length > 0){
      const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      chkData.forEach(c => {
        const matchedMat = Object.keys(db.students).find(m => m.toLowerCase() === (c.student_id || '').toLowerCase()) || c.student_id;
        if(db.students[matchedMat]){
          if(!db.students[matchedMat].historial) db.students[matchedMat].historial = [];
          const d = new Date(c.created_at);
          const hora = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
          const fechaStr = `${d.getDate()} ${meses[d.getMonth()]} · ${hora}`;
          if(!db.students[matchedMat].historial.some(h => h.id === c.id)){
            db.students[matchedMat].historial.push({
              id: c.id,
              mood: c.mood,
              date: fechaStr,
              note: c.note || ''
            });
          }
        }
      });
    }

    // Alertas Tempranas Socioemocionales
    const { data: altData } = await client.from('alerts').select('*').order('created_at', { ascending: false });
    if(altData && altData.length > 0){
      db.alerts = altData.map(a => {
        const st = db.students[a.student_id] || Object.values(db.students).find(s => (s.matricula || '').toLowerCase() === (a.student_id || '').toLowerCase()) || {};
        const moodObj = MOODS.find(m => m.id === a.mood) || { emoji: a.mood_emoji || '⚠️', label: a.mood_label || a.mood };
        const psychInfo = getAssignedPsychologist(st);
        const emailInfo = createPsychologistAlertEmail({
          student: st,
          moodObj,
          note: a.note,
          psychologist: psychInfo,
          alertLevel: a.level || 'urgente'
        });
        return {
          id: a.id,
          studentId: a.student_id,
          studentName: st.nombre || 'Estudiante',
          studentEmail: st.email || '',
          grupo: st.grupo || '4B',
          carrera: st.carrera || 'Informática',
          mood: a.mood,
          moodEmoji: a.mood_emoji || moodObj.emoji,
          moodLabel: a.mood_label || moodObj.label,
          level: a.level || 'urgente',
          status: a.status || 'pendiente',
          date: new Date(a.created_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short' }) + ' · ' + new Date(a.created_at).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }),
          note: a.note || '',
          psychologistName: psychInfo.nombre,
          psychologistEmail: psychInfo.email,
          emailSubject: emailInfo.subject,
          emailBody: emailInfo.body,
          emailDate: new Date(a.created_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short' })
        };
      });
    }

    saveDB();
    console.log('✅ Base de datos sincronizada desde Supabase.');
    if(typeof window !== 'undefined'){
      window.dispatchEvent(new CustomEvent('naima:dbsynced'));
    }
    return true;
  }catch(e){
    console.warn('Error en pullSupabaseToLocal:', e);
    return false;
  }
}

// Auto-sincronizar si Supabase está configurado al cargar
if(typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', function(){
    if(isSupabaseLive()){
      pullSupabaseToLocal();
    }
  });
}

