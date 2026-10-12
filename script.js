/* ============================================================
   NAIMA OS · CONALEP — Orientación Educativa
   Lógica de la plataforma (demo en memoria, sin base de datos)
   ============================================================ */

/* ---------- Estados de ánimo ---------- */
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

/* ---------- Datos y Persistencia Local (Esquema compatible con Supabase) ---------- */
const DEFAULT_AVATAR = { skin:'#E8B48C', hair:'corto', hairColor:'#2B1B12', shirt:'#2F6F62',
  pants:'#1F4E44', outfit:'#2F6F62', face:'default', accessory:'ninguno', body:'masculino', bottom:'pantalon', bg:'#E3ECE7' };

const STORAGE_KEY = 'naima_os_conalep_v2';

// Usuarios de demostración iniciales (CONALEP Plantel Mérida I)
const SEED_USERS = {
  'usr_coord_1': {
    id: 'usr_coord_1',
    nombre: 'Psic. Mariana Estrada',
    display: 'Psic. Mariana E.',
    email: 'mariana.estrada@conalep.edu.mx',
    rol: 'coordinador',
    cargo: 'Coordinadora de Orientación Educativa',
    plantel: 'CONALEP Mérida I'
  },
  'PTB-26001': {
    id: 'PTB-26001',
    matricula: 'PTB-26001',
    nombre: 'Carlos Mendoza López',
    display: 'Carlos M.',
    email: 'carlos.mendoza@alumnos.conalep.edu.mx',
    rol: 'estudiante',
    grupo: '4B',
    carrera: 'Informática',
    guardian: 'Psic. Mariana Estrada',
    prioridad: 'alto',
    segFecha: '11 oct',
    avatar: { ...DEFAULT_AVATAR, bg:'#E3ECE7', hair:'corto', hairColor:'#1B1B1B', shirt:'#0E7C7B' },
    historial: [
      { id:'chk_1', mood:'estresado', date:'11 oct · 18:30', note:'Semana de evaluaciones y proyectos integradores.' },
      { id:'chk_0', mood:'tranquilo', date:'09 oct · 10:15', note:'Buen día en el taller de programación.' }
    ]
  },
  'PTB-26002': {
    id: 'PTB-26002',
    matricula: 'PTB-26002',
    nombre: 'Valeria Gómez Pech',
    display: 'Valeria G.',
    email: 'valeria.gomez@alumnos.conalep.edu.mx',
    rol: 'estudiante',
    grupo: '2A',
    carrera: 'Enfermería General',
    guardian: 'Psic. Mariana Estrada',
    prioridad: 'medio',
    segFecha: '10 oct',
    avatar: { ...DEFAULT_AVATAR, bg:'#F3E9D9', body:'femenino', bottom:'falda', hair:'largo', hairColor:'#2B1B12', shirt:'#C2185B' },
    historial: [
      { id:'chk_2', mood:'triste', date:'10 oct · 14:00', note:'Cansancio por prácticas clínicas y temas familiares.' }
    ]
  },
  'PTB-26003': {
    id: 'PTB-26003',
    matricula: 'PTB-26003',
    nombre: 'Alejandro Ruiz Cauich',
    display: 'Alejandro R.',
    email: 'alejandro.ruiz@alumnos.conalep.edu.mx',
    rol: 'estudiante',
    grupo: '6A',
    carrera: 'Mecatrónica',
    guardian: 'Psic. Mariana Estrada',
    prioridad: 'bajo',
    segFecha: '08 oct',
    avatar: { ...DEFAULT_AVATAR, bg:'#DCEBE6', hair:'rizado', hairColor:'#5B3A29', shirt:'#17795B' },
    historial: [
      { id:'chk_3', mood:'feliz', date:'08 oct · 11:20', note:'Aprobé la certificación del módulo técnico con buena nota.' }
    ]
  }
};

const SEED_ALERTS = [
  {
    id: 'alt_1',
    studentId: 'PTB-26001',
    studentName: 'Carlos Mendoza López',
    grupo: '4B',
    carrera: 'Informática',
    mood: 'estresado',
    moodEmoji: '😣',
    moodLabel: 'Estresado',
    level: 'urgente',
    status: 'pendiente', // 'pendiente' | 'atendida'
    date: '11 oct · 18:30',
    note: 'Semana de evaluaciones y proyectos integradores.'
  },
  {
    id: 'alt_2',
    studentId: 'PTB-26002',
    studentName: 'Valeria Gómez Pech',
    grupo: '2A',
    carrera: 'Enfermería General',
    mood: 'triste',
    moodEmoji: '😔',
    moodLabel: 'Triste',
    level: 'urgente',
    status: 'pendiente',
    date: '10 oct · 14:00',
    note: 'Cansancio por prácticas clínicas y temas familiares.'
  }
];

function loadDB(){
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved){
      const parsed = JSON.parse(saved);
      if(parsed && parsed.students && Object.keys(parsed.students).length > 0){
        return parsed;
      }
    }
  }catch(e){
    console.warn('Error al leer localStorage:', e);
  }
  const initial = {
    users: { ...SEED_USERS },
    students: {
      'PTB-26001': SEED_USERS['PTB-26001'],
      'PTB-26002': SEED_USERS['PTB-26002'],
      'PTB-26003': SEED_USERS['PTB-26003'],
    },
    alerts: [ ...SEED_ALERTS ],
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
  nav(isCoordinator() ? 'inicio' : 'student_inicio');
  renderUserProfile();
  renderRoleBanner();
  renderSidebar();
}

/* ---------- Gestión de Sesión y Roles ---------- */
function getCurrentUser(){
  return db.users[db.currentUserId] || db.students[db.currentUserId] || db.users['usr_coord_1'];
}

function isCoordinator(){
  return getCurrentUser()?.rol === 'coordinador';
}

function switchUser(userId){
  if(db.users[userId] || db.students[userId]){
    db.currentUserId = userId;
    saveDB();
    renderUserProfile();
    renderRoleBanner();
    renderSidebar();
    const defaultSec = isCoordinator() ? 'inicio' : 'student_inicio';
    nav(defaultSec);
  }
}

function toggleDemoRole(){
  if(isCoordinator()){
    // Cambiar a estudiante demo Carlos
    switchUser('PTB-26001');
  } else {
    // Cambiar a coordinador demo Mariana
    switchUser('usr_coord_1');
  }
}

/* ---------- Navegación Separada por Rol ---------- */
const SECTIONS_COORD = [
  { id:'inicio',       label:'Inicio',           icon:'◆' },
  { id:'alumnos',      label:'Protoestrellas',   icon:'⊕' },
  { id:'pioe',         label:'PIOE',             icon:'◎', sep:'MÓDULOS' },
  { id:'eirene',       label:'EIRÉNÉ',           icon:'◌' },
  { id:'orion',        label:'ORION',            icon:'✧' },
  { id:'catalogo',     label:'Documentos',       icon:'▤' },
  { id:'nova',         label:'NOVA',             icon:'◇' },
  { id:'campus3d',     label:'Campus 3D',        icon:'△' },
  { id:'config',       label:'Configuración',    icon:'⚙', sep:'SISTEMA' },
];

const SECTIONS_STUDENT = [
  { id:'student_inicio',  label:'Mi Espacio',        icon:'🏠' },
  { id:'student_checkin', label:'Check-in Emocional',icon:'💖' },
  { id:'student_eirene',  label:'Hablar con Eirén',  icon:'🌸', sep:'COMPAÑERAS IA' },
  { id:'student_orion',   label:'Consejos de Orión', icon:'✧' },
  { id:'student_campus3d',label:'Campus 3D & Juegos',icon:'🎮', sep:'ACTIVIDADES' },
  { id:'student_diario',  label:'Mi Diario',         icon:'📓' },
];

let currentSection = 'inicio';

/* ---------- Render Barra de Usuario & Rol ---------- */
function renderUserProfile(){
  const el = document.getElementById('userProfileBlock');
  if(!el) return;
  const user = getCurrentUser();
  const isCoord = isCoordinator();
  const roleName = isCoord ? 'Coordinador(a)' : 'Estudiante';
  const roleClass = isCoord ? 'coord' : 'student';
  const roleIcon = isCoord ? '🛡️' : '🎓';

  el.innerHTML = `
    <div class="up-avatar ${isCoord ? '' : 'student-av'}">
      ${initialOf(user.display || user.nombre)}
    </div>
    <div class="up-details">
      <span class="up-name" title="${user.nombre}">${user.display || user.nombre}</span>
      <span class="up-role-tag ${roleClass}">${roleIcon} ${roleName}</span>
    </div>
    <button class="up-switch-btn" onclick="openRoleSwitcherModal()" title="Cambiar rol o usuario">⇄</button>
  `;
}

function renderRoleBanner(){
  const el = document.getElementById('roleBarBanner');
  if(!el) return;
  const user = getCurrentUser();
  const isCoord = isCoordinator();
  const pendingCount = (db.alerts || []).filter(a => a.status === 'pendiente').length;

  el.innerHTML = `
    <div class="rb-left">
      <span class="rb-tag">VISTA ACTIVA</span>
      <span class="rb-current ${isCoord ? 'coord' : 'student'}">
        ${isCoord ? '🛡️ Rol Coordinador' : '🎓 Rol Estudiante'} (${user.display || user.nombre})
      </span>
      <span class="rb-desc">
        ${isCoord 
          ? `Supervisión general, alertas (${pendingCount} pendientes) y expedientes.` 
          : 'Check-in diario, acompañamiento IA con Eirén y Orión, campus 3D.'}
      </span>
    </div>
    <div class="rb-actions">
      <button class="rb-btn-toggle" onclick="toggleDemoRole()">
        ⇄ Cambiar a ${isCoord ? 'Vista Estudiante' : 'Vista Coordinador'}
      </button>
      <button class="rb-btn-manage" onclick="openRoleSwitcherModal()">
        👥 Cambiar usuario
      </button>
    </div>
  `;
}

/* ---------- Estado PIOE ---------- */
let pioeOpen = null;

const PIOE_FLOW = ['Planeación','Diagnóstico','Priorización','Intervención','Seguimiento','Evaluación'];

const PIOE_AREAS = [
  { t:'Psicopedagógica',  d:'Trayectoria, hábitos, barreras y permanencia.' },
  { t:'Vocacional',       d:'Proyecto de vida y decisiones académicas.' },
  { t:'Vida saludable',   d:'Promoción, autocuidado y prevención.' },
  { t:'Desarrollo social',d:'Convivencia, pertenencia y participación.' },
];

const PIOE_INSTRUMENTS = [
  { id:'phq',    title:'PHQ-A / PHQ-9',                              desc:'Versión autorizada por la institución', restricted:false },
  { id:'gad',    title:'GAD-7',                                      desc:'Versión autorizada por la institución', restricted:false },
  { id:'assist', title:'ASSIST v3.1',                                desc:'Aplicación por personal capacitado',    restricted:false },
  { id:'riesgo', title:'Evaluación institucional de riesgo crítico', desc:'Solo personal expresamente autorizado', restricted:true  },
];

/* ---------- Estado EIRÉNE ---------- */
let eireneMood = null;
let eireneVoiceOn = false;
let eireneDiary = '';

const EIRENE_MOODS = [
  { id:'triste',    emoji:'😢', label:'Triste',    pct:18,
    reply:'Gracias por decírmelo. Podemos ir con calma y elegir qué te ayudaría ahora.' },
  { id:'ansioso',   emoji:'😰', label:'Ansioso/a', pct:30,
    reply:'Podemos bajar el ritmo un momento. Tú decides si quieres hablar o hacer una actividad breve.' },
  { id:'neutral',   emoji:'😐', label:'Neutral',   pct:50,
    reply:'Está bien estar simplemente aquí. Podemos explorar cómo va tu día sin forzar nada.' },
  { id:'bien',      emoji:'🙂', label:'Bien',      pct:70,
    reply:'Me alegra saberlo. Podemos aprovechar este momento para cuidar algo importante para ti.' },
  { id:'feliz',     emoji:'😊', label:'Feliz',     pct:86,
    reply:'Qué bueno que haya algo agradable hoy. También podemos guardar qué te ayudó a sentirte así.' },
  { id:'increible', emoji:'🤩', label:'Increíble', pct:100,
    reply:'Suena a un buen momento. Si quieres, podemos convertirlo en un recuerdo o una pequeña meta.' },
];

const EIRENE_ACTIVITIES = [
  { icon:'💧', name:'Órbita',     sub:'Respiración y pausa' },
  { icon:'🌈', name:'Prisma',     sub:'Reconocer emociones' },
  { icon:'🧭', name:'Brújula',    sub:'Explorar decisiones' },
  { icon:'🌱', name:'Semillas',   sub:'Pequeñas metas' },
  { icon:'💛', name:'Puentes',    sub:'Comunicación' },
  { icon:'✨', name:'Fortalezas', sub:'Reconocer recursos' },
];

/* ---------- Estado DOCUMENTOS ---------- */
const DOC_FLOWS = [
  { num:'01', t:'Cédula digital',            d:'Expediente base reutilizable.' },
  { num:'02', t:'Bitácora socioemocional',   d:'Atención y seguimiento PIOE.' },
  { num:'03', t:'Consentimiento CONECTA',    d:'Consentimiento y trazabilidad.' },
];

const DOC_CATALOG = [
  { title:'Cédula del estudiante',                          area:'CONALEP / expediente',  type:'Expediente',              status:'Digitalizable' },
  { title:'Bitácora de atención socioemocional',            area:'Orientación Educativa', type:'PIOE',                    status:'Flujo diseñado' },
  { title:'Acuerdo de confidencialidad y manejo de datos',  area:'Red CONECTA',           type:'Consentimiento',          status:'Formulario digital' },
  { title:'PHQ-A / PHQ-9',                                  area:'Salud',                 type:'Instrumento',             status:'Motor preparado; cargar versión autorizada' },
  { title:'GAD-7',                                          area:'Salud',                 type:'Instrumento',             status:'Motor preparado; cargar versión autorizada' },
  { title:'ASSIST v3.1',                                    area:'Salud / CONASAMA',      type:'Instrumento',             status:'Motor preparado; cargar versión autorizada' },
  { title:'Evaluación institucional de riesgo crítico',     area:'Salud',                 type:'Instrumento restringido', status:'Acceso restringido y personal autorizado' },
];

function eireneGreeting(){
  const h = new Date().getHours();
  if(h < 12) return { text:'¡Buenos días!', icon:'☀️' };
  if(h < 19) return { text:'¡Buenas tardes!', icon:'🌤️' };
  return { text:'¡Buenas noches!', icon:'🌙' };
}

function renderSidebar(){
  const navEl = document.getElementById('navlist');
  const sections = isCoordinator() ? SECTIONS_COORD : SECTIONS_STUDENT;
  const pendingAlerts = (db.alerts || []).filter(a => a.status === 'pendiente').length;

  navEl.innerHTML = sections.map(s => {
    const sep = s.sep ? `<div class="nav-sep">${s.sep}</div>` : '';
    const alertChip = (isCoordinator() && s.id === 'inicio' && pendingAlerts > 0)
      ? `<span class="nav-alert-badge">${pendingAlerts}</span>`
      : '';
    return `${sep}<button data-sec="${s.id}" onclick="nav('${s.id}')"><span class="nicon">${s.icon}</span>${s.label} ${alertChip}</button>`;
  }).join('');
}

function nav(sec){
  if(sec !== 'pioe') pioeOpen = null;
  currentSection = sec;
  document.querySelectorAll('#navlist button').forEach(b =>
    b.classList.toggle('active', b.dataset.sec === sec));
  closeSidebarMobile();
  const el = document.getElementById('content');
  window.scrollTo(0,0);

  // Vistas de Coordinador
  if(sec === 'inicio')             el.innerHTML = renderInicio();
  else if(sec === 'alumnos')       el.innerHTML = renderProtoestrellas();
  else if(sec === 'pioe')          el.innerHTML = renderPioe();
  else if(sec === 'eirene')        el.innerHTML = renderEirene();
  else if(sec === 'orion')         el.innerHTML = renderOrionPanel();
  else if(sec === 'catalogo')      el.innerHTML = renderDocumentos();
  else if(sec === 'nova')          el.innerHTML = renderNova();
  else if(sec === 'campus3d')      el.innerHTML = renderCampus3DCoordinador();

  // Vistas de Estudiante
  else if(sec === 'student_inicio')   el.innerHTML = renderStudentInicio();
  else if(sec === 'student_checkin')  el.innerHTML = renderStudentCheckin();
  else if(sec === 'student_eirene')   el.innerHTML = renderStudentEirene();
  else if(sec === 'student_orion')    el.innerHTML = renderStudentOrion();
  else if(sec === 'student_campus3d') el.innerHTML = renderStudentCampus3D();
  else if(sec === 'student_diario')   el.innerHTML = renderStudentDiario();

  else el.innerHTML = renderStub(sec);
}

function renderStub(sec){
  const allSecs = [...SECTIONS_COORD, ...SECTIONS_STUDENT];
  const s = allSecs.find(x => x.id === sec) || { id:sec, label:'Módulo', icon:'◇' };
  const descs = {
    guardianes:'Red de apoyo y referencias a áreas institucionales (tutorías, trabajo social, psicopedagogía).',
    constelaciones:'Mapa grupal del bienestar: agrupaciones, tendencias y comparativos entre grupos.',
    config:'Ajustes de la plataforma, gestión de usuarios del personal y preferencias del módulo.',
  };
  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">NAIMA OS · CONALEP</span>
        <h1>${s.label}</h1>
        <p>${descs[sec] || 'Módulo institucional de la plataforma.'}</p>
      </div>
      <span class="demo-chip">Datos de demostración</span>
    </div>
    <div class="stub-panel">
      <div class="big">${s.icon}</div>
      <h3>${s.label} · en preparación</h3>
      <p>Este módulo forma parte de la hoja de ruta de NAIMA OS. Puedes continuar navegando los módulos activos desde el menú lateral.</p>
    </div>`;
}

/* ---------- Helpers de datos ---------- */
function studentsList(){ return Object.values(db.students || {}); }
function lastMood(s){ const h = s.historial && s.historial[s.historial.length-1]; return h ? MOODS.find(m=>m.id===h.mood) : null; }
function porRevisar(){
  return studentsList().filter(s => s.prioridad === 'medio' || s.prioridad === 'alto'
    || NEGATIVE.includes(lastMood(s)?.id)).length;
}
function bienestarPromedio(){
  const list = studentsList();
  if(!list.length) return 0;
  const sum = list.reduce((a,s)=>{ const m = lastMood(s); return a + (m ? MOOD_W[m.id] : 0); },0);
  return Math.round(sum / list.length);
}
function initialOf(name){ return (name || '?').trim().charAt(0).toUpperCase(); }
const AVATAR_TONES = ['tone-a','tone-b','tone-c'];

/* ---------- VISTA: INICIO (COORDINADOR) ---------- */
function renderInicio(){
  const list = studentsList();
  const rev = porRevisar();
  const bien = bienestarPromedio();
  const pendingAlerts = (db.alerts || []).filter(a => a.status === 'pendiente');

  // Alertas prioritarias provocadas por check-ins negativos
  const urgentAlertsHTML = pendingAlerts.length ? `
    <div class="coord-urgent-box">
      <div class="cub-head">
        <div class="cub-title">
          <span>🚨</span> Alertas Socioemocionales Recientes
        </div>
        <span class="cub-badge">${pendingAlerts.length} ${pendingAlerts.length === 1 ? 'caso requiere atención' : 'casos requieren atención'}</span>
      </div>
      <p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;">
        Los siguientes estudiantes registraron estados de ánimo negativos en su check-in. Las IAs Eirén y Orión brindaron contención inicial; ahora corresponde la intervención y seguimiento del orientador(a).
      </p>
      <div class="cub-list">
        ${pendingAlerts.map(alt => `
          <div class="cub-item">
            <div class="cub-item-info">
              <div class="cub-mood-dot">${alt.moodEmoji || '⚠️'}</div>
              <div>
                <span class="cub-student-name">${alt.studentName} (${alt.grupo} · ${alt.carrera})</span>
                <span class="cub-student-sub">
                  Reportó: <strong>${alt.moodLabel || alt.mood}</strong> · ${alt.date} 
                  ${alt.note ? `— <em>"${escapeHTML(alt.note)}"</em>` : ''}
                </span>
              </div>
            </div>
            <div class="cub-item-actions">
              <button class="btn-outline-maroon" style="padding:6px 14px;font-size:12px;" onclick="openStudentModal('${alt.studentId}')">Ver expediente</button>
              <button class="btn-resolve-alert" onclick="resolveAlert('${alt.id}')">✓ Marcar atendida</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const segRows = list.map((s,i)=>`
    <div class="follow-row" onclick="openStudentModal('${s.matricula}')">
      <div class="f-avatar ${AVATAR_TONES[i % 3]}">${initialOf(s.display)}</div>
      <div class="f-body">
        <span class="f-name">${s.display}</span>
        <span class="f-grupo">${s.grupo} · ${s.carrera || ''}</span>
      </div>
      <div class="f-meta">
        <span class="f-date">${s.segFecha}</span>
        <span class="prio-chip ${s.prioridad}">${s.prioridad.charAt(0).toUpperCase()+s.prioridad.slice(1)}</span>
      </div>
    </div>`).join('');

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">PANEL DEL COORDINADOR / ORIENTADOR</span>
      <h1>¿Qué necesita tu atención hoy?</h1>
      <p>NAIMA organiza el panorama socioemocional para priorizar a los alumnos que requieren acompañamiento humano.</p>
    </div>
    <span class="demo-chip">CONALEP Mérida I</span>
  </div>

  ${urgentAlertsHTML}

  <div class="banner">
    <div class="b-icon">◎</div>
    <div class="b-body">
      <span class="b-tag">Seguimiento prioritario</span>
      <div class="b-title">${rev} ${rev === 1 ? 'estudiante requiere' : 'estudiantes requieren'} revisión activa</div>
      <div class="b-desc">Consulta los casos priorizados y registra las acciones y bitácoras institucionales.</div>
    </div>
    <button class="btn-maroon" onclick="nav('alumnos')">Ver Protoestrellas →</button>
  </div>

  <span class="section-label">Panorama grupal</span>
  <h2 class="section-title">Estado operativo</h2>
  <div class="stat-grid">
    <div class="stat-card"><div class="s-icon teal">◇</div><div class="s-num">${list.length}</div><div class="s-lbl">Protoestrellas registradas</div></div>
    <div class="stat-card"><div class="s-icon maroon">◎</div><div class="s-num">${rev}</div><div class="s-lbl">Por revisar</div></div>
    <div class="stat-card"><div class="s-icon green">◔</div><div class="s-num">${bien}%</div><div class="s-lbl">Bienestar promedio</div></div>
  </div>

  <span class="section-label">Accesos rápidos</span>
  <h2 class="section-title">Acciones frecuentes</h2>
  <div class="quick-grid">
    <button class="quick-card" onclick="quickNuevaProtoestrella()">
      <div class="q-icon">＋</div>
      <div class="q-body"><span class="q-title">Nueva Protoestrella</span><span class="q-sub">Registrar expediente</span></div>
      <span class="q-chev">›</span>
    </button>
    <button class="quick-card" onclick="nav('pioe')">
      <div class="q-icon">◎</div>
      <div class="q-body"><span class="q-title">Abrir PIOE</span><span class="q-sub">Seguimiento y actividades</span></div>
      <span class="q-chev">›</span>
    </button>
    <button class="quick-card" onclick="nav('catalogo')">
      <div class="q-icon">▤</div>
      <div class="q-body"><span class="q-title">Documentos</span><span class="q-sub">Carga y formatos PDF</span></div>
      <span class="q-chev">›</span>
    </button>
  </div>

  <div class="duo-grid">
    <div class="duo-card">
      <span class="section-label">✧ ORION</span>
      <h3>Acompañamiento operativo</h3>
      <p>Organiza pendientes, redacta borradores PIOE y te alerta sobre casos de seguimiento prioritario.</p>
      <button class="link-arrow" onclick="nav('orion')">Hablar con ORION →</button>
    </div>
    <div class="duo-card">
      <span class="section-label">◇ NOVA</span>
      <h3>Visión institucional</h3>
      <p>Consulta métricas agregadas por grupo, turno y carrera técnica para la toma de decisiones.</p>
      <button class="link-arrow" onclick="nav('nova')">Abrir NOVA →</button>
    </div>
  </div>

  <div class="section-head-row">
    <div><span class="section-label">Próximos</span><h2 class="section-title" style="margin-bottom:0;">Seguimientos</h2></div>
    <button class="link-arrow" onclick="nav('alumnos')">Ver todos</button>
  </div>
  <div class="panel">
    ${segRows || `
      <div class="follow-empty">
        <div class="fe-icon">✧</div>
        <h4>Sin seguimientos pendientes</h4>
        <p>Aún no hay Protoestrellas registradas. Cuando existan expedientes, sus seguimientos aparecerán aquí.</p>
      </div>`}
  </div>

  <p class="foot-note"><span class="spark">✦</span> NAIMA apoya la organización del trabajo; las decisiones de acompañamiento corresponden siempre al personal profesional.</p>`;
}

function resolveAlert(alertId){
  const alt = (db.alerts || []).find(a => a.id === alertId);
  if(alt){
    alt.status = 'atendida';
    saveDB();
    renderSidebar();
    renderRoleBanner();
    nav('inicio');
  }
}

/* ---------- VISTA: PROTOESTRELLAS ---------- */
function renderProtoestrellas(){
  const list = studentsList();

  const rows = list.map(s => `
    <tr>
      <td class="pt-name">${s.display}</td>
      <td class="pt-mat mono">${s.matricula}</td>
      <td>${s.grupo} · ${s.carrera || 'Sin carrera'}</td>
      <td>${s.guardian || 'Sin asignar'}</td>
      <td class="pt-action">
        <button class="btn-outline-maroon" onclick="openStudentModal('${s.matricula}')">Abrir expediente</button>
      </td>
    </tr>`).join('');

  const emptyState = `
    <tr class="proto-empty-row">
      <td colspan="5">
        <div class="proto-empty">
          <div class="pe-icon">✦</div>
          <h3>Aún no hay Protoestrellas registradas</h3>
          <p>Cuando se conecte la base de datos institucional, cada expediente aparecerá aquí. Mientras tanto puedes conocer el flujo del módulo.</p>
          <button class="btn-maroon" onclick="quickNuevaProtoestrella()">+ Nueva Protoestrella</button>
        </div>
      </td>
    </tr>`;

  return `
  <div class="page-head">
    <div>
      <h1>Protoestrellas</h1>
      <p>Una persona, un expediente, una historia acompañada.</p>
    </div>
  </div>

  <div class="proto-banner">
    <div class="pb-body">
      <span class="pb-tag">Expediente Único Digital</span>
      <p class="pb-desc">Los datos se capturan una sola vez y alimentan los flujos autorizados.</p>
    </div>
    <button class="btn-maroon" onclick="quickNuevaProtoestrella()">+ Nueva Protoestrella</button>
  </div>

  <h2 class="proto-community-title">Comunidad</h2>

  <div class="proto-table-wrap">
    <table class="proto-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Matrícula</th>
          <th>Grupo / carrera</th>
          <th>Guardián</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${list.length ? rows : emptyState}
      </tbody>
    </table>
  </div>`;
}

/* ---------- Modal: Nueva Protoestrella ---------- */
function quickNuevaProtoestrella(){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Expediente Único Digital</span>
    <h3 style="font-size:18px;margin-bottom:8px;">Nueva Protoestrella</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.55;margin-bottom:18px;">
      Los datos se guardan temporalmente en memoria. Cuando se conecte la base de datos institucional, se persistirán automáticamente.
    </p>

    <form id="protoForm" onsubmit="event.preventDefault();saveProtoestrella();" autocomplete="off">
      <div class="proto-form-field">
        <label for="pfNombre">Nombre completo *</label>
        <input type="text" id="pfNombre" placeholder="Ej. Andrea Méndez López" required maxlength="80">
      </div>

      <div class="proto-form-grid">
        <div class="proto-form-field">
          <label for="pfMatricula">Matrícula *</label>
          <input type="text" id="pfMatricula" placeholder="Ej. PTB-26001" required maxlength="20">
        </div>
        <div class="proto-form-field">
          <label for="pfGrupo">Grupo *</label>
          <input type="text" id="pfGrupo" placeholder="Ej. 2A" required maxlength="10">
        </div>
      </div>

      <div class="proto-form-field">
        <label for="pfCarrera">Carrera *</label>
        <select id="pfCarrera" required>
          <option value="">Selecciona una carrera</option>
          <option>Informática</option>
          <option>Electromecánica</option>
          <option>Administración</option>
          <option>Contabilidad</option>
          <option>Enfermería General</option>
          <option>Mecatrónica</option>
          <option>Autotrónica</option>
          <option>Otro</option>
        </select>
      </div>

      <div class="proto-form-field">
        <label for="pfGuardian">Guardián asignado</label>
        <input type="text" id="pfGuardian" placeholder="Ej. Psic. Guardián Demo" value="Psic. Guardián Demo" maxlength="60">
      </div>

      <div class="proto-form-error" id="pfError"></div>

      <div class="proto-form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-maroon">Guardar Protoestrella</button>
      </div>
    </form>
  `);
}

function saveProtoestrella(){
  const nombre    = document.getElementById('pfNombre').value.trim();
  const matricula = document.getElementById('pfMatricula').value.trim();
  const grupo     = document.getElementById('pfGrupo').value.trim();
  const carrera   = document.getElementById('pfCarrera').value;
  const guardian  = document.getElementById('pfGuardian').value.trim() || 'Sin asignar';
  const err       = document.getElementById('pfError');

  if(!nombre || !matricula || !grupo || !carrera){
    err.textContent = 'Completa todos los campos obligatorios (*).';
    err.style.display = 'block';
    return;
  }
  if(db.students[matricula]){
    err.textContent = 'Ya existe una Protoestrella con esa matrícula.';
    err.style.display = 'block';
    return;
  }

  const parts = nombre.split(/\s+/).filter(Boolean);
  const display = parts.length >= 2
    ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`
    : parts[0];

  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const hoy = new Date();
  const segFecha = `${hoy.getDate()} ${meses[hoy.getMonth()]}`;

  const BGS = ['#E3ECE7','#F3E9D9','#DCEBE6','#F0E4F5','#FDE7E4'];
  const avatar = { ...DEFAULT_AVATAR, bg: BGS[Object.keys(db.students).length % BGS.length] };

  const newStudent = {
    id: matricula,
    nombre, display, matricula, grupo, carrera, guardian,
    email: `${matricula.toLowerCase()}@alumnos.conalep.edu.mx`,
    rol: 'estudiante',
    prioridad: 'bajo',
    segFecha,
    avatar,
    historial: []
  };

  db.students[matricula] = newStudent;
  db.users[matricula] = newStudent;
  saveDB();

  closeModal();

  if(currentSection === 'alumnos') document.getElementById('content').innerHTML = renderProtoestrellas();
  else nav('alumnos');
}

function openStudentModal(matricula){
  const s = db.students[matricula];
  if(!s) return;
  const hist = s.historial && s.historial.length
    ? s.historial.slice().reverse().map(h => {
        const m = MOODS.find(x => x.id === h.mood) || { hex:'#888', emoji:'•', label:h.mood };
        return `<div class="history-row"><span class="mood-dot" style="background:${m.hex};"></span>
          <span class="h-date">${h.date}</span><span>${m.emoji} ${m.label}</span>
          <span class="h-note">${h.note ? '— ' + escapeHTML(h.note) : ''}</span></div>`;
      }).join('')
    : `<div class="history-empty">Sin registros emocionales todavía. Los check-ins aparecerán aquí.</div>`;

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <div class="modal-head">
      <div class="thumb">${buildAvatarSVG(s.avatar,'modal')}</div>
      <div>
        <h3 style="font-size:18px;">${s.nombre}</h3>
        <span class="mono" style="font-size:12px;color:var(--ink-soft);">${s.matricula} · Grupo ${s.grupo}${s.carrera ? ' · ' + s.carrera : ''}</span>
        <div style="margin-top:8px;">
          <span class="prio-chip ${s.prioridad}">Prioridad ${s.prioridad}</span>
        </div>
      </div>
    </div>
    <span class="section-label">Historial emocional</span>
    <div class="history-list" style="margin-bottom:20px;">${hist}</div>
    <button class="btn-maroon" style="width:100%;" onclick="markReviewed('${matricula}')">Marcar seguimiento como revisado</button>
  `);
}

function markReviewed(matricula){
  const s = db.students[matricula];
  if(!s) return;
  s.prioridad = 'bajo';
  (db.alerts || []).forEach(a => {
    if(a.studentId === matricula) a.status = 'atendida';
  });
  saveDB();
  renderSidebar();
  renderRoleBanner();
  closeModal();
  nav(currentSection);
}

/* ---------- VISTA: PIOE ---------- */
function renderPioe(){
  return `
  <div class="page-head">
    <div>
      <h1>PIOE Digital</h1>
      <p>Digitalizamos el proceso; no reemplazamos el criterio profesional.</p>
    </div>
  </div>

  <div class="pioe-banner">
    <div class="pioe-banner-body">
      <span class="pioe-banner-tag">Programa Institucional de Orientación Educativa</span>
      <p class="pioe-banner-desc">Flujo conectado al expediente, documentos, seguimiento y reportes.</p>
    </div>
    <button class="pioe-mode-btn" onclick="pioeInfoModo()">Modo institucional</button>
  </div>

  <h2 class="pioe-section-title">Flujo operativo</h2>
  <div class="pioe-flow">
    ${PIOE_FLOW.map((step,i)=>`
      <div class="pioe-step">
        <span class="pioe-step-num">${i+1}</span>
        <span class="pioe-step-label">${step}</span>
      </div>
    `).join('')}
  </div>

  <h2 class="pioe-section-title">Áreas</h2>
  <div class="pioe-areas">
    ${PIOE_AREAS.map(a=>`
      <div class="pioe-area-card">
        <h3>${a.t}</h3>
        <p>${a.d}</p>
      </div>
    `).join('')}
  </div>

  <h2 class="pioe-section-title">Instrumentos digitalizados</h2>
  <div class="pioe-instruments">
    ${PIOE_INSTRUMENTS.map(inst=>`
      <div class="pioe-inst-card">
        <span class="pioe-inst-tag">Instrumento institucional</span>
        <h3>${inst.title}</h3>
        <p>${inst.desc}</p>
        ${inst.restricted
          ? `<button class="pioe-btn-restricted" onclick="pioeRestricted('${inst.id}')">🔒 Acceso restringido</button>`
          : `<button class="pioe-btn-open" onclick="openPioeInstrument('${inst.id}')">Abrir flujo</button>`
        }
      </div>
    `).join('')}
  </div>

  ${pioeOpen ? renderPioeInstrumentDetail(pioeOpen) : ''}
  `;
}

function renderPioeInstrumentDetail(id){
  const inst = PIOE_INSTRUMENTS.find(x => x.id === id);
  if(!inst) return '';
  return `
    <div class="pioe-inst-detail">
      <h3>${inst.title}</h3>
      <p>El motor de aplicación está listo. Los reactivos deben cargarse desde la versión oficial/autorizada de la institución; NAIMA registra respuestas, calcula la puntuación autorizada, guarda trazabilidad y presenta el resultado al profesional responsable.</p>
      <div class="pioe-warning">
        NAIMA no toma decisiones clínicas automáticamente. El resultado requiere valoración y actuación del personal autorizado conforme al protocolo institucional.
      </div>
      <button class="pioe-btn-close" onclick="closePioeInstrument()">Cerrar</button>
    </div>`;
}

function openPioeInstrument(id){
  pioeOpen = id;
  document.getElementById('content').innerHTML = renderPioe();
  setTimeout(() => {
    const el = document.querySelector('.pioe-inst-detail');
    if(el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  }, 60);
}

function closePioeInstrument(){
  pioeOpen = null;
  document.getElementById('content').innerHTML = renderPioe();
}

function pioeRestricted(id){
  const inst = PIOE_INSTRUMENTS.find(x => x.id === id);
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Instrumento institucional</span>
    <h3 style="font-size:18px;margin-bottom:12px;">${inst ? inst.title : 'Acceso restringido'}</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;margin-bottom:18px;">
      Este instrumento solo puede ser aplicado por <strong>personal expresamente autorizado</strong> por la institución.
      El acceso se habilitará cuando se configure el rol correspondiente en el módulo de Configuración.
    </p>
    <div class="pioe-warning" style="margin-bottom:18px;">
      NAIMA no toma decisiones clínicas automáticamente. La aplicación y valoración corresponden al personal autorizado conforme al protocolo institucional.
    </div>
    <button class="btn-maroon" style="width:100%;" onclick="closeModal()">Entendido</button>
  `);
}

function pioeInfoModo(){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Programa Institucional de Orientación Educativa</span>
    <h3 style="font-size:18px;margin-bottom:12px;">Modo institucional</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;margin-bottom:14px;">
      El PIOE opera en <strong>modo institucional</strong>: cada acción queda vinculada al expediente único de la Protoestrella
      y al profesional responsable. Los datos alimentan automáticamente los módulos de seguimiento, documentos y reportes.
    </p>
    <div class="proto-form-preview">
      <div class="pf-row"><span>Trazabilidad por acción</span><em>activa</em></div>
      <div class="pf-row"><span>Vinculación al expediente</span><em>automática</em></div>
      <div class="pf-row"><span>Reactivos oficiales</span><em>carga institucional</em></div>
      <div class="pf-row"><span>Decisiones clínicas</span><em>solo personal autorizado</em></div>
    </div>
    <button class="btn-maroon" style="width:100%;margin-top:18px;" onclick="closeModal()">Entendido</button>
  `);
}

/* ---------- VISTA: EIRÉNÉ ---------- */
function renderEirene(){
  const g = eireneGreeting();
  const mood = eireneMood ? EIRENE_MOODS.find(m => m.id === eireneMood) : null;
  const currentMood = mood || EIRENE_MOODS[0];

  const moodButtons = EIRENE_MOODS.map(m => `
    <button class="eirene-mood-btn ${eireneMood === m.id ? 'active' : ''}"
            onclick="selectEireneMood('${m.id}')">
      <span class="emb-emoji">${m.emoji}</span>
      <span class="emb-label">${m.label}</span>
    </button>
  `).join('');

  const replyText = mood
    ? mood.reply
    : 'Cuéntame cómo te sientes. No hay una respuesta correcta ni incorrecta; podemos empezar por algo pequeño.';

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">EIRÉNÉ · Bienestar</span>
      <h1>Tu compañera de bienestar</h1>
      <p>Un espacio para escucharte, sin juicios y a tu ritmo.</p>
    </div>
    <button class="eirene-voice-btn ${eireneVoiceOn ? 'on' : ''}" onclick="toggleEireneVoice()">
      <span class="evb-icon">🔊</span>
      <span>Voz ${eireneVoiceOn ? 'activada' : 'desactivada'}</span>
    </button>
  </div>

  <div class="eirene-hero">
    <div class="eirene-avatar-wrap">
      ${eireneAvatarSVG()}
    </div>
    <div class="eirene-hero-body">
      <h2 class="eirene-greeting">${g.text} <span class="eg-icon">${g.icon}</span></h2>
      <p class="eirene-line">Soy Eirene — aquí estoy, sin juicios, contigo y a tu ritmo. 💚</p>
      <p class="eirene-line">Cuéntame cómo te sientes. No hay una respuesta correcta ni incorrecta; podemos empezar por algo pequeño.</p>
      <p class="eirene-line eirene-line-soft">Mereces un momento de calma hoy 🌿</p>
    </div>
  </div>

  <span class="section-label">Tu bienestar</span>
  <h2 class="section-title">Estado actual</h2>

  <div class="eirene-state-card">
    <div class="esc-head">
      <span class="esc-emoji">${currentMood.emoji}</span>
      <span class="esc-label">${currentMood.label}</span>
      <span class="esc-pct mono">${currentMood.pct}%</span>
    </div>
    <div class="esc-track"><div class="esc-fill" style="width:${currentMood.pct}%"></div></div>
  </div>

  <span class="section-label">Check-in</span>
  <h2 class="section-title">¿Cómo te sientes ahora?</h2>

  <div class="eirene-moods">
    ${moodButtons}
  </div>

  <div class="eirene-response">
    <div class="er-avatar">${eireneAvatarMiniSVG()}</div>
    <div class="er-body">
      <span class="er-tag">Eirene responde</span>
      <p class="er-text">${replyText}</p>
    </div>
  </div>

  <div class="eirene-actions">
    <button class="eirene-speak-btn" onclick="speakEirene()">
      <span>🔊</span> Escuchar a Eirene
    </button>
  </div>

  <span class="section-label">Cuidado</span>
  <h2 class="section-title">Hoy podemos cuidarte así</h2>

  <div class="eirene-care">
    <button class="eirene-care-card" onclick="nav('orion')">
      <div class="ecc-icon">🗨️</div>
      <div class="ecc-body">
        <span class="ecc-title">Hablar con Eirene</span>
        <span class="ecc-sub">A tu ritmo</span>
      </div>
    </button>
    <button class="eirene-care-card" onclick="eireneStartBreathing()">
      <div class="ecc-icon">💧</div>
      <div class="ecc-body">
        <span class="ecc-title">Respirar</span>
        <span class="ecc-sub">Una pausa breve</span>
      </div>
    </button>
  </div>

  <span class="section-label">🎮 Actividades</span>
  <h2 class="section-title">Explorar y practicar</h2>
  <p class="eirene-sub">Actividades EIRÉNE</p>

  <h2 class="eirene-block-title">Más participación, sin perder la calma</h2>
  <div class="eirene-activities">
    ${EIRENE_ACTIVITIES.map(a=>`
      <button class="eirene-activity" onclick="eireneActivity('${a.name}')">
        <span class="ea-icon">${a.icon}</span>
        <span class="ea-name">${a.name}</span>
        <span class="ea-sub">${a.sub}</span>
      </button>
    `).join('')}
  </div>

  <p class="eirene-note">Las actividades acompañan el bienestar; no califican emociones ni sustituyen el acompañamiento humano.</p>

  <span class="section-label">📔 Mi espacio</span>
  <h2 class="section-title">Diario emocional</h2>

  <div class="eirene-diary">
    <textarea id="eireneDiaryInput"
              placeholder="Escribe algo que quieras recordar de hoy…"
              maxlength="600"
              oninput="eireneDiary = this.value">${eireneDiary}</textarea>
    <p class="eirene-diary-note">Tu espacio personal debe respetar los permisos y reglas de privacidad definidos por la institución.</p>
    <button class="btn-maroon" onclick="saveEireneDiary()">Guardar</button>
    <span class="eirene-diary-saved" id="eireneDiarySaved"></span>
  </div>

  <p class="foot-note"><span class="spark">✦</span> EIRÉNÉ acompaña; las decisiones y valoraciones corresponden siempre al personal profesional.</p>`;
}

function selectEireneMood(id){
  eireneMood = id;
  document.getElementById('content').innerHTML = renderEirene();
  if(eireneVoiceOn) speakEirene();
}

function toggleEireneVoice(){
  eireneVoiceOn = !eireneVoiceOn;
  document.getElementById('content').innerHTML = renderEirene();
}

function speakEirene(){
  const mood = eireneMood ? EIRENE_MOODS.find(m => m.id === eireneMood) : null;
  const text = mood
    ? mood.reply
    : 'Hola, soy Eirene. Estoy aquí para acompañarte. ¿Cómo te sientes ahora?';

  if(!('speechSynthesis' in window)){
    alert('Tu navegador no soporta síntesis de voz.');
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-MX';
  u.rate = 0.95;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}

function eireneStartBreathing(){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">💧 Respiración</span>
    <h3 style="font-size:18px;margin-bottom:10px;">Una pausa breve</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;margin-bottom:18px;">
      Haz una pausa cómoda. Respira a tu propio ritmo. Puedes detener la actividad cuando quieras.
    </p>
    <div class="eirene-breath">
      <div class="eb-circle"></div>
      <p class="eb-text">Inhala… sostén… exhala…</p>
    </div>
    <p class="eirene-note" style="margin-top:14px;">Si en algún momento sientes molestia, puedes cerrar esta ventana.</p>
    <button class="btn-maroon" style="width:100%;margin-top:16px;" onclick="closeModal()">Terminar</button>
  `);
}

function eireneActivity(name){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Actividad EIRÉNE</span>
    <h3 style="font-size:18px;margin-bottom:10px;">${name}</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;margin-bottom:18px;">
      Esta actividad forma parte del catálogo EIRÉNE. El contenido guiado se cargará cuando se conecte con el banco institucional de recursos.
    </p>
    <div class="pioe-warning" style="margin-bottom:18px;">
      Las actividades acompañan el bienestar; no califican emociones ni sustituyen el acompañamiento humano.
    </div>
    <button class="btn-maroon" style="width:100%;" onclick="closeModal()">Entendido</button>
  `);
}

function saveEireneDiary(){
  const saved = document.getElementById('eireneDiarySaved');
  if(saved){
    saved.textContent = '✓ Guardado en memoria (se borrará al recargar)';
    setTimeout(() => { saved.textContent = ''; }, 3200);
  }
}

/* ---------- Avatar EIRÉNE (SVG) ---------- */
function eireneAvatarSVG(){
  return `
  <svg viewBox="0 0 320 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="eBG" cx="50%" cy="38%" r="75%">
        <stop offset="0%" stop-color="#F7DDA8"/>
        <stop offset="55%" stop-color="#DDA878"/>
        <stop offset="100%" stop-color="#6B4A2E"/>
      </radialGradient>
      <linearGradient id="eSkin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F2CDAC"/>
        <stop offset="100%" stop-color="#D8A47F"/>
      </linearGradient>
      <linearGradient id="eDress" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#C72432"/>
        <stop offset="100%" stop-color="#7C0E1C"/>
      </linearGradient>
      <linearGradient id="eHair" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#4A2A1C"/>
        <stop offset="100%" stop-color="#1F0F08"/>
      </linearGradient>
    </defs>

    <rect width="320" height="420" fill="url(#eBG)"/>
    <circle cx="55" cy="80" r="10" fill="#FFF" opacity="0.28"/>
    <circle cx="240" cy="60" r="14" fill="#FFF" opacity="0.22"/>
    <circle cx="90" cy="180" r="6" fill="#FFF" opacity="0.30"/>
    <circle cx="260" cy="200" r="8" fill="#FFF" opacity="0.26"/>
    <circle cx="150" cy="110" r="5" fill="#FFF" opacity="0.35"/>
    <circle cx="40" cy="260" r="9" fill="#FFF" opacity="0.20"/>
    <circle cx="280" cy="300" r="7" fill="#FFF" opacity="0.22"/>

    <path d="M70 420 L70 300 Q70 250 105 235 L215 235 Q250 250 250 300 L250 420 Z" fill="url(#eDress)"/>
    <path d="M120 235 L160 275 L200 235 Z" fill="url(#eSkin)"/>
    <path d="M105 235 L120 205" stroke="#7C0E1C" stroke-width="6" stroke-linecap="round"/>
    <path d="M215 235 L200 205" stroke="#7C0E1C" stroke-width="6" stroke-linecap="round"/>

    <rect x="143" y="195" width="34" height="45" fill="url(#eSkin)"/>

    <ellipse cx="160" cy="150" rx="52" ry="64" fill="url(#eSkin)"/>
    <ellipse cx="108" cy="155" rx="8" ry="13" fill="url(#eSkin)"/>
    <ellipse cx="212" cy="155" rx="8" ry="13" fill="url(#eSkin)"/>

    <path d="M108 145 Q100 70 160 60 Q220 70 212 145 Q212 118 160 112 Q108 118 108 145 Z" fill="url(#eHair)"/>
    <ellipse cx="160" cy="72" rx="34" ry="22" fill="url(#eHair)"/>
    <path d="M120 90 Q130 82 145 82" stroke="#6B3A24" stroke-width="2" fill="none" opacity="0.7"/>
    <path d="M175 82 Q190 82 200 90" stroke="#6B3A24" stroke-width="2" fill="none" opacity="0.7"/>

    <path d="M124 128 Q136 122 148 128" stroke="#2A160C" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M172 128 Q184 122 196 128" stroke="#2A160C" stroke-width="3" fill="none" stroke-linecap="round"/>

    <ellipse cx="138" cy="145" rx="8.5" ry="9.5" fill="#FFFFFF"/>
    <ellipse cx="182" cy="145" rx="8.5" ry="9.5" fill="#FFFFFF"/>
    <ellipse cx="138" cy="146" rx="6" ry="7" fill="#5A3018"/>
    <ellipse cx="182" cy="146" rx="6" ry="7" fill="#5A3018"/>
    <circle cx="138" cy="146" r="2.8" fill="#160A03"/>
    <circle cx="182" cy="146" r="2.8" fill="#160A03"/>
    <circle cx="140" cy="143" r="1.6" fill="#FFF"/>
    <circle cx="184" cy="143" r="1.6" fill="#FFF"/>

    <path d="M160 155 Q155 168 160 172 Q163 173 165 172" stroke="#B98A68" stroke-width="1.6" fill="none" stroke-linecap="round"/>

    <path d="M142 185 Q160 200 178 185" stroke="#8E2C33" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M150 190 Q160 193 170 190" stroke="#FFF" stroke-width="2" fill="none" opacity="0.5"/>

    <ellipse cx="122" cy="172" rx="11" ry="6" fill="#E89579" opacity="0.5"/>
    <ellipse cx="198" cy="172" rx="11" ry="6" fill="#E89579" opacity="0.5"/>

    <text x="128" y="243" font-family="cursive" font-size="7" fill="#5A3A28" opacity="0.7"
          transform="rotate(-6 128 243)">Pío morí</text>

    <rect x="70" y="330" width="14" height="6" rx="3" fill="#C9A24B" opacity="0.85"/>
  </svg>`;
}

function eireneAvatarMiniSVG(){
  return `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="emBG" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#F7DDA8"/>
        <stop offset="100%" stop-color="#A87850"/>
      </radialGradient>
      <linearGradient id="emSkin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F2CDAC"/>
        <stop offset="100%" stop-color="#D8A47F"/>
      </linearGradient>
      <linearGradient id="emHair" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#4A2A1C"/>
        <stop offset="100%" stop-color="#1F0F08"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#emBG)"/>
    <ellipse cx="50" cy="52" rx="20" ry="24" fill="url(#emSkin)"/>
    <path d="M30 48 Q26 22 50 20 Q74 22 70 48 Q70 36 50 34 Q30 36 30 48 Z" fill="url(#emHair)"/>
    <ellipse cx="50" cy="26" rx="13" ry="8" fill="url(#emHair)"/>
    <ellipse cx="43" cy="52" rx="3" ry="3.5" fill="#3A1E10"/>
    <ellipse cx="57" cy="52" rx="3" ry="3.5" fill="#3A1E10"/>
    <path d="M44 63 Q50 68 56 63" stroke="#8E2C33" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M25 100 Q25 78 50 74 Q75 78 75 100 Z" fill="#C72432"/>
  </svg>`;
}

/* ---------- VISTA: ORION ---------- */
function orionGreeting(){
  const h = new Date().getHours();
  if(h < 12) return 'Buenos días, compañero de viaje.';
  if(h < 19) return 'Buenas tardes, compañero de viaje.';
  return 'Buenas noches, compañero de viaje.';
}

function orionConstellationSVG(){
  return `
  <svg viewBox="0 0 260 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="orionBg" cx="50%" cy="45%" r="75%">
        <stop offset="0%" stop-color="#1B3358"/>
        <stop offset="55%" stop-color="#102743"/>
        <stop offset="100%" stop-color="#071528"/>
      </radialGradient>
      <radialGradient id="starWhite" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
        <stop offset="45%" stop-color="#C9E2FF" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#C9E2FF" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="starRed" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFE0C2" stop-opacity="1"/>
        <stop offset="45%" stop-color="#FF9C6B" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#FF7A45" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="starBlue" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
        <stop offset="45%" stop-color="#9FC8FF" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="#6FA8FF" stop-opacity="0"/>
      </radialGradient>
      <filter id="blurSoft"><feGaussianBlur stdDeviation="2.5"/></filter>
    </defs>

    <rect width="260" height="420" fill="url(#orionBg)"/>

    <g fill="#FFFFFF">
      <circle cx="35" cy="55" r="0.9" opacity="0.55"/>
      <circle cx="210" cy="70" r="0.7" opacity="0.45"/>
      <circle cx="55" cy="380" r="0.8" opacity="0.4"/>
      <circle cx="230" cy="350" r="0.9" opacity="0.5"/>
      <circle cx="25" cy="200" r="0.6" opacity="0.35"/>
      <circle cx="240" cy="180" r="0.7" opacity="0.4"/>
      <circle cx="140" cy="30" r="0.6" opacity="0.35"/>
      <circle cx="185" cy="240" r="0.6" opacity="0.3"/>
      <circle cx="70" cy="120" r="0.5" opacity="0.3"/>
      <circle cx="200" cy="400" r="0.7" opacity="0.35"/>
      <circle cx="90" cy="270" r="0.5" opacity="0.28"/>
      <circle cx="170" cy="150" r="0.5" opacity="0.3"/>
    </g>

    <g stroke="#8FB8E0" stroke-width="0.9" stroke-linecap="round" opacity="0.55" fill="none">
      <line x1="78" y1="92" x2="178" y2="102"/>
      <line x1="78" y1="92" x2="102" y2="215"/>
      <line x1="178" y1="102" x2="148" y2="205"/>
      <line x1="102" y1="215" x2="125" y2="208"/>
      <line x1="125" y1="208" x2="148" y2="205"/>
      <line x1="102" y1="215" x2="72" y2="335"/>
      <line x1="148" y1="205" x2="188" y2="345"/>
      <line x1="72" y1="335" x2="188" y2="345"/>
      <line x1="118" y1="240" x2="122" y2="262" opacity="0.4"/>
      <line x1="122" y1="262" x2="128" y2="285" opacity="0.4"/>
      <line x1="125" y1="55" x2="78" y2="92" opacity="0.4"/>
      <line x1="125" y1="55" x2="178" y2="102" opacity="0.4"/>
    </g>

    <circle cx="125" cy="55" r="5" fill="url(#starWhite)" filter="url(#blurSoft)"/>
    <circle cx="125" cy="55" r="1.6" fill="#FFFFFF"/>

    <circle cx="78" cy="92" r="9" fill="url(#starRed)" filter="url(#blurSoft)"/>
    <circle cx="78" cy="92" r="2.6" fill="#FFE6D2"/>

    <circle cx="178" cy="102" r="7" fill="url(#starWhite)" filter="url(#blurSoft)"/>
    <circle cx="178" cy="102" r="2.1" fill="#FFFFFF"/>

    <circle cx="102" cy="215" r="5.5" fill="url(#starBlue)" filter="url(#blurSoft)"/>
    <circle cx="102" cy="215" r="1.8" fill="#FFFFFF"/>
    <circle cx="125" cy="208" r="5.5" fill="url(#starBlue)" filter="url(#blurSoft)"/>
    <circle cx="125" cy="208" r="1.8" fill="#FFFFFF"/>
    <circle cx="148" cy="205" r="5.5" fill="url(#starBlue)" filter="url(#blurSoft)"/>
    <circle cx="148" cy="205" r="1.8" fill="#FFFFFF"/>

    <circle cx="72" cy="335" r="5" fill="url(#starWhite)" filter="url(#blurSoft)"/>
    <circle cx="72" cy="335" r="1.7" fill="#FFFFFF"/>

    <circle cx="188" cy="345" r="10" fill="url(#starBlue)" filter="url(#blurSoft)"/>
    <circle cx="188" cy="345" r="2.8" fill="#EAF3FF"/>

    <circle cx="118" cy="240" r="2.4" fill="#C9E2FF" opacity="0.85"/>
    <circle cx="122" cy="262" r="2" fill="#C9E2FF" opacity="0.7"/>
    <circle cx="128" cy="285" r="2.4" fill="#C9E2FF" opacity="0.8"/>
  </svg>`;
}

function renderOrionPanel(){
  const seg = porRevisar();
  const total = studentsList().length;

  const chips = [
    { id:'resumen',    label:'Resumen del día'   },
    { id:'reporte',    label:'Preparar reporte'  },
    { id:'expediente', label:'Buscar expediente' },
    { id:'pendientes', label:'Revisar pendientes'},
  ];

  return `
  <div class="page-head">
    <div>
      <h1>ORION</h1>
      <p>Tu compañero de viaje para organizar, resumir y preparar el trabajo.</p>
    </div>
  </div>

  <div class="orion-layout">
    <div class="orion-constellation">
      ${orionConstellationSVG()}
    </div>

    <div class="orion-panel">
      <span class="orion-tag">ORION · Asistente del guardián</span>
      <h2 class="orion-title">${orionGreeting()}</h2>

      <div class="orion-msg">
        Puedo preparar un resumen de tus seguimientos pendientes sin sustituir tu criterio profesional.
        Ahora mismo hay <strong>${seg}</strong> caso${seg === 1 ? '' : 's'} por revisar de <strong>${total}</strong> Protoestrella${total === 1 ? '' : 's'} registrada${total === 1 ? '' : 's'}.
      </div>

      <div class="orion-msg">
        También puedo ayudarte a redactar un borrador de reporte PIOE a partir de información ya validada en el sistema.
      </div>

      <div class="orion-chips">
        ${chips.map(c => `
          <button class="orion-chip" onclick="orionQuick('${c.id}')">${c.label}</button>
        `).join('')}
      </div>

      <div class="orion-warning">
        ORION no diagnostica ni decide derivaciones. Las decisiones sensibles permanecen en manos del profesional autorizado.
      </div>
    </div>
  </div>

  <div id="orionResult"></div>`;
}

function orionQuick(id){
  const seg = porRevisar();
  const total = studentsList().length;
  const bien = bienestarPromedio();

  const respuestas = {
    resumen: `
      <h3>Resumen del día</h3>
      <ul>
        <li><strong>${total}</strong> Protoestrellas registradas en el sistema.</li>
        <li><strong>${seg}</strong> caso${seg === 1 ? '' : 's'} con seguimiento pendiente.</li>
        <li>Bienestar promedio del grupo: <strong>${bien}%</strong>.</li>
        <li>Los check-ins emocionales se alimentan desde EIRÉNÉ.</li>
      </ul>`,
    reporte: `
      <h3>Borrador de reporte PIOE</h3>
      <p>Puedo redactar un borrador a partir de la información ya validada en el sistema. El contenido final requiere tu revisión y firma antes de emitirse.</p>
      <ul>
        <li>Expedientes considerados: <strong>${total}</strong></li>
        <li>Casos priorizados: <strong>${seg}</strong></li>
        <li>Secciones sugeridas: Panorama · Áreas · Instrumentos · Seguimiento</li>
      </ul>`,
    expediente: `
      <h3>Buscar expediente</h3>
      <p>El buscador de expedientes se conectará a la base de datos institucional. Por ahora puedes consultar la sección <strong>Protoestrellas</strong> para ver la lista completa y abrir cualquier expediente.</p>
      <p><button class="btn-maroon" onclick="nav('alumnos')">Ir a Protoestrellas →</button></p>`,
    pendientes: `
      <h3>Revisar pendientes</h3>
      <p>Hay <strong>${seg}</strong> caso${seg === 1 ? '' : 's'} que requieren revisión.</p>
      <p><button class="btn-maroon" onclick="nav('alumnos')">Ver Protoestrellas →</button></p>`,
  };

  const el = document.getElementById('orionResult');
  el.innerHTML = `
    <div class="orion-result">
      <span class="orion-result-tag">ORION responde</span>
      <div class="orion-result-body">${respuestas[id] || 'Sin contenido.'}</div>
    </div>`;
  setTimeout(() => el.scrollIntoView({ behavior:'smooth', block:'start' }), 60);
}

/* ---------- CHAT ORION (accesible desde Inicio) ---------- */
const ORION_ANSWERS = [
  { keys:['revis','prioridad','atencion','atención'],
    text:'Actualmente hay ' + '{REV}' + ' caso(s) por revisar. Te sugiero abrir la sección Protoestrellas y filtrar por prioridad media o alta. Las decisiones de acompañamiento siempre las toma el personal profesional.' },
  { keys:['panorama','resumen','estado','bienestar'],
    text:'El bienestar promedio del grupo es de ' + '{BIEN}' + '%. Puedes ver la distribución completa de estados de ánimo en el módulo NOVA.' },
  { keys:['pioe'],
    text:'PIOE es el Programa Institucional de Orientación Educativa. En NAIMA opera en modo institucional, vinculado al expediente único de cada Protoestrella, con flujo de Planeación, Diagnóstico, Priorización, Intervención, Seguimiento y Evaluación.' },
  { keys:['eirene','eiréne','bienestar','emocion','emoción','calma'],
    text:'EIRÉNÉ es tu compañera de bienestar: te escucha, te acompaña y te ofrece actividades breves de calma. No califica emociones ni sustituye el acompañamiento humano.' },
  { keys:['documento','document','catalogo','catálogo','biblioteca'],
    text:'El módulo Documentos concentra la biblioteca institucional: cédula digital, bitácora socioemocional, consentimiento CONECTA e instrumentos como PHQ-A, GAD-7 y ASSIST. Cada instrumento conserva su versión oficial y permisos de uso.' },
  { keys:['nuevo','registrar','alta','expediente','protoestrella'],
    text:'Para dar de alta una Protoestrella usa el botón "+ Nueva Protoestrella" en la sección Comunidad. Necesitarás nombre, matrícula, grupo y carrera. La persistencia real llegará cuando se conecte la base de datos.' },
  { keys:['hola','buenas','hey'],
    text:'Hola. Soy ORION, tu asistente operativo en NAIMA. Puedo orientarte sobre seguimientos, el panorama del grupo o los módulos de la plataforma.' },
];

function orionReply(q){
  const low = q.toLowerCase();
  for(const a of ORION_ANSWERS){
    if(a.keys.some(k => low.includes(k)))
      return a.text.replace('{REV}', porRevisar()).replace('{BIEN}', bienestarPromedio());
  }
  return 'Entendido. Puedo ayudarte con: casos por revisar, resumen del panorama, alta de Protoestrellas o los módulos PIOE, EIRÉNÉ, Documentos y NOVA. ¿Por dónde empezamos?';
}

function openOrionChat(){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">✧ ORION · Asistente operativo</span>
    <h3 style="font-size:18px;margin-bottom:14px;">Acompañamiento operativo</h3>
    <div class="chat-chips">
      <button onclick="orionAsk(this.textContent)">¿Qué casos requieren revisión?</button>
      <button onclick="orionAsk(this.textContent)">Resume el panorama del grupo</button>
      <button onclick="orionAsk(this.textContent)">¿Qué hay en Documentos?</button>
    </div>
    <div class="chat-box" id="chatBox">
      <div class="chat-msg bot">Hola, soy ORION. Estoy aquí para ayudarte a organizar tu trabajo de orientación. ¿Qué necesitas?</div>
    </div>
    <div class="chat-input-row">
      <input type="text" id="chatInput" placeholder="Escribe tu pregunta…" onkeydown="if(event.key==='Enter')orionSend()">
      <button class="chat-send" onclick="orionSend()">Enviar</button>
    </div>
  `);
}

function orionAsk(text){
  document.getElementById('chatInput').value = text;
  orionSend();
}
function orionSend(){
  const input = document.getElementById('chatInput');
  const box = document.getElementById('chatBox');
  const q = input.value.trim();
  if(!q) return;
  box.insertAdjacentHTML('beforeend', `<div class="chat-msg user">${escapeHTML(q)}</div>`);
  input.value = '';
  setTimeout(() => {
    box.insertAdjacentHTML('beforeend', `<div class="chat-msg bot">${orionReply(q)}</div>`);
    box.scrollTop = box.scrollHeight;
  }, 500);
  box.scrollTop = box.scrollHeight;
}
function escapeHTML(str){ const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

/* ---------- VISTA: DOCUMENTOS ---------- */
function renderDocumentos(){
  const rows = DOC_CATALOG.map(d => `
    <div class="doc-row">
      <div class="doc-title">${d.title}</div>
      <div class="doc-area">${d.area}</div>
      <div class="doc-type-wrap">
        <span class="doc-type">${d.type}</span>
      </div>
      <div class="doc-status">${d.status}</div>
    </div>
  `).join('');

  return `
  <div class="page-head">
    <div>
      <h1>Documentos Inteligentes</h1>
      <p>Una captura alimenta expediente, bitácora, seguimiento y reporte.</p>
    </div>
  </div>

  <div class="pioe-banner">
    <div class="pioe-banner-body">
      <span class="pioe-banner-tag">Biblioteca institucional</span>
      <p class="pioe-banner-desc">Los instrumentos se integran conservando su versión oficial, propósito y permisos de uso.</p>
    </div>
    <button class="pioe-mode-btn" onclick="docInfoWorkflow()">NAIMA Workflow</button>
  </div>

  <h2 class="pioe-section-title">Flujos activos del MVP</h2>
  <div class="doc-flows">
    ${DOC_FLOWS.map(f => `
      <div class="doc-flow-card">
        <span class="doc-flow-num">${f.num}</span>
        <h3>${f.t}</h3>
        <p>${f.d}</p>
      </div>
    `).join('')}
  </div>

  <h2 class="pioe-section-title">Catálogo</h2>
  <div class="doc-catalog">
    ${rows}
  </div>

  <p class="foot-note"><span class="spark">✦</span> Los instrumentos conservan su versión oficial. NAIMA no altera reactivos ni protocolos.</p>`;
}

function docInfoWorkflow(){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">NAIMA Workflow</span>
    <h3 style="font-size:18px;margin-bottom:12px;">Una captura, varios flujos</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;margin-bottom:14px;">
      Cada documento del catálogo se integra al flujo institucional correspondiente:
      la información se captura una sola vez y alimenta expediente, bitácora, seguimiento y reporte.
    </p>
    <div class="proto-form-preview">
      <div class="pf-row"><span>Cédula digital</span><em>expediente reutilizable</em></div>
      <div class="pf-row"><span>Bitácora socioemocional</span><em>seguimiento PIOE</em></div>
      <div class="pf-row"><span>Consentimiento CONECTA</span><em>trazabilidad</em></div>
      <div class="pf-row"><span>Instrumentos</span><em>motor listo · versión autorizada</em></div>
    </div>
    <div class="pioe-warning" style="margin-top:18px;">
      Los instrumentos conservan su versión oficial. NAIMA no altera reactivos ni protocolos; la aplicación corresponde al personal autorizado.
    </div>
    <button class="btn-maroon" style="width:100%;margin-top:18px;" onclick="closeModal()">Entendido</button>
  `);
}

/* ---------- VISTA: NOVA ---------- */
function renderNova(){
  const list = studentsList();
  const counts = {}; MOODS.forEach(m => counts[m.id] = 0);
  list.forEach(s => { const m = lastMood(s); if(m) counts[m.id]++; });
  const bars = MOODS.map(m => {
    const pct = list.length ? Math.round((counts[m.id] / list.length) * 100) : 0;
    return `<div class="nova-bar-row">
      <div class="nb-head"><span>${m.emoji} ${m.label}</span><span class="mono">${counts[m.id]}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${m.hex};"></div></div>
    </div>`;
  }).join('');
  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">◇ NOVA</span>
      <h1>Visión institucional</h1>
      <p>Información agregada del grupo piloto para seguimiento operativo y toma de decisiones.</p>
    </div>
    <span class="demo-chip">Datos de demostración</span>
  </div>
  <div class="stat-grid">
    <div class="stat-card"><div class="s-icon teal">◇</div><div class="s-num">${list.length}</div><div class="s-lbl">Protoestrellas activas</div></div>
    <div class="stat-card"><div class="s-icon maroon">◎</div><div class="s-num">${porRevisar()}</div><div class="s-lbl">Casos por revisar</div></div>
    <div class="stat-card"><div class="s-icon green">◔</div><div class="s-num">${bienestarPromedio()}%</div><div class="s-lbl">Bienestar promedio</div></div>
  </div>
  <span class="section-label">Distribución</span>
  <h2 class="section-title">Estado de ánimo del grupo (último registro)</h2>
  <div class="panel" style="padding:24px;"><div class="nova-bars">${bars}</div></div>`;
}

/* ---------- Modal ---------- */
function openModal(html){
  document.getElementById('appModalBody').innerHTML = html;
  document.getElementById('appModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  document.getElementById('appModal').classList.remove('active');
  document.body.style.overflow = '';
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/* ---------- Sidebar móvil ---------- */
function toggleSidebarMobile(){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const open = !sb.classList.contains('open');
  sb.classList.toggle('open', open);
  ov.classList.toggle('active', open);
}
function closeSidebarMobile(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

/* ---------- Avatar (SVG) ---------- */
const SKIN_TONES = ['#F5D0B5','#E8B48C','#C68863','#8D5A3E','#5A3825','#3D2314'];
const HAIR_STYLES = ['corto','rizado','largo','moño','rapado','trenzas','emo','punk','afro','bob','coletas','hime'];
const HAIR_COLORS = ['#1B1B1B','#2B1B12','#5B3A29','#8B5A2B','#C99A3E','#D94F70','#4F6FD9','#8B5CF6','#10B981','#F472B6','#FBBF24'];
const SHIRT_COLORS = ['#2F6F62','#FF7A59','#6C63FF','#333333','#FFC857','#EB5757','#3B82F6','#EC4899','#10B981','#F97316','#8B5CF6','#06B6D4'];
const PANTS_COLORS = ['#1F4E44','#B84A2E','#4C45B8','#1A1A1A','#C49A2E','#A83232','#2563EB','#BE185D','#059669','#C2410C','#7C3AED','#0891B2'];
const FACES = ['default','feliz','triste','sorprendido','guiño','cool','enojado','dormido'];
const ACCESSORIES = ['ninguno','lentes','gorra','audifonos','banda','corona','cuernos','mascara','sombrero','aretes','lazo','tiara'];
const BODY_TYPES = ['masculino','femenino'];
const BOTTOM_TYPES = ['pantalon','falda'];
const BG_OPTIONS = ['#E3ECE7','#F3E9D9','#DCEBE6','#F0E4F5','#FDE7E4','#1A1A2E','#16213E','#0F3460'];

function buildAvatarSVG(av, uid){
  uid = uid || 'p';
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
    case 'trenzas': hair = `<path d="M52 44 L52 28 Q52 16 100 16 Q148 16 148 28 L148 44 Q148 34 100 34 Q52 34 52 44 Z" fill="${hc}"/><rect x="40" y="40" width="16" height="68" rx="8" fill="${hc}"/><rect x="144" y="40" width="16" height="68" rx="8" fill="${hc}"/>`; break;
    case 'emo': hair = `<path d="M46 48 L46 22 Q46 12 100 12 Q154 12 154 22 L154 48 L154 92 Q140 82 140 54 L140 38 Q140 30 100 30 Q60 30 60 38 L60 54 Q60 82 46 92 Z" fill="${hc}"/><path d="M46 48 Q46 70 54 86 L66 76 Q60 60 60 42 Z" fill="${hc}"/>`; break;
    case 'punk': hair = `<path d="M52 48 L52 28 Q52 14 100 14 Q148 14 148 28 L148 48 Q148 36 100 36 Q52 36 52 48 Z" fill="${hc}"/><polygon points="70,16 76,2 82,16" fill="${hc}"/><polygon points="100,12 106,-2 112,12" fill="${hc}"/><polygon points="128,16 134,2 140,16" fill="${hc}"/>`; break;
    case 'afro': hair = `<circle cx="100" cy="52" r="50" fill="${hc}"/>`; break;
    case 'bob': hair = `<path d="M46 48 L46 30 Q46 16 100 16 Q154 16 154 30 L154 48 L154 98 Q140 90 140 70 L140 54 Q140 44 100 44 Q60 44 60 54 L60 70 Q60 90 46 98 Z" fill="${hc}"/><rect x="46" y="32" width="108" height="16" rx="5" fill="${hc}"/>`; break;
    case 'coletas': hair = `<path d="M52 44 L52 28 Q52 16 100 16 Q148 16 148 28 L148 44 Q148 34 100 34 Q52 34 52 44 Z" fill="${hc}"/><rect x="38" y="38" width="20" height="58" rx="10" fill="${hc}"/><rect x="142" y="38" width="20" height="58" rx="10" fill="${hc}"/><circle cx="48" cy="96" r="10" fill="${hc}"/><circle cx="152" cy="96" r="10" fill="${hc}"/>`; break;
    case 'hime': hair = `<path d="M46 48 L46 22 Q46 12 100 12 Q154 12 154 22 L154 48 L154 148 Q140 138 140 96 L140 58 Q140 48 100 48 Q60 48 60 58 L60 96 Q60 138 46 148 Z" fill="${hc}"/><rect x="46" y="30" width="108" height="18" rx="5" fill="${hc}"/><path d="M46 78 Q36 100 42 124" stroke="${hc}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M154 78 Q164 100 158 124" stroke="${hc}" stroke-width="9" fill="none" stroke-linecap="round"/>`; break;
  }

  let faceSVG = '';
  switch(face){
    case 'default': faceSVG = `<rect x="78" y="60" width="10" height="12" rx="2" fill="#1a1a1a"/><rect x="112" y="60" width="10" height="12" rx="2" fill="#1a1a1a"/><path d="M88 84 Q100 90 112 84" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; break;
    case 'feliz': faceSVG = `<rect x="78" y="58" width="10" height="10" rx="2" fill="#1a1a1a"/><rect x="112" y="58" width="10" height="10" rx="2" fill="#1a1a1a"/><path d="M82 60 Q83 58 85 60" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M116 60 Q117 58 119 60" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M85 80 Q100 94 115 80" stroke="#1a1a1a" stroke-width="3" fill="none" stroke-linecap="round"/>`; break;
    case 'triste': faceSVG = `<rect x="78" y="62" width="10" height="8" rx="2" fill="#1a1a1a"/><rect x="112" y="62" width="10" height="8" rx="2" fill="#1a1a1a"/><path d="M88 86 Q100 82 112 86" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; break;
    case 'sorprendido': faceSVG = `<circle cx="83" cy="64" r="7" fill="#1a1a1a"/><circle cx="117" cy="64" r="7" fill="#1a1a1a"/><circle cx="85" cy="62" r="2" fill="#fff"/><circle cx="119" cy="62" r="2" fill="#fff"/><ellipse cx="100" cy="86" rx="7" ry="9" fill="#1a1a1a"/>`; break;
    case 'guiño': faceSVG = `<path d="M78 64 Q83 60 88 64" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="112" y="58" width="10" height="10" rx="2" fill="#1a1a1a"/><path d="M85 82 Q100 92 115 82" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; break;
    case 'cool': faceSVG = `<rect x="78" y="58" width="10" height="10" rx="2" fill="#1a1a1a"/><rect x="112" y="58" width="10" height="10" rx="2" fill="#1a1a1a"/><path d="M85 82 Q100 82 115 82" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="74" y="53" width="52" height="4" rx="2" fill="#1a1a1a" opacity="0.6"/>`; break;
    case 'enojado': faceSVG = `<path d="M76 58 L90 64" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M124 58 L110 64" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="78" y="64" width="10" height="8" rx="2" fill="#1a1a1a"/><rect x="112" y="64" width="10" height="8" rx="2" fill="#1a1a1a"/><path d="M88 86 Q100 82 112 86" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; break;
    case 'dormido': faceSVG = `<path d="M78 64 Q83 60 88 64" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M112 64 Q117 60 122 64" stroke="#1a1a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="100" cy="84" r="4" fill="#1a1a1a" opacity="0.3"/><text x="132" y="38" font-family="sans-serif" font-size="14" fill="#1a1a1a" opacity="0.4">z</text><text x="142" y="26" font-family="sans-serif" font-size="10" fill="#1a1a1a" opacity="0.3">z</text>`; break;
  }

  let accessory = '';
  switch(av.accessory){
    case 'lentes': accessory = `<g stroke="#1B241F" stroke-width="3" fill="rgba(255,255,255,0.25)"><rect x="72" y="56" width="22" height="16" rx="4"/><rect x="106" y="56" width="22" height="16" rx="4"/><line x1="94" y1="64" x2="106" y2="64" stroke-width="2.5"/></g>`; break;
    case 'gorra': accessory = `<rect x="48" y="22" width="104" height="20" rx="6" fill="${shirt}"/><rect x="40" y="36" width="64" height="10" rx="5" fill="${shirt}"/>`; break;
    case 'audifonos': accessory = `<path d="M42 68 Q42 16 100 16 Q158 16 158 68" stroke="#333" stroke-width="5" fill="none"/><rect x="32" y="56" width="16" height="28" rx="6" fill="#333"/><rect x="152" y="56" width="16" height="28" rx="6" fill="#333"/><rect x="36" y="60" width="8" height="20" rx="3" fill="#555"/><rect x="156" y="60" width="8" height="20" rx="3" fill="#555"/>`; break;
    case 'banda': accessory = `<rect x="52" y="40" width="96" height="10" rx="5" fill="${shirt}"/>`; break;
    case 'corona': accessory = `<path d="M55 16 L65 2 L75 14 L85 0 L95 12 L105 0 L115 14 L125 2 L135 16 L135 24 L55 24 Z" fill="#FFD700" stroke="#B8860B" stroke-width="1"/><circle cx="85" cy="8" r="3" fill="#FF6B6B"/><circle cx="105" cy="8" r="3" fill="#FF6B6B"/>`; break;
    case 'cuernos': accessory = `<path d="M60 30 Q45 12 35 2 Q50 16 65 28 Z" fill="#8B4513"/><path d="M140 30 Q155 12 165 2 Q150 16 135 28 Z" fill="#8B4513"/>`; break;
    case 'mascara': accessory = `<rect x="58" y="50" width="84" height="42" rx="12" fill="#1a1a1a"/><rect x="70" y="60" width="18" height="14" rx="4" fill="${s}"/><rect x="112" y="60" width="18" height="14" rx="4" fill="${s}"/><line x1="88" y1="67" x2="112" y2="67" stroke="#333" stroke-width="2"/>`; break;
    case 'sombrero': accessory = `<ellipse cx="100" cy="24" rx="52" ry="12" fill="#4A3728"/><path d="M68 24 L74 2 Q100 -8 126 2 L132 24 Z" fill="#5C4033"/>`; break;
    case 'aretes': accessory = `<circle cx="46" cy="66" r="5" fill="#FFD700" stroke="#B8860B" stroke-width="1"/><circle cx="154" cy="66" r="5" fill="#FFD700" stroke="#B8860B" stroke-width="1"/><circle cx="46" cy="76" r="3" fill="#FF6B6B"/><circle cx="154" cy="76" r="3" fill="#FF6B6B"/>`; break;
    case 'lazo': accessory = `<path d="M85 8 L100 16 L115 8 L100 0 Z" fill="#FF6B9D"/><circle cx="100" cy="8" r="5" fill="#FF1744"/>`; break;
    case 'tiara': accessory = `<path d="M60 22 Q80 10 100 14 Q120 10 140 22" stroke="#C0C0C0" stroke-width="3" fill="none"/><circle cx="100" cy="12" r="5" fill="#E0E0E0" stroke="#A0A0A0" stroke-width="1"/><circle cx="80" cy="16" r="3" fill="#E0E0E0"/><circle cx="120" cy="16" r="3" fill="#E0E0E0"/>`; break;
  }

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
    <line x1="84" y1="158" x2="72" y2="220" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
    <line x1="100" y1="158" x2="100" y2="220" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
    <line x1="116" y1="158" x2="128" y2="220" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
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
        <stop offset="0%" stop-color="${av.bg}"/><stop offset="100%" stop-color="${av.bg}" stop-opacity="0.3"/>
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
    ${accessory}
  </svg>`;
}

/* ============================================================
   VISTAS DEL ESTUDIANTE (Paso 2)
   ============================================================ */

let selectedStudentMood = null;

function renderStudentInicio(){
  const user = getCurrentUser();
  const s = db.students[user.matricula || user.id] || user;
  const last = lastMood(s);
  const pendingAlert = (db.alerts || []).find(a => a.studentId === s.matricula && a.status === 'pendiente');

  const greeting = eireneGreeting();

  const moodBanner = last ? `
    <div class="banner" style="border-left-color:${last.hex};">
      <div class="b-icon" style="background:${last.hex}22;color:${last.hex};">${last.emoji}</div>
      <div class="b-body">
        <span class="b-tag">Último registro emocional</span>
        <div class="b-title">Te sentiste "${last.label}" recientemente</div>
        <div class="b-desc">${s.historial[s.historial.length-1]?.note ? `"${escapeHTML(s.historial[s.historial.length-1].note)}"` : 'Recuerda que puedes actualizar cómo te sientes en cualquier momento.'}</div>
      </div>
      <button class="btn-maroon" onclick="nav('student_checkin')">Nuevo Check-in →</button>
    </div>
  ` : `
    <div class="banner">
      <div class="b-icon">💖</div>
      <div class="b-body">
        <span class="b-tag">Bienestar diario</span>
        <div class="b-title">Aún no has hecho tu Check-in de hoy</div>
        <div class="b-desc">Tómate 30 segundos para contarnos cómo te sientes. Eirén y Orión están aquí para acompañarte.</div>
      </div>
      <button class="btn-maroon" onclick="nav('student_checkin')">Hacer Check-in →</button>
    </div>
  `;

  const alertNote = pendingAlert ? `
    <div class="ai-alert-confirmed-notice" style="margin-bottom:24px;">
      <span style="font-size:20px;">🛡️</span>
      <div>
        <strong>Acompañamiento institucional activo:</strong> Tu orientador(a) (${s.guardian || 'Psic. Mariana Estrada'}) tiene conocimiento de tu último reporte de ${pendingAlert.moodLabel}. Recuerda que estamos aquí para ti y puedes solicitar una plática en cualquier momento.
      </div>
    </div>
  ` : '';

  return `
  <div class="student-hero">
    <div class="sh-avatar-wrap">
      ${buildAvatarSVG(s.avatar || DEFAULT_AVATAR, 'sh')}
    </div>
    <div class="sh-body">
      <span class="sh-badge">✦ Espacio del Alumno · CONALEP</span>
      <h1 class="sh-title">${greeting.text}, ${s.display || s.nombre}</h1>
      <p class="sh-desc">Este es tu espacio seguro para registrar tus emociones, tomar pausas activas y recibir apoyo cuando lo necesites.</p>
      <div class="sh-meta">
        <span class="sh-meta-item">Matrícula: <strong>${s.matricula || 'PTB-Demo'}</strong></span>
        <span class="sh-meta-item">Grupo: <strong>${s.grupo || '4B'}</strong></span>
        <span class="sh-meta-item">Carrera: <strong>${s.carrera || 'Informática'}</strong></span>
        <span class="sh-meta-item">Orientador(a): <strong>${s.guardian || 'Psic. Mariana Estrada'}</strong></span>
      </div>
    </div>
  </div>

  ${alertNote}
  ${moodBanner}

  <span class="section-label">Tus herramientas</span>
  <h2 class="section-title">¿Qué te gustaría hacer hoy?</h2>

  <div class="quick-grid">
    <button class="quick-card" onclick="nav('student_checkin')">
      <div class="q-icon">💖</div>
      <div class="q-body">
        <span class="q-title">Check-in Emocional</span>
        <span class="q-sub">Registra cómo te sientes hoy</span>
      </div>
      <span class="q-chev">›</span>
    </button>
    <button class="quick-card" onclick="nav('student_eirene')">
      <div class="q-icon">🌸</div>
      <div class="q-body">
        <span class="q-title">Hablar con Eirén</span>
        <span class="q-sub">Compañera de bienestar y calma</span>
      </div>
      <span class="q-chev">›</span>
    </button>
    <button class="quick-card" onclick="nav('student_orion')">
      <div class="q-icon">✧</div>
      <div class="q-body">
        <span class="q-title">Consejos de Orión</span>
        <span class="q-sub">Organización y motivación escolar</span>
      </div>
      <span class="q-chev">›</span>
    </button>
  </div>

  <div class="duo-grid">
    <div class="duo-card">
      <span class="section-label">🎮 CAMPUS 3D & JUEGOS</span>
      <h3>Recorridos Virtuales y Juegos</h3>
      <p>Explora el plantel CONALEP en 3D, el Puente de Progreso y dinámicas interactivas para despejar la mente.</p>
      <button class="link-arrow" onclick="nav('student_campus3d')">Explorar Campus 3D →</button>
    </div>
    <div class="duo-card">
      <span class="section-label">📓 MI DIARIO</span>
      <h3>Diario de Reflexión</h3>
      <p>Escribe lo que piensas y sientes de forma privada. Un espacio para desahogarte a tu ritmo.</p>
      <button class="link-arrow" onclick="nav('student_diario')">Abrir mi Diario →</button>
    </div>
  </div>

  <div class="section-head-row" style="margin-top:20px;">
    <div><span class="section-label">Historial</span><h2 class="section-title" style="margin-bottom:0;">Tus últimos check-ins</h2></div>
  </div>

  <div class="panel">
    ${(s.historial && s.historial.length) ? s.historial.slice().reverse().map(h => {
      const m = MOODS.find(x => x.id === h.mood) || { hex:'#888', emoji:'•', label:h.mood };
      return `
        <div class="follow-row">
          <div class="f-avatar" style="background:${m.hex}22;color:${m.hex};font-size:20px;">${m.emoji}</div>
          <div class="f-body">
            <span class="f-name">Te sentiste ${m.label}</span>
            <span class="f-grupo">${h.note ? `"${escapeHTML(h.note)}"` : 'Sin comentarios'}</span>
          </div>
          <div class="f-meta">
            <span class="f-date">${h.date}</span>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="follow-empty">
        <div class="fe-icon">✦</div>
        <h4>Aún no hay registros en tu historial</h4>
        <p>Cuando realices tu primer check-in emocional, aparecerá aquí.</p>
      </div>
    `}
  </div>
  `;
}

/* ---------- VISTA: CHECK-IN DEL ESTUDIANTE ---------- */
function renderStudentCheckin(){
  selectedStudentMood = null;

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">BIENESTAR ESTUDIANTIL</span>
      <h1>¿Cómo te sientes hoy?</h1>
      <p>Elige la emoción que mejor represente tu momento. No hay respuestas correctas ni incorrectas.</p>
    </div>
    <span class="demo-chip">Check-in Diario</span>
  </div>

  <div class="student-checkin-box">
    <div class="sc-header">
      <h3>Selecciona tu estado de ánimo</h3>
      <p>Tu respuesta es confidencial y nos ayuda a brindarte el apoyo adecuado si lo necesitas.</p>
    </div>

    <div class="student-mood-grid">
      ${MOODS.map(m => `
        <div class="student-mood-card ${NEGATIVE.includes(m.id) ? 'is-negative' : ''}" 
             id="smCard_${m.id}" 
             onclick="selectStudentMood('${m.id}')">
          <span class="smc-emoji">${m.emoji}</span>
          <span class="smc-label">${m.label}</span>
          <span class="smc-tag">${NEGATIVE.includes(m.id) ? 'Requiere apoyo' : 'Equilibrio'}</span>
        </div>
      `).join('')}
    </div>

    <div class="student-note-field">
      <label for="scNote">¿Quieres contar qué te hace sentir así hoy? (Opcional)</label>
      <textarea id="scNote" placeholder="Ej. Tengo mucha carga con los proyectos de cierre, me siento cansado/a, o simplemente tuve un buen día..."></textarea>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
      <button class="btn-maroon" style="padding:14px 28px;font-size:14px;" onclick="submitStudentCheckin()">
        Registrar mi estado de ánimo →
      </button>
      <span style="font-size:12.5px;color:var(--ink-muted);">
        🔒 Tus datos son tratados conforme a la política de orientación escolar CONALEP.
      </span>
    </div>
  </div>

  <div id="studentCheckinResult"></div>
  `;
}

function selectStudentMood(moodId){
  selectedStudentMood = moodId;
  document.querySelectorAll('.student-mood-card').forEach(c => c.classList.remove('active'));
  const target = document.getElementById('smCard_' + moodId);
  if(target) target.classList.add('active');
}

function submitStudentCheckin(){
  if(!selectedStudentMood){
    alert('Por favor selecciona una emoción antes de guardar.');
    return;
  }

  const noteInput = document.getElementById('scNote');
  const note = noteInput ? noteInput.value.trim() : '';

  const user = getCurrentUser();
  const s = db.students[user.matricula || user.id] || user;
  const moodObj = MOODS.find(m => m.id === selectedStudentMood);

  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const hoy = new Date();
  const hora = String(hoy.getHours()).padStart(2,'0') + ':' + String(hoy.getMinutes()).padStart(2,'0');
  const fechaStr = `${hoy.getDate()} ${meses[hoy.getMonth()]} · ${hora}`;

  // Guardar en historial del estudiante
  if(!s.historial) s.historial = [];
  s.historial.push({
    id: 'chk_' + Date.now(),
    mood: selectedStudentMood,
    date: fechaStr,
    note: note
  });

  const isNeg = NEGATIVE.includes(selectedStudentMood);

  if(isNeg){
    s.prioridad = 'alto';
    // Generar alerta automática para el Coordinador
    if(!db.alerts) db.alerts = [];
    const newAlert = {
      id: 'alt_' + Date.now(),
      studentId: s.matricula,
      studentName: s.nombre,
      grupo: s.grupo,
      carrera: s.carrera,
      mood: selectedStudentMood,
      moodEmoji: moodObj.emoji,
      moodLabel: moodObj.label,
      level: 'urgente',
      status: 'pendiente',
      date: fechaStr,
      note: note || 'Reportó estado negativo en check-in'
    };
    db.alerts.unshift(newAlert);
  } else {
    s.prioridad = 'bajo';
  }

  saveDB();
  renderSidebar();
  renderRoleBanner();

  const resContainer = document.getElementById('studentCheckinResult');
  if(!resContainer) return;

  if(isNeg){
    resContainer.innerHTML = renderAiSupportContainer(s, moodObj, note);
  } else {
    resContainer.innerHTML = renderPositiveAiSupport(s, moodObj, note);
  }

  resContainer.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* --- Componente de Apoyo Emocional IA Dual (Eirén & Orión) ante emociones negativas --- */
function renderAiSupportContainer(student, mood, note){
  const firstName = (student.display || student.nombre).split(' ')[0];

  const eireneMsgs = {
    estresado: `Hola ${firstName}, te escucho con mucho cariño. El estrés en la escuela o en casa puede sentirse como una carga muy pesada, pero no tienes que resolver todo hoy ni hacerlo a solas. Respira hondo: eres una persona valiosa y capaz de superar esto a tu propio ritmo. 💚`,
    triste: `Hola ${firstName}, gracias por tener la valentía de compartir cómo te sientes. Está completamente bien no sentirse bien hoy. Tu tristeza es válida y no tienes por qué ocultarla. Aquí estoy contigo, sin juicios y a tu lado. Mereces un momento de calma hoy. 🌿`,
    enojado: `Hola ${firstName}, reconozco tu molestia y es normal sentir coraje o frustración ante situaciones difíciles. Tómate una pausa cómoda antes de tomar cualquier decisión. Vamos a cuidar tu energía para que recuperes tu tranquilidad. ✨`
  };

  const orionMsgs = {
    estresado: `✧ Consejo de Orión: 'Las tormentas académicas más intensas son temporales'. Te sugiero dividir tus pendientes en partes pequeñas, tomar un vaso con agua y hacer 3 minutos de respiración. Recuerda que tu orientadora ${student.guardian || 'Psic. Mariana Estrada'} está disponible para respaldarte sin juzgarte.`,
    triste: `✧ Consejo de Orión: 'Incluso en la noche más oscura, las estrellas siguen ahí'. Hoy no te exijas perfección. Hablar con alguien de confianza o escribir en tu diario personal te ayudará a ordenar lo que sientes. Tu equipo escolar está de tu lado.`,
    enojado: `✧ Consejo de Orión: 'La pausa es la mayor muestra de fuerza'. Cuando sientas enojo, aléjate unos minutos de la fuente de tensión, camina o realiza una pausa activa. Recuerda que tienes una red de apoyo en CONALEP.`
  };

  return `
  <div class="ai-support-container">
    <div class="ai-support-banner">
      <div class="as-pulse-icon">💚</div>
      <div>
        <h3 class="as-banner-title">Red de Apoyo Emocional Inmediata activada</h3>
        <p class="as-banner-sub">Eirén y Orión están aquí para acompañarte mientras tu reporte es notificado de forma confidencial.</p>
      </div>
    </div>

    <div class="ai-duo-chat-grid">
      <!-- Mensaje Eirén -->
      <div class="ai-agent-bubble eirene">
        <div class="aab-header">
          <div class="aab-avatar">🌸</div>
          <div>
            <span class="aab-name">Eirén</span>
            <span class="aab-role">Tu compañera de bienestar</span>
          </div>
        </div>
        <p class="aab-msg">${eireneMsgs[mood.id] || eireneMsgs['estresado']}</p>
      </div>

      <!-- Mensaje Orión -->
      <div class="ai-agent-bubble orion">
        <div class="aab-header">
          <div class="aab-avatar">✧</div>
          <div>
            <span class="aab-name">Orión</span>
            <span class="aab-role">Estrategia y orientación escolar</span>
          </div>
        </div>
        <p class="aab-msg">${orionMsgs[mood.id] || orionMsgs['estresado']}</p>
      </div>
    </div>

    <div class="ai-alert-confirmed-notice">
      <span>🔔</span>
      <span><strong>Alerta institucional enviada:</strong> Se ha generado un aviso confidencial para tu Orientadora (${student.guardian || 'Psic. Mariana Estrada'}) para brindarte acompañamiento prioritario.</span>
    </div>

    <div class="ai-actions-row">
      <button class="btn-maroon" onclick="eireneStartBreathing()">
        🧘 Hacer pausa de respiración (3 min)
      </button>
      <button class="btn-outline-maroon" onclick="speakEireneCustom('${escapeHTML(eireneMsgs[mood.id] || '')}')">
        🔊 Escuchar a Eirén
      </button>
      <button class="btn-outline-maroon" onclick="nav('student_diario')">
        📓 Escribir en mi Diario
      </button>
      <button class="btn-outline-maroon" style="background:#FFF0F3;border-color:var(--pink);color:var(--pink);" onclick="requestCounselorSupport()">
        🤝 Solicitar cita presencial con Orientación
      </button>
    </div>
  </div>
  `;
}

function renderPositiveAiSupport(student, mood, note){
  const firstName = (student.display || student.nombre).split(' ')[0];

  return `
  <div class="ai-support-container" style="border-color:rgba(23,121,91,.35);background:linear-gradient(145deg,#F7FCF9 0%,#F0F8F4 100%);">
    <div class="ai-support-banner">
      <div class="as-pulse-icon" style="background:rgba(23,121,91,.15);color:var(--green);">✨</div>
      <div>
        <h3 class="as-banner-title" style="color:var(--green);">¡Nos alegra que te sientas ${mood.label}, ${firstName}!</h3>
        <p class="as-banner-sub">Has registrado un estado de bienestar positivo el día de hoy.</p>
      </div>
    </div>

    <div class="ai-duo-chat-grid">
      <div class="ai-agent-bubble eirene">
        <div class="aab-header"><div class="aab-avatar">🌸</div><div><span class="aab-name">Eirén</span><span class="aab-role">Bienestar</span></div></div>
        <p class="aab-msg">¡Qué alegría saber que estás teniendo un buen momento, ${firstName}! Aprovecha esta energía para aprender algo nuevo, compartir con tus compañeros o guardar este recuerdo en tu diario. 💚</p>
      </div>
      <div class="ai-agent-bubble orion">
        <div class="aab-header"><div class="aab-avatar">✧</div><div><span class="aab-name">Orión</span><span class="aab-role">Orientación</span></div></div>
        <p class="aab-msg">✧ Consejo de Orión: Cuando te sientes tranquilo o feliz, tu cerebro aprende y retiene información con mayor claridad. ¡Sigue con ese gran impulso en tus clases de CONALEP!</p>
      </div>
    </div>

    <div class="ai-actions-row">
      <button class="btn-maroon" style="background:var(--green);" onclick="nav('student_inicio')">
        Ir a Mi Espacio →
      </button>
      <button class="btn-outline-maroon" onclick="nav('student_campus3d')">
        🎮 Explorar Campus 3D & Juegos
      </button>
    </div>
  </div>
  `;
}

function speakEireneCustom(msg){
  if(!('speechSynthesis' in window)){
    alert('Tu navegador no soporta síntesis de voz.');
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(msg || 'Hola, estoy aquí contigo.');
  u.lang = 'es-MX';
  u.rate = 0.95;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}

function requestCounselorSupport(){
  const user = getCurrentUser();
  const s = db.students[user.matricula || user.id] || user;

  if(!db.supportRequests) db.supportRequests = [];
  db.supportRequests.push({
    id: 'req_' + Date.now(),
    studentId: s.matricula,
    studentName: s.nombre,
    date: new Date().toLocaleString(),
    status: 'pendiente'
  });

  // Asegurar que exista una alerta en db.alerts
  if(!db.alerts) db.alerts = [];
  db.alerts.unshift({
    id: 'alt_req_' + Date.now(),
    studentId: s.matricula,
    studentName: s.nombre,
    grupo: s.grupo,
    carrera: s.carrera,
    mood: 'solicitud',
    moodEmoji: '🤝',
    moodLabel: 'Solicitud de Cita Directa',
    level: 'urgente',
    status: 'pendiente',
    date: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
    note: 'El alumno solicitó expresamente una cita presencial con el personal de Orientación.'
  });

  saveDB();
  renderRoleBanner();
  renderSidebar();

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:44px;margin-bottom:12px;">🤝</div>
      <h3 style="font-size:20px;margin-bottom:8px;">Solicitud recibida con éxito</h3>
      <p style="font-size:14px;color:var(--ink-soft);line-height:1.6;margin-bottom:20px;">
        Tu orientadora <strong>${s.guardian || 'Psic. Mariana Estrada'}</strong> ha recibido tu notificación prioritaria. Se pondrá en contacto contigo de forma privada y discreta en el plantel escolar.
      </p>
      <div style="background:var(--bg);padding:14px;border-radius:12px;font-size:13px;color:var(--ink-soft);margin-bottom:20px;">
        Si se trata de una urgencia inmediata, por favor acude directamente al cubículo de Orientación Educativa del Plantel.
      </div>
      <button class="btn-maroon" style="width:100%;" onclick="closeModal()">Entendido</button>
    </div>
  `);
}

/* ---------- VISTAS DE EIRÉN Y ORIÓN (ADAPTADAS PARA ESTUDIANTE) ---------- */
function renderStudentEirene(){
  return renderEirene();
}

function renderStudentOrion(){
  const user = getCurrentUser();
  const firstName = (user.display || user.nombre).split(' ')[0];

  const chips = [
    { q:'¿Cómo me organizo para estudiar mejor?', a:'Te sugiero usar la técnica Pomodoro: 25 minutos de estudio enfocado y 5 minutos de descanso. Deja el celular en otra habitación y comienza por la materia que más te cueste.' },
    { q:'Tengo mucha ansiedad antes de un examen', a:'La ansiedad es tu cuerpo preparándose para actuar. Haz 3 respiraciones profundas con Eirén, recuerda que un examen mide un momento y no tu inteligencia, y llega 10 minutos antes para aclimatarte.' },
    { q:'Siento que no puedo con tantas tareas', a:'No intentes hacer todo a la vez. Haz una lista de sólo 3 tareas para hoy y numéralas por importancia. Al terminar una, táchala; ese pequeño logro te dará claridad.' },
    { q:'Quiero hablar con mi orientador escolar', a:'Puedes solicitar una plática confidencial en cualquier momento mediante el botón de cita o acudiendo al cubículo de Orientación en el plantel.' },
  ];

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">✧ ORIÓN · TU GUÍA ESCOLAR</span>
      <h1>Consejos y Estrategias con Orión</h1>
      <p>Orientación para tu trayectoria académica, hábitos de estudio y motivación en CONALEP.</p>
    </div>
    <span class="demo-chip">Asistente de Estudio</span>
  </div>

  <div class="orion-layout">
    <div class="orion-constellation">
      ${orionConstellationSVG()}
    </div>
    <div class="orion-panel">
      <span class="orion-tag">✧ ORIÓN · Guía del estudiante</span>
      <h2 class="orion-title">${orionGreeting()} Hola ${firstName}.</h2>
      <div class="orion-msg">
        Estoy aquí para ayudarte a encontrar el rumbo cuando las materias o el tiempo parezcan difíciles. Pregúntame sobre técnicas de estudio, hábitos y manejo de presión.
      </div>

      <div class="orion-chips">
        ${chips.map(c => `
          <button class="orion-chip" onclick="orionStudentAnswer('${escapeHTML(c.q)}','${escapeHTML(c.a)}')">${c.q}</button>
        `).join('')}
      </div>

      <div class="orion-warning" style="margin-top:18px;">
        Orión te acompaña con estrategias; las decisiones y el apoyo integral siempre están respaldados por tus orientadores de CONALEP.
      </div>
    </div>
  </div>

  <div id="orionStudentAnswerBox" style="margin-top:20px;"></div>
  `;
}

function orionStudentAnswer(q, a){
  const el = document.getElementById('orionStudentAnswerBox');
  if(!el) return;
  el.innerHTML = `
    <div class="orion-result" style="animation:pageEnter .3s ease;">
      <span class="orion-result-tag">✧ Orión responde sobre: "${q}"</span>
      <div class="orion-result-body">
        <p style="font-size:14.5px;line-height:1.6;color:var(--ink);">${a}</p>
      </div>
    </div>
  `;
  el.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ---------- VISTA: CAMPUS 3D & JUEGOS ---------- */
function renderStudentCampus3D(){
  return renderCampus3DView(true);
}

function renderCampus3DCoordinador(){
  return renderCampus3DView(false);
}

function renderCampus3DView(isStudentView){
  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">CAMPUS INTERACTIVO 3D</span>
      <h1>Recorridos 3D y Dinámicas</h1>
      <p>Espacios virtuales inmersivos del plantel CONALEP y experiencias de recorrido interactivo.</p>
    </div>
    <span class="demo-chip">Integración Mérida 3D</span>
  </div>

  <div class="banner">
    <div class="b-icon">△</div>
    <div class="b-body">
      <span class="b-tag">Experiencia Inmersiva</span>
      <div class="b-title">Módulo de Enlace 3D y Videojuegos</div>
      <div class="b-desc">Este espacio está preparado para vincular los entornos 3D modelados del Plantel CONALEP y recorridos interactivos de Mérida.</div>
    </div>
  </div>

  <div class="quick-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">
    <div class="panel" style="padding:24px;display:flex;flex-direction:column;gap:14px;">
      <div style="font-size:36px;">🏫</div>
      <h3>Plantel CONALEP Virtual (3D)</h3>
      <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;">
        Recorrido virtual interactivo en primera persona por las aulas, talleres de especialidad, explanada cívica y cubículo de Orientación Educativa.
      </p>
      <button class="btn-maroon" style="margin-top:auto;" onclick="openCampus3DModal('plantel')">
        Iniciar Recorrido 3D →
      </button>
    </div>

    <div class="panel" style="padding:24px;display:flex;flex-direction:column;gap:14px;">
      <div style="font-size:36px;">🌉</div>
      <h3>Recorrido Puente de Progreso (3D)</h3>
      <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;">
        Experiencia paisajística relajante diseñada para pausas activas, caminatas virtuales y descompresión del estrés estudiantil.
      </p>
      <button class="btn-maroon" style="margin-top:auto;" onclick="openCampus3DModal('puente')">
        Iniciar Experiencia →
      </button>
    </div>

    <div class="panel" style="padding:24px;display:flex;flex-direction:column;gap:14px;">
      <div style="font-size:36px;">🧩</div>
      <h3>Dinámica: Laberinto de Concentración</h3>
      <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;">
        Minijuego de calma y agilidad mental para reenfocar la atención antes de clases o exámenes.
      </p>
      <button class="btn-maroon" style="margin-top:auto;" onclick="openCampus3DModal('juego')">
        Jugar Dinámica →
      </button>
    </div>
  </div>
  `;
}

function openCampus3DModal(tipo){
  const titulos = {
    plantel: '🏫 Recorrido 3D · Plantel CONALEP',
    puente: '🌉 Recorrido 3D · Puente de Progreso',
    juego: '🧩 Dinámica de Concentración'
  };

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Campus 3D & Experiencias</span>
    <h3 style="font-size:18px;margin-bottom:12px;">${titulos[tipo]}</h3>
    <div style="width:100%;height:320px;background:#0F172A;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;margin-bottom:18px;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.1);">
      <div style="font-size:52px;margin-bottom:10px;animation:pulseBadge 2s infinite;">🎮</div>
      <h4 style="font-size:16px;margin-bottom:6px;">Visor 3D preparado</h4>
      <p style="font-size:13px;color:#94A3B8;max-width:380px;text-align:center;line-height:1.5;padding:0 16px;">
        Listo para embeber el build WebGL / Three.js generado por el equipo de Mérida.
      </p>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#38BDF8;margin-top:14px;background:rgba(56,189,248,.12);padding:4px 12px;border-radius:100px;">
        Puerto de enlace 3D listo
      </span>
    </div>
    <div class="pioe-warning" style="margin-bottom:18px;">
      Esta experiencia complementa el bienestar y descanso activo de los alumnos de CONALEP.
    </div>
    <button class="btn-maroon" style="width:100%;" onclick="closeModal()">Cerrar visor</button>
  `);
}

/* ---------- VISTA: MI DIARIO (ESTUDIANTE) ---------- */
function renderStudentDiario(){
  const user = getCurrentUser();
  const sId = user.matricula || user.id;
  const entries = (db.diary && db.diary[sId]) || [];

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">📔 MI ESPACIO PRIVADO</span>
      <h1>Mi Diario Emocional</h1>
      <p>Escribe lo que sientes, lo que aprendiste o lo que te preocupa. Escribir ayuda a ordenar la mente.</p>
    </div>
    <span class="demo-chip">Privado y Seguro</span>
  </div>

  <div class="student-checkin-box">
    <div class="sc-header">
      <h3>Nueva entrada de hoy</h3>
      <p>Tus notas se guardan de forma segura para tus propias reflexiones.</p>
    </div>

    <div class="student-note-field">
      <textarea id="diaryEntryInput" style="min-height:110px;" placeholder="¿Qué pasó hoy? ¿Qué pensamiento quieres soltar o qué momento te gustaría recordar?"></textarea>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <button class="btn-maroon" onclick="saveStudentDiarioEntry()">
        Guardar entrada en mi Diario →
      </button>
      <span id="diarySaveNotice" style="font-size:13px;color:var(--green);font-weight:600;"></span>
    </div>
  </div>

  <span class="section-label">Historial de reflexiones</span>
  <h2 class="section-title">Tus notas anteriores</h2>

  <div class="panel">
    ${entries.length ? entries.slice().reverse().map(e => `
      <div class="follow-row" style="cursor:default;">
        <div class="f-avatar" style="background:var(--green-soft);color:var(--green);font-size:18px;">📓</div>
        <div class="f-body">
          <span class="f-name" style="font-weight:500;font-size:13.5px;color:var(--ink);">${escapeHTML(e.text)}</span>
        </div>
        <div class="f-meta">
          <span class="f-date">${e.date}</span>
        </div>
      </div>
    `).join('') : `
      <div class="follow-empty">
        <div class="fe-icon">✦</div>
        <h4>Tu diario está listo</h4>
        <p>Aún no has escrito ninguna reflexión. Escribe arriba para comenzar.</p>
      </div>
    `}
  </div>
  `;
}

function saveStudentDiarioEntry(){
  const input = document.getElementById('diaryEntryInput');
  const text = input ? input.value.trim() : '';
  if(!text){
    alert('Por favor escribe algo antes de guardar.');
    return;
  }

  const user = getCurrentUser();
  const sId = user.matricula || user.id;

  if(!db.diary) db.diary = {};
  if(!db.diary[sId]) db.diary[sId] = [];

  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const hoy = new Date();
  const fechaStr = `${hoy.getDate()} ${meses[hoy.getMonth()]} · ${String(hoy.getHours()).padStart(2,'0')}:${String(hoy.getMinutes()).padStart(2,'0')}`;

  db.diary[sId].push({
    id: 'dia_' + Date.now(),
    date: fechaStr,
    text: text
  });

  saveDB();

  input.value = '';
  const notice = document.getElementById('diarySaveNotice');
  if(notice){
    notice.textContent = '✓ Guardado exitosamente';
    setTimeout(() => { if(notice) notice.textContent = ''; }, 2500);
  }

  // Refrescar la vista
  setTimeout(() => nav('student_diario'), 400);
}

/* ============================================================
   MODALES DE GESTIÓN DE ROLES Y REGISTRO DE USUARIOS
   ============================================================ */
function openRoleSwitcherModal(){
  const currId = db.currentUserId;

  const usersList = Object.values(db.users || {});
  const coords = usersList.filter(u => u.rol === 'coordinador');
  const students = Object.values(db.students || {});

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Sistema de Autenticación y Demostración</span>
    <h3 style="font-size:20px;margin-bottom:6px;">Seleccionar Perfil Activo</h3>
    <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.5;margin-bottom:18px;">
      Cambia entre el rol de <strong>Coordinador</strong> y los alumnos de prueba (<strong>Protoestrellas</strong>) para experimentar ambas perspectivas de NAIMA OS.
    </p>

    <div style="font-weight:700;font-size:13px;color:var(--maroon);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">
      🛡️ Coordinadores / Orientadores
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
      ${coords.map(c => `
        <div class="role-switch-card ${currId === c.id ? 'active' : ''}" onclick="switchUser('${c.id}');closeModal();">
          <div class="rsc-icon">🛡️</div>
          <div>
            <span class="rsc-title">${c.nombre} ${currId === c.id ? '<span style="color:var(--green);font-size:12px;">(Activo)</span>' : ''}</span>
            <span class="rsc-desc">${c.cargo || 'Orientación Educativa'} · ${c.plantel || 'CONALEP Mérida I'}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="font-weight:700;font-size:13px;color:var(--green);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">
      🎓 Alumnos (Protoestrellas)
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
      ${students.map(st => `
        <div class="role-switch-card ${currId === st.matricula || currId === st.id ? 'active' : ''}" onclick="switchUser('${st.matricula || st.id}');closeModal();">
          <div class="rsc-icon">🎓</div>
          <div>
            <span class="rsc-title">${st.nombre} ${currId === (st.matricula || st.id) ? '<span style="color:var(--green);font-size:12px;">(Activo)</span>' : ''}</span>
            <span class="rsc-desc">${st.matricula} · Grupo ${st.grupo} · ${st.carrera || 'Informática'}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;">
      <button class="btn-outline-maroon" onclick="openRegisterUserModal()">
        ＋ Registrar nuevo alumno o coordinador
      </button>
      <button class="btn-ghost" onclick="resetDB();closeModal();">
        ↺ Restablecer datos demo
      </button>
    </div>
  `);
}

function openRegisterUserModal(){
  openModal(`
    <button class="close-x" onclick="openRoleSwitcherModal()">← Volver</button>
    <span class="section-label">Registro de Usuarios (Supabase Ready)</span>
    <h3 style="font-size:19px;margin-bottom:8px;">Crear Nuevo Usuario</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;margin-bottom:16px;">
      Crea un nuevo perfil para probar la plataforma con datos personalizados.
    </p>

    <form onsubmit="event.preventDefault();saveNewUserSubmit();">
      <div class="proto-form-field">
        <label for="nuRol">Rol de usuario *</label>
        <select id="nuRol" onchange="toggleNuFields(this.value)">
          <option value="estudiante">🎓 Alumno (Estudiante)</option>
          <option value="coordinador">🛡️ Coordinador / Orientador</option>
        </select>
      </div>

      <div class="proto-form-field">
        <label for="nuNombre">Nombre completo *</label>
        <input type="text" id="nuNombre" placeholder="Ej. Daniel Pech Rodríguez" required maxlength="80">
      </div>

      <div class="proto-form-field">
        <label for="nuEmail">Correo electrónico *</label>
        <input type="email" id="nuEmail" placeholder="usuario@conalep.edu.mx" required>
      </div>

      <div id="nuStudentFields">
        <div class="proto-form-grid">
          <div class="proto-form-field">
            <label for="nuMatricula">Matrícula *</label>
            <input type="text" id="nuMatricula" placeholder="PTB-26010">
          </div>
          <div class="proto-form-field">
            <label for="nuGrupo">Grupo *</label>
            <input type="text" id="nuGrupo" placeholder="4A">
          </div>
        </div>

        <div class="proto-form-field">
          <label for="nuCarrera">Carrera técnica *</label>
          <select id="nuCarrera">
            <option>Informática</option>
            <option>Enfermería General</option>
            <option>Mecatrónica</option>
            <option>Electromecánica</option>
            <option>Administración</option>
            <option>Contabilidad</option>
          </select>
        </div>
      </div>

      <div id="nuCoordFields" style="display:none;">
        <div class="proto-form-field">
          <label for="nuCargo">Cargo o puesto *</label>
          <input type="text" id="nuCargo" placeholder="Psicólogo de Turno Matutino" value="Orientador Educativo">
        </div>
      </div>

      <div class="proto-form-error" id="nuError"></div>

      <div class="proto-form-actions" style="margin-top:18px;">
        <button type="button" class="btn-ghost" onclick="openRoleSwitcherModal()">Cancelar</button>
        <button type="submit" class="btn-maroon">Registrar y Entrar</button>
      </div>
    </form>
  `);
}

function toggleNuFields(rol){
  const sF = document.getElementById('nuStudentFields');
  const cF = document.getElementById('nuCoordFields');
  if(rol === 'coordinador'){
    if(sF) sF.style.display = 'none';
    if(cF) cF.style.display = 'block';
  } else {
    if(sF) sF.style.display = 'block';
    if(cF) cF.style.display = 'none';
  }
}

function saveNewUserSubmit(){
  const rol = document.getElementById('nuRol').value;
  const nombre = document.getElementById('nuNombre').value.trim();
  const email = document.getElementById('nuEmail').value.trim();
  const err = document.getElementById('nuError');

  if(!nombre || !email){
    err.textContent = 'Completa los campos obligatorios.';
    err.style.display = 'block';
    return;
  }

  const parts = nombre.split(/\s+/).filter(Boolean);
  const display = parts.length >= 2 ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.` : parts[0];

  if(rol === 'coordinador'){
    const cargo = document.getElementById('nuCargo').value.trim() || 'Orientador Educativo';
    const id = 'usr_coord_' + Date.now();
    const newCoord = {
      id,
      nombre,
      display,
      email,
      rol: 'coordinador',
      cargo,
      plantel: 'CONALEP Mérida I'
    };
    db.users[id] = newCoord;
    saveDB();
    switchUser(id);
    closeModal();
  } else {
    const matricula = document.getElementById('nuMatricula').value.trim() || ('PTB-' + Math.floor(10000 + Math.random()*90000));
    const grupo = document.getElementById('nuGrupo').value.trim() || '2A';
    const carrera = document.getElementById('nuCarrera').value;

    const newStudent = {
      id: matricula,
      matricula,
      nombre,
      display,
      email,
      rol: 'estudiante',
      grupo,
      carrera,
      guardian: 'Psic. Mariana Estrada',
      prioridad: 'bajo',
      segFecha: 'Hoy',
      avatar: { ...DEFAULT_AVATAR },
      historial: []
    };

    db.students[matricula] = newStudent;
    db.users[matricula] = newStudent;
    saveDB();
    switchUser(matricula);
    closeModal();
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', function(){
  renderUserProfile();
  renderRoleBanner();
  renderSidebar();

  const initialView = isCoordinator() ? 'inicio' : 'student_inicio';
  nav(initialView);

  const overlay = document.getElementById('appModal');
  if(overlay){
    overlay.addEventListener('click', function(e){ if(e.target === this) closeModal(); });
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ closeModal(); closeSidebarMobile(); }
  });
  window.addEventListener('resize', function(){ if(window.innerWidth > 992) closeSidebarMobile(); });
});