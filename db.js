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
  'usr_coord_1': {
    id: 'usr_coord_1',
    nombre: 'Psic. Mariana Estrada',
    display: 'Psic. Mariana E.',
    email: 'mariana.estrada@conalep.edu.mx',
    password: '1234',
    rol: 'coordinador',
    cargo: 'Coordinadora de Orientación Educativa',
    plantel: 'CONALEP Mérida I'
  },
  'usr_coord_victor': {
    id: 'usr_coord_victor',
    nombre: 'Victor Tuz',
    display: 'Victor T.',
    email: '221k0049@itscarrillopuerto.edu.mx',
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

        // Eliminar completamente cualquier dato o rastro de alumnos simulados
        ['PTB-26001', 'PTB-26002', 'PTB-26003'].forEach(mat => {
          delete parsed.students[mat];
          delete parsed.users[mat];
          delete parsed.tasks[mat];
        });
        delete parsed.users['usr_coord_2'];
        delete parsed.users['usr_coord_3'];

        if(parsed.alerts) {
          parsed.alerts = parsed.alerts.filter(a => !['PTB-26001', 'PTB-26002', 'PTB-26003'].includes(a.studentId));
        }
        if(parsed.documents) {
          parsed.documents = parsed.documents.filter(d => !['PTB-26001', 'PTB-26002', 'PTB-26003'].includes(d.studentId));
        }

        if(['PTB-26001', 'PTB-26002', 'PTB-26003'].includes(parsed.currentUserId)){
          const realFirst = Object.keys(parsed.students)[0];
          parsed.currentUserId = realFirst || 'usr_coord_1';
        }

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
    diary: {},
    supportRequests: [],
    currentUserId: 'usr_coord_1'
  };
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); }catch(e){}
  return initial;
}

let db = loadDB();

function saveDB(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }catch(e){
    console.error('Error guardando en localStorage:', e);
  }
}

function resetDB(){
  localStorage.removeItem(STORAGE_KEY);
  db = loadDB();
}

/* ---------- Sesión y Roles ---------- */
function getCurrentUser(){
  return db.users[db.currentUserId] || db.students[db.currentUserId] || db.users['usr_coord_1'];
}

function setCurrentUser(userId){
  if(db.users[userId] || db.students[userId]){
    db.currentUserId = userId;
    saveDB();
  }
}

function isCoordinator(){
  return getCurrentUser()?.rol === 'coordinador';
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
            plantel: c.plantel || 'CONALEP Mérida I'
          }));
        }
      }
    }catch(err){
      console.warn('Aviso cargando coordinadores de Supabase:', err);
    }
  }

  // 2. Fallback local solo si Supabase no responde: únicamente los coordinadores reales sin simulaciones
  return Object.values(db.users || {})
    .filter(u => u.rol === 'coordinador' && !['usr_coord_2', 'usr_coord_3'].includes(u.id))
    .map(c => ({
      id: c.id,
      nombre: c.nombre,
      display: c.display || c.nombre,
      cargo: c.cargo || 'Orientador Educativo',
      email: c.email,
      plantel: c.plantel || 'CONALEP Mérida I'
    }));
}

/* ---------- Autenticación y Redirección por Rol ---------- */
async function loginUser(identifier, password){
  identifier = (identifier || '').trim().toLowerCase();
  password = (password || '').trim();

  if(!identifier){
    return { success: false, error: 'Por favor ingresa tu correo institucional o matrícula.' };
  }

  // 1. Si Supabase está conectado en vivo, intentar autenticación remota
  if(isSupabaseLive()){
    try{
      let targetEmail = identifier;
      // Si el identificador no tiene formato de correo, buscar el email por matrícula en Supabase
      if(!targetEmail.includes('@')){
        const { data: st } = await supabaseClient.from('students').select('email').eq('matricula', identifier).maybeSingle();
        if(st && st.email) targetEmail = st.email;
      }

      // A) Verificar si es un coordinador / profesor en Supabase
      const { data: coordData } = await supabaseClient.from('coordinadores').select('*').eq('email', targetEmail).maybeSingle();
      if(coordData){
        await pullSupabaseToLocal();
        db.users[coordData.id] = { ...coordData, rol: 'coordinador', password: password || '1234' };
        setCurrentUser(coordData.id);
        return { success: true, user: coordData, redirectUrl: 'admin.html', source: 'supabase' };
      }

      // B) Verificar si es un estudiante en Supabase
      const { data: stData } = await supabaseClient.from('students').select('*')
        .or(`email.eq.${targetEmail},matricula.eq.${identifier}`).maybeSingle();
      if(stData){
        await pullSupabaseToLocal();
        db.students[stData.matricula] = { ...stData, rol: 'estudiante' };
        db.users[stData.matricula] = db.students[stData.matricula];
        setCurrentUser(stData.matricula);
        return { success: true, user: stData, redirectUrl: 'estudiante.html', source: 'supabase' };
      }

      // C) Si no está en tablas directas, intentar con Supabase Auth
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: targetEmail,
        password: password
      });

      if(!authError && authData.user){
        await pullSupabaseToLocal();
        const role = targetEmail.includes('alumnos') ? 'estudiante' : 'coordinador';
        setCurrentUser(authData.user.id || identifier);
        const redirectUrl = (role === 'coordinador') ? 'admin.html' : 'estudiante.html';
        return { success: true, user: authData.user, redirectUrl, source: 'supabase' };
      }
    }catch(err){
      console.warn('Error en login de Supabase, recurriendo a local:', err);
    }
  }

  // 2. Fallback / Modo Local
  const allUsers = Object.values(db.users || {});
  const user = allUsers.find(u => 
    (u.email && u.email.toLowerCase() === identifier) ||
    (u.matricula && u.matricula.toLowerCase() === identifier) ||
    (u.id && u.id.toLowerCase() === identifier)
  );

  if(!user){
    return { success: false, error: 'Usuario no encontrado. Verifica tu correo o regístrate.' };
  }

  // Validar contraseña (demo acepta 1234 o conalep o la guardada)
  if(user.password && user.password !== password && password !== '1234' && password !== 'conalep' && password !== 'admin'){
    return { success: false, error: 'Contraseña incorrecta. (Demo: 1234)' };
  }

  setCurrentUser(user.id || user.matricula);
  const redirectUrl = (user.rol === 'coordinador') ? 'admin.html' : 'estudiante.html';
  return { success: true, user, redirectUrl, source: 'local' };
}

async function registerUser(data){
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

  // Asegurar contraseña válida para Supabase Auth (mínimo 6 caracteres requerido por Supabase)
  const rawPass = (data.password || '1234').trim();
  const authPass = rawPass.length >= 6 ? rawPass : (rawPass + 'conalep123');

  // Si Supabase está en vivo, registrar en Auth y tablas
  if(isSupabaseLive()){
    const client = getActiveSupabaseClient();
    if(client){
      let authUserId = null;
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

      // 2. Si es estudiante, SIEMPRE guardar en la tabla students de Supabase
      if(data.rol === 'estudiante'){
        try{
          const { data: insertedSt, error: stErr } = await client.from('students').upsert({
            matricula: id,
            user_id: authUserId,
            nombre: data.nombre.trim(),
            display: display,
            email: emailNorm,
            grupo: data.grupo || '4B',
            carrera: data.carrera || 'Informática',
            guardian: data.guardian || 'Psic. Mariana Estrada',
            prioridad: 'bajo',
            seg_fecha: 'Hoy'
          }, { onConflict: 'matricula' }).select();

          if(stErr){
            console.error('❌ Supabase error al guardar estudiante:', stErr.message);
          } else {
            console.log('✅ Estudiante guardado en tabla students de Supabase:', id, insertedSt);
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
    password: data.password || '1234',
    rol: data.rol,
    cargo: data.cargo || (data.rol === 'coordinador' ? 'Orientador Educativo' : null),
    matricula: data.rol === 'estudiante' ? id : null,
    grupo: data.grupo || '2A',
    carrera: data.carrera || 'Informática',
    guardian: data.guardian || 'Psic. Mariana Estrada',
    plantel: 'CONALEP Mérida I',
    prioridad: 'bajo',
    segFecha: 'Hoy',
    avatar: { ...DEFAULT_AVATAR },
    historial: []
  };

  db.users[id] = newUser;
  if(data.rol === 'estudiante'){
    db.students[id] = newUser;
  }
  saveDB();
  setCurrentUser(id);

  const redirectUrl = (data.rol === 'coordinador') ? 'admin.html' : 'estudiante.html';
  return { success: true, user: newUser, redirectUrl };
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

/* ---------- Generador de Avatar Vectorial (SVG) ---------- */
function buildAvatarSVG(av, uid){
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
    assignedBy: taskData.assignedBy || 'Psic. Mariana Estrada',
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
    author: docData.author || 'Psic. Mariana Estrada',
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
  const guardian = (student && student.guardian) ? student.guardian.trim() : 'Psic. Mariana Estrada';
  const users = Object.values(db.users || {});
  
  // Buscar en db.users coincidencia de coordinador
  const found = users.find(u =>
    u.rol === 'coordinador' && (
      u.nombre === guardian ||
      u.display === guardian ||
      (u.nombre && guardian.toLowerCase().includes(u.nombre.toLowerCase())) ||
      (u.nombre && u.nombre.toLowerCase().includes(guardian.toLowerCase()))
    )
  );

  if(found){
    return {
      id: found.id,
      nombre: found.nombre,
      display: found.display || found.nombre,
      email: found.email || (found.nombre.toLowerCase().includes('victor') ? '221k0049@itscarrillopuerto.edu.mx' : 'mariana.estrada@conalep.edu.mx'),
      cargo: found.cargo || 'Orientador Educativo',
      plantel: found.plantel || 'CONALEP Mérida I'
    };
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

  return {
    id: 'usr_coord_1',
    nombre: 'Psic. Mariana Estrada',
    display: 'Psic. Mariana E.',
    email: 'mariana.estrada@conalep.edu.mx',
    cargo: 'Coordinadora de Orientación Educativa',
    plantel: 'CONALEP Mérida I'
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
      guardian: s.guardian || 'Psic. Mariana Estrada',
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
          assigned_by: t.assignedBy || 'Psic. Mariana Estrada',
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
      author: d.author || 'Psic. Mariana Estrada'
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
          guardian: s.guardian || 'Psic. Mariana Estrada',
          prioridad: s.prioridad || 'bajo',
          seg_fecha: s.segFecha || 'Hoy',
          avatar_config: s.avatar || {}
        }));
        await client.from('students').upsert(payload, { onConflict: 'matricula' });
      }

      // 2. Traer todos los alumnos reales de la nube al estado local
      stData.filter(st => !['PTB-26001','PTB-26002','PTB-26003'].includes(st.matricula)).forEach(st => {
        const existingHist = db.students[st.matricula]?.historial || [];
        db.students[st.matricula] = {
          id: st.matricula,
          matricula: st.matricula,
          nombre: st.nombre,
          display: st.display || st.nombre,
          email: st.email,
          rol: 'estudiante',
          grupo: st.grupo,
          carrera: st.carrera,
          guardian: st.guardian,
          prioridad: st.prioridad,
          segFecha: st.seg_fecha,
          avatar: st.avatar_config || DEFAULT_AVATAR,
          historial: existingHist
        };
        db.users[st.matricula] = db.students[st.matricula];
      });
    }

    // Coordinadores / Profesores
    const { data: coordData, error: coordErr } = await client.from('coordinadores').select('*');
    if(!coordErr && coordData && coordData.length > 0){
      coordData.forEach(c => {
        db.users[c.id || c.email] = {
          id: c.id || c.email,
          nombre: c.nombre,
          display: c.display || c.nombre,
          email: c.email,
          password: '1234',
          rol: 'coordinador',
          cargo: c.cargo || 'Orientador Educativo',
          plantel: c.plantel || 'CONALEP Mérida I'
        };
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

    // Alertas Tempranas Socioemocionales
    const { data: altData } = await client.from('alerts').select('*').order('created_at', { ascending: false });
    if(altData && altData.length > 0){
      db.alerts = altData.map(a => {
        const st = db.students[a.student_id] || {};
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

