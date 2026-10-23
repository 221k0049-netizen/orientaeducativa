/* ============================================================
   NAIMA OS · CONALEP — Portal de Administración (admin.js)
   Lógica del Coordinador y Orientador Educativo
   ============================================================ */

// Validación estricta de sesión de orientador/coordinador en admin.js
const currentAdminUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
if (!currentAdminUser || currentAdminUser.rol !== 'coordinador') {
  window.location.replace('index.html');
  throw new Error('Sesión no autorizada. Redirigiendo al inicio de sesión institucional.');
}

const SECTIONS_ADMIN = [
  { id:'inicio',        label:'Inicio',           icon:'◆' },
  { id:'alumnos',       label:'Estudiantes',      icon:'🎓' },
  { id:'psicologia',    label:'Psicología Escolar',icon:'🩺', sep:'CLÍNICA' },
  { id:'agenda',        label:'Agenda & Citas',   icon:'📅' },
  { id:'reportes_ofic', label:'Reportes Oficiales',icon:'📋' },
  { id:'pioe',          label:'PIOE Digital',     icon:'◎', sep:'MÓDULOS' },
  { id:'eirene',        label:'EIRÉNÉ',           icon:'◌' },
  { id:'orion',         label:'ORION Asistente',  icon:'✧' },
  { id:'catalogo',      label:'Documentos',       icon:'▤' },
  { id:'nova',          label:'NOVA Analítica',   icon:'◇' },
  { id:'campus3d',      label:'Campus 3D',        icon:'△' },
  { id:'equipo',        label:'Orientadores',     icon:'🛡️', sep:'SISTEMA' },
  { id:'config',        label:'Configuración',    icon:'⚙' },
];

let currentSection = 'inicio';
let pioeOpen = null;

/* ---------- Render Sidebar y Perfil ---------- */
function renderAdminUserProfile(){
  const el = document.getElementById('userProfileBlock');
  if(!el) return;
  const user = getCurrentUser() || {};
  let rawPhoto = user.photo || user.avatar_url || (db.users[user.id] && (db.users[user.id].photo || db.users[user.id].avatar_url)) || (db.users[user.email] && (db.users[user.email].photo || db.users[user.email].avatar_url)) || null;
  if(rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim().startsWith('{')){
    try{ rawPhoto = JSON.parse(rawPhoto).photo || null; }catch(e){}
  }
  const photo = rawPhoto;

  el.innerHTML = `
    <div class="up-avatar-wrap" onclick="openAdminPhotoModal()" title="Haz clic para subir o cambiar tu foto de perfil">
      <div class="up-avatar">
        ${photo ? `
          <img src="${escapeHTML(photo)}" class="up-avatar-img" alt="Foto de ${escapeHTML(user.nombre || user.display || 'Orientador')}">
        ` : `
          ${initialOf(user.display || user.nombre || 'V')}
        `}
      </div>
      <span class="up-camera-badge" title="Cambiar foto">📷</span>
    </div>
    <div class="up-details">
      <span class="up-name" title="${escapeHTML(user.nombre || user.display || '')}">${escapeHTML(user.display || user.nombre || 'Orientador')}</span>
      <span class="up-role-tag coord">🛡️ ${escapeHTML(user.cargo || 'Orientador Educativo')}</span>
    </div>
  `;

  const topUserEl = document.getElementById('adminHeaderUser');
  if(topUserEl) topUserEl.textContent = `${user.nombre || user.display || 'Orientador'} · ${user.plantel || 'CONALEP Mérida I'}`;
}

function renderAdminSidebar(){
  const navEl = document.getElementById('navlist');
  if(!navEl) return;
  const user = getCurrentUser();
  const myPendingAlerts = (db.alerts || []).filter(a => a.status === 'pendiente' && isAlertAssignedToMe(a, user)).length;

  // Actualizar botón de alerta en la barra superior si existe (solo alertas de sus alumnos)
  const topAlertBtn = document.getElementById('topNavAlertBtn');
  const topAlertCount = document.getElementById('topNavAlertCount');
  if(topAlertBtn && topAlertCount){
    if(myPendingAlerts > 0){
      topAlertBtn.style.display = 'inline-flex';
      topAlertCount.textContent = myPendingAlerts;
    } else {
      topAlertBtn.style.display = 'none';
    }
  }

  navEl.innerHTML = SECTIONS_ADMIN.map(s => {
    const sep = s.sep ? `<div class="nav-sep">${s.sep}</div>` : '';
    const alertChip = (s.id === 'inicio' && myPendingAlerts > 0)
      ? `<span class="nav-alert-badge">${myPendingAlerts}</span>`
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

  if(sec === 'inicio')             el.innerHTML = renderAdminInicio();
  else if(sec === 'alumnos')       el.innerHTML = renderProtoestrellas();
  else if(sec === 'psicologia')    el.innerHTML = renderAdminPsicologia();
  else if(sec === 'agenda')        el.innerHTML = renderAdminAgenda();
  else if(sec === 'reportes_ofic') el.innerHTML = renderAdminReportesOficiales();
  else if(sec === 'pioe')          el.innerHTML = renderPioe();
  else if(sec === 'eirene')        el.innerHTML = renderEirene();
  else if(sec === 'orion')         el.innerHTML = renderOrionPanel();
  else if(sec === 'catalogo')      el.innerHTML = renderDocumentos();
  else if(sec === 'nova')          el.innerHTML = renderNova();
  else if(sec === 'campus3d')      el.innerHTML = renderCampus3DCoordinador();
  else if(sec === 'equipo')        el.innerHTML = renderEquipoCoordinadores();
  else if(sec === 'config')        el.innerHTML = renderConfiguracion();
  else el.innerHTML = renderAdminStub(sec);
}

function renderAdminStub(sec){
  const s = SECTIONS_ADMIN.find(x => x.id === sec) || { id:sec, label:'Módulo', icon:'⚙' };
  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">PORTAL ADMINISTRATIVO</span>
        <h1>${s.label}</h1>
        <p>Módulo institucional de la plataforma NAIMA OS.</p>
      </div>
      <span class="demo-chip">CONALEP Mérida I</span>
    </div>
    <div class="stub-panel">
      <div class="big">${s.icon}</div>
      <h3>${s.label} · En preparación</h3>
      <p>Este módulo forma parte de la hoja de ruta institucional de NAIMA OS. Puedes continuar gestionando expedientes, alertas y el PIOE desde el menú.</p>
    </div>
  `;
}

/* ---------- Helpers de Datos y Filtros de Orientador ---------- */
function isStudentAssignedToMe(s, user){
  const u = user || getCurrentUser();
  if(!u || !s) return false;
  const uName = (u.nombre || '').trim().toLowerCase();
  const uDisplay = (u.display || '').trim().toLowerCase();
  const uEmail = (u.email || '').trim().toLowerCase();
  const guardian = (s.guardian || '').trim().toLowerCase();
  const guardianEmail = (s.guardianEmail || '').trim().toLowerCase();

  if(guardianEmail && uEmail && guardianEmail === uEmail) return true;
  if(guardian && uName && (guardian === uName || guardian === uDisplay || guardian.includes(uName) || uName.includes(guardian))) return true;
  return false;
}

function isAlertAssignedToMe(alt, user){
  const u = user || getCurrentUser();
  if(!u || !alt) return false;
  const uEmail = (u.email || '').trim().toLowerCase();
  const uName = (u.nombre || '').trim().toLowerCase();
  const altEmail = (alt.psychologistEmail || '').trim().toLowerCase();
  const altName = (alt.psychologistName || '').trim().toLowerCase();

  if(altEmail && uEmail && altEmail === uEmail) return true;
  if(altName && uName && (altName === uName || altName.includes(uName) || uName.includes(altName))) return true;

  const s = db.students[alt.studentId];
  if(s) return isStudentAssignedToMe(s, u);
  return false;
}

function studentsList(){ return Object.values(db.students || {}); }

function myStudentsList(){
  const u = getCurrentUser();
  return studentsList().filter(s => isStudentAssignedToMe(s, u));
}

function lastMood(s){ const h = s.historial && s.historial[s.historial.length-1]; return h ? MOODS.find(m=>m.id===h.mood) : null; }

function porRevisar(customList){
  const target = customList || myStudentsList();
  return target.filter(s => s.prioridad === 'medio' || s.prioridad === 'alto'
    || NEGATIVE.includes(lastMood(s)?.id)).length;
}

function bienestarPromedio(customList){
  const list = customList || myStudentsList();
  if(!list.length) return 0;
  const sum = list.reduce((a,s)=>{ const m = lastMood(s); return a + (m ? MOOD_W[m.id] : 0); },0);
  return Math.round(sum / list.length);
}

let adminAlertsScope = 'mis_alumnos'; // 'mis_alumnos' | 'plantel'

function setAdminAlertsScope(scope){
  adminAlertsScope = scope;
  const el = document.getElementById('content');
  if(el) el.innerHTML = renderAdminInicio();
}

/* ---------- VISTA: INICIO (ADMIN) ---------- */
function renderAdminInicio(){
  const user = getCurrentUser();
  const allStudents = studentsList();
  const myStudents = myStudentsList();
  const allPendingAlerts = (db.alerts || []).filter(a => a.status === 'pendiente');
  const myPendingAlerts = allPendingAlerts.filter(a => isAlertAssignedToMe(a, user));

  const isGlobalScope = adminAlertsScope === 'plantel';
  const displayedAlerts = isGlobalScope ? allPendingAlerts : myPendingAlerts;

  const rev = porRevisar(myStudents);
  const bien = bienestarPromedio(myStudents);

  // Alertas prioritarias provocadas por check-ins neutros o negativos
  let urgentAlertsHTML = '';

  if(displayedAlerts.length > 0){
    urgentAlertsHTML = `
      <div class="coord-urgent-box">
        <div class="cub-head">
          <div class="cub-title">
            <span>🚨</span> ${isGlobalScope ? 'Alertas Globales de Supervisión del Plantel' : 'Alertas de Tus Alumnos Asignados'}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button class="btn-outline-maroon" style="padding:4px 10px;font-size:11.5px;background:#FFF;" onclick="setAdminAlertsScope('${isGlobalScope ? 'mis_alumnos' : 'plantel'}')">
              ${isGlobalScope ? `← Volver a mis alumnos (${myPendingAlerts.length})` : `👁️ Ver todas del plantel (${allPendingAlerts.length})`}
            </button>
            <span class="cub-badge">${displayedAlerts.length} ${displayedAlerts.length === 1 ? 'caso prioritario' : 'casos prioritarios'}</span>
          </div>
        </div>
        <p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;">
          ${isGlobalScope 
            ? 'Vista de supervisión general: mostrando todas las alertas pendientes registradas en el plantel CONALEP Mérida I.' 
            : 'Estudiantes asignados a tu acompañamiento que registraron estados de ánimo que requieren atención socioemocional.'}
        </p>
        <div class="cub-list">
          ${displayedAlerts.map(alt => {
            const s = db.students[alt.studentId] || {};
            const isUrgent = alt.level === 'urgente';
            const psychName = alt.psychologistName || s.guardian || 'Orientador Asignado';
            return `
            <div class="cub-item ${isUrgent ? 'cub-item-urgent' : 'cub-item-neutral'}">
              <div class="cub-item-info">
                <div class="cub-mood-dot">${alt.moodEmoji || '⚠️'}</div>
                <div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="cub-student-name">${alt.studentName} (${alt.grupo} · ${alt.carrera || 'Informática'})</span>
                    <span class="prio-chip ${isUrgent ? 'alto' : 'medio'}" style="font-size:10.5px;padding:2px 7px;">
                      ${isUrgent ? '🔴 Atención Urgente' : '🟡 Seguimiento Preventivo'}
                    </span>
                  </div>
                  <span class="cub-student-sub">
                    Reportó: <strong>${alt.moodLabel || alt.mood}</strong> · ${alt.date} 
                    ${alt.note ? `— <em>"${escapeHTML(alt.note)}"</em>` : ''}
                  </span>
                  <div style="font-size:11.8px;color:var(--ink-soft);margin-top:3px;">
                    🩺 <strong>Orientador(a) asignado(a):</strong> ${psychName}
                    <span style="color:var(--green);font-weight:600;margin-left:8px;">✓ Correo notificado</span>
                  </div>
                </div>
              </div>
              <div class="cub-item-actions">
                <button class="btn-maroon" style="padding:7px 14px;font-size:12.5px;display:flex;align-items:center;gap:6px;" onclick="openContactStudentModal('${alt.id}')">
                  📞 Comunicarse con el Alumno
                </button>
                <button class="btn-outline-maroon" style="padding:6px 11px;font-size:12px;" onclick="openAlertEmailModal('${alt.id}')" title="Ver correo institucional de alerta">
                  ✉️ Ver Correo
                </button>
                <button class="btn-outline-maroon" style="padding:6px 12px;font-size:12px;" onclick="openStudentModal('${alt.studentId}')">
                  📋 Expediente
                </button>
                <button class="btn-resolve-alert" onclick="resolveAlert('${alt.id}')" title="Marcar como atendida una vez contactado el alumno">
                  ✓ Atendida
                </button>
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    `;
  } else {
    urgentAlertsHTML = `
      <div class="coord-status-box" style="background:#FFFFFF;border:1px solid #E8E5DF;border-radius:12px;padding:20px 24px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px;">
          <div style="display:flex;align-items:flex-start;gap:14px;max-width:680px;">
            <span style="font-size:28px;line-height:1;">🩺</span>
            <div>
              <h4 style="margin:0 0 5px 0;font-size:15px;color:var(--ink);font-weight:700;">
                ${myStudents.length === 0 ? `Panel de Orientación: ${escapeHTML(user.nombre)} · Sin estudiantes asignados actualmente` : 'Todo al día con tus estudiantes asignados'}
              </h4>
              <p style="margin:0;font-size:13px;color:var(--ink-soft);line-height:1.5;">
                ${myStudents.length === 0 
                  ? `Tu cuenta de orientador(a) está activa en la base de datos oficial. En cuanto un alumno seleccione a <strong>${escapeHTML(user.nombre)}</strong> como su orientador al registrarse, sus expedientes, check-ins y alertas socioemocionales se asignarán automáticamente a tu panel.` 
                  : 'No tienes alertas socioemocionales prioritarias ni situaciones de riesgo pendientes de atender en tus alumnos asignados.'}
              </p>
            </div>
          </div>
          ${allPendingAlerts.length > 0 ? `
            <button class="btn-outline-maroon" style="font-size:12px;padding:6px 12px;white-space:nowrap;" onclick="setAdminAlertsScope('plantel')">
              👁️ Supervisar alertas globales del plantel (${allPendingAlerts.length}) →
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  const AVATAR_TONES = ['tone-a','tone-b','tone-c'];
  const segStudents = myStudents.length ? myStudents : [];
  const segRows = segStudents.map((s,i)=>`
    <div class="follow-row" onclick="openStudentModal('${s.matricula}')">
      <div class="f-avatar ${AVATAR_TONES[i % 3]}">${initialOf(s.display)}</div>
      <div class="f-body">
        <span class="f-name">${s.display}</span>
        <span class="f-grupo">${s.grupo} · ${s.carrera || ''}</span>
      </div>
      <div class="f-meta">
        <span class="f-date">${s.segFecha || 'Pendiente'}</span>
        <span class="prio-chip ${s.prioridad}">${s.prioridad.charAt(0).toUpperCase()+s.prioridad.slice(1)}</span>
      </div>
    </div>`).join('');

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">PANEL DE CONTROL DE ORIENTACIÓN EDUCATIVA</span>
      <h1>¿Qué necesita tu atención hoy?</h1>
      <p>NAIMA organiza el panorama socioemocional del plantel para priorizar a los alumnos que requieren acompañamiento humano.</p>
    </div>
    <span class="demo-chip">CONALEP Mérida I</span>
  </div>

  ${urgentAlertsHTML}

  <div class="banner">
    <div class="b-icon">◎</div>
    <div class="b-body">
      <span class="b-tag">Seguimiento prioritario</span>
      <div class="b-title">${myStudents.length ? `${rev} ${rev === 1 ? 'estudiante asignado requiere' : 'estudiantes asignados requieren'} revisión activa` : 'Sin casos asignados actualmente'}</div>
      <div class="b-desc">${myStudents.length ? 'Consulta los casos priorizados de tu alumnado y registra las bitácoras institucionales.' : 'En cuanto tengas estudiantes asignados, aquí se calcularán sus casos prioritarios.'}</div>
    </div>
    <button class="btn-maroon" onclick="nav('alumnos')">Ver Estudiantes →</button>
  </div>

  <span class="section-label">Panorama institucional</span>
  <h2 class="section-title">Estado operativo</h2>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="s-icon teal">◇</div>
      <div class="s-num">${myStudents.length}</div>
      <div class="s-lbl">Tus alumnos asignados <span style="font-size:11px;opacity:0.75;display:block;">(${allStudents.length} en el plantel)</span></div>
    </div>
    <div class="stat-card">
      <div class="s-icon maroon">◎</div>
      <div class="s-num">${myPendingAlerts.length}</div>
      <div class="s-lbl">Tus alertas prioritarias</div>
    </div>
    <div class="stat-card">
      <div class="s-icon green">◔</div>
      <div class="s-num">${myStudents.length ? bien + '%' : '—'}</div>
      <div class="s-lbl">${myStudents.length ? 'Bienestar de tus alumnos' : 'Sin alumnos asignados'}</div>
    </div>
  </div>

  <span class="section-label">Accesos rápidos</span>
  <h2 class="section-title">Acciones frecuentes</h2>
  <div class="quick-grid">
    <button class="quick-card" onclick="quickNuevaProtoestrella()">
      <div class="q-icon">＋</div>
      <div class="q-body"><span class="q-title">Nuevo Estudiante</span><span class="q-sub">Registrar expediente</span></div>
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
        <p>Aún no hay estudiantes registrados. Cuando existan expedientes, sus seguimientos aparecerán aquí.</p>
      </div>`}
  </div>

  <p class="foot-note"><span class="spark">✦</span> NAIMA apoya la organización del trabajo; las decisiones de acompañamiento corresponden siempre al personal profesional.</p>`;
}

async function resolveAlert(alertId){
  await resolveAlertInDb(alertId, 'Atendida y seguimiento registrado por el orientador(a).');
  renderAdminSidebar();
  nav('inicio');
}

/* ============================================================
   SUBMÓDULO: CRUD COMPLETO DE ESTUDIANTES / ESTATUS ESCOLAR
   ============================================================ */
let protoestrellasTab = 'mis_alumnos';
let protoStudentSearch = '';
let protoStudentFilterStatus = '';
let protoStudentFilterCareer = '';

const CONALEP_CAREERS = [
  'Informática',
  'Enfermería General',
  'Mecatrónica',
  'Electromecánica',
  'Administración',
  'Contabilidad',
  'Autotrónica',
  'Alimentos y Bebidas',
  'Hospitalidad Turística',
  'Otro'
];

function getStudentStatusInfo(s){
  const est = (s && s.estado) ? s.estado.toLowerCase() : 'activo';
  if(est === 'baja_definitiva') {
    return { id: 'baja_definitiva', label: 'Baja Definitiva', icon: '🔴', class: 'baja-definitiva', isBaja: true };
  }
  if(est === 'baja_temporal') {
    return { id: 'baja_temporal', label: 'Baja Temporal', icon: '🟡', class: 'baja-temporal', isBaja: true };
  }
  if(est === 'egresado') {
    return { id: 'egresado', label: 'Egresado', icon: '⚪', class: 'egresado', isBaja: false };
  }
  return { id: 'activo', label: 'Activo', icon: '🟢', class: 'activo', isBaja: false };
}

function setProtoTab(tab){
  protoestrellasTab = tab;
  const el = document.getElementById('content');
  if(el) el.innerHTML = renderProtoestrellas();
}

function setProtoStudentSearch(val){
  protoStudentSearch = val || '';
  const tbody = document.getElementById('protoStudentsTableBody');
  if(tbody) tbody.innerHTML = renderProtoStudentsTableRows();
}

function setProtoStudentFilterStatus(val){
  protoStudentFilterStatus = val || '';
  const tbody = document.getElementById('protoStudentsTableBody');
  if(tbody) tbody.innerHTML = renderProtoStudentsTableRows();
}

function setProtoStudentFilterCareer(val){
  protoStudentFilterCareer = val || '';
  const tbody = document.getElementById('protoStudentsTableBody');
  if(tbody) tbody.innerHTML = renderProtoStudentsTableRows();
}

function getFilteredStudentsList(){
  const user = getCurrentUser();
  const all = studentsList();
  const my = myStudentsList();

  let base = all;
  if(protoestrellasTab === 'mis_alumnos') base = my;
  else if(protoestrellasTab === 'activos') base = all.filter(s => (s.estado || 'activo') === 'activo');
  else if(protoestrellasTab === 'bajas') base = all.filter(s => s.estado === 'baja_temporal' || s.estado === 'baja_definitiva');

  const q = (protoStudentSearch || '').toLowerCase().trim();
  const fStatus = protoStudentFilterStatus;
  const fCareer = protoStudentFilterCareer;

  return base.filter(s => {
    const stInfo = getStudentStatusInfo(s);
    if(fStatus && stInfo.id !== fStatus) return false;
    if(fCareer && (s.carrera || '').toLowerCase() !== fCareer.toLowerCase()) return false;
    if(q){
      const match = [
        s.nombre,
        s.matricula,
        s.grupo,
        s.carrera,
        s.tutor,
        s.email,
        s.telefono,
        s.guardian
      ].some(field => field && field.toLowerCase().includes(q));
      if(!match) return false;
    }
    return true;
  });
}

function renderProtoStudentsTableRows(){
  const user = getCurrentUser();
  const list = getFilteredStudentsList();

  if(!list.length){
    return `
      <tr class="proto-empty-row">
        <td colspan="6">
          <div class="proto-empty" style="padding:36px 20px;text-align:center;">
            <div class="pe-icon" style="font-size:28px;margin-bottom:8px;">🔍</div>
            <h3 style="margin:0 0 6px 0;font-size:16px;">No se encontraron estudiantes</h3>
            <p style="color:var(--ink-soft);max-width:480px;margin:0 auto 14px;font-size:13px;">
              Intenta cambiar los términos de búsqueda o los filtros aplicados.
            </p>
            <button class="btn-ghost" onclick="protoStudentSearch='';protoStudentFilterStatus='';protoStudentFilterCareer='';if(currentSection==='alumnos')document.getElementById('content').innerHTML=renderProtoestrellas();">
              Limpiar filtros
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  return list.map(s => {
    const isAssignedToCurrent = isStudentAssignedToMe(s, user);
    const stInfo = getStudentStatusInfo(s);
    const isBaja = stInfo.isBaja;

    return `
    <tr style="${isBaja ? 'background:rgba(253,237,236,0.3);' : ''}">
      <td class="pt-name">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;">
          <strong style="${isBaja ? 'text-decoration:line-through;color:var(--ink-soft);' : 'color:var(--ink);'}">${escapeHTML(s.nombre)}</strong>
          ${isAssignedToCurrent ? '<span style="color:var(--green);font-size:11px;font-weight:700;">(Tu estudiante)</span>' : ''}
          ${s.tamizaje ? `<span class="badge-tamizaje ${(s.tamizaje.resultados && s.tamizaje.resultados.riesgoGlobal) || 'bajo'}" title="Tamizaje PIOE">🩺 ${(s.tamizaje.resultados && s.tamizaje.resultados.riesgoGlobal ? s.tamizaje.resultados.riesgoGlobal.toUpperCase() : 'PIOE')}</span>` : ''}
        </div>
      </td>
      <td class="pt-mat mono" style="font-weight:600;">${escapeHTML(s.matricula)}</td>
      <td>
        <div><strong>${escapeHTML(s.grupo || '—')}</strong> · ${escapeHTML(s.carrera || 'Sin carrera')}</div>
        <div style="font-size:11px;color:var(--ink-muted);">${escapeHTML(s.turno || 'Matutino')}</div>
      </td>
      <td>
        <span style="font-weight:${isAssignedToCurrent ? '700' : '400'};color:${isAssignedToCurrent ? 'var(--green)' : 'var(--ink)'};">
          ${escapeHTML(s.guardian || 'Por asignar')}
        </span>
      </td>
      <td>
        <span class="badge-student-status ${stInfo.class}" title="${s.motivo_baja ? escapeHTML(s.motivo_baja) : ''}">
          ${stInfo.icon} ${stInfo.label}
        </span>
        ${s.motivo_baja ? `
          <div style="font-size:10px;color:var(--ink-soft);margin-top:2px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(s.motivo_baja)}">
            ${escapeHTML(s.motivo_baja)}
          </div>
        ` : ''}
      </td>
      <td class="pt-action" style="white-space:nowrap;">
        <div class="student-crud-actions">
          <button class="btn-action-crud" onclick="openStudentModal('${escapeHTML(s.matricula)}')" title="Ver expediente integral">
            Expediente
          </button>
          <button class="btn-action-crud btn-crud-edit" onclick="openEditStudentModal('${escapeHTML(s.matricula)}')" title="Modificar datos del estudiante">
            ✏️ Editar
          </button>
          ${isBaja ? `
            <button class="btn-action-crud btn-crud-reactivar" onclick="reactivateStudent('${escapeHTML(s.matricula)}')" title="Reactivar a este alumno como Activo">
              🔄 Reactivar
            </button>
          ` : `
            <button class="btn-action-crud btn-crud-baja" onclick="openBajaStudentModal('${escapeHTML(s.matricula)}')" title="Dar de baja temporal o definitiva">
              ⚠️ Baja
            </button>
          `}
          <a href="reporte-psicologico.html?matricula=${encodeURIComponent(s.matricula)}" target="_blank" class="btn-action-crud" title="Generar Reporte Psicológico Oficial">
            📋 Reporte
          </a>
          <button class="btn-action-crud btn-crud-delete" onclick="deleteStudentPermanent('${escapeHTML(s.matricula)}')" title="Eliminar alumno definitivamente del sistema">
            🗑️
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ---------- VISTA: ESTUDIANTES ---------- */
function renderProtoestrellas(){
  const user = getCurrentUser();
  const allStudents = studentsList();
  const myStudents = myStudentsList();
  const activos = allStudents.filter(s => (s.estado || 'activo') === 'activo');
  const bajas = allStudents.filter(s => s.estado === 'baja_temporal' || s.estado === 'baja_definitiva');

  return `
  <div class="page-head">
    <div>
      <h1>Estudiantes</h1>
      <p>Una persona, un expediente, una historia acompañada en CONALEP.</p>
    </div>
  </div>

  <div class="proto-banner">
    <div class="pb-body">
      <span class="pb-tag">Expediente Único Digital · Control Institucional</span>
      <p class="pb-desc">Gestión integral de expedientes, altas, modificaciones y estatus de alumnos en CONALEP Mérida I.</p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="psicologia-escolar.html#tab-importar" class="btn-outline-maroon" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;text-decoration:none;background:#FFF;display:inline-flex;align-items:center;gap:6px;">📥 Importar Excel / CSV</a>
      <a href="psicologia-escolar.html#tab-agenda" class="btn-outline-maroon" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;text-decoration:none;background:#FFF;display:inline-flex;align-items:center;gap:6px;">📅 Agenda de Citas</a>
      <button class="btn-maroon" onclick="quickNuevaProtoestrella()">+ Nuevo Estudiante</button>
    </div>
  </div>

  <!-- Barra de Filtros y Búsqueda en Tiempo Real -->
  <div class="student-filter-toolbar">
    <div class="student-search-box">
      <span>🔍</span>
      <input type="text" placeholder="Buscar por nombre, matrícula, grupo, carrera, tutor..."
             value="${escapeHTML(protoStudentSearch)}"
             oninput="setProtoStudentSearch(this.value)">
      ${protoStudentSearch ? `<button type="button" onclick="setProtoStudentSearch('');document.querySelector('.student-search-box input').value='';" style="background:transparent;border:none;cursor:pointer;color:var(--ink-muted);font-size:12px;">✕</button>` : ''}
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
      <select class="student-filter-select" onchange="setProtoStudentFilterStatus(this.value)">
        <option value="" ${protoStudentFilterStatus===''?'selected':''}>Todos los estatus</option>
        <option value="activo" ${protoStudentFilterStatus==='activo'?'selected':''}>🟢 Activos (${activos.length})</option>
        <option value="baja_temporal" ${protoStudentFilterStatus==='baja_temporal'?'selected':''}>🟡 Baja Temporal</option>
        <option value="baja_definitiva" ${protoStudentFilterStatus==='baja_definitiva'?'selected':''}>🔴 Baja Definitiva</option>
        <option value="egresado" ${protoStudentFilterStatus==='egresado'?'selected':''}>⚪ Egresados</option>
      </select>

      <select class="student-filter-select" onchange="setProtoStudentFilterCareer(this.value)">
        <option value="" ${protoStudentFilterCareer===''?'selected':''}>Todas las carreras</option>
        ${CONALEP_CAREERS.map(c => `
          <option value="${escapeHTML(c)}" ${protoStudentFilterCareer===c?'selected':''}>${escapeHTML(c)}</option>
        `).join('')}
      </select>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:20px 0 14px;">
    <h2 class="proto-community-title" style="margin:0;">Comunidad Estudiantil</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn-outline-maroon" style="padding:6px 14px;border-radius:100px;font-size:12.5px;font-weight:600;background:${protoestrellasTab==='mis_alumnos' ? 'var(--maroon)' : '#FFF'};color:${protoestrellasTab==='mis_alumnos' ? '#FFF' : 'var(--maroon)'};border-color:var(--maroon);" onclick="setProtoTab('mis_alumnos')">
        📌 Mis Estudiantes Asignados (${myStudents.length})
      </button>
      <button class="btn-outline-maroon" style="padding:6px 14px;border-radius:100px;font-size:12.5px;font-weight:600;background:${protoestrellasTab==='todos' ? 'var(--maroon)' : '#FFF'};color:${protoestrellasTab==='todos' ? '#FFF' : 'var(--maroon)'};border-color:var(--maroon);" onclick="setProtoTab('todos')">
        🌐 Todos (${allStudents.length})
      </button>
      <button class="btn-outline-maroon" style="padding:6px 14px;border-radius:100px;font-size:12.5px;font-weight:600;background:${protoestrellasTab==='activos' ? 'var(--maroon)' : '#FFF'};color:${protoestrellasTab==='activos' ? '#FFF' : 'var(--maroon)'};border-color:var(--maroon);" onclick="setProtoTab('activos')">
        🟢 Activos (${activos.length})
      </button>
      <button class="btn-outline-maroon" style="padding:6px 14px;border-radius:100px;font-size:12.5px;font-weight:600;background:${protoestrellasTab==='bajas' ? 'var(--maroon)' : '#FFF'};color:${protoestrellasTab==='bajas' ? '#FFF' : 'var(--maroon)'};border-color:var(--maroon);" onclick="setProtoTab('bajas')">
        ⚠️ En Baja (${bajas.length})
      </button>
    </div>
  </div>

  <div class="proto-table-wrap">
    <table class="proto-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Matrícula</th>
          <th>Grupo / Carrera</th>
          <th>Orientador Asignado</th>
          <th>Estatus Escolar</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="protoStudentsTableBody">
        ${renderProtoStudentsTableRows()}
      </tbody>
    </table>
  </div>`;
}

/* ---------- CREAR NUEVO ESTUDIANTE (MODAL COMPLETO) ---------- */
async function quickNuevaProtoestrella(){
  let psychs = [];
  try{
    if(typeof getActivePsychologists === 'function'){
      psychs = await getActivePsychologists();
    }
  }catch(e){}
  if(!psychs.length){
    psychs = Object.values(db.users || {}).filter(u => u && u.rol === 'coordinador');
  }

  const currentUser = getCurrentUser();

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Expediente Único Digital</span>
    <h3 style="font-size:18px;margin-bottom:6px;color:var(--ink);">＋ Registrar Nuevo Estudiante</h3>
    <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.55;margin-bottom:16px;">
      Registra un nuevo expediente en el sistema institucional CONALEP Mérida I.
    </p>

    <form id="protoForm" onsubmit="event.preventDefault();saveProtoestrella();" autocomplete="off">
      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="pfNombre">Nombre Completo *</label>
          <input type="text" id="pfNombre" placeholder="Ej. Andrea Méndez López" required maxlength="100">
        </div>
        <div class="proto-form-field">
          <label for="pfMatricula">Matrícula Institucional *</label>
          <input type="text" id="pfMatricula" placeholder="Ej. PTB-26004" required maxlength="25">
        </div>
      </div>

      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="pfCarrera">Carrera Técnica *</label>
          <select id="pfCarrera" required>
            <option value="">Selecciona una carrera</option>
            ${CONALEP_CAREERS.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
          </select>
        </div>
        <div class="proto-form-field">
          <label for="pfGrupo">Grupo / Semestre *</label>
          <input type="text" id="pfGrupo" placeholder="Ej. 2A, 402, 6B" required maxlength="15">
        </div>
      </div>

      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="pfTurno">Turno Escolar</label>
          <select id="pfTurno">
            <option value="Matutino" selected>Matutino</option>
            <option value="Vespertino">Vespertino</option>
          </select>
        </div>
        <div class="proto-form-field">
          <label for="pfGuardian">Orientador(a) Asignado</label>
          <select id="pfGuardian">
            <option value="">— Selecciona un orientador —</option>
            ${psychs.map(p => `
              <option value="${escapeHTML(p.nombre)}" data-email="${escapeHTML(p.email || '')}" ${((currentUser?.nombre || '').toLowerCase() === (p.nombre || '').toLowerCase()) ? 'selected' : ''}>
                🩺 ${escapeHTML(p.nombre)} (${escapeHTML(p.cargo || 'Orientador')})
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="pfTelefono">Teléfono del Alumno</label>
          <input type="tel" id="pfTelefono" placeholder="Ej. 9991234567" maxlength="20">
        </div>
        <div class="proto-form-field">
          <label for="pfEmail">Correo Electrónico (Opcional)</label>
          <input type="email" id="pfEmail" placeholder="Dejar vacío para correo conalep" maxlength="80">
        </div>
      </div>

      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="pfTutor">Tutor Legal (Padre/Madre)</label>
          <input type="text" id="pfTutor" placeholder="Ej. Juan Méndez" maxlength="80">
        </div>
        <div class="proto-form-field">
          <label for="pfTelTutor">Teléfono de Emergencia Tutor</label>
          <input type="tel" id="pfTelTutor" placeholder="Ej. 9997654321" maxlength="20">
        </div>
      </div>

      <div class="proto-form-error" id="pfError"></div>

      <div class="proto-form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-maroon">Guardar Estudiante</button>
      </div>
    </form>
  `);
}

async function saveProtoestrella(){
  const nombre    = document.getElementById('pfNombre').value.trim();
  const matricula = document.getElementById('pfMatricula').value.trim();
  const grupo     = document.getElementById('pfGrupo').value.trim();
  const carrera   = document.getElementById('pfCarrera').value;
  const turno     = document.getElementById('pfTurno')?.value || 'Matutino';
  const guardianEl= document.getElementById('pfGuardian');
  const guardian  = guardianEl ? guardianEl.value.trim() : (getCurrentUser()?.nombre || 'Orientador Educativo');
  const selectedOpt = guardianEl && guardianEl.selectedIndex >= 0 ? guardianEl.options[guardianEl.selectedIndex] : null;
  const guardianEmail = selectedOpt ? (selectedOpt.getAttribute('data-email') || '') : '';
  const telefono  = document.getElementById('pfTelefono')?.value.trim() || '';
  const emailInput= document.getElementById('pfEmail')?.value.trim();
  const email     = emailInput || `${matricula.toLowerCase()}@alumnos.conalep.edu.mx`;
  const tutor     = document.getElementById('pfTutor')?.value.trim() || '';
  const telTutor  = document.getElementById('pfTelTutor')?.value.trim() || '';
  const err       = document.getElementById('pfError');

  if(!nombre || !matricula || !grupo || !carrera){
    if(err){
      err.textContent = 'Completa todos los campos obligatorios (*).';
      err.style.display = 'block';
    }
    return;
  }
  if(db.students[matricula]){
    if(err){
      err.textContent = 'Ya existe un estudiante con esa matrícula.';
      err.style.display = 'block';
    }
    return;
  }

  const parts = nombre.split(/\s+/).filter(Boolean);
  const display = parts.length >= 2 ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.` : parts[0];

  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const hoy = new Date();
  const segFecha = `${hoy.getDate()} ${meses[hoy.getMonth()]}`;

  const BGS = ['#E3ECE7','#F3E9D9','#DCEBE6','#F0E4F5','#FDE7E4'];
  const avatar = { ...DEFAULT_AVATAR, bg: BGS[Object.keys(db.students).length % BGS.length] };

  const newStudent = {
    id: matricula,
    matricula,
    nombre,
    display,
    email,
    telefono,
    tutor,
    tel_tutor: telTutor,
    rol: 'estudiante',
    grupo,
    carrera,
    turno,
    estado: 'activo',
    motivo_baja: '',
    fecha_baja: null,
    guardian: guardian || 'Orientador Educativo',
    guardianEmail: guardianEmail || null,
    prioridad: 'bajo',
    segFecha,
    avatar,
    historial: [],
    created_at: new Date().toISOString()
  };

  db.students[matricula] = newStudent;
  db.users[matricula] = newStudent;
  saveDB();

  if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
    const client = typeof getActiveSupabaseClient === 'function' ? getActiveSupabaseClient() : null;
    if(client){
      try{
        await client.from('students').insert({
          matricula,
          nombre,
          display,
          email,
          grupo,
          carrera,
          guardian: newStudent.guardian,
          prioridad: 'bajo',
          seg_fecha: segFecha,
          avatar_config: {
            ...avatar,
            _meta: {
              estado: 'activo',
              turno,
              telefono,
              tutor,
              tel_tutor: telTutor
            }
          }
        });
      }catch(e){
        console.warn('Aviso insertando en Supabase:', e);
      }
    }
  }

  closeModal();
  alert(`✅ Estudiante ${nombre} registrado exitosamente con estatus ACTIVO.`);
  if(currentSection === 'alumnos') document.getElementById('content').innerHTML = renderProtoestrellas();
  else nav('alumnos');
}

/* ---------- MODIFICAR DATOS DEL ESTUDIANTE (MODAL DE EDICIÓN) ---------- */
async function openEditStudentModal(matricula){
  const s = db.students[matricula] || Object.values(db.students).find(st => (st.matricula || '').toLowerCase() === (matricula || '').toLowerCase());
  if(!s){
    alert('Estudiante no encontrado.');
    return;
  }
  matricula = s.matricula;

  let psychs = [];
  try{
    if(typeof getActivePsychologists === 'function'){
      psychs = await getActivePsychologists();
    }
  }catch(e){}
  if(!psychs.length){
    psychs = Object.values(db.users || {}).filter(u => u && u.rol === 'coordinador');
  }

  const currentGuardian = s.guardian || '';
  const currentEstado = s.estado || 'activo';

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Gestión Institucional de Alumnos</span>
    <h3 style="font-size:18px;margin-bottom:6px;color:var(--ink);">✏️ Modificar Datos del Estudiante</h3>
    <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.5;margin-bottom:16px;">
      Edita la información académica, contacto o estatus de <strong>${escapeHTML(s.nombre)}</strong> (${escapeHTML(matricula)}).
    </p>

    <form id="editStudentForm" onsubmit="event.preventDefault();saveEditStudent('${escapeHTML(matricula)}');" autocomplete="off">
      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="edNombre">Nombre Completo *</label>
          <input type="text" id="edNombre" value="${escapeHTML(s.nombre || '')}" required maxlength="100">
        </div>
        <div class="proto-form-field">
          <label for="edMatricula">Matrícula Institucional *</label>
          <input type="text" id="edMatricula" value="${escapeHTML(s.matricula || '')}" required maxlength="25">
        </div>
      </div>

      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="edCarrera">Carrera Técnica *</label>
          <select id="edCarrera" required>
            ${CONALEP_CAREERS.map(c => `
              <option value="${escapeHTML(c)}" ${(s.carrera === c || (c==='Informática' && !s.carrera)) ? 'selected' : ''}>${escapeHTML(c)}</option>
            `).join('')}
          </select>
        </div>
        <div class="proto-form-field">
          <label for="edGrupo">Grupo / Semestre *</label>
          <input type="text" id="edGrupo" value="${escapeHTML(s.grupo || '')}" placeholder="Ej. 6B" required maxlength="15">
        </div>
      </div>

      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="edTurno">Turno Escolar</label>
          <select id="edTurno">
            <option value="Matutino" ${(s.turno==='Matutino' || !s.turno)?'selected':''}>Matutino</option>
            <option value="Vespertino" ${(s.turno==='Vespertino')?'selected':''}>Vespertino</option>
          </select>
        </div>
        <div class="proto-form-field">
          <label for="edEstado">Estatus / Estado del Alumno *</label>
          <select id="edEstado" onchange="toggleEditMotivoBajaField(this.value)">
            <option value="activo" ${currentEstado==='activo'?'selected':''}>🟢 Activo (Inscrito regular)</option>
            <option value="baja_temporal" ${currentEstado==='baja_temporal'?'selected':''}>🟡 Baja Temporal (Permiso / suspensión)</option>
            <option value="baja_definitiva" ${currentEstado==='baja_definitiva'?'selected':''}>🔴 Baja Definitiva (Deserción / baja)</option>
            <option value="egresado" ${currentEstado==='egresado'?'selected':''}>⚪ Egresado (Graduado)</option>
          </select>
        </div>
      </div>

      <!-- Campo condicional de Motivo de Baja -->
      <div class="proto-form-field" id="edMotivoBajaContainer" style="display:${(currentEstado==='baja_temporal'||currentEstado==='baja_definitiva')?'block':'none'};margin-bottom:12px;background:#FDEDEC;padding:12px;border-radius:8px;border:1px solid #F5B7B1;">
        <label for="edMotivoBaja" style="color:#78281F;font-weight:700;">Motivo de la Baja Escolar</label>
        <input type="text" id="edMotivoBaja" value="${escapeHTML(s.motivo_baja || '')}" placeholder="Ej. Rezago académico, cambio de plantel, motivos de salud...">
        <div style="font-size:11px;color:#922B21;margin-top:4px;">
          Registra la razón institucional para el historial del expediente.
        </div>
      </div>

      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="edTelefono">Teléfono del Estudiante</label>
          <input type="tel" id="edTelefono" value="${escapeHTML(s.telefono || '')}" placeholder="Ej. 9991234567" maxlength="20">
        </div>
        <div class="proto-form-field">
          <label for="edEmail">Correo Electrónico</label>
          <input type="email" id="edEmail" value="${escapeHTML(s.email || '')}" placeholder="correo@ejemplo.com" maxlength="80">
        </div>
      </div>

      <div class="proto-form-grid" style="margin-bottom:12px;">
        <div class="proto-form-field">
          <label for="edTutor">Tutor Legal (Padre / Madre / Responsable)</label>
          <input type="text" id="edTutor" value="${escapeHTML(s.tutor || '')}" placeholder="Nombre del padre o tutor" maxlength="80">
        </div>
        <div class="proto-form-field">
          <label for="edTelTutor">Teléfono de Emergencia del Tutor</label>
          <input type="tel" id="edTelTutor" value="${escapeHTML(s.tel_tutor || '')}" placeholder="Ej. 9997654321" maxlength="20">
        </div>
      </div>

      <div class="proto-form-field" style="margin-bottom:14px;">
        <label for="edGuardian">Orientador(a) / Psicólogo(a) Asignado</label>
        <select id="edGuardian">
          <option value="" ${!currentGuardian ? 'selected' : ''}>— Sin orientador asignado —</option>
          ${psychs.map(p => `
            <option value="${escapeHTML(p.nombre)}" data-email="${escapeHTML(p.email || '')}" ${(currentGuardian.toLowerCase() === (p.nombre||'').toLowerCase()) ? 'selected' : ''}>
              🩺 ${escapeHTML(p.nombre)} (${escapeHTML(p.cargo || 'Orientador Educativo')})
            </option>
          `).join('')}
        </select>
      </div>

      <div class="proto-form-error" id="edError"></div>

      <div class="proto-form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-maroon">💾 Guardar Cambios</button>
      </div>
    </form>
  `);
}

function toggleEditMotivoBajaField(estado){
  const c = document.getElementById('edMotivoBajaContainer');
  if(!c) return;
  if(estado === 'baja_temporal' || estado === 'baja_definitiva'){
    c.style.display = 'block';
  } else {
    c.style.display = 'none';
  }
}

async function saveEditStudent(oldMatricula){
  const s = db.students[oldMatricula];
  if(!s){
    alert('Error: Alumno no encontrado.');
    return;
  }

  const nombre = document.getElementById('edNombre').value.trim();
  const matricula = document.getElementById('edMatricula').value.trim();
  const carrera = document.getElementById('edCarrera').value;
  const grupo = document.getElementById('edGrupo').value.trim();
  const turno = document.getElementById('edTurno').value;
  const estado = document.getElementById('edEstado').value;
  const motivoBajaInput = document.getElementById('edMotivoBaja');
  const motivoBaja = motivoBajaInput ? motivoBajaInput.value.trim() : '';
  const telefono = document.getElementById('edTelefono').value.trim();
  const email = document.getElementById('edEmail').value.trim() || `${matricula.toLowerCase()}@alumnos.conalep.edu.mx`;
  const tutor = document.getElementById('edTutor').value.trim();
  const telTutor = document.getElementById('edTelTutor').value.trim();
  const guardianEl = document.getElementById('edGuardian');
  const guardian = guardianEl ? guardianEl.value : '';
  const selectedOpt = guardianEl && guardianEl.selectedIndex >= 0 ? guardianEl.options[guardianEl.selectedIndex] : null;
  const guardianEmail = selectedOpt ? (selectedOpt.getAttribute('data-email') || '') : '';
  const err = document.getElementById('edError');

  if(!nombre || !matricula || !grupo || !carrera){
    if(err){
      err.textContent = 'Completa todos los campos obligatorios (*).';
      err.style.display = 'block';
    }
    return;
  }

  // Si se modificó la matrícula, verificar que no colisione con otro alumno
  if(matricula !== oldMatricula && db.students[matricula]){
    if(err){
      err.textContent = `Ya existe otro estudiante con la matrícula ${matricula}.`;
      err.style.display = 'block';
    }
    return;
  }

  const parts = nombre.split(/\s+/).filter(Boolean);
  const display = parts.length >= 2 ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.` : parts[0];

  // Verificar cambio de estatus de baja
  const previousEstado = s.estado || 'activo';
  let fechaBaja = s.fecha_baja || null;
  let bajaAutorizada = s.baja_autorizada_por || null;
  const user = getCurrentUser();

  if(estado !== 'activo' && previousEstado === 'activo'){
    fechaBaja = new Date().toLocaleDateString('es-MX') + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    bajaAutorizada = user?.nombre || 'Coordinación';
  } else if(estado === 'activo'){
    fechaBaja = null;
  }

  // Actualizar objeto de estudiante
  s.nombre = nombre;
  s.display = display;
  s.matricula = matricula;
  s.id = matricula;
  s.carrera = carrera;
  s.grupo = grupo;
  s.turno = turno;
  s.telefono = telefono;
  s.email = email;
  s.tutor = tutor;
  s.tel_tutor = telTutor;
  s.guardian = guardian;
  if(guardianEmail) s.guardianEmail = guardianEmail;
  s.estado = estado;
  s.motivo_baja = (estado !== 'activo') ? (motivoBaja || s.motivo_baja || 'Baja administrativa') : '';
  s.fecha_baja = fechaBaja;
  s.baja_autorizada_por = bajaAutorizada;

  // Si la matrícula cambió, migrar claves y referencias
  if(matricula !== oldMatricula){
    db.students[matricula] = s;
    delete db.students[oldMatricula];

    if(db.users[oldMatricula]){
      db.users[matricula] = { ...db.users[oldMatricula], ...s, id: matricula, matricula };
      delete db.users[oldMatricula];
    } else {
      db.users[matricula] = s;
    }

    if(db.tasks && db.tasks[oldMatricula]){
      db.tasks[matricula] = db.tasks[oldMatricula];
      delete db.tasks[oldMatricula];
    }
    if(db.documents){
      db.documents.forEach(d => { if(d.studentId === oldMatricula) d.studentId = matricula; });
    }
    if(db.alerts){
      db.alerts.forEach(a => { if(a.studentId === oldMatricula) a.studentId = matricula; });
    }
    if(db.appointments){
      db.appointments.forEach(ap => { if(ap.studentId === oldMatricula) ap.studentId = matricula; });
    }
  } else {
    db.students[matricula] = s;
    if(db.users[matricula]){
      db.users[matricula] = { ...db.users[matricula], ...s };
    }
  }

  saveDB();

  // Sincronizar en Supabase si está disponible
  if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
    const client = typeof getActiveSupabaseClient === 'function' ? getActiveSupabaseClient() : null;
    if(client){
      try{
        const payload = {
          matricula: s.matricula,
          nombre: s.nombre,
          display: s.display,
          email: s.email,
          grupo: s.grupo,
          carrera: s.carrera,
          guardian: s.guardian,
          avatar_config: {
            ...(s.avatar || {}),
            _meta: {
              estado: s.estado,
              motivo_baja: s.motivo_baja,
              fecha_baja: s.fecha_baja,
              baja_autorizada_por: s.baja_autorizada_por,
              telefono: s.telefono,
              tutor: s.tutor,
              tel_tutor: s.tel_tutor,
              turno: s.turno
            }
          }
        };
        await client.from('students').upsert(payload, { onConflict: 'matricula' });
        if(matricula !== oldMatricula){
          await client.from('students').delete().eq('matricula', oldMatricula);
        }
      }catch(e){
        console.warn('Aviso sincronizando edición con Supabase:', e);
      }
    }
  }

  closeModal();
  alert(`✅ Datos del estudiante ${s.nombre} actualizados correctamente.`);
  if(currentSection === 'alumnos') document.getElementById('content').innerHTML = renderProtoestrellas();
  else nav('alumnos');
}

/* ---------- GESTIÓN DIRECTA DE BAJAS Y REACTIVACIONES ---------- */
function openBajaStudentModal(matricula){
  const s = db.students[matricula];
  if(!s){
    alert('Estudiante no encontrado.');
    return;
  }

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label" style="color:var(--danger);">Control de Estatus Escolar</span>
    <h3 style="font-size:18px;margin-bottom:6px;color:var(--maroon);">⚠️ Aplicar Baja de Estudiante</h3>
    <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.5;margin-bottom:16px;">
      Registra la baja formal para <strong>${escapeHTML(s.nombre)}</strong> (Matrícula: <span class="mono">${escapeHTML(s.matricula)}</span> · Grupo ${escapeHTML(s.grupo)}).
    </p>

    <form onsubmit="event.preventDefault();applyStudentBaja('${escapeHTML(matricula)}');">
      <div class="proto-form-field" style="margin-bottom:12px;">
        <label for="bajaTipo">Tipo de Baja Institucional *</label>
        <select id="bajaTipo" required>
          <option value="baja_temporal" selected>🟡 Baja Temporal (Permiso de ciclo / Suspensión temporal con derecho a reingreso)</option>
          <option value="baja_definitiva">🔴 Baja Definitiva (Deserción escolar / Baja total del plantel)</option>
        </select>
      </div>

      <div class="proto-form-field" style="margin-bottom:12px;">
        <label for="bajaCausa">Causa / Motivo Oficial *</label>
        <select id="bajaCausa" required>
          <option value="Problemas de salud física o psicológica">Problemas de salud física o psicológica</option>
          <option value="Rezago académico / Reprobación de módulos">Rezago académico / Reprobación de módulos</option>
          <option value="Cambio de residencia o plantel">Cambio de residencia o plantel</option>
          <option value="Motivos económicos o de incorporación laboral">Motivos económicos o de incorporación laboral</option>
          <option value="Decisión personal / familiar">Decisión personal / familiar</option>
          <option value="Faltas reiteradas / Pérdida de derecho">Faltas reiteradas / Pérdida de derecho</option>
          <option value="Otro motivo administrativo">Otro motivo administrativo</option>
        </select>
      </div>

      <div class="proto-form-field" style="margin-bottom:16px;">
        <label for="bajaDetalles">Observaciones o Notas del Coordinador (Opcional)</label>
        <textarea id="bajaDetalles" rows="3" placeholder="Detalles de entrevistas con el alumno o tutor, acuerdos o circunstancias..." style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:inherit;font-size:12.5px;"></textarea>
      </div>

      <div style="background:#FDEDEC;padding:12px 14px;border-radius:8px;border-left:3px solid var(--danger);font-size:12px;color:#78281F;margin-bottom:16px;">
        ✦ Al aplicar la baja, el estudiante no podrá iniciar sesión en el portal y su expediente reflejará el estatus correspondiente.
      </div>

      <div class="proto-form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-maroon" style="background:var(--danger);border-color:var(--danger);">
          ⚠️ Confirmar Aplicación de Baja
        </button>
      </div>
    </form>
  `);
}

async function applyStudentBaja(matricula){
  const s = db.students[matricula];
  if(!s) return;

  const tipo = document.getElementById('bajaTipo').value;
  const causa = document.getElementById('bajaCausa').value;
  const detalles = (document.getElementById('bajaDetalles').value || '').trim();
  const user = getCurrentUser();

  const motivoCompleto = causa + (detalles ? ` (${detalles})` : '');
  const fechaStr = new Date().toLocaleDateString('es-MX') + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  s.estado = tipo;
  s.motivo_baja = motivoCompleto;
  s.fecha_baja = fechaStr;
  s.baja_autorizada_por = user?.nombre || 'Coordinación';

  if(db.users[matricula]){
    db.users[matricula].estado = tipo;
    db.users[matricula].motivo_baja = motivoCompleto;
    db.users[matricula].fecha_baja = fechaStr;
  }

  saveDB();

  if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
    const client = typeof getActiveSupabaseClient === 'function' ? getActiveSupabaseClient() : null;
    if(client){
      try{
        await client.from('students').update({
          avatar_config: {
            ...(s.avatar || {}),
            _meta: {
              estado: s.estado,
              motivo_baja: s.motivo_baja,
              fecha_baja: s.fecha_baja,
              baja_autorizada_por: s.baja_autorizada_por
            }
          }
        }).eq('matricula', matricula);
      }catch(e){}
    }
  }

  closeModal();
  alert(`⚠️ Se ha aplicado la ${tipo === 'baja_temporal' ? 'BAJA TEMPORAL' : 'BAJA DEFINITIVA'} al estudiante ${s.nombre}.`);
  if(currentSection === 'alumnos') document.getElementById('content').innerHTML = renderProtoestrellas();
  else nav('alumnos');
}

async function reactivateStudent(matricula){
  const s = db.students[matricula];
  if(!s) return;

  if(!confirm(`¿Deseas reactivar al alumno ${s.nombre} (${matricula}) y restablecer su cuenta como ACTIVO?\n\nEl estudiante recuperará acceso normal a NAIMA OS.`)){
    return;
  }

  s.estado = 'activo';
  s.motivo_baja = '';
  s.fecha_baja = null;
  s.baja_autorizada_por = null;

  if(db.users[matricula]){
    db.users[matricula].estado = 'activo';
    db.users[matricula].motivo_baja = '';
    db.users[matricula].fecha_baja = null;
  }

  saveDB();

  if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
    const client = typeof getActiveSupabaseClient === 'function' ? getActiveSupabaseClient() : null;
    if(client){
      try{
        await client.from('students').update({
          avatar_config: {
            ...(s.avatar || {}),
            _meta: { estado: 'activo' }
          }
        }).eq('matricula', matricula);
      }catch(e){}
    }
  }

  alert(`✅ Estudiante ${s.nombre} reactivado exitosamente con estatus ACTIVO.`);
  closeModal();
  if(currentSection === 'alumnos') document.getElementById('content').innerHTML = renderProtoestrellas();
  else nav('alumnos');
}

async function deleteStudentPermanent(matricula){
  const s = db.students[matricula] || Object.values(db.students).find(st => st.matricula === matricula);
  if(!s) return;

  const conf = confirm(
    `🚨 ATENCIÓN — ACCIÓN DE SEGURIDAD 🚨\n\n` +
    `¿Estás COMPLETAMENTE SEGURO de eliminar al estudiante ${s.nombre} (Matrícula: ${s.matricula})?\n\n` +
    `Esta acción eliminará su expediente institucional, check-ins, acuerdos y documentos asociados en el plantel.`
  );
  if(!conf) return;

  delete db.students[matricula];
  delete db.users[matricula];
  if(db.tasks) delete db.tasks[matricula];
  if(db.alerts) db.alerts = db.alerts.filter(a => a.studentId !== matricula);
  if(db.documents) db.documents = db.documents.filter(d => d.studentId !== matricula);
  if(db.appointments) db.appointments = db.appointments.filter(ap => ap.studentId !== matricula);

  saveDB();

  if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
    const client = typeof getActiveSupabaseClient === 'function' ? getActiveSupabaseClient() : null;
    if(client){
      try{
        await client.from('students').delete().eq('matricula', matricula);
      }catch(e){
        console.warn('Aviso eliminando de Supabase:', e);
      }
    }
  }

  closeModal();
  alert(`🗑️ El expediente de ${s.nombre} ha sido eliminado definitivamente.`);
  if(currentSection === 'alumnos') document.getElementById('content').innerHTML = renderProtoestrellas();
  else nav('alumnos');
}


/* ---------- MODAL DEL EXPEDIENTE DEL ESTUDIANTE (MULTI-PESTAÑA) ---------- */
function openStudentModal(matricula, activeTab = 'checkins'){
  const s = db.students[matricula] || Object.values(db.students).find(st => (st.matricula || '').toLowerCase() === (matricula || '').toLowerCase());
  if(!s) return;
  matricula = s.matricula;

  const tasks = getStudentTasks(matricula);
  const docs = getStudentDocuments(matricula);
  const hist = s.historial || [];
  const pendingAlert = (db.alerts || []).find(a => (a.studentId || '').toLowerCase() === matricula.toLowerCase() && a.status === 'pendiente');

  // --- HTML de Pestaña: Check-ins y Bienestar ---
  const alertBoxHTML = pendingAlert ? `
    <div class="modal-urgent-alert-box">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-weight:700;color:var(--danger);font-size:13px;display:flex;align-items:center;gap:6px;">
          🚨 Alerta Socioemocional Activa (${pendingAlert.moodLabel})
        </span>
        <button class="btn-outline-maroon" style="padding:4px 10px;font-size:11px;" onclick="openAlertEmailModal('${pendingAlert.id}')">
          ✉️ Ver Correo Notificado
        </button>
      </div>
      <p style="font-size:12.5px;color:var(--ink);line-height:1.45;margin-bottom:8px;">
        Reportó: <strong>${pendingAlert.moodLabel} ${pendingAlert.moodEmoji}</strong> en fecha ${pendingAlert.date}.<br>
        <em>"${escapeHTML(pendingAlert.note)}"</em>
      </p>
      <div style="font-size:11.5px;color:var(--ink-soft);background:#fff;padding:8px 10px;border-radius:8px;border:1px solid #FFCDD2;">
        ✦ <strong>Contención Inicial:</strong> Eirén y Orión brindaron ejercicios de calma y recomendaciones inmediatas. Se requiere seguimiento de la orientadora.
      </div>
    </div>
  ` : '';

  const histHTML = hist.length
    ? hist.slice().reverse().map(h => {
        const m = MOODS.find(x => x.id === h.mood) || { hex:'#888', emoji:'•', label:h.mood };
        return `
          <div class="history-row">
            <span class="mood-dot" style="background:${m.hex};"></span>
            <span class="h-date">${h.date}</span>
            <span style="font-weight:600;">${m.emoji} ${m.label}</span>
            <span class="h-note">${h.note ? '— ' + escapeHTML(h.note) : ''}</span>
          </div>`;
      }).join('')
    : `<div class="history-empty">Sin registros emocionales todavía. Los check-ins del alumno aparecerán aquí.</div>`;

  const checkinsTabContent = `
    ${alertBoxHTML}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span class="section-label" style="margin:0;">Historial Emocional Reciente</span>
      <span style="font-size:12px;color:var(--ink-muted);font-weight:500;">Total registros: ${hist.length}</span>
    </div>
    <div class="history-list" style="max-height:220px;overflow-y:auto;margin-bottom:16px;">
      ${histHTML}
    </div>
  `;

  // --- HTML de Pestaña: Tareas y Acuerdos ---
  const tasksHTML = tasks.length
    ? tasks.map(t => `
        <div class="admin-task-card ${t.completed ? 'completed' : ''}">
          <div style="display:flex;align-items:flex-start;gap:10px;flex:1;">
            <input type="checkbox" class="admin-task-checkbox" ${t.completed ? 'checked' : ''} 
              onchange="toggleTaskAdmin('${matricula}', '${t.id}')" title="Marcar como completada">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
                <span class="task-cat-badge ${t.category ? t.category.toLowerCase() : 'general'}">${t.category || 'Compromiso'}</span>
                <span class="admin-task-title ${t.completed ? 'line-through' : ''}">${escapeHTML(t.title)}</span>
              </div>
              ${t.desc ? `<p class="admin-task-desc">${escapeHTML(t.desc)}</p>` : ''}
              <div class="admin-task-meta">
                <span>📅 Entrega: <strong>${t.dueDate || 'Pendiente'}</strong></span>
                <span>· Asignó: ${t.assignedBy || 'Orientación'}</span>
              </div>
            </div>
          </div>
          <button class="btn-delete-task" onclick="deleteTaskAdmin('${matricula}', '${t.id}')" title="Eliminar compromiso">✕</button>
        </div>
      `).join('')
    : `
      <div class="history-empty" style="padding:24px 16px;">
        <div style="font-size:24px;margin-bottom:6px;">📋</div>
        <strong>No hay tareas o compromisos asignados</strong>
        <p style="font-size:12px;color:var(--ink-soft);margin-top:4px;">Asigna acuerdos de estudio, pausas de respiración o compromisos de tutoría.</p>
      </div>
    `;

  const tasksTabContent = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>
        <span class="section-label" style="margin:0;">Acuerdos y Compromisos de Orientación</span>
        <div style="font-size:11.5px;color:var(--ink-soft);">El alumno puede ver y marcar estas tareas en su portal</div>
      </div>
      <button class="btn-maroon" style="padding:7px 14px;font-size:12px;border-radius:100px;" onclick="openAddTaskModal('${matricula}')">
        ＋ Asignar Compromiso
      </button>
    </div>
    <div class="admin-task-list" style="max-height:240px;overflow-y:auto;margin-bottom:16px;">
      ${tasksHTML}
    </div>
  `;

  // --- HTML de Pestaña: Documentos del Alumno ---
  const docsHTML = docs.length
    ? docs.map(d => `
        <div class="admin-doc-card">
          <div style="display:flex;align-items:center;gap:12px;flex:1;">
            <div class="admin-doc-icon">📄</div>
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                <span class="doc-type-badge">${d.category || 'Expediente'}</span>
                <strong style="font-size:13.5px;color:var(--ink);">${escapeHTML(d.title)}</strong>
              </div>
              <div class="admin-doc-meta">
                <span>📁 ${escapeHTML(d.fileName || 'archivo.pdf')}</span>
                <span>· ${d.fileSize || '120 KB'}</span>
                <span>· Fecha: ${d.date}</span>
              </div>
              ${d.notes ? `<div style="font-size:11.5px;color:var(--ink-soft);margin-top:3px;font-style:italic;">"${escapeHTML(d.notes)}"</div>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn-outline-maroon" style="padding:5px 10px;font-size:11.5px;" onclick="openOfficialReportModal('${matricula}', '${escapeHTML(d.title)}')">
              🖨️ Imprimir
            </button>
            <button class="btn-delete-task" onclick="deleteDocAdmin('${d.id}', '${matricula}')" title="Eliminar documento">✕</button>
          </div>
        </div>
      `).join('')
    : `
      <div class="history-empty" style="padding:24px 16px;">
        <div style="font-size:24px;margin-bottom:6px;">📁</div>
        <strong>Sin documentos anexados en este expediente</strong>
        <p style="font-size:12px;color:var(--ink-soft);margin-top:4px;">Carga cédulas, justificaciones, cartas compromiso o tamizajes.</p>
      </div>
    `;

  const docsTabContent = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div>
        <span class="section-label" style="margin:0;">Expediente y Documentación</span>
        <div style="font-size:11.5px;color:var(--ink-soft);">Archivos institucionales vinculados a ${s.nombre}</div>
      </div>
      <button class="btn-maroon" style="padding:7px 14px;font-size:12px;border-radius:100px;" onclick="openUploadModal('${matricula}')">
        ＋ Adjuntar Archivo
      </button>
    </div>
    <div class="admin-doc-list" style="max-height:240px;overflow-y:auto;margin-bottom:16px;">
      ${docsHTML}
    </div>
  `;

  const tamizajeData = s.tamizaje || null;
  const tamizajeTabContent = tamizajeData ? `
    <div style="background:#FAFBF9;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <span class="section-label" style="margin:0;">Resultados del Tamizaje Psicoemocional (PIOE)</span>
        <span class="badge-tamizaje ${(tamizajeData.resultados && tamizajeData.resultados.riesgoGlobal) || 'bajo'}">
          Nivel de Riesgo: ${((tamizajeData.resultados && tamizajeData.resultados.riesgoGlobal) || 'bajo').toUpperCase()}
        </span>
      </div>
      <div class="tamizaje-kpi-grid">
        <div class="tamizaje-kpi-box">
          <div class="val">${(tamizajeData.resultados && tamizajeData.resultados.phq ? tamizajeData.resultados.phq.score : 0)}/27</div>
          <div class="lbl">Depresión (PHQ-A)</div>
        </div>
        <div class="tamizaje-kpi-box">
          <div class="val">${(tamizajeData.resultados && tamizajeData.resultados.gad ? tamizajeData.resultados.gad.score : 0)}/21</div>
          <div class="lbl">Ansiedad (GAD-7)</div>
        </div>
        <div class="tamizaje-kpi-box">
          <div class="val">${(tamizajeData.resultados && tamizajeData.resultados.assist ? tamizajeData.resultados.assist.nivel : 'Sin riesgo')}</div>
          <div class="lbl">Sustancias (ASSIST)</div>
        </div>
        <div class="tamizaje-kpi-box">
          <div class="val">${(tamizajeData.resultados && tamizajeData.resultados.posit ? tamizajeData.resultados.posit.nivel : 'Bajo')}</div>
          <div class="lbl">Psicosocial (POSIT)</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--ink-soft);margin-top:10px;">
        Fecha de aplicación: <strong>${new Date(tamizajeData.fecha).toLocaleDateString('es-MX')}</strong>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="reporte-psicologico.html?matricula=${encodeURIComponent(matricula)}" target="_blank" class="btn-maroon" style="padding:8px 14px;font-size:12.5px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
        📋 Abrir en Reporte Psicológico Oficial
      </a>
      <a href="psicologia-escolar.html" target="_blank" class="btn-outline-maroon" style="padding:8px 14px;font-size:12.5px;text-decoration:none;">
        🩺 Abrir Sistema de Psicología Escolar
      </a>
    </div>
  ` : `
    <div class="history-empty" style="padding:28px 16px;">
      <div style="font-size:26px;margin-bottom:6px;">📋</div>
      <strong>El alumno aún no ha respondido el tamizaje de este ciclo</strong>
      <p style="font-size:12px;color:var(--ink-soft);margin-top:4px;">
        El alumno puede responder el cuestionario desde su portal estudiantil o puedes abrir el formato oficial de reporte psicológico.
      </p>
      <div style="margin-top:12px;">
        <a href="reporte-psicologico.html?matricula=${encodeURIComponent(matricula)}" target="_blank" class="btn-outline-maroon" style="padding:7px 14px;font-size:12.5px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
          📋 Elaborar Reporte Psicológico Oficial
        </a>
      </div>
    </div>
  `;

  // --- HTML de Pestaña: Ficha Integral de Datos Escolares ---
  const estado = s.estado || 'activo';
  const stInfo = getStudentStatusInfo(s);

  const fichaTabContent = `
    <div style="background:#FAFBF9;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
        <div>
          <span class="section-label" style="margin:0;">Información Escolar y Administrativa</span>
          <div style="font-size:11.5px;color:var(--ink-soft);margin-top:2px;">Expediente institucional de ${escapeHTML(s.nombre)}</div>
        </div>
        <button class="btn-action-crud btn-crud-edit" onclick="openEditStudentModal('${escapeHTML(matricula)}')">
          ✏️ Modificar Datos del Estudiante
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;font-size:12.5px;">
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Nombre Oficial</span>
          <strong style="color:var(--ink);">${escapeHTML(s.nombre)}</strong>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Matrícula Institucional</span>
          <strong class="mono" style="color:var(--maroon);">${escapeHTML(s.matricula)}</strong>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Grupo y Semestre</span>
          <strong>${escapeHTML(s.semestre ? s.semestre + ' · ' : '')}${escapeHTML(s.grupo || '—')}</strong>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Carrera Técnica</span>
          <strong>${escapeHTML(s.carrera || 'Informática')}</strong>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Turno</span>
          <strong>${escapeHTML(s.turno || 'Matutino')}</strong>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Estatus Escolar</span>
          <span class="badge-student-status ${stInfo.class}">${stInfo.icon} ${stInfo.label}</span>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Teléfono del Estudiante</span>
          <span>${escapeHTML(s.telefono || 'Sin registrar')}</span>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Correo Electrónico</span>
          <span>${escapeHTML(s.email || '—')}</span>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Tutor Legal (Padre / Madre)</span>
          <strong>${escapeHTML(s.tutor || 'Sin registrar')}</strong>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Teléfono Emergencia Tutor</span>
          <span>${escapeHTML(s.tel_tutor || 'Sin registrar')}</span>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Orientador(a) Responsable</span>
          <strong>${escapeHTML(s.guardian || 'Por asignar')}</strong>
        </div>
        <div style="background:#FFF;padding:10px 12px;border:1px solid var(--line);border-radius:8px;">
          <span style="font-size:11px;color:var(--ink-soft);display:block;">Diagnóstico / Motivo Inicial</span>
          <span>${escapeHTML(s.diagnostico || s.dx || 'Acompañamiento regular')}</span>
        </div>
      </div>

      ${(stInfo.isBaja) ? `
        <div style="margin-top:12px;padding:12px 14px;background:#FDEDEC;border:1px solid #F5B7B1;border-radius:8px;font-size:12px;color:#78281F;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div>
            <strong>⚠️ Información de la Baja Escolar (${stInfo.label}):</strong><br>
            <span>Motivo registrado: <em>"${escapeHTML(s.motivo_baja || 'Baja administrativa')}"</em></span><br>
            <span>Fecha de aplicación: <strong>${escapeHTML(s.fecha_baja || '—')}</strong> · Autorizó: ${escapeHTML(s.baja_autorizada_por || 'Coordinación')}</span>
          </div>
          <button class="btn-action-crud btn-crud-reactivar" onclick="reactivateStudent('${escapeHTML(matricula)}')">
            🔄 Reactivar a Activo
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // Selector del contenido según pestaña activa
  let activeTabHTML = checkinsTabContent;
  if(activeTab === 'tareas') activeTabHTML = tasksTabContent;
  if(activeTab === 'documentos') activeTabHTML = docsTabContent;
  if(activeTab === 'tamizaje') activeTabHTML = tamizajeTabContent;
  if(activeTab === 'ficha') activeTabHTML = fichaTabContent;

  const studentPhoto = (typeof getStudentPhoto === 'function') ? getStudentPhoto(s) : (s.photo || s.avatar?.photo || null);

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    
    <!-- Encabezado del Alumno -->
    <div class="modal-head" style="align-items:flex-start;margin-bottom:14px;">
      <div class="thumb" style="width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--bg);border:2px solid var(--line);box-shadow:var(--shadow);">
        ${studentPhoto ? `
          <img src="${escapeHTML(studentPhoto)}" alt="Foto de ${escapeHTML(s.nombre)}" style="width:100%;height:100%;object-fit:cover;display:block;">
        ` : `
          ${buildAvatarSVG(s.avatar,'modal')}
        `}
      </div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <h3 style="font-size:19px;margin:0;color:var(--ink);">${escapeHTML(s.nombre)}</h3>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="badge-student-status ${stInfo.class}">${stInfo.icon} ${stInfo.label}</span>
            <span class="prio-chip ${s.prioridad}">Prioridad ${s.prioridad}</span>
          </div>
        </div>
        <div class="mono" style="font-size:12px;color:var(--ink-soft);margin:3px 0 6px;">
          ${escapeHTML(s.matricula)} · Grupo ${escapeHTML(s.grupo || '—')} · Carrera: ${escapeHTML(s.carrera || 'Informática')} · ${escapeHTML(s.turno || 'Matutino')}
        </div>
        <div style="font-size:12px;color:var(--ink-soft);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span>🛡️ Orientador(a): <strong>${escapeHTML(s.guardian || 'Por asignar')}</strong></span>
          ${(!isStudentAssignedToMe(s)) ? `
            <button class="btn-outline-maroon" style="padding:2px 8px;font-size:11px;border-radius:4px;" onclick="assignStudentToMe('${escapeHTML(s.matricula)}')">
              📌 Asignar a mi tutoría
            </button>
          ` : `
            <span style="color:var(--green);font-weight:600;font-size:11.5px;">✓ Asignado a ti</span>
          `}
          <span>🏫 Plantel Mérida I</span>
        </div>

        <!-- Botones de Acción Rápida CRUD -->
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn-action-crud btn-crud-edit" onclick="openEditStudentModal('${escapeHTML(matricula)}')" title="Modificar datos del estudiante">
            ✏️ Modificar Datos
          </button>
          ${stInfo.isBaja ? `
            <button class="btn-action-crud btn-crud-reactivar" onclick="reactivateStudent('${escapeHTML(matricula)}')" title="Reactivar a este alumno como Activo">
              🔄 Reactivar Alumno
            </button>
          ` : `
            <button class="btn-action-crud btn-crud-baja" onclick="openBajaStudentModal('${escapeHTML(matricula)}')" title="Dar de baja escolar">
              ⚠️ Dar de Baja
            </button>
          `}
          <button class="btn-outline-maroon" style="padding:5px 12px;font-size:11.5px;border-radius:100px;" onclick="openOfficialReportModal('${escapeHTML(matricula)}', 'Expediente Integral del Estudiante')">
            🖨️ PDF Oficial
          </button>
          <a href="reporte-psicologico.html?matricula=${encodeURIComponent(matricula)}" target="_blank" class="btn-outline-maroon" style="padding:5px 12px;font-size:11.5px;border-radius:100px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
            📋 Reporte Psicológico
          </a>
          <button class="btn-action-crud btn-crud-delete" onclick="deleteStudentPermanent('${escapeHTML(matricula)}')" title="Eliminar expediente">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Pestañas de Navegación del Modal -->
    <div class="student-modal-tabs">
      <button class="sm-tab-btn ${activeTab === 'ficha' ? 'active' : ''}" onclick="openStudentModal('${escapeHTML(matricula)}', 'ficha')">
        👤 Ficha Escolar
      </button>
      <button class="sm-tab-btn ${activeTab === 'checkins' ? 'active' : ''}" onclick="openStudentModal('${escapeHTML(matricula)}', 'checkins')">
        💖 Check-ins (${hist.length})
      </button>
      <button class="sm-tab-btn ${activeTab === 'tareas' ? 'active' : ''}" onclick="openStudentModal('${escapeHTML(matricula)}', 'tareas')">
        📋 Acuerdos y Tareas (${tasks.length})
      </button>
      <button class="sm-tab-btn ${activeTab === 'documentos' ? 'active' : ''}" onclick="openStudentModal('${escapeHTML(matricula)}', 'documentos')">
        📁 Documentos (${docs.length})
      </button>
      <button class="sm-tab-btn ${activeTab === 'tamizaje' ? 'active' : ''}" onclick="openStudentModal('${escapeHTML(matricula)}', 'tamizaje')">
        🩺 Tamizaje PIOE ${s.tamizaje ? '✓' : ''}
      </button>
    </div>

    <!-- Contenedor Dinámico de la Pestaña -->
    <div class="student-modal-tab-body">
      ${activeTabHTML}
    </div>

    <!-- Acciones Inferiores -->
    <div style="display:flex;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line);">
      <button class="btn-maroon" style="flex:1;padding:11px 16px;font-size:13px;" onclick="markReviewed('${escapeHTML(matricula)}')">
        ✓ Marcar seguimiento como revisado y atendido
      </button>
      <button class="btn-ghost" style="padding:11px 18px;font-size:13px;" onclick="closeModal()">
        Cerrar
      </button>
    </div>
  `);
}

function toggleTaskAdmin(matricula, taskId){
  toggleStudentTask(matricula, taskId);
  openStudentModal(matricula, 'tareas');
}

function deleteTaskAdmin(matricula, taskId){
  if(confirm('¿Eliminar este compromiso de orientación?')){
    deleteStudentTask(matricula, taskId);
    openStudentModal(matricula, 'tareas');
  }
}

function deleteDocAdmin(docId, matricula){
  if(confirm('¿Eliminar este documento del expediente?')){
    deleteStudentDocument(docId);
    if(matricula){
      openStudentModal(matricula, 'documentos');
    } else {
      if(currentSection === 'catalogo') nav('catalogo');
    }
  }
}

/* ---------- MODAL PARA ASIGNAR NUEVA TAREA / COMPROMISO ---------- */
function openAddTaskModal(matricula){
  const s = db.students[matricula];
  if(!s) return;

  const hoy = new Date();
  const fechaSugerida = `${hoy.getDate() + 3} oct 2026`;

  openModal(`
    <button class="close-x" onclick="openStudentModal('${matricula}', 'tareas')">✕</button>
    <span class="section-label">Acompañamiento Socioemocional y Académico</span>
    <h3 style="font-size:18px;margin-bottom:6px;">Asignar Tarea o Acuerdo de Orientación</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;margin-bottom:18px;">
      Estudiante: <strong>${s.nombre}</strong> (${s.matricula} · Grupo ${s.grupo}). Este compromiso se reflejará de inmediato en el portal del alumno.
    </p>

    <form onsubmit="event.preventDefault();saveNewTask('${matricula}');" autocomplete="off">
      <div class="proto-form-field">
        <label for="taskTitle">Título del compromiso o actividad *</label>
        <input type="text" id="taskTitle" placeholder="Ej. Técnica Pomodoro 25/5 para exámenes, Pausa activa con Eirén" required maxlength="100">
      </div>

      <div class="proto-form-grid">
        <div class="proto-form-field">
          <label for="taskCat">Área / Categoría *</label>
          <select id="taskCat" required>
            <option value="Académico">Académico</option>
            <option value="Bienestar" selected>Bienestar Emocional</option>
            <option value="Salud">Salud y Hábitos</option>
            <option value="Vocacional">Orientación Vocacional</option>
            <option value="Tutoría">Tutoría y Convivencia</option>
          </select>
        </div>
        <div class="proto-form-field">
          <label for="taskDue">Fecha límite o de revisión *</label>
          <input type="text" id="taskDue" value="${fechaSugerida}" required maxlength="30">
        </div>
      </div>

      <div class="proto-form-field">
        <label for="taskDesc">Indicaciones y recomendaciones de la orientadora</label>
        <textarea id="taskDesc" rows="3" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--bg);font-family:inherit;font-size:13px;resize:vertical;" placeholder="Describe brevemente la técnica o acuerdo pactado con el estudiante..."></textarea>
      </div>

      <div class="proto-form-actions">
        <button type="button" class="btn-ghost" onclick="openStudentModal('${matricula}', 'tareas')">Cancelar</button>
        <button type="submit" class="btn-maroon">Guardar y Asignar Tarea</button>
      </div>
    </form>
  `);
}

function saveNewTask(matricula){
  const title = document.getElementById('taskTitle').value.trim();
  const category = document.getElementById('taskCat').value;
  const dueDate = document.getElementById('taskDue').value.trim();
  const desc = document.getElementById('taskDesc').value.trim();

  if(!title){
    alert('Ingresa el título de la tarea.');
    return;
  }

  addStudentTask(matricula, {
    title,
    category,
    dueDate,
    desc,
    assignedBy: getCurrentUser()?.display || 'Orientador Educativo'
  });

  openStudentModal(matricula, 'tareas');
}

/* ---------- Asignar Estudiante al Orientador Actual ---------- */
async function assignStudentToMe(matricula){
  const user = getCurrentUser();
  if(!user || !db.students[matricula]) return;
  db.students[matricula].guardian = user.nombre;
  db.students[matricula].guardianEmail = user.email;
  if(db.users[matricula]){
    db.users[matricula].guardian = user.nombre;
    db.users[matricula].guardianEmail = user.email;
  }
  saveDB();
  if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
    const client = typeof getActiveSupabaseClient === 'function' ? getActiveSupabaseClient() : null;
    if(client){
      await client.from('students').update({
        guardian: user.nombre
      }).eq('matricula', matricula);
    }
  }
  alert(`✅ Estudiante asignado exitosamente a tu acompañamiento (${user.nombre}).`);
  renderAdminSidebar();
  openStudentModal(matricula);
}

/* ---------- MODAL: VISTA PREVIA DEL CORREO INSTITUCIONAL DE ALERTA ---------- */
function openAlertEmailModal(alertId){
  const alt = (db.alerts || []).find(a => a.id === alertId);
  if(!alt) return;

  const s = db.students[alt.studentId] || {};
  const psychName = alt.psychologistName || s.guardian || 'Orientador Educativo';
  const psychEmail = alt.psychologistEmail || '221k0049@itscarrillopuerto.edu.mx';
  const isUrgent = alt.level === 'urgente';

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <div class="email-preview-wrapper">
      <!-- Barra superior cliente de correo -->
      <div class="email-client-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">✉️</span>
          <strong>Correo Institucional CONALEP</strong>
        </div>
        <span class="mono" style="font-size:11px;background:rgba(255,255,255,0.2);padding:3px 8px;border-radius:100px;">
          ${isUrgent ? 'Alerta Crítica · PIOE' : 'Seguimiento Preventivo · PIOE'}
        </span>
      </div>

      <!-- Cabecera del correo -->
      <div class="email-meta-header">
        <div class="email-meta-row">
          <span class="em-lbl">De:</span>
          <span class="em-val"><strong>sistema.alertas@conalep.edu.mx</strong> (NAIMA OS · Orientación Educativa Mérida I)</span>
        </div>
        <div class="email-meta-row">
          <span class="em-lbl">Para:</span>
          <span class="em-val"><strong>${psychEmail}</strong> (${psychName} · Orientador(a) PIOE)</span>
        </div>
        <div class="email-meta-row">
          <span class="em-lbl">Fecha:</span>
          <span class="em-val">${alt.date}</span>
        </div>
        <div class="email-meta-row">
          <span class="em-lbl">Asunto:</span>
          <span class="em-subject">${alt.emailSubject || (isUrgent ? `🚨 [ALERTA SOCIOEMOCIONAL CRÍTICA] Check-in de ${alt.studentName}` : `⚠️ [SEGUIMIENTO SOCIOEMOCIONAL] Check-in de ${alt.studentName}`)}</span>
        </div>
      </div>

      <!-- Cuerpo del mensaje institucional -->
      <div class="email-body-content">
        <div class="email-institutional-badge">
          <div style="font-weight:700;color:var(--maroon);font-size:14px;">COLEGIO NACIONAL DE EDUCACIÓN PROFESIONAL TÉCNICA</div>
          <div style="font-size:11.5px;color:var(--ink-soft);">PLANTEL MÉRIDA I · DEPARTAMENTO DE ORIENTACIÓN EDUCATIVA Y TUTORÍAS</div>
        </div>

        <p style="font-size:13.5px;line-height:1.6;color:var(--ink);margin-bottom:14px;">
          Estimado/a <strong>${psychName}</strong>,<br>
          El sistema inteligente NAIMA OS ha registrado un check-in de bienestar que coincide con criterios de atención ${isUrgent ? 'prioritaria y urgente' : 'preventiva y seguimiento'} según el protocolo institucional del PIOE.
        </p>

        <div class="email-student-card">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:28px;">${alt.moodEmoji || '⚠️'}</div>
            <div>
              <div style="font-size:15px;font-weight:700;color:var(--ink);">${alt.studentName}</div>
              <div class="mono" style="font-size:12px;color:var(--ink-soft);">
                Matrícula: ${alt.studentId} · Grupo: ${alt.grupo} · Carrera: ${alt.carrera} · Correo: ${alt.studentEmail || s.email || 'No registrado'}
              </div>
            </div>
          </div>
          <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);font-size:13px;">
            <div>Estado reportado: <strong style="color:${isUrgent ? 'var(--danger)' : '#B7791F'};">${alt.moodLabel || alt.mood}</strong> (${isUrgent ? 'Requiere Apoyo Inmediato' : 'Atención Preventiva'})</div>
            <div style="margin-top:4px;">Comentario del estudiante: <em>"${escapeHTML(alt.note || 'Sin nota adicional')}"</em></div>
          </div>
        </div>

        <div class="email-ai-intervention-box">
          <div style="font-weight:700;margin-bottom:4px;color:var(--green);font-size:12.5px;">
            🌿 Contención Inicial de IAs Activada en Plataforma:
          </div>
          <ul style="padding-left:18px;font-size:12px;line-height:1.55;color:var(--ink-soft);">
            <li><strong>Eirén:</strong> Validó la emoción del alumno, redujo la exigencia cognitiva y brindó acompañamiento empático.</li>
            <li><strong>Orión:</strong> Ofreció recomendaciones prácticas de organización académica y recordó que su orientador(a) ${psychName} está disponible.</li>
          </ul>
        </div>

        <div style="margin-top:14px;padding:12px 14px;background:#FFFBF0;border:1px solid #FFE082;border-radius:8px;font-size:12.8px;line-height:1.55;color:#7B341E;">
          🔔 <strong>Acción requerida por la plataforma:</strong> Por favor comunícate a la brevedad con el/la estudiante (${alt.studentName}) a su correo o en persona para brindarle acompañamiento humano y registrar la bitácora correspondiente en NAIMA OS.
        </div>
      </div>

      <!-- Pie de acciones -->
      <div class="email-footer-actions">
        <button class="btn-maroon" style="padding:9px 18px;font-size:12.5px;" onclick="closeModal();openContactStudentModal('${alt.id}');">
          📞 Comunicarse con ${alt.studentName.split(' ')[0]} Ahora →
        </button>
        <button class="btn-ghost" style="padding:9px 16px;font-size:12.5px;" onclick="closeModal();">
          Cerrar
        </button>
      </div>
    </div>
  `);
}

/* ---------- MODAL: COMUNICARSE DIRECTAMENTE CON EL ALUMNO ---------- */
function openContactStudentModal(alertId){
  const alt = (db.alerts || []).find(a => a.id === alertId);
  if(!alt) return;

  const s = db.students[alt.studentId] || {};
  const currentUser = getCurrentUser();
  const firstName = (alt.studentName || s.nombre || 'Alumno').split(' ')[0];
  const psychName = alt.psychologistName || s.guardian || currentUser.nombre || 'Orientador Educativo';
  const studentEmail = alt.studentEmail || s.email || `${(s.matricula || alt.studentId).toLowerCase()}@conalepmex.edu.mx`;
  const isUrgent = alt.level === 'urgente';

  // Mensaje de contacto institucional sugerido
  const draftSubject = `Acompañamiento Socioemocional - Orientación Educativa CONALEP Mérida I`;
  const draftBody = `Hola ${firstName}, te escribe ${currentUser.nombre || psychName} del departamento de Orientación Educativa de CONALEP Mérida I. Revisé en la plataforma tu check-in emocional del día de hoy (${alt.moodLabel || alt.mood}) y quiero que sepas que cuentas con todo nuestro respaldo. Me gustaría platicar contigo en el cubículo de Orientación para saber cómo estás y en qué podemos apoyarte. ¿En qué horario tienes un espacio libre el día de hoy o mañana? Recuerda que este espacio es confidencial y para tu bienestar. Un saludo afectuoso.`;

  const mailtoUrl = `mailto:${encodeURIComponent(studentEmail)}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`;

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <div class="contact-modal-wrapper">
      <!-- Encabezado de la comunicación -->
      <div class="contact-student-hero">
        <div class="csh-avatar">${initialOf(alt.studentName || s.display)}</div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:18px;color:var(--ink);">${alt.studentName}</h3>
            <span class="prio-chip ${isUrgent ? 'alto' : 'medio'}" style="font-size:11px;">
              ${isUrgent ? '🔴 Atención Urgente' : '🟡 Seguimiento Preventivo'}
            </span>
          </div>
          <div class="mono" style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">
            Matrícula: <strong>${alt.studentId}</strong> · Grupo: <strong>${alt.grupo}</strong> · Carrera: <strong>${alt.carrera || 'Informática'}</strong>
          </div>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">
            🩺 Orientador asignado: <strong>${psychName}</strong>
          </div>
        </div>
      </div>

      <!-- Resumen de lo reportado -->
      <div class="contact-mood-summary ${isUrgent ? 'urgent' : 'neutral'}">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:26px;">${alt.moodEmoji || '⚠️'}</span>
          <div>
            <div style="font-size:13.5px;font-weight:700;color:var(--ink);">
              Reportó: ${alt.moodLabel || alt.mood} · <span style="font-weight:400;color:var(--ink-soft);font-size:12px;">${alt.date}</span>
            </div>
            <div style="font-size:12.5px;color:var(--ink);margin-top:2px;">
              ${alt.note ? `Comentario del estudiante: <em>"${escapeHTML(alt.note)}"</em>` : '<em>El estudiante no agregó comentarios adicionales en su check-in.</em>'}
            </div>
          </div>
        </div>
      </div>

      <!-- Canales de comunicación directa -->
      <div style="margin-top:16px;">
        <span class="section-label" style="margin-bottom:8px;">Canales de Contacto Directo</span>
        
        <!-- Canal 1: Correo Institucional -->
        <div class="contact-channel-card">
          <div class="ccc-head">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">✉️</span>
              <div>
                <strong>Correo Institucional del Alumno</strong>
                <div class="mono" style="font-size:12px;color:var(--ink-soft);">${studentEmail}</div>
              </div>
            </div>
            <a href="${mailtoUrl}" target="_blank" class="btn-maroon" style="padding:6px 14px;font-size:12px;text-decoration:none;">
              Abrir Correo ↗
            </a>
          </div>

          <div class="contact-draft-preview">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <span style="font-size:11.5px;font-weight:600;color:var(--ink-soft);">Borrador Institucional Sugerido:</span>
              <button class="btn-copy-draft" onclick="copyContactDraftText('${escapeHTML(draftBody)}')">
                📋 Copiar Mensaje
              </button>
            </div>
            <div class="contact-draft-body" id="contactDraftBodyText">
              ${escapeHTML(draftBody)}
            </div>
          </div>
        </div>

        <!-- Canal 2: WhatsApp o Llamada Telefónica -->
        <div class="contact-channel-card" style="margin-top:10px;">
          <div class="ccc-head">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">💬</span>
              <div>
                <strong>Contacto por WhatsApp / Teléfono</strong>
                <div style="font-size:12px;color:var(--ink-soft);">Envío rápido de mensaje directo si cuentas con su número celular.</div>
              </div>
            </div>
            <button class="btn-outline-maroon" style="padding:6px 14px;font-size:12px;" onclick="openWhatsAppDirectPrompt('${encodeURIComponent(draftBody)}')">
              Enviar por WhatsApp ↗
            </button>
          </div>
        </div>
      </div>

      <!-- Bitácora y Registro de Contacto -->
      <div style="margin-top:18px;background:#F8F9FA;padding:14px;border-radius:10px;border:1px solid var(--line);">
        <label for="contactActionNote" style="display:block;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px;">
          📝 Registro de Intervención (Bitácora PIOE)
        </label>
        <textarea id="contactActionNote" style="width:100%;min-height:65px;padding:10px;font-size:12.8px;border:1px solid var(--line);border-radius:6px;resize:vertical;" placeholder="Describe la acción realizada. Ej: Se envió correo citando al alumno mañana a las 10:30 AM en el cubículo de orientación."></textarea>

        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:12px;">
          <button class="btn-ghost" style="padding:8px 16px;font-size:12.5px;" onclick="closeModal()">
            Cancelar
          </button>
          <button class="btn-maroon" style="padding:8px 20px;font-size:12.5px;" onclick="handleContactSaveAndResolve('${alt.id}', '${alt.studentId}')">
            ✓ Guardar Registro y Marcar Atendida
          </button>
        </div>
      </div>
    </div>
  `);
}

function copyContactDraftText(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(() => {
      alert('✓ Mensaje copiado al portapapeles. Puedes pegarlo en tu cliente de correo o mensajería.');
    }).catch(() => {
      prompt('Copia el siguiente texto:', text);
    });
  } else {
    prompt('Copia el siguiente texto:', text);
  }
}

function openWhatsAppDirectPrompt(encodedText){
  const phone = prompt('Introduce el número de celular del alumno a 10 dígitos (Ej: 9991234567):');
  if(phone && phone.trim()){
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/52${cleanPhone}?text=${encodedText}`;
    window.open(url, '_blank');
  }
}

async function handleContactSaveAndResolve(alertId, studentId){
  const noteEl = document.getElementById('contactActionNote');
  const noteText = noteEl ? noteEl.value.trim() : '';

  await resolveAlertInDb(alertId, noteText || 'Contacto y seguimiento socioemocional realizado.');
  closeModal();
  renderAdminSidebar();
  nav('inicio');

  alert('✓ ¡Excelente! Se registró el contacto y la alerta socioemocional ha sido marcada como atendida.');
}

function markReviewed(matricula){
  const s = db.students[matricula];
  if(!s) return;
  s.prioridad = 'bajo';
  (db.alerts || []).forEach(a => {
    if(a.studentId === matricula) a.status = 'atendida';
  });
  saveDB();
  renderAdminSidebar();
  closeModal();
  nav(currentSection);
}

/* ---------- VISTA: PIOE ---------- */
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

function renderPioe(){
  return `
  <div class="page-head">
    <div>
      <h1>PIOE Digital</h1>
      <p>Digitalizamos el proceso institucional; no reemplazamos el criterio profesional.</p>
    </div>
  </div>

  <div class="pioe-banner">
    <div class="pioe-banner-body">
      <span class="pioe-banner-tag">Programa Institucional de Orientación Educativa</span>
      <p class="pioe-banner-desc">Flujo conectado al expediente, documentos, seguimiento y reportes oficiales.</p>
    </div>
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

  <h2 class="pioe-section-title">Áreas de Acompañamiento</h2>
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
      <p>El motor de aplicación está listo. Los reactivos oficiales se aplican conforme a la norma institucional; NAIMA registra respuestas, calcula puntuación y presenta el resultado al profesional responsable.</p>
      <div class="pioe-warning">
        NAIMA no toma decisiones clínicas automáticamente. La valoración y actuación corresponden al personal autorizado de CONALEP.
      </div>
      <button class="pioe-btn-close" onclick="closePioeInstrument()">Cerrar</button>
    </div>`;
}

function openPioeInstrument(id){
  pioeOpen = id;
  document.getElementById('content').innerHTML = renderPioe();
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
      Este instrumento solo puede ser aplicado por <strong>personal expresamente autorizado</strong> por la institución conforme al protocolo.
    </p>
    <button class="btn-maroon" style="width:100%;" onclick="closeModal()">Entendido</button>
  `);
}

/* ---------- VISTA: EIRÉNÉ (ADMIN) ---------- */
function renderEirene(){
  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">EIRÉNÉ · ORIENTACIÓN</span>
      <h1>EIRÉNÉ · Compañera de Bienestar</h1>
      <p>Herramienta socioemocional que atiende a los estudiantes de CONALEP en el portal estudiantil.</p>
    </div>
  </div>

  <div class="panel" style="padding:28px;">
    <h3>Rol de EIRÉNÉ en la plataforma</h3>
    <p style="font-size:14px;color:var(--ink-soft);line-height:1.6;margin:12px 0 20px;">
      Cuando un estudiante accede a su portal e interactúa con EIRÉNÉ, ella registra sus emociones, brinda contención inmediata y, ante cualquier indicador de vulnerabilidad o estrés, genera una alerta inmediata en este portal administrativo.
    </p>
    <div class="duo-grid">
      <div class="duo-card">
        <span class="section-label">RESPUESTA INMEDIATA</span>
        <h3>Contención con Empatía</h3>
        <p>Valida las emociones del estudiante sin emitir juicios ni sustituir la labor psicológica.</p>
      </div>
      <div class="duo-card">
        <span class="section-label">CANALIZACIÓN</span>
        <h3>Alerta Institucional</h3>
        <p>Conecta al alumno directamente con el equipo de Orientación Educativa del plantel.</p>
      </div>
    </div>
  </div>`;
}

/* ---------- VISTA: ORION (ADMIN) ---------- */
function orionGreeting(){
  const h = new Date().getHours();
  if(h < 12) return 'Buenos días, orientadora.';
  if(h < 19) return 'Buenas tardes, orientadora.';
  return 'Buenas noches, orientadora.';
}

function orionConstellationSVG(){
  return `
  <svg viewBox="0 0 260 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="orionBg" cx="50%" cy="45%" r="75%">
        <stop offset="0%" stop-color="#1B3358"/><stop offset="55%" stop-color="#102743"/><stop offset="100%" stop-color="#071528"/>
      </radialGradient>
      <radialGradient id="starWhite" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/><stop offset="100%" stop-color="#C9E2FF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="260" height="420" fill="url(#orionBg)"/>
    <circle cx="125" cy="55" r="4" fill="url(#starWhite)"/>
    <circle cx="78" cy="92" r="5" fill="#FFE0C2"/>
    <circle cx="178" cy="102" r="4.5" fill="#FFFFFF"/>
    <line x1="78" y1="92" x2="178" y2="102" stroke="#8FB8E0" stroke-width="0.8" opacity="0.6"/>
    <circle cx="102" cy="215" r="4" fill="#9FC8FF"/>
    <circle cx="125" cy="208" r="4" fill="#9FC8FF"/>
    <circle cx="148" cy="205" r="4" fill="#9FC8FF"/>
    <line x1="102" y1="215" x2="148" y2="205" stroke="#8FB8E0" stroke-width="0.8" opacity="0.6"/>
    <circle cx="72" cy="335" r="4" fill="#FFFFFF"/>
    <circle cx="188" cy="345" r="6" fill="#6FA8FF"/>
    <line x1="72" y1="335" x2="188" y2="345" stroke="#8FB8E0" stroke-width="0.8" opacity="0.6"/>
  </svg>`;
}

function renderOrionPanel(){
  const seg = porRevisar();
  const total = studentsList().length;

  return `
  <div class="page-head">
    <div>
      <h1>ORION · Asistente Operativo</h1>
      <p>Organiza, resume y prepara el trabajo de orientación escolar.</p>
    </div>
  </div>

  <div class="orion-layout">
    <div class="orion-constellation">
      ${orionConstellationSVG()}
    </div>
    <div class="orion-panel">
      <span class="orion-tag">ORION · Co-piloto de Orientación</span>
      <h2 class="orion-title">${orionGreeting()}</h2>
      <div class="orion-msg">
        Puedo preparar un resumen de tus seguimientos pendientes. Ahora mismo hay <strong>${seg}</strong> caso(s) por revisar de <strong>${total}</strong> alumnos registrados.
      </div>

      <div class="orion-chips">
        <button class="orion-chip" onclick="orionQuick('resumen')">Resumen del día</button>
        <button class="orion-chip" onclick="orionQuick('reporte')">Borrador de reporte PIOE</button>
        <button class="orion-chip" onclick="nav('alumnos')">Consultar expedientes</button>
      </div>

      <div class="orion-warning">
        ORION no sustituye tu juicio clínico ni toma decisiones sensibles de derivación.
      </div>
    </div>
  </div>

  <div id="orionResult" style="margin-top:20px;"></div>
  `;
}

function orionQuick(tipo){
  const seg = porRevisar();
  const total = studentsList().length;
  const bien = bienestarPromedio();

  const respuestas = {
    resumen: `
      <h3>Resumen del día</h3>
      <ul>
        <li><strong>${total}</strong> Estudiantes registrados en CONALEP Mérida I.</li>
        <li><strong>${seg}</strong> caso(s) con seguimiento pendiente o alerta activa.</li>
        <li>Bienestar promedio del grupo: <strong>${bien}%</strong>.</li>
      </ul>`,
    reporte: `
      <h3>Borrador de Reporte PIOE</h3>
      <p>Expedientes analizados: <strong>${total}</strong> | Casos atendidos: <strong>${seg}</strong>.</p>
      <p>Secciones recomendadas: Diagnóstico socioemocional, priorización por grupo y bitácora de acuerdos.</p>`
  };

  const el = document.getElementById('orionResult');
  el.innerHTML = `
    <div class="orion-result">
      <span class="orion-result-tag">ORION responde</span>
      <div class="orion-result-body">${respuestas[tipo] || ''}</div>
    </div>`;
  el.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ---------- VISTA: DOCUMENTOS ---------- */
const DOC_FLOWS = [
  { num:'01', t:'Cédula digital',            d:'Expediente base del alumno.' },
  { num:'02', t:'Bitácora socioemocional',   d:'Atención y acuerdos de orientación.' },
  { num:'03', t:'Consentimiento CONECTA',    d:'Privacidad institucional y trazabilidad.' },
];

const DOC_CATALOG = [
  { title:'Cédula del estudiante',                          area:'CONALEP / expediente',  type:'Expediente' },
  { title:'Bitácora de atención socioemocional',            area:'Orientación Educativa', type:'PIOE' },
  { title:'Acuerdo de confidencialidad y manejo de datos',  area:'Red CONECTA',           type:'Consentimiento' },
  { title:'PHQ-A / PHQ-9 (Tamizaje)',                       area:'Salud Escolar',         type:'Instrumento' },
  { title:'GAD-7 (Ansiedad)',                               area:'Salud Escolar',         type:'Instrumento' },
];

function renderDocumentos(){
  const allDocs = getAllDocuments();
  const students = studentsList();

  const studentDocRows = allDocs.length ? allDocs.map(d => `
    <tr>
      <td>
        <strong style="color:var(--ink);">${escapeHTML(d.studentName)}</strong>
        <div class="mono" style="font-size:11.5px;color:var(--ink-soft);">${d.studentId} · ${d.grupo || '4B'}</div>
      </td>
      <td>
        <strong>${escapeHTML(d.title)}</strong>
        <div style="margin-top:2px;"><span class="doc-type-badge">${d.category || 'Expediente'}</span></div>
      </td>
      <td>
        <span class="mono" style="font-size:12px;">📁 ${escapeHTML(d.fileName || 'archivo.pdf')}</span>
        <div style="font-size:11px;color:var(--ink-muted);">${d.fileSize || '150 KB'}</div>
      </td>
      <td>
        <span style="font-size:12.5px;color:var(--ink-soft);">${d.date}</span>
      </td>
      <td style="text-align:right;white-space:nowrap;">
        <button class="btn-outline-maroon" style="padding:5px 12px;font-size:11.5px;margin-right:4px;" 
          onclick="openOfficialReportModal('${d.studentId}', '${escapeHTML(d.title)}')">
          🖨️ Imprimir Membretado
        </button>
        <button class="btn-delete-task" onclick="deleteDocAdmin('${d.id}')" title="Eliminar documento">✕</button>
      </td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="5" style="text-align:center;padding:32px 16px;color:var(--ink-soft);">
        <div style="font-size:24px;margin-bottom:6px;">📁</div>
        <strong>No hay documentos de alumnos cargados todavía</strong>
        <p style="font-size:12px;margin-top:4px;">Utiliza el botón de arriba para anexar la primera cédula o acuerdo.</p>
      </td>
    </tr>
  `;

  const catalogRows = DOC_CATALOG.map(d => `
    <div class="doc-row">
      <div class="doc-title">${d.title}</div>
      <div class="doc-area">${d.area}</div>
      <div class="doc-type-wrap"><span class="doc-type">${d.type}</span></div>
      <div class="doc-status">
        <button class="btn-outline-maroon" style="padding:6px 12px;font-size:12px;" onclick="openOfficialReportModal(null, '${d.title}')">
          🖨️ Formato Oficial PDF
        </button>
      </div>
    </div>
  `).join('');

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">DIRECCIÓN DE SERVICIOS ESTUDIANTILES</span>
      <h1>Documentos Inteligentes y Expedientes</h1>
      <p>Biblioteca institucional, expedientes cargados por estudiante y generación oficial con membrete CONALEP.</p>
    </div>
    <span class="demo-chip">CONALEP Mérida I</span>
  </div>

  <div class="pioe-banner">
    <div class="pioe-banner-body">
      <span class="pioe-banner-tag">Expediente Único Digital</span>
      <p class="pioe-banner-desc">
        Carga y resguarda documentos probatorios por estudiante: cédulas, justificaciones médicas, cartas compromiso y tamizajes.
      </p>
    </div>
    <button class="btn-maroon" onclick="openUploadModal()">＋ Cargar documento de alumno</button>
  </div>

  <div class="section-head-row">
    <div>
      <span class="section-label">Archivos del Plantel</span>
      <h2 class="section-title" style="margin-bottom:0;">Expedientes Digitales Cargados (${allDocs.length})</h2>
    </div>
  </div>

  <div class="proto-table-wrap" style="margin-bottom:34px;">
    <table class="proto-table">
      <thead>
        <tr>
          <th>Alumno / Matrícula</th>
          <th>Título / Categoría</th>
          <th>Archivo / Peso</th>
          <th>Fecha de Carga</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${studentDocRows}
      </tbody>
    </table>
  </div>

  <h2 class="pioe-section-title">Formatos e Instrumentos Oficiales del PIOE</h2>
  <div class="doc-catalog">
    ${catalogRows}
  </div>
  `;
}

function printDoc(title){
  const firstStudent = Object.values(db.students || {})[0];
  openOfficialReportModal(firstStudent ? firstStudent.matricula : null, title);
}

/* ---------- GENERADOR OFICIAL DE DOCUMENTOS CON MEMBRETE CONALEP ---------- */
function openOfficialReportModal(matricula, docTitle = null){
  const firstStudent = Object.values(db.students || {})[0];
  const s = (matricula ? db.students[matricula] : null) || firstStudent || {
    nombre: 'Expediente Institucional',
    matricula: 'CONALEP-MID1',
    grupo: '—',
    carrera: 'Orientación Educativa',
    guardian: getCurrentUser()?.nombre || 'Orientador Educativo'
  };

  const tasks = getStudentTasks(s.matricula);
  const hist = s.historial || [];
  const title = docTitle || 'Expediente Integral de Acompañamiento Socioemocional';
  const folio = 'CONALEP-OE-MID1-2026-' + (s.matricula.replace(/[^0-9]/g,'') || '042');
  const hoyStr = new Date().toLocaleDateString('es-MX', {
    day:'2-digit', month:'long', year:'numeric'
  });

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--line);">
      <div>
        <span class="section-label" style="margin:0;">Vista de Impresión Oficial</span>
        <div style="font-size:12.5px;color:var(--ink-soft);">Listo para imprimir en papel institucional o guardar como PDF</div>
      </div>
      <button class="btn-maroon" style="padding:9px 18px;font-size:13px;display:flex;align-items:center;gap:6px;" onclick="window.print();">
        🖨️ Mandar a Impresión / Guardar PDF
      </button>
    </div>

    <!-- DOCUMENTO FORMAL CON MEMBRETE CONALEP (ÁREA DE IMPRESIÓN) -->
    <div class="conalep-official-sheet" id="printableSheet">
      
      <!-- Membrete Superior Oficial -->
      <div class="sheet-header">
        <div class="sheet-header-left">
          <div class="sheet-gov-crest">
            <span style="font-size:22px;">🏛️</span>
          </div>
          <div>
            <div class="sheet-title-main">GOBIERNO DE MÉXICO · SECRETARÍA DE EDUCACIÓN PÚBLICA</div>
            <div class="sheet-title-sub">COLEGIO NACIONAL DE EDUCACIÓN PROFESIONAL TÉCNICA</div>
            <div class="sheet-title-desc">ORGANISMO PÚBLICO DESCENTRALIZADO DEL GOBIERNO FEDERAL</div>
            <div class="sheet-title-plantel">DIRECCIÓN ESTATAL YUCATÁN · PLANTEL MÉRIDA I (CCT: 31DPT0001E)</div>
          </div>
        </div>
        <div class="sheet-header-right">
          <div class="sheet-folio-box">
            <span class="sheet-folio-lbl">FOLIO OFICIAL PIOE</span>
            <span class="sheet-folio-num mono">${folio}</span>
          </div>
          <div class="sheet-date-lbl">Mérida, Yucatán, a ${hoyStr}</div>
        </div>
      </div>

      <!-- Título del Documento -->
      <div class="sheet-doc-title-block">
        <h2 class="sheet-doc-title">${escapeHTML(title)}</h2>
        <div class="sheet-doc-subtitle">PROGRAMA INSTITUCIONAL DE ORIENTACIÓN EDUCATIVA Y TUTORÍAS (PIOE)</div>
      </div>

      <!-- Ficha del Estudiante -->
      <div class="sheet-section-title">I. DATOS DE IDENTIFICACIÓN DEL ESTUDIANTE</div>
      <table class="sheet-info-table">
        <tr>
          <td style="width:25%;" class="sit-lbl">Nombre del Alumno:</td>
          <td style="width:40%;" class="sit-val"><strong>${s.nombre}</strong></td>
          <td style="width:15%;" class="sit-lbl">Matrícula:</td>
          <td style="width:20%;" class="sit-val mono"><strong>${s.matricula}</strong></td>
        </tr>
        <tr>
          <td class="sit-lbl">Carrera Técnica:</td>
          <td class="sit-val">${s.carrera || 'P.T.B. en Informática'}</td>
          <td class="sit-lbl">Grupo / Turno:</td>
          <td class="sit-val">${s.grupo} · Matutino</td>
        </tr>
        <tr>
          <td class="sit-lbl">Orientador(a) Asignado:</td>
          <td class="sit-val">${s.guardian || 'Por asignar'}</td>
          <td class="sit-lbl">Estatus de Apoyo:</td>
          <td class="sit-val">Acompañamiento Activo</td>
        </tr>
      </table>

      <!-- Historial y Diagnóstico de Bienestar -->
      <div class="sheet-section-title">II. REGISTRO RECIENTE DE BIENESTAR Y CHECK-INS EMOCIONALES</div>
      <table class="sheet-table-data">
        <thead>
          <tr>
            <th style="width:22%;">Fecha y Hora</th>
            <th style="width:22%;">Estado Reportado</th>
            <th style="width:56%;">Observaciones / Comentario del Alumno</th>
          </tr>
        </thead>
        <tbody>
          ${hist.length ? hist.slice(-4).reverse().map(h => {
            const m = MOODS.find(x => x.id === h.mood) || { label:h.mood, emoji:'•' };
            return `
              <tr>
                <td class="mono" style="font-size:11.5px;">${h.date}</td>
                <td><strong>${m.emoji} ${m.label}</strong></td>
                <td>${h.note ? escapeHTML(h.note) : 'Check-in rutinario en plataforma'}</td>
              </tr>
            `;
          }).join('') : `
            <tr>
              <td colspan="3" style="text-align:center;font-style:italic;color:#666;">Sin registros previos en la bitácora digital.</td>
            </tr>
          `}
        </tbody>
      </table>

      <!-- Acuerdos y Compromisos -->
      <div class="sheet-section-title">III. BITÁCORA DE COMPROMISOS Y ACUERDOS DE SEGUIMIENTO</div>
      <table class="sheet-table-data">
        <thead>
          <tr>
            <th style="width:40%;">Compromiso / Actividad</th>
            <th style="width:20%;">Área</th>
            <th style="width:20%;">Fecha Límite</th>
            <th style="width:20%;">Estatus</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.length ? tasks.map(t => `
            <tr>
              <td>
                <strong>${escapeHTML(t.title)}</strong>
                ${t.desc ? `<div style="font-size:10.5px;color:#555;margin-top:2px;">${escapeHTML(t.desc)}</div>` : ''}
              </td>
              <td>${t.category || 'General'}</td>
              <td class="mono" style="font-size:11.5px;">${t.dueDate || 'En curso'}</td>
              <td><span style="font-weight:600;color:${t.completed ? '#17795B' : '#7E1C3E'};">${t.completed ? '✓ CUMPLIDO' : '⏳ PENDIENTE'}</span></td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4" style="text-align:center;font-style:italic;color:#666;">Se acuerda continuar el seguimiento ordinario en aula y talleres.</td>
            </tr>
          `}
        </tbody>
      </table>

      <!-- Fundamento y Confidencialidad -->
      <div class="sheet-disclaimer">
        <strong>NOTA DE CONFIDENCIALIDAD Y FUNDAMENTO INSTITUCIONAL:</strong> La información contenida en este documento forma parte del expediente socioemocional y de tutoría del estudiante, amparado por el Modelo Académico de Calidad para la Competitividad de CONALEP y la normatividad de protección de datos personales. Válido exclusivamente para efectos psicopedagógicos internos.
      </div>

      <!-- Firmas Oficiales y Sello Digital -->
      <div class="sheet-signatures">
        <div class="sheet-sig-box">
          <div class="sheet-sig-line"></div>
          <div class="sheet-sig-name">${getCurrentUser()?.nombre || s.guardian || 'Orientador(a) Institucional'}</div>
          <div class="sheet-sig-title">${getCurrentUser()?.cargo || 'Orientación Educativa y Tutorías'}</div>
          <div class="sheet-sig-stamp">✦ SELLO DIGITAL PIOE MER-1 ✦</div>
        </div>
        <div class="sheet-sig-box">
          <div class="sheet-sig-line"></div>
          <div class="sheet-sig-name">${s.nombre}</div>
          <div class="sheet-sig-title">Firma del Estudiante (Enterado)</div>
          <div class="mono" style="font-size:10px;color:#777;margin-top:4px;">Matrícula: ${s.matricula}</div>
        </div>
        <div class="sheet-sig-box">
          <div class="sheet-sig-line"></div>
          <div class="sheet-sig-name">Padre, Madre o Tutor Legal</div>
          <div class="sheet-sig-title">Enterado y Corresponsable</div>
          <div class="mono" style="font-size:10px;color:#777;margin-top:4px;">Ciclo Escolar 2026-2027</div>
        </div>
      </div>

    </div>
  `);
}

/* ---------- MODAL PARA CARGAR DOCUMENTO DE ESTUDIANTE ---------- */
function openUploadModal(preselectedMatricula = null){
  const students = studentsList();

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Expediente Digital Único</span>
    <h3 style="font-size:18px;margin-bottom:6px;">Cargar Documento de Estudiante</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;margin-bottom:18px;">
      Anexa justificantes, cartas de tutoría, cédulas o tamizajes al expediente del estudiante en CONALEP Mérida I.
    </p>

    <form onsubmit="event.preventDefault();submitUploadDocument();" autocomplete="off">
      <div class="proto-form-field">
        <label for="upStudentSelect">Seleccionar Alumno(a) *</label>
        <select id="upStudentSelect" required>
          ${students.map(s => `
            <option value="${s.matricula}" ${s.matricula === preselectedMatricula ? 'selected' : ''}>
              ${s.nombre} (${s.matricula} · Grupo ${s.grupo} · ${s.carrera || 'Técnico'})
            </option>
          `).join('')}
        </select>
      </div>

      <div class="proto-form-grid">
        <div class="proto-form-field">
          <label for="upDocTitle">Título del documento *</label>
          <input type="text" id="upDocTitle" placeholder="Ej. Carta Compromiso de Tutoría, Cédula de Salud" required maxlength="100">
        </div>
        <div class="proto-form-field">
          <label for="upDocCat">Tipo / Categoría *</label>
          <select id="upDocCat" required>
            <option value="Expediente">Cédula / Expediente Base</option>
            <option value="Acuerdo PIOE" selected>Carta Compromiso y Acuerdos PIOE</option>
            <option value="Justificante">Justificante Médico o Socioemocional</option>
            <option value="Instrumento">Tamizaje (PHQ-9 / GAD-7 / ASSIST)</option>
            <option value="Consentimiento">Consentimiento Informado CONECTA</option>
          </select>
        </div>
      </div>

      <div class="proto-form-field">
        <label for="upDocFile">Archivo Digital (PDF o Imagen)</label>
        <input type="file" id="upDocFile" accept=".pdf,.png,.jpg,.jpeg" style="padding:10px 14px;background:var(--bg);border-radius:10px;border:1px dashed var(--line);width:100%;cursor:pointer;">
        <div style="font-size:11.5px;color:var(--ink-muted);margin-top:4px;">
          Formatos aceptados: PDF, JPG, PNG (Hasta 15 MB)
        </div>
      </div>

      <div class="proto-form-field">
        <label for="upDocNotes">Observaciones o notas de orientación</label>
        <textarea id="upDocNotes" rows="2" style="width:100%;padding:10px 14px;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--bg);font-family:inherit;font-size:13px;resize:vertical;" placeholder="Anotaciones relevantes de la orientadora sobre este documento..."></textarea>
      </div>

      <div class="proto-form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-maroon">Adjuntar al Expediente</button>
      </div>
    </form>
  `);
}

function submitUploadDocument(){
  const studentId = document.getElementById('upStudentSelect').value;
  const title = document.getElementById('upDocTitle').value.trim();
  const category = document.getElementById('upDocCat').value;
  const notes = document.getElementById('upDocNotes').value.trim();
  const fileInput = document.getElementById('upDocFile');

  if(!title){
    alert('Ingresa el título del documento.');
    return;
  }

  let fileName = title.replace(/\s+/g,'_') + '.pdf';
  let fileSize = '165 KB';

  if(fileInput && fileInput.files && fileInput.files.length > 0){
    const f = fileInput.files[0];
    fileName = f.name;
    fileSize = (f.size / 1024 < 1024) 
      ? Math.round(f.size / 1024) + ' KB' 
      : (f.size / (1024*1024)).toFixed(1) + ' MB';
  }

  addStudentDocument({
    studentId,
    title,
    category,
    fileName,
    fileSize,
    notes,
    author: getCurrentUser()?.display || 'Orientador Educativo'
  });

  alert('¡Documento adjuntado exitosamente al expediente del estudiante!');
  closeModal();

  if(currentSection === 'catalogo') nav('catalogo');
  else if(currentSection === 'alumnos') openStudentModal(studentId, 'documentos');
}

/* ---------- VISTA: NOVA (ANALÍTICA) ---------- */
function renderNova(){
  const list = studentsList();
  const counts = {}; MOODS.forEach(m => counts[m.id] = 0);
  list.forEach(s => { const m = lastMood(s); if(m) counts[m.id]++; });

  const bars = MOODS.map(m => {
    const pct = list.length ? Math.round((counts[m.id] / list.length) * 100) : 0;
    return `<div class="nova-bar-row">
      <div class="nb-head"><span>${m.emoji} ${m.label}</span><span class="mono">${counts[m.id]} alumno(s) (${pct}%)</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${m.hex};"></div></div>
    </div>`;
  }).join('');

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">◇ NOVA · ANALÍTICA</span>
      <h1>Visión Institucional del Plantel</h1>
      <p>Información agregada para seguimiento operativo y toma de decisiones en CONALEP Mérida I.</p>
    </div>
    <span class="demo-chip">Métricas en Tiempo Real</span>
  </div>

  <div class="stat-grid">
    <div class="stat-card"><div class="s-icon teal">◇</div><div class="s-num">${list.length}</div><div class="s-lbl">Estudiantes activos</div></div>
    <div class="stat-card"><div class="s-icon maroon">◎</div><div class="s-num">${porRevisar()}</div><div class="s-lbl">Casos por revisar</div></div>
    <div class="stat-card"><div class="s-icon green">◔</div><div class="s-num">${bienestarPromedio()}%</div><div class="s-lbl">Bienestar promedio</div></div>
  </div>

  <span class="section-label">Distribución emocional</span>
  <h2 class="section-title">Estado de ánimo grupal (último check-in)</h2>
  <div class="panel" style="padding:24px;">
    <div class="nova-bars">${bars}</div>
  </div>
  `;
}

/* ---------- VISTA: CAMPUS 3D (ADMIN) ---------- */
function renderCampus3DCoordinador(){
  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">CAMPUS INTERACTIVO 3D</span>
      <h1>Campus 3D y Entornos Virtuales</h1>
      <p>Supervisión de espacios virtuales del plantel y dinámicas interactivas desarrolladas en Mérida.</p>
    </div>
    <span class="demo-chip">Integración Mérida 3D</span>
  </div>

  <div class="banner">
    <div class="b-icon">△</div>
    <div class="b-body">
      <span class="b-tag">Entornos 3D</span>
      <div class="b-title">Módulo de Enlace 3D y Videojuegos</div>
      <div class="b-desc">Espacios virtuales para recorrido del plantel CONALEP y dinámicas de relajación estudiantil.</div>
    </div>
  </div>

  <div class="quick-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">
    <div class="panel" style="padding:24px;">
      <div style="font-size:36px;margin-bottom:10px;">🏫</div>
      <h3>Plantel CONALEP Virtual (3D)</h3>
      <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;margin:8px 0 16px;">
        Recorrido virtual en 3D para ambientación de alumnos, aulas y talleres.
      </p>
      <button class="btn-outline-maroon" style="width:100%;" onclick="open3dDemo('Plantel CONALEP')">Probar Visor 3D</button>
    </div>

    <div class="panel" style="padding:24px;">
      <div style="font-size:36px;margin-bottom:10px;">🌉</div>
      <h3>Puente de Progreso (3D)</h3>
      <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;margin:8px 0 16px;">
        Entorno relajante para pausas activas y reducción del estrés escolar.
      </p>
      <button class="btn-outline-maroon" style="width:100%;" onclick="open3dDemo('Puente de Progreso')">Probar Visor 3D</button>
    </div>
  </div>
  `;
}

function open3dDemo(nombre){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 style="font-size:18px;margin-bottom:12px;">🎮 Visor 3D: ${nombre}</h3>
    <div style="width:100%;height:300px;background:#0F172A;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
      <div style="font-size:48px;margin-bottom:10px;">△</div>
      <p style="font-size:14px;color:#94A3B8;">Enlace preparado para embeber el modelo 3D WebGL de Mérida.</p>
    </div>
  `);
}

/* ---------- VISTA: EQUIPO DE ORIENTADORES Y COORDINACIÓN ---------- */
function renderEquipoCoordinadores(){
  const currentUser = getCurrentUser() || {};
  const seenCoords = new Set();
  const coords = Object.values(db.users || {})
    .filter(u => u && u.rol === 'coordinador')
    .filter(u => {
      const emailLower = (u.email || u.id || '').toLowerCase();
      if(!emailLower || seenCoords.has(emailLower)) return false;
      seenCoords.add(emailLower);
      return true;
    });

  const rows = coords.map(c => {
    const isMe = (c.id === currentUser.id || c.email === currentUser.email);
    const emailLower = (c.email || '').toLowerCase();
    const isFounder = (emailLower === '221k0049@itscarrillopuerto.edu.mx' || emailLower === 'adanm.noh150903@gmail.com');
    let cPhoto = c.photo || c.avatar_url;
    if(cPhoto && typeof cPhoto === 'string' && cPhoto.trim().startsWith('{')){
      try{ cPhoto = JSON.parse(cPhoto).photo || null; }catch(e){}
    }
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="up-avatar" style="width:38px;height:38px;font-size:14px;background:var(--maroon);color:#FFF;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;overflow:hidden;flex-shrink:0;">
              ${cPhoto ? `
                <img src="${escapeHTML(cPhoto)}" class="up-avatar-img" alt="Foto de ${escapeHTML(c.nombre)}">
              ` : `
                ${initialOf(c.display || c.nombre)}
              `}
            </div>
            <div>
              <strong style="color:var(--ink);font-size:14px;">${escapeHTML(c.nombre)}</strong>
              ${isMe ? '<span style="color:var(--green);font-size:11px;font-weight:700;margin-left:6px;background:var(--green-soft);padding:2px 7px;border-radius:100px;">(Tu cuenta activa)</span>' : ''}
              <div style="font-size:12px;color:var(--ink-soft);">${escapeHTML(c.cargo || 'Orientador Educativo')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="mono" style="font-size:12.5px;color:var(--ink);">${escapeHTML(c.email)}</span>
        </td>
        <td>
          <span style="font-size:12.5px;color:var(--ink-soft);">${escapeHTML(c.plantel || 'CONALEP Mérida I')}</span>
        </td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:var(--green);background:var(--green-soft);padding:3px 10px;border-radius:100px;">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;"></span>
            Activo
          </span>
        </td>
        <td style="text-align:right;">
          ${(!isMe && !isFounder) ? `
            <button class="btn-delete-task" onclick="handleEliminarCoordinador('${c.id}', '${escapeHTML(c.nombre)}')" title="Dar de baja orientador">
              ✕
            </button>
          ` : `<span style="font-size:11.5px;color:var(--ink-muted);font-weight:500;">${isMe ? 'Sesión actual' : 'Fundador'}</span>`}
        </td>
      </tr>
    `;
  }).join('');

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">DIRECCIÓN GENERAL · SERVICIOS ESTUDIANTILES</span>
      <h1>Equipo de Orientación y Tutorías</h1>
      <p>Gestión institucional de orientadores, psicólogos escolares y tutores autorizados con acceso al portal de administración.</p>
    </div>
    <span class="demo-chip">CONALEP Mérida I</span>
  </div>

  <div class="pioe-banner">
    <div class="pioe-banner-body">
      <span class="pioe-banner-tag">Acceso Seguro & Confidencial</span>
      <p class="pioe-banner-desc">
        Por seguridad institucional, los orientadores y psicólogos no se registran públicamente. Da de alta a nuevos integrantes de tu equipo aquí para habilitar su acceso oficial.
      </p>
    </div>
    <button class="btn-maroon" onclick="openNuevoCoordinadorModal()">＋ Dar de alta orientador(a)</button>
  </div>

  <div class="stat-grid" style="margin-bottom:24px;">
    <div class="stat-card">
      <div class="s-icon teal">🛡️</div>
      <div class="s-num">${coords.length}</div>
      <div class="s-lbl">Orientadores activos en el sistema</div>
    </div>
    <div class="stat-card">
      <div class="s-icon green">🏫</div>
      <div class="s-num">Mérida I</div>
      <div class="s-lbl">Plantel institucional</div>
    </div>
    <div class="stat-card">
      <div class="s-icon maroon">🔒</div>
      <div class="s-num">Cerrado</div>
      <div class="s-lbl">Registro público restringido</div>
    </div>
  </div>

  <div class="section-head-row">
    <div>
      <span class="section-label">Personal Acreditado</span>
      <h2 class="section-title" style="margin-bottom:0;">Orientadores y Coordinadores</h2>
    </div>
    <button class="btn-outline-maroon" style="padding:6px 14px;font-size:12.5px;" onclick="openNuevoCoordinadorModal()">
      ＋ Nuevo Integrante
    </button>
  </div>

  <div class="proto-table-wrap">
    <table class="proto-table">
      <thead>
        <tr>
          <th>Orientador(a) / Especialista</th>
          <th>Correo Institucional</th>
          <th>Plantel</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
  `;
}

function openNuevoCoordinadorModal(){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Control de Acceso Institucional</span>
    <h3 style="font-size:18px;margin-bottom:6px;">Dar de Alta a Nuevo Orientador / Coordinador</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.55;margin-bottom:18px;">
      Registra a un nuevo psicólogo, orientador(a) o tutor(a). Su cuenta tendrá acceso al Portal Administrador y aparecerá disponible para los estudiantes al registrarse.
    </p>

    <form id="formNuevoCoord" onsubmit="handleNuevoCoordinadorSubmit(event)" autocomplete="off">
      <div class="proto-form-field">
        <label for="ncNombre">Nombre completo con título *</label>
        <input type="text" id="ncNombre" placeholder="Ej. Lic. Claudia Pech Rodríguez" required maxlength="80">
      </div>

      <div class="proto-form-field">
        <label for="ncEmail">Correo electrónico institucional *</label>
        <input type="email" id="ncEmail" placeholder="usuario@conalep.edu.mx" required>
      </div>

      <div class="proto-form-field">
        <label for="ncCargo">Cargo o función técnica *</label>
        <select id="ncCargo" required>
          <option value="Orientador Educativo">Orientador Educativo</option>
          <option value="Psicólogo(a) Escolar">Psicólogo(a) Escolar</option>
          <option value="Coordinador(a) de Orientación">Coordinador(a) de Orientación</option>
          <option value="Tutor(a) Institucional (PIOE)">Tutor(a) Institucional (PIOE)</option>
          <option value="Trabajo Social">Trabajo Social</option>
        </select>
      </div>

      <div class="proto-form-field">
        <label for="ncPass">Contraseña inicial de acceso *</label>
        <input type="password" id="ncPass" value="conalep123" minlength="6" required>
        <div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">Mínimo 6 caracteres. El orientador podrá usarla para ingresar a NAIMA OS.</div>
      </div>

      <div class="proto-form-error" id="ncError"></div>

      <div style="background:#FAF6EE;border:1px solid #E6D8BA;border-left:3px solid var(--maroon);padding:10px 12px;border-radius:6px;font-size:12px;color:var(--ink);line-height:1.45;margin-bottom:16px;">
        ✦ <strong>Integración automática:</strong> Este orientador quedará sincronizado en Supabase y aparecerá inmediatamente en el menú de asignación de los alumnos.
      </div>

      <div class="proto-form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-maroon">Guardar y Habilitar Acceso →</button>
      </div>
    </form>
  `);
}

async function handleNuevoCoordinadorSubmit(e){
  e.preventDefault();
  const nombre = document.getElementById('ncNombre').value.trim();
  const email = document.getElementById('ncEmail').value.trim();
  const cargo = document.getElementById('ncCargo').value;
  const password = document.getElementById('ncPass').value.trim();
  const errEl = document.getElementById('ncError');

  if(!nombre || !email || !password){
    if(errEl){
      errEl.textContent = 'Por favor completa todos los campos requeridos.';
      errEl.style.display = 'block';
    }
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if(submitBtn){
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrando en base de datos...';
  }

  try{
    const res = await registerUser({
      rol: 'coordinador',
      nombre,
      email,
      cargo,
      password,
      plantel: 'CONALEP Mérida I'
    }, { switchUser: false });

    if(res.success){
      closeModal();
      if(currentSection === 'equipo') nav('equipo');
      alert(`¡${nombre} ha sido dado de alta exitosamente como ${cargo}!`);
    } else {
      if(errEl){
        errEl.textContent = res.error || 'Error al guardar el orientador.';
        errEl.style.display = 'block';
      }
      if(submitBtn){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar y Habilitar Acceso →';
      }
    }
  }catch(err){
    if(errEl){
      errEl.textContent = err.message || 'Error de conexión.';
      errEl.style.display = 'block';
    }
    if(submitBtn){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar y Habilitar Acceso →';
    }
  }
}

async function handleEliminarCoordinador(id, nombre){
  if(!confirm(`¿Estás seguro de que deseas dar de baja a ${nombre} del equipo de orientación? Ya no podrá acceder al portal administrativo.`)){
    return;
  }

  const res = await deleteCoordinator(id);
  if(res.success){
    if(currentSection === 'equipo') nav('equipo');
  } else {
    alert(res.error || 'No se pudo eliminar al orientador.');
  }
}

/* ---------- VISTA: CONFIGURACIÓN ---------- */
function renderConfiguracion(){
  const user = getCurrentUser() || {};
  const isSb = typeof isSupabaseLive === 'function' && isSupabaseLive();

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">SISTEMA INSTITUCIONAL</span>
      <h1>Configuración de la Plataforma</h1>
      <p>Ajustes operativos, conexión con la base de datos y control de accesos de NAIMA OS.</p>
    </div>
    <span class="demo-chip">CONALEP Mérida I</span>
  </div>

  <!-- Módulo de Notificaciones por Correo Electrónico -->
  <div class="card" style="margin-bottom:24px;border-left:4px solid var(--maroon);padding:24px;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
      <div>
        <span class="section-label" style="margin:0 0 4px 0;">📬 ALERTAS INMEDIATAS POR CORREO</span>
        <h3 style="margin:0;font-size:17px;color:var(--ink);">Correo Institucional para Alertas de Check-in</h3>
        <p style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;max-width:650px;">
          Cuando un alumno responde su Check-in con un estado de alerta o preventivo (Triste, Estresado, Enojado o Neutral), el sistema despacha automáticamente una notificación a la bandeja de entrada para brindar atención inmediata.
        </p>
      </div>
      <span class="badge-student-status activo" style="font-size:11px;">
        ● Sistema SMTP / Servidor Activo
      </span>
    </div>

    <div style="background:#FAFBF9;border:1px solid var(--line);border-radius:10px;padding:18px;margin-bottom:14px;">
      <div class="proto-form-grid" style="margin-bottom:14px;">
        <div class="proto-form-field">
          <label for="cfgAlertEmail"><strong>Correo Preferencial para Alertas Socioemocionales</strong></label>
          <input type="email" id="cfgAlertEmail" 
                 placeholder="Ej. 221k0049@itscarrillopuerto.edu.mx o tu_correo@gmail.com" 
                 value="${escapeHTML((db.settings && db.settings.alertEmail) ? db.settings.alertEmail : (user.email || ''))}">
          <div style="font-size:11.5px;color:var(--ink-muted);margin-top:4px;">
            Correo de tu cuenta actual: <strong>${escapeHTML(user.email || '221k0049@itscarrillopuerto.edu.mx')}</strong>
          </div>
        </div>

        <div class="proto-form-field">
          <label for="cfgAlertMode"><strong>Modo de Envío de Alertas</strong></label>
          <select id="cfgAlertMode">
            <option value="both" ${(db.settings?.alertMode==='both' || !db.settings?.alertMode) ? 'selected' : ''}>
              📬 Enviar a Ambos (Orientador asignado al alumno + Correo preferencial)
            </option>
            <option value="preferred" ${db.settings?.alertMode==='preferred' ? 'selected' : ''}>
              🎯 Enviar Únicamente al Correo Preferencial arriba indicado
            </option>
            <option value="orientador" ${db.settings?.alertMode==='orientador' ? 'selected' : ''}>
              🩺 Enviar Únicamente al Orientador asignado a cada alumno
            </option>
          </select>
          <div style="font-size:11.5px;color:var(--ink-muted);margin-top:4px;">
            Garantiza que el orientador o la coordinación reciba la alerta al instante.
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button class="btn-maroon" onclick="saveAlertEmailSettings()" style="padding:10px 20px;font-size:13px;">
          💾 Guardar Preferencias de Correo
        </button>
        <button class="btn-outline-maroon" onclick="sendTestAlertEmail()" style="padding:10px 18px;font-size:13px;background:#FFF;">
          🧪 Enviar Correo de Prueba a Mi Bandeja →
        </button>
        <span id="cfgEmailFeedback" style="display:none;font-size:12.5px;font-weight:600;color:var(--green);"></span>
      </div>
    </div>
  </div>

  <div class="duo-grid" style="grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:24px;">
    <div class="duo-card">
      <span class="section-label">🛡️ GESTIÓN DE ACCESOS</span>
      <h3>Equipo de Orientadores y Coordinación</h3>
      <p>Administra las cuentas de psicólogos y tutores autorizados. Ningún personal puede registrarse públicamente por seguridad.</p>
      <button class="btn-maroon" style="margin-top:8px;" onclick="nav('equipo')">Gestionar Orientadores →</button>
    </div>

    <div class="duo-card">
      <span class="section-label">🔑 SEGURIDAD DE ACCESO</span>
      <h3>Cambiar Mi Contraseña</h3>
      <p>Personaliza tu clave de acceso institucional. Protege tu portal y actualiza tus credenciales cuando lo requieras.</p>
      <button class="btn-outline-maroon" style="margin-top:8px;" onclick="openCambiarPasswordModal()">Cambiar Mi Contraseña →</button>
    </div>

    <div class="duo-card">
      <span class="section-label">☁️ BASE DE DATOS SUPABASE</span>
      <h3>Conexión y Sincronización</h3>
      <p style="margin-bottom:12px;">Estado: <strong>${isSb ? '🟢 Conectado en vivo (Supabase Cloud)' : '🟡 Modo Local (Persistencia en navegador)'}</strong></p>
      <button class="btn-outline-maroon" onclick="forzarSincronizacionSupabase()">🔄 Forzar Sincronización Ahora</button>
    </div>
  </div>

  <div class="panel" style="padding:24px;">
    <h3 style="font-size:16px;margin:0 0 12px 0;">Ficha Técnica del Sistema</h3>
    <table class="sheet-info-table" style="margin:0;">
      <tr>
        <td class="sit-lbl" style="width:25%;">Institución:</td>
        <td class="sit-val">Colegio Nacional de Educación Profesional Técnica (CONALEP)</td>
      </tr>
      <tr>
        <td class="sit-lbl">Plantel:</td>
        <td class="sit-val">Plantel Mérida I · Clave CCT: 31DPT0001E</td>
      </tr>
      <tr>
        <td class="sit-lbl">Programa:</td>
        <td class="sit-val">Programa Institucional de Orientación Educativa y Tutorías (PIOE)</td>
      </tr>
      <tr>
        <td class="sit-lbl">Usuario en sesión:</td>
        <td class="sit-val"><strong>${escapeHTML(user.nombre || 'Orientador')}</strong> (${escapeHTML(user.cargo || 'Orientador Educativo')}) · ${escapeHTML(user.email || '')}</td>
      </tr>
      <tr>
        <td class="sit-lbl">Control de Registro:</td>
        <td class="sit-val"><span style="color:var(--green);font-weight:700;">✓ Registro público restringido únicamente a estudiantes</span></td>
      </tr>
    </table>
  </div>
  `;
}

function saveAlertEmailSettings(){
  const emailInput = document.getElementById('cfgAlertEmail');
  const modeSelect = document.getElementById('cfgAlertMode');
  const feedback = document.getElementById('cfgEmailFeedback');
  if(!emailInput) return;

  const email = emailInput.value.trim();
  const mode = modeSelect ? modeSelect.value : 'both';

  if(!db.settings) db.settings = {};
  db.settings.alertEmail = email;
  db.settings.alertMode = mode;
  saveDB();

  if(feedback){
    feedback.textContent = `✓ Guardado: Las alertas se enviarán a ${email || 'correo del orientador'}`;
    feedback.style.display = 'inline';
    setTimeout(() => { feedback.style.display = 'none'; }, 4000);
  }
  alert(`✅ Configuración de alertas guardada exitosamente.\nDestinatario preferencial: ${email || 'Orientador asignado'}`);
}

async function sendTestAlertEmail(){
  const emailInput = document.getElementById('cfgAlertEmail');
  const targetEmail = (emailInput ? emailInput.value.trim() : '') || getCurrentUser()?.email || '221k0049@itscarrillopuerto.edu.mx';

  if(!targetEmail || !targetEmail.includes('@')){
    alert('Por favor introduce un correo electrónico válido antes de enviar la prueba.');
    return;
  }

  const btn = event?.target;
  const originalText = btn ? btn.textContent : '';
  if(btn){
    btn.disabled = true;
    btn.textContent = 'Enviando prueba...';
  }

  try{
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: targetEmail,
        toName: getCurrentUser()?.nombre || 'Coordinador(a) Institucional',
        studentName: 'Estudiante de Demostración (CONALEP)',
        matricula: 'PTB-TEST-2026',
        grupo: '6B',
        carrera: 'Técnico en Informática',
        studentEmail: 'alumno.prueba@alumnos.conalep.edu.mx',
        mood: 'estresado',
        moodEmoji: '😣',
        moodLabel: 'Estresado',
        note: 'Esta es una prueba de verificación del sistema de alertas automáticas por Check-in de NAIMA OS.',
        level: 'urgente',
        subject: '🧪 [VERIFICACIÓN] Prueba de Alerta por Check-in de NAIMA OS'
      })
    });

    const data = await res.json().catch(() => ({}));
    if(res.ok && data.success){
      alert(`✅ ¡Correo de prueba enviado con éxito!\n\nRevisa la bandeja de entrada de: ${targetEmail}`);
    } else {
      alert(`Aviso al enviar correo: ${data.error || data.message || 'Verifica la configuración del servidor.'}`);
    }
  }catch(err){
    alert(`Aviso: No se pudo conectar con el servicio de correo: ${err.message}.\nSi estás en local, asegúrate de iniciar el servidor con "npm start".`);
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

async function forzarSincronizacionSupabase(){
  if(typeof pullSupabaseToLocal === 'function'){
    alert('Sincronizando con Supabase...');
    const ok = await pullSupabaseToLocal();
    if(ok){
      alert('✅ Base de datos sincronizada correctamente con la nube.');
      nav(currentSection);
    } else {
      alert('Aviso: No se pudo conectar con Supabase en este momento.');
    }
  }
}

/* ---------- Modal y Lógica para Cambiar Contraseña ---------- */
function openCambiarPasswordModal(){
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : {};
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Seguridad de la Cuenta</span>
    <h3 style="font-size:18px;margin-bottom:6px;">Actualizar Contraseña de Acceso</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.55;margin-bottom:18px;">
      Usuario: <strong>${escapeHTML(user.nombre || 'Orientador')}</strong> (${escapeHTML(user.email || '')})
    </p>

    <form id="formChangePass" onsubmit="handleCambiarPasswordSubmit(event)" autocomplete="off">
      <div class="proto-form-field">
        <label for="cpNewPass">Nueva Contraseña de Acceso *</label>
        <input type="password" id="cpNewPass" placeholder="Mínimo 6 caracteres" minlength="6" required>
        <div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">Elige una contraseña segura que puedas recordar.</div>
      </div>

      <div class="proto-form-field" style="margin-top:12px;">
        <label for="cpConfirmPass">Confirmar Nueva Contraseña *</label>
        <input type="password" id="cpConfirmPass" placeholder="Repite tu nueva contraseña" minlength="6" required>
      </div>

      <div class="proto-form-error" id="cpError" style="margin-top:12px;"></div>

      <div class="proto-form-actions" style="margin-top:20px;">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-maroon">Guardar Nueva Contraseña →</button>
      </div>
    </form>
  `);
}

async function handleCambiarPasswordSubmit(e){
  e.preventDefault();
  const newPass = document.getElementById('cpNewPass').value.trim();
  const confirmPass = document.getElementById('cpConfirmPass').value.trim();
  const errEl = document.getElementById('cpError');

  if(newPass.length < 6){
    if(errEl){ errEl.textContent = 'La contraseña debe tener mínimo 6 caracteres.'; errEl.style.display = 'block'; }
    return;
  }
  if(newPass !== confirmPass){
    if(errEl){ errEl.textContent = 'Las contraseñas no coinciden.'; errEl.style.display = 'block'; }
    return;
  }

  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if(!user){
    if(errEl){ errEl.textContent = 'No se encontró la sesión activa.'; errEl.style.display = 'block'; }
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if(submitBtn){
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando contraseña...';
  }

  try{
    const pwdHash = (typeof hashPassword === 'function') ? await hashPassword(newPass) : newPass;
    user.password = newPass;
    user.passwordHash = pwdHash;

    if(db.users[user.id]) db.users[user.id] = { ...db.users[user.id], password: newPass, passwordHash: pwdHash };
    if(user.email && db.users[user.email]) db.users[user.email] = { ...db.users[user.email], password: newPass, passwordHash: pwdHash };
    saveDB();

    // Actualizar en Supabase Auth si es posible
    if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
      const client = (typeof getActiveSupabaseClient === 'function') ? getActiveSupabaseClient() : null;
      if(client && client.auth){
        try{
          await client.auth.updateUser({ password: newPass });
        }catch(e){
          console.warn('Aviso actualizando auth en Supabase:', e);
        }
      }
    }

    closeModal();
    alert('✅ Tu contraseña ha sido actualizada con éxito. Úsala en tu próximo inicio de sesión.');
  }catch(err){
    if(errEl){
      errEl.textContent = err.message || 'Error al actualizar contraseña.';
      errEl.style.display = 'block';
    }
    if(submitBtn){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Nueva Contraseña →';
    }
  }
}

/* ---------- Modales y Menú Móvil ---------- */
function openModal(html){
  const b = document.getElementById('appModalBody');
  const m = document.getElementById('appModal');
  if(b && m){
    b.innerHTML = html;
    m.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}
function closeModal(){
  const m = document.getElementById('appModal');
  if(m) m.classList.remove('active');
  document.body.style.overflow = '';
}
function toggleSidebarMobile(){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if(sb && ov){
    const open = !sb.classList.contains('open');
    sb.classList.toggle('open', open);
    ov.classList.toggle('active', open);
  }
}
function closeSidebarMobile(){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if(sb && ov){
    sb.classList.remove('open');
    ov.classList.remove('active');
  }
}

/* ---------- Inicialización ---------- */
document.addEventListener('DOMContentLoaded', function(){
  renderAdminUserProfile();
  renderAdminSidebar();
  nav('inicio');

  const overlay = document.getElementById('appModal');
  if(overlay){
    overlay.addEventListener('click', function(e){ if(e.target === this) closeModal(); });
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ closeModal(); closeSidebarMobile(); }
  });
  window.addEventListener('resize', function(){ if(window.innerWidth > 992) closeSidebarMobile(); });
});

// Re-renderizar automáticamente cuando Supabase termine de sincronizar datos
window.addEventListener('naima:dbsynced', function(){
  renderAdminUserProfile();
  renderAdminSidebar();
  nav(currentSection);
});

/* ---------- GESTIÓN DE FOTO DE PERFIL DEL ORIENTADOR (ESTILO FACEBOOK) ---------- */
let tempAdminPhotoDataUrl = null;

function openAdminPhotoModal(){
  tempAdminPhotoDataUrl = null;
  const user = getCurrentUser() || {};
  let rawCurrentPhoto = user.photo || user.avatar_url || (db.users[user.id] && (db.users[user.id].photo || db.users[user.id].avatar_url)) || (db.users[user.email] && (db.users[user.email].photo || db.users[user.email].avatar_url)) || null;
  if(rawCurrentPhoto && typeof rawCurrentPhoto === 'string' && rawCurrentPhoto.trim().startsWith('{')){
    try{ rawCurrentPhoto = JSON.parse(rawCurrentPhoto).photo || null; }catch(e){}
  }
  const currentPhoto = rawCurrentPhoto;

  openModal(`
    <div class="photo-modal-card">
      <button class="close-x" onclick="closeModal()">✕</button>
      
      <div class="pm-header">
        <div class="pm-icon-wrap" style="background:#FDF2F4;border-color:#F5C6CB;color:var(--maroon);">🛡️</div>
        <div>
          <h3 style="margin:0;font-size:18px;color:var(--ink);">Foto de Perfil del Orientador</h3>
          <p style="margin:4px 0 0;font-size:13px;color:var(--ink-soft);line-height:1.45;">
            Sube tu foto real tal como en Facebook para personalizar tu perfil y credencial institucional en NAIMA OS.
          </p>
        </div>
      </div>

      <div class="pm-preview-container">
        <div class="pm-preview-circle" id="adminPhotoPreviewCircle">
          ${currentPhoto ? `
            <img src="${escapeHTML(currentPhoto)}" id="adminPhotoPreviewImg" alt="Foto de perfil actual">
          ` : `
            <div class="pm-placeholder-view" id="adminPhotoPlaceholderView">
              <span style="font-size:48px;">👤</span>
              <span style="font-size:12px;color:var(--ink-muted);margin-top:4px;">Sin foto seleccionada</span>
            </div>
          `}
        </div>
      </div>

      <div class="pm-actions-bar">
        <input type="file" id="adminPhotoFileInput" accept="image/png, image/jpeg, image/jpg, image/webp" style="display:none;" onchange="handleAdminPhotoFileChosen(event)">
        
        <button type="button" class="btn-maroon" onclick="document.getElementById('adminPhotoFileInput').click()" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <span>📁</span> Seleccionar foto de tu dispositivo
        </button>

        ${currentPhoto ? `
          <button type="button" class="btn-ghost" style="color:var(--danger);display:inline-flex;align-items:center;gap:4px;cursor:pointer;" onclick="deleteAdminProfilePhoto()">
            <span>🗑️</span> Quitar foto actual
          </button>
        ` : ''}
      </div>

      <div id="adminPhotoSaveSection" style="display:none;margin-top:22px;padding-top:16px;border-top:1px solid var(--line);">
        <div style="font-size:12.5px;color:var(--green);font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:6px;justify-content:center;">
          <span>✓</span> Vista previa lista. ¿Deseas guardar esta foto?
        </div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button type="button" class="btn-ghost" onclick="cancelAdminPhotoUpload()">Descartar</button>
          <button type="button" class="btn-maroon" id="btnConfirmAdminPhotoSave" onclick="saveAdminProfilePhoto()">
            Guardar como foto de perfil →
          </button>
        </div>
      </div>
    </div>
  `);
}

function handleAdminPhotoFileChosen(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;

  if(!file.type.startsWith('image/')){
    alert('Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP).');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt){
    const img = new Image();
    img.onload = function(){
      // Redimensionar y centrar en un canvas cuadrado max 400x400 para optimizar almacenamiento
      const targetSize = 400;
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
      tempAdminPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.88);

      // Actualizar vista previa en el modal
      const circleEl = document.getElementById('adminPhotoPreviewCircle');
      if(circleEl){
        circleEl.innerHTML = `<img src="${tempAdminPhotoDataUrl}" alt="Nueva foto de perfil">`;
      }
      const saveSec = document.getElementById('adminPhotoSaveSection');
      if(saveSec) saveSec.style.display = 'block';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function cancelAdminPhotoUpload(){
  tempAdminPhotoDataUrl = null;
  const user = getCurrentUser() || {};
  const currentPhoto = user.photo || user.avatar_url || (db.users[user.id] && (db.users[user.id].photo || db.users[user.id].avatar_url)) || (db.users[user.email] && (db.users[user.email].photo || db.users[user.email].avatar_url)) || null;
  const circleEl = document.getElementById('adminPhotoPreviewCircle');
  if(circleEl){
    if(currentPhoto){
      circleEl.innerHTML = `<img src="${escapeHTML(currentPhoto)}" alt="Foto de perfil actual">`;
    } else {
      circleEl.innerHTML = `
        <div class="pm-placeholder-view" id="adminPhotoPlaceholderView">
          <span style="font-size:48px;">👤</span>
          <span style="font-size:12px;color:var(--ink-muted);margin-top:4px;">Sin foto seleccionada</span>
        </div>
      `;
    }
  }
  const saveSec = document.getElementById('adminPhotoSaveSection');
  if(saveSec) saveSec.style.display = 'none';
}

async function saveAdminProfilePhoto(){
  if(!tempAdminPhotoDataUrl) return;
  const user = getCurrentUser() || {};
  const saveBtn = document.getElementById('btnConfirmAdminPhotoSave');
  if(saveBtn){
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando foto...';
  }

  // 1. Guardar localmente
  user.photo = tempAdminPhotoDataUrl;
  user.avatar_url = tempAdminPhotoDataUrl;

  if(user.id && db.users[user.id]){
    db.users[user.id].photo = tempAdminPhotoDataUrl;
    db.users[user.id].avatar_url = tempAdminPhotoDataUrl;
  }
  if(user.email && db.users[user.email]){
    db.users[user.email].photo = tempAdminPhotoDataUrl;
    db.users[user.email].avatar_url = tempAdminPhotoDataUrl;
  }
  saveDB();

  // Actualizar sesión activa
  if(typeof setSessionUser === 'function'){
    setSessionUser(user);
  }

  // 2. Sincronizar a Supabase si está en vivo
  if(isSupabaseLive()){
    try{
      const client = getActiveSupabaseClient();
      if(client){
        // Intentar actualizar en la tabla coordinadores
        try {
          await client.from('coordinadores').update({
            avatar_url: tempAdminPhotoDataUrl
          }).or(user.email ? `id.eq.${user.id || ''},email.eq.${user.email}` : `id.eq.${user.id}`);
        } catch(errC){
          console.warn('Aviso actualizando avatar_url en coordinadores:', errC);
        }

        // Intentar actualizar también en profiles si existe (preservando _auth_hash)
        if(user.email){
          try {
            const { data: profData } = await client.from('profiles').select('id,avatar_url').ilike('email', user.email).maybeSingle();
            let profConfig = {};
            if(profData && profData.avatar_url && typeof profData.avatar_url === 'string' && profData.avatar_url.trim().startsWith('{')){
              try{ profConfig = JSON.parse(profData.avatar_url); }catch(e){}
            }
            profConfig.photo = tempAdminPhotoDataUrl;
            if(profData){
              await client.from('profiles').update({ avatar_url: JSON.stringify(profConfig) }).eq('id', profData.id);
            }
          } catch(errP){}
        }
        console.log('✅ Foto de orientador sincronizada con Supabase');
      }
    }catch(err){
      console.warn('Aviso sincronizando foto con Supabase:', err);
    }
  }

  closeModal();
  renderAdminUserProfile();
  if(currentSection === 'equipo'){
    renderEquipoCoordinadores();
  }
}

async function deleteAdminProfilePhoto(){
  if(!confirm('¿Estás seguro de que deseas eliminar tu foto de perfil actual?')) return;
  const user = getCurrentUser() || {};

  delete user.photo;
  delete user.avatar_url;

  if(user.id && db.users[user.id]){
    delete db.users[user.id].photo;
    delete db.users[user.id].avatar_url;
  }
  if(user.email && db.users[user.email]){
    delete db.users[user.email].photo;
    delete db.users[user.email].avatar_url;
  }
  saveDB();

  if(typeof setSessionUser === 'function'){
    setSessionUser(user);
  }

  if(isSupabaseLive()){
    try{
      const client = getActiveSupabaseClient();
      if(client){
        try{
          await client.from('coordinadores').update({ avatar_url: null })
            .or(user.email ? `id.eq.${user.id || ''},email.eq.${user.email}` : `id.eq.${user.id}`);
        }catch(e){}
        if(user.email){
          try{
            const { data: profData } = await client.from('profiles').select('id,avatar_url').ilike('email', user.email).maybeSingle();
            let profConfig = {};
            if(profData && profData.avatar_url && typeof profData.avatar_url === 'string' && profData.avatar_url.trim().startsWith('{')){
              try{ profConfig = JSON.parse(profData.avatar_url); }catch(e){}
            }
            profConfig.photo = null;
            if(profData){
              await client.from('profiles').update({ avatar_url: JSON.stringify(profConfig) }).eq('id', profData.id);
            }
          }catch(e){}
        }
        console.log('✅ Foto de orientador eliminada en Supabase');
      }
    }catch(err){
      console.warn('Aviso eliminando foto en Supabase:', err);
    }
  }

  closeModal();
  renderAdminUserProfile();
  if(currentSection === 'equipo'){
    renderEquipoCoordinadores();
  }
}

/* ============================================================
   SECCIONES: PSICOLOGÍA ESCOLAR, AGENDA Y REPORTES OFICIALES (100% NATIVO)
   ============================================================ */

let adminPsicoSubTab = 'panorama'; // 'panorama' | 'expedientes' | 'agenda' | 'importar' | 'reportes'
let adminPsicoSearch = '';
let adminPsicoFilterStatus = '';
let adminPsicoFilterRisk = '';
let adminAgendaFilter = 'all'; // 'all' | 'today' | 'week' | 'pending' | 'completed'
let adminAgendaWeekOffset = 0; // 0 = semana actual
let pendingImportRows = [];
let pendingImportHeaders = [];

function getPsicoRisk(s){
  if(!s) return 'none';
  if(s.riesgo) return s.riesgo;
  if(s.tamizaje && s.tamizaje.resultados && s.tamizaje.resultados.riesgoGlobal){
    const r = s.tamizaje.resultados.riesgoGlobal.toLowerCase();
    if(r.includes('cris')) return 'crisis';
    if(r.includes('alt')) return 'high';
    if(r.includes('mod') || r.includes('med')) return 'mid';
    if(r.includes('baj')) return 'low';
  }
  if(s.prioridad === 'alto') return 'high';
  if(s.prioridad === 'medio') return 'mid';
  return 'none';
}

const PSICO_RISK_LABELS = {
  none: 'Sin riesgo',
  low: 'Riesgo bajo',
  mid: 'Riesgo moderado',
  high: 'Riesgo alto',
  crisis: 'Crisis / Urgente'
};

const PSICO_HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const PSICO_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function setAdminPsicoTab(tab){
  adminPsicoSubTab = tab;
  const container = document.getElementById('psicoContent');
  document.querySelectorAll('.psico-subnav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  if(container){
    container.innerHTML = renderAdminPsicoCurrentTab();
    if(tab === 'agenda') attachAgendaListeners();
    if(tab === 'importar') attachImportListeners();
  } else {
    const el = document.getElementById('content');
    if(el) el.innerHTML = renderAdminPsicologia();
  }
}

function renderAdminPsicologia(){
  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">DIRECCIÓN GENERAL · ÁREA DE PSICOLOGÍA ESCOLAR</span>
        <h1>Psicología Escolar & Orientación Clínica</h1>
        <p>Acompañamiento psicopedagógico, expedientes clínicos, agenda semanal de sesiones y reportes oficiales con membrete CONALEP.</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span class="demo-chip">CONALEP Mérida I</span>
        <button class="btn-maroon" onclick="openAddStudentModal()" style="font-size:12.5px;padding:8px 16px;">
          ＋ Nuevo Expediente
        </button>
      </div>
    </div>

    <!-- Barra de Subnavegación Nativa NAIMA OS -->
    <div class="psico-subnav-bar">
      <button class="psico-subnav-btn ${adminPsicoSubTab==='panorama'?'active':''}" data-tab="panorama" onclick="setAdminPsicoTab('panorama')">
        <span>◆</span> Panorama Clínico
      </button>
      <button class="psico-subnav-btn ${adminPsicoSubTab==='expedientes'?'active':''}" data-tab="expedientes" onclick="setAdminPsicoTab('expedientes')">
        <span>👤</span> Expedientes Clínicos
      </button>
      <button class="psico-subnav-btn ${adminPsicoSubTab==='agenda'?'active':''}" data-tab="agenda" onclick="setAdminPsicoTab('agenda')">
        <span>📅</span> Agenda & Citas
      </button>
      <button class="psico-subnav-btn ${adminPsicoSubTab==='importar'?'active':''}" data-tab="importar" onclick="setAdminPsicoTab('importar')">
        <span>📥</span> Importar Excel / CSV
      </button>
      <button class="psico-subnav-btn ${adminPsicoSubTab==='reportes'?'active':''}" data-tab="reportes" onclick="setAdminPsicoTab('reportes')">
        <span>📋</span> Reportes Oficiales
      </button>
    </div>

    <!-- Contenedor Dinámico del Submódulo -->
    <div id="psicoContent">
      ${renderAdminPsicoCurrentTab()}
    </div>
  `;
}

function renderAdminAgenda(){
  adminPsicoSubTab = 'agenda';
  return renderAdminPsicologia();
}

function renderAdminReportesOficiales(){
  adminPsicoSubTab = 'reportes';
  return renderAdminPsicologia();
}

function renderAdminPsicoCurrentTab(){
  if(adminPsicoSubTab === 'panorama') return renderPsicoPanorama();
  if(adminPsicoSubTab === 'expedientes') return renderPsicoExpedientes();
  if(adminPsicoSubTab === 'agenda') return renderPsicoAgenda();
  if(adminPsicoSubTab === 'importar') return renderPsicoImportar();
  if(adminPsicoSubTab === 'reportes') return renderPsicoReportes();
  return renderPsicoPanorama();
}

/* ============================================================
   SUBMÓDULO 1: PANORAMA CLÍNICO
   ============================================================ */
function renderPsicoPanorama(){
  const allStudents = studentsList();
  const total = allStudents.length;
  const activos = allStudents.filter(s => s.estado !== 'cerrado').length;
  const altoRiesgoList = allStudents.filter(s => {
    const r = getPsicoRisk(s);
    return r === 'high' || r === 'crisis';
  });
  const altoRiesgo = altoRiesgoList.length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const apts = db.appointments || [];
  const citasHoy = apts.filter(a => a.fecha === todayStr && a.estado !== 'Cancelada');
  const proximasCitas = apts.filter(a => a.fecha >= todayStr && a.estado !== 'Cancelada')
    .sort((a,b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .slice(0, 5);

  const riskCounts = { none: 0, low: 0, mid: 0, high: 0, crisis: 0 };
  allStudents.forEach(s => {
    const r = getPsicoRisk(s);
    if(riskCounts[r] !== undefined) riskCounts[r]++;
    else riskCounts.none++;
  });

  return `
    <div class="stat-grid" style="margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-icon" style="background:#F0FAF8;color:var(--green);">📁</div>
        <div class="stat-value" style="color:var(--ink);">${total}</div>
        <div class="stat-label">Total Expedientes</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#EBF3FA;color:#185FA5;">🎓</div>
        <div class="stat-value" style="color:var(--ink);">${activos}</div>
        <div class="stat-label">Alumnos Activos</div>
      </div>
      <div class="stat-card" style="${altoRiesgo > 0 ? 'border-color:var(--danger);' : ''}">
        <div class="stat-icon" style="background:#FDECEA;color:var(--danger);">⚠️</div>
        <div class="stat-value" style="color:${altoRiesgo > 0 ? 'var(--danger)' : 'var(--ink)'};">${altoRiesgo}</div>
        <div class="stat-label">Riesgo Alto / Crisis</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FFF9EB;color:#B47D0A;">📅</div>
        <div class="stat-value" style="color:var(--ink);">${citasHoy.length}</div>
        <div class="stat-label">Citas Programadas Hoy</div>
      </div>
    </div>

    <!-- Panel de Casos Prioritarios si existen -->
    ${altoRiesgo > 0 ? `
      <div class="card" style="border-left:4px solid var(--danger);margin-bottom:24px;background:#FFFDFD;">
        <div class="card-hdr" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div class="card-ttl" style="color:var(--danger);display:flex;align-items:center;gap:8px;">
            <span>🚨</span> Casos Prioritarios en Riesgo Alto o Crisis (${altoRiesgo})
          </div>
          <span style="font-size:12px;color:var(--danger);font-weight:600;">Atención Inmediata Requerida</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:12px;">
          ${altoRiesgoList.map(s => {
            const risk = getPsicoRisk(s);
            const photo = s.photo || s.avatar_url;
            return `
              <div style="background:#FFF;border:1px solid #F5C6CB;border-radius:8px;padding:12px;display:flex;align-items:center;gap:12px;">
                <div class="clinical-stu-avatar" style="width:40px;height:40px;font-size:14px;border-color:#F5C6CB;">
                  ${photo ? `<img src="${escapeHTML(photo)}" alt="Foto">` : initialOf(s.nombre)}
                </div>
                <div style="flex:1;min-width:0;">
                  <strong style="display:block;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${escapeHTML(s.nombre)}
                  </strong>
                  <div style="font-size:11px;color:var(--ink-soft);">${escapeHTML(s.carrera || '')} · ${s.matricula || s.id}</div>
                  <span class="risk-badge-native ${risk}" style="font-size:9.5px;padding:2px 7px;margin-top:4px;">
                    ${PSICO_RISK_LABELS[risk]}
                  </span>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <button class="btn-outline-maroon" style="padding:4px 8px;font-size:11px;" onclick="openClinicalDetailModal('${s.matricula || s.id}')">
                    Expediente
                  </button>
                  <button class="btn-maroon" style="padding:4px 8px;font-size:11px;" onclick="openAddAppointmentModal({ studentId: '${s.matricula || s.id}' })">
                    Cita
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:20px;margin-bottom:24px;">
      <!-- Próximas Citas -->
      <div class="card">
        <div class="card-hdr" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div class="card-ttl" style="font-size:15px;color:var(--ink);display:flex;align-items:center;gap:6px;">
            <span>📅</span> Próximas Citas de Orientación
          </div>
          <button class="btn-outline-maroon" style="font-size:11.5px;padding:5px 10px;" onclick="setAdminPsicoTab('agenda')">
            Ver agenda →
          </button>
        </div>

        ${proximasCitas.length ? proximasCitas.map(a => {
          const statusColor = a.estado === 'Confirmada' ? 'var(--green)' : (a.estado === 'Completada' ? '#185FA5' : '#B47D0A');
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);">
              <div style="width:8px;height:8px;border-radius:50%;background:${statusColor};flex-shrink:0;"></div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${escapeHTML(a.nombre || a.studentName || 'Estudiante')}
                </div>
                <div style="font-size:11px;color:var(--ink-soft);">
                  ${a.fecha} · ${a.hora} hrs · ${escapeHTML(a.tipo || 'Orientación')}
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="tag tg-gr" style="font-size:10px;">${escapeHTML(a.estado)}</span>
                <button class="btn-ghost" style="padding:4px 6px;font-size:11px;color:var(--green);" title="Marcar asistencia" onclick="quickMarkAttendance('${a.id}', true)">
                  ✓
                </button>
              </div>
            </div>
          `;
        }).join('') : `
          <div style="text-align:center;padding:32px 16px;color:var(--ink-muted);">
            <div style="font-size:28px;margin-bottom:6px;">📅</div>
            <p style="font-size:13px;">No hay citas programadas para hoy ni los próximos días.</p>
            <button class="btn-maroon" style="margin-top:10px;font-size:12px;padding:6px 14px;" onclick="openAddAppointmentModal()">
              ＋ Programar Nueva Cita
            </button>
          </div>
        `}
      </div>

      <!-- Distribución por Semáforo de Riesgo -->
      <div class="card">
        <div class="card-hdr" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div class="card-ttl" style="font-size:15px;color:var(--ink);display:flex;align-items:center;gap:6px;">
            <span>🎯</span> Distribución por Semáforo de Riesgo
          </div>
          <span style="font-size:11.5px;color:var(--ink-muted);">${total} evaluados</span>
        </div>

        ${total ? Object.keys(riskCounts).map(k => {
          const v = riskCounts[k];
          const pct = Math.round((v / (total || 1)) * 100);
          const barColor = k === 'none' ? '#1E7E34' : (k === 'low' ? '#007E67' : (k === 'mid' ? '#B47D0A' : (k === 'high' ? '#C0392B' : '#7A0F0F')));
          return `
            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px;">
                <span class="risk-badge-native ${k}">${PSICO_RISK_LABELS[k]}</span>
                <strong style="color:var(--ink);">${v} <span style="color:var(--ink-muted);font-weight:400;">(${pct}%)</span></strong>
              </div>
              <div style="height:7px;background:var(--sand);border-radius:4px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width .3s;"></div>
              </div>
            </div>
          `;
        }).join('') : `
          <div style="text-align:center;padding:30px;color:var(--ink-muted);">
            Sin expedientes registrados para generar estadísticas.
          </div>
        `}
      </div>
    </div>

    <!-- Expedientes Recientes -->
    <div class="card">
      <div class="card-hdr" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div class="card-ttl" style="font-size:15px;color:var(--ink);display:flex;align-items:center;gap:6px;">
          <span>👤</span> Expedientes Recientes
        </div>
        <button class="btn-outline-maroon" style="font-size:11.5px;padding:5px 12px;" onclick="setAdminPsicoTab('expedientes')">
          Ver todos los expedientes (${total}) →
        </button>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;">
        ${allStudents.slice(-5).reverse().map(s => {
          const risk = getPsicoRisk(s);
          const photo = s.photo || s.avatar_url;
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:#FFF;">
              <div class="clinical-stu-avatar" style="width:38px;height:38px;font-size:14px;">
                ${photo ? `<img src="${escapeHTML(photo)}" alt="Foto">` : initialOf(s.nombre)}
              </div>
              <div style="flex:1;min-width:0;">
                <strong style="font-size:13.5px;color:var(--ink);">${escapeHTML(s.nombre)}</strong>
                <div style="font-size:11.5px;color:var(--ink-soft);">${escapeHTML(s.carrera || '')} · Matrícula: ${s.matricula || s.id}</div>
              </div>
              <span class="risk-badge-native ${risk}">${PSICO_RISK_LABELS[risk]}</span>
              <button class="btn-outline-maroon" style="padding:5px 12px;font-size:12px;" onclick="openClinicalDetailModal('${s.matricula || s.id}')">
                Expediente
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/* ============================================================
   SUBMÓDULO 2: EXPEDIENTES CLÍNICOS
   ============================================================ */
function renderPsicoExpedientes(){
  const allStudents = studentsList();
  const q = (adminPsicoSearch || '').toLowerCase().trim();
  const fest = adminPsicoFilterStatus || '';
  const frisk = adminPsicoFilterRisk || '';

  const filtered = allStudents.filter(s => {
    const risk = getPsicoRisk(s);
    const mQ = !q || [s.nombre, s.matricula, s.id, s.carrera, s.curp, s.diagnostico, s.dx].some(v => v && v.toLowerCase().includes(q));
    const mEst = !fest || (s.estado || 'activo') === fest;
    const mRisk = !frisk || risk === frisk;
    return mQ && mEst && mRisk;
  });

  return `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-hdr" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="card-ttl" style="font-size:16px;color:var(--ink);">
            👤 Expedientes Estudiantiles & Clínicos (${filtered.length} de ${allStudents.length})
          </div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">
            Historial de notas evolutivas, impresiones diagnósticas y valoraciones del riesgo.
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-maroon" onclick="openAddStudentModal()" style="font-size:12px;padding:7px 14px;">
            ＋ Nuevo Expediente
          </button>
          <button class="btn-outline-maroon" onclick="setAdminPsicoTab('importar')" style="font-size:12px;padding:7px 14px;">
            📥 Importar Excel / CSV
          </button>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:16px;">
        <input type="text" id="inpPsicoSearch" placeholder="🔍 Buscar por nombre, matrícula, carrera, diagnóstico…"
               value="${escapeHTML(adminPsicoSearch)}"
               oninput="adminPsicoSearch=this.value; renderPsicoExpedientesList();"
               style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:12.5px;">

        <select id="selPsicoFilterStatus" onchange="adminPsicoFilterStatus=this.value; renderPsicoExpedientesList();"
                style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:12.5px;">
          <option value="" ${fest===''?'selected':''}>Todos los estados</option>
          <option value="activo" ${fest==='activo'?'selected':''}>Activo</option>
          <option value="seguimiento" ${fest==='seguimiento'?'selected':''}>En Seguimiento</option>
          <option value="cerrado" ${fest==='cerrado'?'selected':''}>Cerrado</option>
        </select>

        <select id="selPsicoFilterRisk" onchange="adminPsicoFilterRisk=this.value; renderPsicoExpedientesList();"
                style="padding:8px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:12.5px;">
          <option value="" ${frisk===''?'selected':''}>Todos los niveles de riesgo</option>
          <option value="none" ${frisk==='none'?'selected':''}>Sin riesgo</option>
          <option value="low" ${frisk==='low'?'selected':''}>Riesgo bajo</option>
          <option value="mid" ${frisk==='mid'?'selected':''}>Riesgo moderado</option>
          <option value="high" ${frisk==='high'?'selected':''}>Riesgo alto</option>
          <option value="crisis" ${frisk==='crisis'?'selected':''}>Crisis</option>
        </select>
      </div>

      <div id="psicoExpedientesListContainer">
        ${renderPsicoExpedientesCards(filtered)}
      </div>
    </div>
  `;
}

function renderPsicoExpedientesList(){
  const container = document.getElementById('psicoExpedientesListContainer');
  if(!container) return;
  const allStudents = studentsList();
  const q = (adminPsicoSearch || '').toLowerCase().trim();
  const fest = adminPsicoFilterStatus || '';
  const frisk = adminPsicoFilterRisk || '';

  const filtered = allStudents.filter(s => {
    const risk = getPsicoRisk(s);
    const mQ = !q || [s.nombre, s.matricula, s.id, s.carrera, s.curp, s.diagnostico, s.dx].some(v => v && v.toLowerCase().includes(q));
    const mEst = !fest || (s.estado || 'activo') === fest;
    const mRisk = !frisk || risk === frisk;
    return mQ && mEst && mRisk;
  });

  container.innerHTML = renderPsicoExpedientesCards(filtered);
}

function renderPsicoExpedientesCards(list){
  if(!list.length){
    return `
      <div style="text-align:center;padding:40px 16px;color:var(--ink-muted);">
        <div style="font-size:32px;margin-bottom:8px;">🔍</div>
        <h3>No se encontraron expedientes con los criterios seleccionados</h3>
        <p style="font-size:13px;margin-top:4px;">Intenta cambiar el término de búsqueda o limpia los filtros.</p>
      </div>
    `;
  }

  const allApts = db.appointments || [];

  return list.map(s => {
    const risk = getPsicoRisk(s);
    const stripColor = risk === 'none' ? '#1E7E34' : (risk === 'low' ? '#007E67' : (risk === 'mid' ? '#B47D0A' : (risk === 'high' ? '#C0392B' : '#7A0F0F')));
    const photo = s.photo || s.avatar_url;
    const aptsCount = allApts.filter(a => a.studentId === (s.matricula || s.id)).length;
    const notasCount = (s.notas || []).length;

    return `
      <div class="clinical-stu-card">
        <div class="clinical-stu-strip" style="background:${stripColor};"></div>
        <div class="clinical-stu-body">
          <div class="clinical-stu-avatar">
            ${photo ? `<img src="${escapeHTML(photo)}" alt="Foto">` : initialOf(s.nombre)}
          </div>
          <div class="clinical-stu-info">
            <div class="clinical-stu-name">${escapeHTML(s.nombre)}</div>
            <div class="clinical-stu-sub">
              ${escapeHTML(s.carrera || 'Técnico')} · ${s.semestre ? s.semestre + ' Sem' : ''} ${s.grupo ? 'Grupo ' + s.grupo : ''} · Matrícula: <strong>${s.matricula || s.id}</strong>
            </div>
            <div class="clinical-stu-tags">
              <span class="risk-badge-native ${risk}">${PSICO_RISK_LABELS[risk]}</span>
              <span class="tag tg-az">${escapeHTML(s.estado || 'activo')}</span>
              ${s.diagnostico || s.dx ? `<span class="tag tg-gr">🩺 ${escapeHTML(s.diagnostico || s.dx)}</span>` : ''}
              <span class="tag tg-gr">📅 ${aptsCount} cita${aptsCount!==1?'s':''}</span>
              <span class="tag tg-gr">📝 ${notasCount} nota${notasCount!==1?'s':''}</span>
            </div>
          </div>
          <div class="clinical-stu-actions">
            <button class="btn-maroon" style="padding:6px 12px;font-size:12px;" onclick="openClinicalDetailModal('${s.matricula || s.id}')">
              👤 Expediente
            </button>
            <button class="btn-outline-maroon" style="padding:6px 12px;font-size:12px;" onclick="openCreateOfficialReportModal('${s.matricula || s.id}')">
              📋 Reporte Folio
            </button>
            <button class="btn-outline-maroon" style="padding:6px 10px;font-size:12px;" onclick="openAddAppointmentModal({ studentId: '${s.matricula || s.id}' })" title="Programar cita">
              📅 Cita
            </button>
            <button class="btn-ghost" style="padding:6px 8px;font-size:13px;" onclick="openEditStudent('${s.matricula || s.id}')" title="Editar estudiante">
              ✏️
            </button>
            <button class="btn-ghost" style="padding:6px 8px;font-size:13px;color:var(--danger);" onclick="deleteStudentPsico('${s.matricula || s.id}')" title="Eliminar expediente">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* Modal Detalle de Expediente Clínico */
function openClinicalDetailModal(id){
  const s = db.students[id] || Object.values(db.students || {}).find(x => x.matricula === id || x.id === id);
  if(!s){
    alert('Expediente no encontrado');
    return;
  }

  const risk = getPsicoRisk(s);
  const photo = s.photo || s.avatar_url;
  const notas = (s.notas || []).slice().reverse();
  const apts = (db.appointments || []).filter(a => a.studentId === (s.matricula || s.id))
    .sort((a,b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));

  openModal(`
    <div style="max-width:850px;width:100%;">
      <button class="close-x" onclick="closeModal()">✕</button>

      <div style="display:flex;align-items:flex-start;gap:16px;border-bottom:1.5px solid var(--line);padding-bottom:18px;margin-bottom:18px;flex-wrap:wrap;">
        <div class="clinical-stu-avatar" style="width:58px;height:58px;font-size:22px;">
          ${photo ? `<img src="${escapeHTML(photo)}" alt="Foto">` : initialOf(s.nombre)}
        </div>
        <div style="flex:1;min-width:240px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <h2 style="margin:0;font-size:20px;color:var(--ink);">${escapeHTML(s.nombre)}</h2>
            <span class="risk-badge-native ${risk}">${PSICO_RISK_LABELS[risk]}</span>
          </div>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">
            ${escapeHTML(s.carrera || 'Técnico')} · ${s.semestre || ''} ${s.grupo || ''} · Matrícula: <strong>${s.matricula || s.id}</strong> · Turno: ${s.turno || 'Matutino'}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-maroon" style="padding:7px 14px;font-size:12px;" onclick="openAddNoteModal('${s.matricula || s.id}')">
            📝 + Nueva Nota
          </button>
          <button class="btn-outline-maroon" style="padding:7px 14px;font-size:12px;" onclick="openAddAppointmentModal({ studentId: '${s.matricula || s.id}' })">
            📅 + Agendar Cita
          </button>
          <button class="btn-outline-maroon" style="padding:7px 14px;font-size:12px;" onclick="openCreateOfficialReportModal('${s.matricula || s.id}')">
            📋 Reporte Oficial
          </button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:20px;">
        <!-- Ficha de Identificación -->
        <div style="background:#FAF8F5;border:1px solid var(--line);border-radius:8px;padding:16px;">
          <h4 style="margin:0 0 10px;font-size:13px;color:var(--maroon);text-transform:uppercase;letter-spacing:.05em;">
            👤 Ficha de Identificación
          </h4>
          <div style="font-size:12px;display:flex;flex-direction:column;gap:6px;">
            <div><strong>CURP:</strong> ${escapeHTML(s.curp || '—')}</div>
            <div><strong>Edad:</strong> ${s.edad ? s.edad + ' años' : '—'} · <strong>Sexo:</strong> ${s.sexo || '—'}</div>
            <div><strong>Teléfono:</strong> ${escapeHTML(s.telefono || s.tel || '—')}</div>
            <div><strong>Correo:</strong> ${escapeHTML(s.correo || s.email || '—')}</div>
            <div style="border-top:1px dashed var(--line);padding-top:6px;margin-top:2px;">
              <strong>Tutor Legal:</strong> ${escapeHTML(s.tutor || 'Por registrar')} (${escapeHTML(s.tel_tutor || s.tutor_tel || 'Sin teléfono')})
            </div>
            <div><strong>Motivo Inicial:</strong> ${escapeHTML(s.motivo || 'Ingreso general / Detección oportuna')}</div>
          </div>

          <!-- Modificar Semáforo de Riesgo Directamente -->
          <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:10px;">
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;text-transform:uppercase;">
              Actualizar Nivel de Riesgo Clínico:
            </label>
            <select style="width:100%;padding:6px 10px;border-radius:6px;border:1.5px solid var(--line);font-size:12px;"
                    onchange="updateStudentRiskDirectly('${s.matricula || s.id}', this.value)">
              <option value="none" ${risk==='none'?'selected':''}>Sin riesgo</option>
              <option value="low" ${risk==='low'?'selected':''}>Riesgo bajo</option>
              <option value="mid" ${risk==='mid'?'selected':''}>Riesgo moderado</option>
              <option value="high" ${risk==='high'?'selected':''}>Riesgo alto</option>
              <option value="crisis" ${risk==='crisis'?'selected':''}>Crisis / Urgente</option>
            </select>
          </div>
        </div>

        <!-- Impresión Diagnóstica -->
        <div style="background:#FAF8F5;border:1px solid var(--line);border-radius:8px;padding:16px;">
          <h4 style="margin:0 0 10px;font-size:13px;color:var(--maroon);text-transform:uppercase;letter-spacing:.05em;">
            🩺 Impresión Diagnóstica & Seguimiento
          </h4>
          <textarea id="diagText_${s.matricula || s.id}" style="width:100%;height:110px;padding:8px 10px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;resize:vertical;" placeholder="Escribe aquí la hipótesis diagnóstica, CIE-11 o acuerdos generales…">${escapeHTML(s.diagnostico || s.dx || '')}</textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <button class="btn-maroon" style="padding:6px 14px;font-size:11.5px;" onclick="saveStudentDiagnosis('${s.matricula || s.id}')">
              Guardar Diagnóstico
            </button>
          </div>
        </div>
      </div>

      <!-- Línea de Tiempo de Notas Evolutivas -->
      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3 style="margin:0;font-size:15px;color:var(--ink);">
            📝 Notas Evolutivas Cronológicas (${notas.length})
          </h3>
          <button class="btn-maroon" style="padding:5px 12px;font-size:11.5px;" onclick="openAddNoteModal('${s.matricula || s.id}')">
            ＋ Nueva Nota Evolutiva
          </button>
        </div>

        <div class="clinical-note-timeline">
          ${notas.length ? notas.map(n => `
            <div class="cnt-item">
              <div class="cnt-dot"></div>
              <div class="cnt-body">
                <div class="cnt-meta">
                  ${n.fecha || 'Reciente'} · <strong>${escapeHTML(n.tipo || 'Sesión Individual')}</strong> · Sesión #${n.sesion || '1'} ${n.orientador ? '· ' + escapeHTML(n.orientador) : ''}
                </div>
                <div class="cnt-text">${escapeHTML(n.texto || '')}</div>
                ${n.dx_update ? `
                  <div style="margin-top:6px;font-size:11.5px;color:var(--maroon);font-weight:600;">
                    → Actualización diagnóstica: ${escapeHTML(n.dx_update)}
                  </div>
                ` : ''}
                ${n.acuerdos ? `
                  <div style="margin-top:4px;font-size:11.5px;color:var(--green);font-weight:600;">
                    ✓ Acuerdos: ${escapeHTML(n.acuerdos)}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('') : `
            <div style="text-align:center;padding:24px;color:var(--ink-muted);background:#FAF8F5;border-radius:8px;">
              No hay notas evolutivas registradas en este expediente. Haz clic en "+ Nueva Nota Evolutiva" para registrar la primera.
            </div>
          `}
        </div>
      </div>

      <!-- Historial de Citas del Alumno -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3 style="margin:0;font-size:15px;color:var(--ink);">
            📅 Historial de Citas y Sesiones (${apts.length})
          </h3>
          <button class="btn-outline-maroon" style="padding:5px 12px;font-size:11.5px;" onclick="openAddAppointmentModal({ studentId: '${s.matricula || s.id}' })">
            ＋ Agendar Cita
          </button>
        </div>

        ${apts.length ? apts.map(a => `
          <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border:1px solid var(--line);border-radius:6px;margin-bottom:6px;background:#FFF;">
            <div class="mono" style="font-size:11px;font-weight:700;color:var(--maroon);">${a.fecha} ${a.hora}</div>
            <div style="flex:1;font-size:12px;color:var(--ink);">${escapeHTML(a.tipo || 'Orientación')}</div>
            <span class="tag ${a.estado==='Completada'?'tg-g':(a.estado==='Cancelada'?'tg-r':'tg-a')}">${escapeHTML(a.estado)}</span>
            <div style="display:flex;gap:4px;">
              <button class="btn-ghost" style="padding:2px 6px;font-size:11px;color:var(--green);" onclick="quickMarkAttendance('${a.id}', true)">✓ Asistió</button>
              <button class="btn-ghost" style="padding:2px 6px;font-size:11px;color:var(--danger);" onclick="quickMarkAttendance('${a.id}', false)">✕ No asistió</button>
            </div>
          </div>
        `).join('') : `
          <div style="font-size:12.5px;color:var(--ink-muted);padding:12px 0;">Sin citas registradas para este estudiante.</div>
        `}
      </div>
    </div>
  `);
}

function updateStudentRiskDirectly(studentId, newRisk){
  const s = db.students[studentId] || Object.values(db.students || {}).find(x => x.matricula === studentId || x.id === studentId);
  if(!s) return;
  s.riesgo = newRisk;
  saveDB();
  alert('Nivel de riesgo actualizado con éxito.');
  openClinicalDetailModal(studentId);
  if(adminPsicoSubTab === 'expedientes') renderPsicoExpedientesList();
}

function saveStudentDiagnosis(studentId){
  const s = db.students[studentId] || Object.values(db.students || {}).find(x => x.matricula === studentId || x.id === studentId);
  const textEl = document.getElementById('diagText_' + studentId);
  if(!s || !textEl) return;
  s.diagnostico = textEl.value.trim();
  s.dx = s.diagnostico;
  saveDB();
  alert('Impresión diagnóstica guardada con éxito.');
}

function deleteStudentPsico(studentId){
  const s = db.students[studentId] || Object.values(db.students || {}).find(x => x.matricula === studentId || x.id === studentId);
  const name = s ? s.nombre : studentId;
  if(!confirm(`¿Estás seguro de eliminar el expediente de "${name}"? Esta acción no se puede deshacer.`)) return;

  delete db.students[studentId];
  if(s && s.matricula && db.students[s.matricula]) delete db.students[s.matricula];
  saveDB();
  alert('Expediente eliminado con éxito.');
  setAdminPsicoTab('expedientes');
}

/* Modal Nueva Nota Evolutiva */
function openAddNoteModal(studentId){
  const s = db.students[studentId] || Object.values(db.students || {}).find(x => x.matricula === studentId || x.id === studentId);
  if(!s) return;
  const user = getCurrentUser() || {};
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextSesNum = ((s.notas || []).length || 0) + 1;

  openModal(`
    <div style="max-width:550px;width:100%;">
      <button class="close-x" onclick="openClinicalDetailModal('${studentId}')">✕</button>
      <h3 style="margin:0 0 6px;color:var(--ink);">📝 Registrar Nueva Nota Evolutiva</h3>
      <p style="margin:0 0 16px;font-size:12.5px;color:var(--ink-soft);">
        Alumno: <strong>${escapeHTML(s.nombre)}</strong> (${s.matricula || s.id})
      </p>

      <form onsubmit="handleSaveClinicalNote(event, '${studentId}')">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Fecha de la Sesión *</label>
            <input type="date" id="noteFecha" value="${todayStr}" required style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Número de Sesión *</label>
            <input type="number" id="noteSesion" value="${nextSesNum}" min="1" required style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Tipo de Intervención</label>
            <select id="noteTipo" style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
              <option>Sesión Individual de Orientación</option>
              <option>Intervención en Crisis / Emergencia</option>
              <option>Seguimiento Emocional</option>
              <option>Reunión con Tutor / Padres de Familia</option>
              <option>Canalización Externa (Salud Mental)</option>
              <option>Tutoría Académica de Apoyo</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Orientador Responsable</label>
            <input type="text" id="noteOrientador" value="${escapeHTML(user.nombre || user.display || 'Orientador Educativo')}" required style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Evolución Clínica & Observaciones del Proceso *</label>
          <textarea id="noteTexto" rows="4" required placeholder="Describe el estado anímico, temas abordados, respuestas conductuales y evolución del estudiante..." style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;resize:vertical;"></textarea>
        </div>

        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Acuerdos y Tareas Terapéuticas / Escolares</label>
          <input type="text" id="noteAcuerdos" placeholder="Ej. Asistir a talleres de respiración, entregar reporte académico el viernes..." style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
          <button type="button" class="btn-ghost" onclick="openClinicalDetailModal('${studentId}')">Cancelar</button>
          <button type="submit" class="btn-maroon">Guardar Nota Evolutiva →</button>
        </div>
      </form>
    </div>
  `);
}

function handleSaveClinicalNote(e, studentId){
  e.preventDefault();
  const s = db.students[studentId] || Object.values(db.students || {}).find(x => x.matricula === studentId || x.id === studentId);
  if(!s) return;

  if(!s.notas) s.notas = [];
  const newNote = {
    id: 'note_' + Date.now(),
    fecha: document.getElementById('noteFecha').value,
    sesion: parseInt(document.getElementById('noteSesion').value, 10) || (s.notas.length + 1),
    tipo: document.getElementById('noteTipo').value,
    orientador: document.getElementById('noteOrientador').value.trim(),
    texto: document.getElementById('noteTexto').value.trim(),
    acuerdos: document.getElementById('noteAcuerdos').value.trim(),
    created_at: new Date().toISOString()
  };

  s.notas.push(newNote);
  saveDB();
  alert('Nota evolutiva registrada exitosamente.');
  openClinicalDetailModal(studentId);
}

/* ============================================================
   SUBMÓDULO 3: AGENDA SEMANAL & CITAS
   ============================================================ */
function renderPsicoAgenda(){
  const apts = db.appointments || [];
  const todayStr = new Date().toISOString().slice(0, 10);

  // Calcular fechas de la semana seleccionada (Lunes a Viernes)
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + (adminAgendaWeekOffset * 7));
  const currentDayOfWeek = baseDate.getDay(); // 0 domingo, 1 lunes...
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + mondayOffset);

  const weekDates = [];
  for(let i = 0; i < 5; i++){
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push({
      dayName: PSICO_DAYS[i],
      dateStr: d.toISOString().slice(0, 10),
      displayDate: d.toLocaleDateString('es-MX', { day:'2-digit', month:'short' })
    });
  }

  const weekTitle = `Semana del ${weekDates[0].displayDate} al ${weekDates[4].displayDate}`;

  // Filtrado de citas para la lista inferior
  let filteredApts = apts.slice().sort((a,b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  if(adminAgendaFilter === 'today'){
    filteredApts = filteredApts.filter(a => a.fecha === todayStr);
  } else if(adminAgendaFilter === 'week'){
    const wStart = weekDates[0].dateStr;
    const wEnd = weekDates[4].dateStr;
    filteredApts = filteredApts.filter(a => a.fecha >= wStart && a.fecha <= wEnd);
  } else if(adminAgendaFilter === 'pending'){
    filteredApts = filteredApts.filter(a => a.estado === 'Programada' || a.estado === 'Confirmada');
  } else if(adminAgendaFilter === 'completed'){
    filteredApts = filteredApts.filter(a => a.estado === 'Completada');
  }

  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="card-hdr" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="card-ttl" style="font-size:16px;color:var(--ink);display:flex;align-items:center;gap:8px;">
            <span>📅</span> Agenda Semanal & Disponibilidad de Cubículo
          </div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">
            Cubículo 1 de Orientación Educativa · Lunes a Viernes de 08:00 a 16:00 hrs.
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-maroon" onclick="openAddAppointmentModal()" style="font-size:12px;padding:7px 16px;">
            ＋ Agendar Nueva Cita
          </button>
        </div>
      </div>

      <!-- Barra de Navegación de Semana -->
      <div style="display:flex;align-items:center;justify-content:space-between;background:#FAF8F5;border:1px solid var(--line);border-radius:8px;padding:10px 16px;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;gap:6px;">
          <button class="btn-ghost" style="padding:6px 12px;font-size:12px;" onclick="changeAgendaWeek(-1)">
            ◀ Anterior
          </button>
          <button class="btn-ghost" style="padding:6px 12px;font-size:12px;" onclick="adminAgendaWeekOffset=0; setAdminPsicoTab('agenda');">
            Semana Actual
          </button>
          <button class="btn-ghost" style="padding:6px 12px;font-size:12px;" onclick="changeAgendaWeek(1)">
            Siguiente ▶
          </button>
        </div>
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;color:var(--maroon);">
          ${weekTitle}
        </div>
      </div>

      <!-- Cuadrícula Semanal Interactiva -->
      <div style="overflow-x:auto;">
        <table class="avail-grid-table">
          <thead>
            <tr>
              <th style="width:80px;">Hora</th>
              ${weekDates.map(w => `
                <th>
                  <div>${w.dayName}</div>
                  <div style="font-size:10px;font-weight:400;opacity:0.9;">${w.displayDate}</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${PSICO_HOURS.map(h => `
              <tr>
                <td style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--ink-soft);background:#FAF8F5;">
                  ${h}
                </td>
                ${weekDates.map(w => {
                  const matchApt = apts.find(a => a.fecha === w.dateStr && a.hora === h && a.estado !== 'Cancelada');
                  if(matchApt){
                    return `
                      <td>
                        <div class="avail-slot-native busy" onclick="openAptDetailModal('${matchApt.id}')" title="${escapeHTML(matchApt.studentName || matchApt.nombre)}: ${escapeHTML(matchApt.tipo || 'Cita')}">
                          <div style="font-size:10.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHTML(matchApt.studentName || matchApt.nombre || 'Ocupado')}
                          </div>
                          <div style="font-size:9.5px;opacity:0.85;">${matchApt.estado}</div>
                        </div>
                      </td>
                    `;
                  } else {
                    return `
                      <td>
                        <div class="avail-slot-native free" onclick="openAddAppointmentModal({ fecha: '${w.dateStr}', hora: '${h}' })" title="Clic para agendar sesión">
                          ＋ Libre
                        </div>
                      </td>
                    `;
                  }
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Lista de Citas con Filtros y Asistencia Directa -->
    <div class="card">
      <div class="card-hdr" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div class="card-ttl" style="font-size:15px;color:var(--ink);">
          📋 Listado General de Sesiones (${filteredApts.length})
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn-ghost ${adminAgendaFilter==='all'?'active':''}" style="padding:4px 10px;font-size:11.5px;" onclick="adminAgendaFilter='all'; setAdminPsicoTab('agenda');">
            Todas
          </button>
          <button class="btn-ghost ${adminAgendaFilter==='today'?'active':''}" style="padding:4px 10px;font-size:11.5px;" onclick="adminAgendaFilter='today'; setAdminPsicoTab('agenda');">
            Hoy
          </button>
          <button class="btn-ghost ${adminAgendaFilter==='week'?'active':''}" style="padding:4px 10px;font-size:11.5px;" onclick="adminAgendaFilter='week'; setAdminPsicoTab('agenda');">
            Esta Semana
          </button>
          <button class="btn-ghost ${adminAgendaFilter==='pending'?'active':''}" style="padding:4px 10px;font-size:11.5px;" onclick="adminAgendaFilter='pending'; setAdminPsicoTab('agenda');">
            Pendientes
          </button>
          <button class="btn-ghost ${adminAgendaFilter==='completed'?'active':''}" style="padding:4px 10px;font-size:11.5px;" onclick="adminAgendaFilter='completed'; setAdminPsicoTab('agenda');">
            Completadas
          </button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;">
        ${filteredApts.length ? filteredApts.map(a => {
          const isDone = a.estado === 'Completada';
          const isMiss = a.estado === 'No asistió';
          const isCancel = a.estado === 'Cancelada';
          const dotColor = isDone ? 'var(--green)' : (isMiss ? 'var(--danger)' : (isCancel ? 'gray' : '#B47D0A'));

          return `
            <div class="apt-card-native">
              <div class="apt-status-indicator" style="background:${dotColor};"></div>
              <div class="apt-time-badge">
                <div>${a.fecha}</div>
                <div style="font-size:14px;font-weight:700;">${a.hora}</div>
              </div>
              <div style="flex:1;min-width:200px;">
                <div style="font-size:14px;font-weight:700;color:var(--ink);">
                  ${escapeHTML(a.studentName || a.nombre || 'Estudiante')}
                </div>
                <div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">
                  ${escapeHTML(a.tipo || 'Orientación General')} · Modalidad: ${escapeHTML(a.modalidad || 'Cubículo Presencial')}
                </div>
                ${a.motivo ? `
                  <div style="font-size:11.5px;color:var(--ink-muted);font-style:italic;margin-top:2px;">
                    "${escapeHTML(a.motivo)}"
                  </div>
                ` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span class="tag ${isDone?'tg-g':(isMiss?'tg-r':'tg-a')}">${escapeHTML(a.estado)}</span>
                <button class="btn-ghost" style="padding:5px 10px;font-size:11.5px;color:var(--green);font-weight:700;" onclick="quickMarkAttendance('${a.id}', true)">
                  ✓ Asistió
                </button>
                <button class="btn-ghost" style="padding:5px 10px;font-size:11.5px;color:var(--danger);" onclick="quickMarkAttendance('${a.id}', false)">
                  ✕ No asistió
                </button>
                <button class="btn-ghost" style="padding:5px 8px;font-size:12px;color:var(--danger);" onclick="deleteAppointmentPsico('${a.id}')" title="Eliminar cita">
                  🗑️
                </button>
              </div>
            </div>
          `;
        }).join('') : `
          <div style="text-align:center;padding:32px 16px;color:var(--ink-muted);">
            No hay citas registradas con el filtro seleccionado.
          </div>
        `}
      </div>
    </div>
  `;
}

function changeAgendaWeek(offset){
  adminAgendaWeekOffset += offset;
  setAdminPsicoTab('agenda');
}

function attachAgendaListeners(){}

/* Modal para Agendar Cita */
function openAddAppointmentModal(prefill){
  prefill = prefill || {};
  const allStudents = studentsList();
  const todayStr = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser() || {};

  openModal(`
    <div style="max-width:540px;width:100%;">
      <button class="close-x" onclick="closeModal()">✕</button>
      <h3 style="margin:0 0 6px;color:var(--ink);">📅 Programar Cita de Orientación</h3>
      <p style="margin:0 0 16px;font-size:12.5px;color:var(--ink-soft);">
        Asigna un espacio en el cubículo de atención psicopedagógica CONALEP Mérida 1.
      </p>

      <form onsubmit="handleSaveAppointment(event)">
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Estudiante *</label>
          <select id="aptStudentSel" required style="width:100%;padding:8px 10px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
            <option value="">Selecciona un alumno…</option>
            ${allStudents.map(s => `
              <option value="${s.matricula || s.id}" ${(prefill.studentId && (s.matricula===prefill.studentId || s.id===prefill.studentId)) ? 'selected' : ''}>
                ${escapeHTML(s.nombre)} (${s.matricula || s.id}) · ${escapeHTML(s.carrera || '')}
              </option>
            `).join('')}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Fecha *</label>
            <input type="date" id="aptFecha" value="${prefill.fecha || todayStr}" required style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Hora de Inicio *</label>
            <select id="aptHora" required style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
              ${PSICO_HOURS.map(h => `
                <option value="${h}" ${prefill.hora===h?'selected':''}>${h} hrs</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Tipo de Sesión</label>
            <select id="aptTipo" style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
              <option>Orientación Inicial</option>
              <option>Seguimiento Emocional</option>
              <option>Intervención en Crisis</option>
              <option>Reunión con Tutor / Padres</option>
              <option>Tutoría Académica</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Modalidad</label>
            <select id="aptModalidad" style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
              <option>Cubículo Presencial Mérida 1</option>
              <option>Virtual / Videollamada</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Motivo o Asunto a Tratar</label>
          <textarea id="aptMotivo" rows="3" placeholder="Motivo de la cita, acuerdos o notas preparatorias…" style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;resize:vertical;"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
          <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn-maroon">Agendar Cita →</button>
        </div>
      </form>
    </div>
  `);
}

function handleSaveAppointment(e){
  e.preventDefault();
  const studentId = document.getElementById('aptStudentSel').value;
  const s = db.students[studentId] || Object.values(db.students || {}).find(x => x.matricula === studentId || x.id === studentId);
  if(!s){
    alert('Por favor selecciona un estudiante válido.');
    return;
  }

  const user = getCurrentUser() || {};
  if(!db.appointments) db.appointments = [];

  const newApt = {
    id: 'apt_' + Date.now(),
    studentId: s.matricula || s.id,
    studentName: s.nombre,
    nombre: s.nombre,
    fecha: document.getElementById('aptFecha').value,
    hora: document.getElementById('aptHora').value,
    tipo: document.getElementById('aptTipo').value,
    modalidad: document.getElementById('aptModalidad').value,
    motivo: document.getElementById('aptMotivo').value.trim(),
    estado: 'Programada',
    orientador: user.nombre || user.display || 'Orientador Educativo',
    created_at: new Date().toISOString()
  };

  db.appointments.push(newApt);
  saveDB();
  closeModal();
  alert('Cita agendada exitosamente.');
  setAdminPsicoTab('agenda');
}

function quickMarkAttendance(aptId, attended){
  if(!db.appointments) return;
  const apt = db.appointments.find(a => a.id === aptId);
  if(!apt) return;
  apt.asistio = attended;
  apt.estado = attended ? 'Completada' : 'No asistió';
  saveDB();
  setAdminPsicoTab(adminPsicoSubTab);
}

function deleteAppointmentPsico(aptId){
  if(!confirm('¿Deseas eliminar esta cita de la agenda?')) return;
  db.appointments = (db.appointments || []).filter(a => a.id !== aptId);
  saveDB();
  setAdminPsicoTab('agenda');
}

/* ============================================================
   SUBMÓDULO 4: IMPORTADOR MASIVO EXCEL / CSV CON SHEETJS
   ============================================================ */
const COL_ALIASES = {
  nombre:     ['nombre','nombre completo','alumno','estudiante','nombres','nombre(s)','alumnos'],
  matricula:  ['matricula','mat','control','no control','num control','id','expediente','no. control'],
  carrera:    ['carrera','carrera tecnica','especialidad','programa','carrera técnica'],
  semestre:   ['semestre','sem','grado','nivel'],
  grupo:      ['grupo','grp','gpo','seccion','salón','salon'],
  turno:      ['turno','horario'],
  telefono:   ['telefono','tel','celular','movil','teléfono','cel'],
  correo:     ['correo','email','correo institucional','correo electronico','e-mail','mail'],
  tutor:      ['tutor','padre','madre','tutor legal','responsable','familiar'],
  tel_tutor:  ['tel tutor','telefono tutor','tel_tutor','tel. tutor','contacto tutor'],
  diagnostico:['diagnostico','dx','diagnóstico','motivo','impresion','observaciones'],
  riesgo:     ['riesgo','nivel riesgo','semaforo','semáforo','prioridad']
};

function buildHeaderMap(headers){
  const map = {};
  headers.forEach(h => {
    const clean = String(h).toLowerCase().trim().replace(/[\._\-]/g,' ');
    for(const [canonical, aliases] of Object.entries(COL_ALIASES)){
      if(aliases.some(a => clean === a || clean.includes(a))){
        if(!map[canonical]) map[canonical] = h;
      }
    }
  });
  return map;
}

function getColValue(row, canonical, map){
  const originalHeader = map[canonical];
  if(!originalHeader) return '';
  return String(row[originalHeader] || '').trim();
}

function renderPsicoImportar(){
  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="card-hdr" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="card-ttl" style="font-size:16px;color:var(--ink);display:flex;align-items:center;gap:8px;">
            <span>📥</span> Importador Masivo de Estudiantes (Excel / CSV)
          </div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">
            Carga listas grupales en formato .xlsx o .csv con detección inteligente de columnas.
          </p>
        </div>
        <button class="btn-outline-maroon" onclick="downloadExcelTemplate()" style="font-size:12px;padding:7px 14px;">
          📄 Descargar Plantilla Excel (.xlsx)
        </button>
      </div>

      <!-- Zona Drag & Drop -->
      <div class="upload-zone-native" id="nativeUploadZone" onclick="document.getElementById('nativeExcelInput').click()">
        <input type="file" id="nativeExcelInput" accept=".xlsx, .xls, .csv" style="display:none;" onchange="handleExcelFileSelected(event)">
        <div style="font-size:42px;margin-bottom:8px;">📊</div>
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:15px;color:var(--maroon);">
          Arrastra tu archivo Excel (.xlsx) o CSV aquí
        </div>
        <div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">
          o haz clic para examinar archivos de tu dispositivo
        </div>
        <div style="font-size:11px;color:var(--ink-muted);margin-top:8px;">
          Compatible con encabezados oficiales CONALEP Mérida 1
        </div>
      </div>

      <!-- Contenedor de Vista Previa de Datos -->
      <div id="importPreviewArea" style="display:none;margin-top:24px;"></div>
    </div>
  `;
}

function attachImportListeners(){
  const zone = document.getElementById('nativeUploadZone');
  if(!zone) return;

  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.remove('over'); });
  });
  zone.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    if(dt && dt.files && dt.files.length){
      processExcelFile(dt.files[0]);
    }
  });
}

function handleExcelFileSelected(e){
  const file = e.target.files && e.target.files[0];
  if(file) processExcelFile(file);
}

function processExcelFile(file){
  if(typeof XLSX === 'undefined'){
    alert('Librería SheetJS (XLSX) cargando. Por favor reintenta en un momento.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt){
    try{
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if(!rows.length){
        alert('El archivo no contiene filas de datos.');
        return;
      }

      pendingImportRows = rows;
      pendingImportHeaders = Object.keys(rows[0] || {});
      renderImportPreviewTable();
    }catch(err){
      console.error(err);
      alert('Error procesando archivo Excel: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderImportPreviewTable(){
  const container = document.getElementById('importPreviewArea');
  if(!container) return;

  const hmap = buildHeaderMap(pendingImportHeaders);
  const totalRows = pendingImportRows.length;
  const previewSlice = pendingImportRows.slice(0, 8);

  container.style.display = 'block';
  container.innerHTML = `
    <div style="border-top:1.5px solid var(--line);padding-top:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="margin:0;font-size:16px;color:var(--ink);">
            ✓ Vista Previa de Datos Detectados (${totalRows} filas)
          </h3>
          <p style="margin:2px 0 0;font-size:12.5px;color:var(--ink-soft);">
            Verifica que las columnas coincidan correctamente antes de aplicar a la base de datos.
          </p>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn-ghost" onclick="cancelExcelImport()">Descartar</button>
          <button class="btn-maroon" onclick="confirmExcelImport()">
            📥 Confirmar e Importar Alumnos (${totalRows}) →
          </button>
        </div>
      </div>

      <div class="proto-table-wrap" style="max-height:300px;overflow-y:auto;border:1px solid var(--line);border-radius:8px;">
        <table class="proto-table" style="font-size:12px;">
          <thead>
            <tr>
              <th>Nombre del Estudiante</th>
              <th>Matrícula</th>
              <th>Carrera</th>
              <th>Sem / Grupo</th>
              <th>Teléfono</th>
              <th>Tutor Legal</th>
              <th>Nivel de Riesgo</th>
            </tr>
          </thead>
          <tbody>
            ${previewSlice.map(r => {
              const nom = getColValue(r, 'nombre', hmap) || '(Sin nombre)';
              const mat = getColValue(r, 'matricula', hmap) || '—';
              const car = getColValue(r, 'carrera', hmap) || '—';
              const sem = getColValue(r, 'semestre', hmap);
              const grp = getColValue(r, 'grupo', hmap);
              const tel = getColValue(r, 'telefono', hmap) || '—';
              const tut = getColValue(r, 'tutor', hmap) || '—';
              let rsk = getColValue(r, 'riesgo', hmap).toLowerCase();
              if(rsk.includes('alt') || rsk.includes('cris')) rsk = 'high';
              else if(rsk.includes('mod') || rsk.includes('med')) rsk = 'mid';
              else if(rsk.includes('baj')) rsk = 'low';
              else rsk = 'none';

              return `
                <tr>
                  <td><strong>${escapeHTML(nom)}</strong></td>
                  <td class="mono">${escapeHTML(mat)}</td>
                  <td>${escapeHTML(car)}</td>
                  <td>${escapeHTML(sem)} ${escapeHTML(grp)}</td>
                  <td>${escapeHTML(tel)}</td>
                  <td>${escapeHTML(tut)}</td>
                  <td><span class="risk-badge-native ${rsk}">${PSICO_RISK_LABELS[rsk]}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${totalRows > 8 ? `
        <div style="font-size:11.5px;color:var(--ink-muted);margin-top:6px;text-align:right;">
          Mostrando primeras 8 de ${totalRows} filas.
        </div>
      ` : ''}
    </div>
  `;
}

function cancelExcelImport(){
  pendingImportRows = [];
  pendingImportHeaders = [];
  const container = document.getElementById('importPreviewArea');
  if(container) container.style.display = 'none';
}

function confirmExcelImport(){
  if(!pendingImportRows.length) return;
  const hmap = buildHeaderMap(pendingImportHeaders);
  let added = 0;
  let updated = 0;

  if(!db.students) db.students = {};

  pendingImportRows.forEach(row => {
    const nombre = getColValue(row, 'nombre', hmap);
    if(!nombre || nombre.length < 2) return;

    let mat = getColValue(row, 'matricula', hmap);
    if(!mat){
      mat = 'PTB-' + Math.floor(Math.random() * 89999 + 10000);
    }

    const carrera = getColValue(row, 'carrera', hmap) || 'Técnico en Informática';
    const semestre = getColValue(row, 'semestre', hmap) || '4°';
    const grupo = getColValue(row, 'grupo', hmap) || '402';
    const turno = getColValue(row, 'turno', hmap) || 'Matutino';
    const telefono = getColValue(row, 'telefono', hmap);
    const email = getColValue(row, 'correo', hmap) || (mat.toLowerCase() + '@conalepmex.edu.mx');
    const tutor = getColValue(row, 'tutor', hmap);
    const tel_tutor = getColValue(row, 'tel_tutor', hmap);
    const diagnostico = getColValue(row, 'diagnostico', hmap);

    let riesgoRaw = (getColValue(row, 'riesgo', hmap) || 'none').toLowerCase();
    let riesgo = 'none';
    if(riesgoRaw.includes('cris')) riesgo = 'crisis';
    else if(riesgoRaw.includes('alt') || riesgoRaw.includes('high')) riesgo = 'high';
    else if(riesgoRaw.includes('med') || riesgoRaw.includes('mod')) riesgo = 'mid';
    else if(riesgoRaw.includes('baj') || riesgoRaw.includes('low')) riesgo = 'low';

    // Verificar si ya existe por matrícula o nombre
    let existing = db.students[mat] || Object.values(db.students).find(s => s.nombre.toLowerCase() === nombre.toLowerCase());

    if(existing){
      existing.nombre = nombre;
      existing.carrera = carrera;
      existing.semestre = semestre;
      existing.grupo = grupo;
      existing.turno = turno;
      if(telefono) existing.telefono = telefono;
      if(email) existing.email = email;
      if(tutor) existing.tutor = tutor;
      if(tel_tutor) existing.tel_tutor = tel_tutor;
      if(diagnostico) existing.diagnostico = diagnostico;
      if(riesgo !== 'none') existing.riesgo = riesgo;
      updated++;
    } else {
      db.students[mat] = {
        id: mat,
        matricula: mat,
        nombre: nombre,
        carrera: carrera,
        semestre: semestre,
        grupo: grupo,
        turno: turno,
        telefono: telefono,
        email: email,
        tutor: tutor,
        tel_tutor: tel_tutor,
        diagnostico: diagnostico,
        dx: diagnostico,
        riesgo: riesgo,
        estado: 'activo',
        notas: [],
        created_at: new Date().toISOString()
      };
      added++;
    }
  });

  saveDB();
  alert(`✓ Importación completada: ${added} nuevos estudiantes agregados y ${updated} actualizados.`);
  cancelExcelImport();
  setAdminPsicoTab('expedientes');
}

function downloadExcelTemplate(){
  if(typeof XLSX === 'undefined'){
    alert('Cargando librería XLSX...');
    return;
  }
  const headers = [['nombre', 'matricula', 'carrera', 'semestre', 'grupo', 'turno', 'telefono', 'correo', 'tutor', 'tel_tutor', 'diagnostico', 'riesgo']];
  const example = [
    ['García López Juan', 'PTB-26101', 'Técnico en Informática', '4°', '402', 'Matutino', '9991234567', 'juan@gmail.com', 'García Pedro', '9997654321', 'Ansiedad ante exámenes', 'bajo'],
    ['Pérez Chan Mariana', 'PTB-26102', 'Técnico en Enfermería General', '4°', '401', 'Matutino', '9992345678', 'mariana@gmail.com', 'Chan Rosa', '9998765432', 'Apoyo psicopedagógico', 'sin riesgo']
  ];
  const ws = XLSX.utils.aoa_to_sheet(headers.concat(example));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
  XLSX.writeFile(wb, 'Plantilla_CONALEP_Alumnos.xlsx');
}

/* ============================================================
   SUBMÓDULO 5: REPORTES OFICIALES CON FOLIO
   ============================================================ */
function renderPsicoReportes(){
  const allDocs = (typeof getAllDocuments === 'function') ? getAllDocuments() : (db.documents || []);

  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="card-hdr" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="card-ttl" style="font-size:16px;color:var(--ink);display:flex;align-items:center;gap:8px;">
            <span>📋</span> Expedientes Clínicos & Formatos Oficiales CONALEP
          </div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">
            Generación y resguardo de reportes de evaluación psicológica con membrete oficial y folio institucional MER1.
          </p>
        </div>
        <button class="btn-maroon" onclick="openCreateOfficialReportModal()" style="font-size:12.5px;padding:8px 16px;">
          ＋ Elaborar Nuevo Reporte Oficial (Folio) ↗
        </button>
      </div>

      <div class="pioe-banner" style="margin-bottom:20px;">
        <div class="pioe-banner-body">
          <span class="pioe-banner-tag">Documento Oficial CONALEP</span>
          <p class="pioe-banner-desc">
            El formato oficial incluye membrete institucional del Plantel Mérida 1, folio automatizado, evaluación de 6 áreas del desarrollo, valoración del riesgo y firmas oficiales.
          </p>
        </div>
      </div>

      <div class="proto-table-wrap">
        <table class="proto-table">
          <thead>
            <tr>
              <th>Alumno / Matrícula</th>
              <th>Título del Reporte</th>
              <th>Folio / Categoría</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${allDocs.length ? allDocs.map(d => `
              <tr>
                <td>
                  <strong style="color:var(--ink);">${escapeHTML(d.studentName || d.studentId)}</strong>
                  <div class="mono" style="font-size:11.5px;color:var(--ink-soft);">${d.studentId}</div>
                </td>
                <td><strong>${escapeHTML(d.title)}</strong></td>
                <td><span class="doc-type-badge">${d.folio || d.file_type || 'Reporte'}</span></td>
                <td><span style="font-size:12px;color:var(--ink-soft);">${d.created_at ? new Date(d.created_at).toLocaleDateString('es-MX') : (d.date || 'Reciente')}</span></td>
                <td style="text-align:right;">
                  <button class="btn-outline-maroon" style="padding:5px 12px;font-size:12px;" onclick="printOfficialReportView('${d.id}')">
                    🖨️ Ver / Imprimir
                  </button>
                  <button class="btn-ghost" style="padding:5px 8px;font-size:12px;color:var(--danger);" onclick="deleteOfficialReport('${d.id}')" title="Eliminar reporte">
                    🗑️
                  </button>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5" style="text-align:center;padding:32px;color:var(--ink-soft);">
                  No hay reportes elaborados todavía. Haz clic en "Elaborar Nuevo Reporte Oficial" para generar el primero.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* Modal Generador de Reporte Oficial con Folio */
function openCreateOfficialReportModal(prefillStudentId){
  const allStudents = studentsList();
  const user = getCurrentUser() || {};
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = Math.floor(100 + Math.random() * 900);
  const generatedFolio = `MER1-${yy}${mm}-${seq}`;

  openModal(`
    <div style="max-width:820px;width:100%;max-height:85vh;overflow-y:auto;">
      <button class="close-x" onclick="closeModal()">✕</button>

      <div style="border-bottom:2px solid var(--maroon);padding-bottom:12px;margin-bottom:16px;">
        <span class="eyebrow" style="color:var(--maroon);">FORMATO INSTITUCIONAL OFICIAL</span>
        <h2 style="margin:2px 0 0;font-size:18px;color:var(--ink);">Elaboración de Reporte Psicológico Escolar</h2>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:700;color:var(--maroon);margin-top:4px;">
          FOLIO ASIGNADO: ${generatedFolio}
        </div>
      </div>

      <form onsubmit="handleSaveOfficialReport(event, '${generatedFolio}')">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Seleccionar Estudiante *</label>
            <select id="repStudentSel" required style="width:100%;padding:8px 10px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
              <option value="">Selecciona un alumno…</option>
              ${allStudents.map(s => `
                <option value="${s.matricula || s.id}" ${(prefillStudentId && (s.matricula===prefillStudentId || s.id===prefillStudentId)) ? 'selected' : ''}>
                  ${escapeHTML(s.nombre)} (${s.matricula || s.id}) · ${escapeHTML(s.carrera || '')}
                </option>
              `).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Fecha de Evaluación *</label>
            <input type="date" id="repFecha" value="${todayStr}" required style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Orientador(a) / Psicólogo Evaluador *</label>
            <input type="text" id="repOrientador" value="${escapeHTML(user.nombre || user.display || 'Orientador Educativo')}" required style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Cédula Profesional</label>
            <input type="text" id="repCedula" placeholder="Ej. 12345678" style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Título del Reporte *</label>
          <input type="text" id="repTitulo" value="Reporte de Evaluación Psicopedagógica y Conductual" required style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
        </div>

        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Motivo de Consulta o Referencia *</label>
          <textarea id="repMotivo" rows="2" required placeholder="Motivo de la referencia o solicitud de intervención psicopedagógica..." style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;resize:vertical;">Canalización por orientación educativa ante indicadores de estrés escolar y bajo rendimiento.</textarea>
        </div>

        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Instrumentos y Técnicas Aplicadas</label>
          <input type="text" id="repInstrumentos" value="Entrevista Clínica Semiestructurada, Tamizaje PIOE (PHQ-A, GAD-7), Observación Conductual" style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Área Personal y Emocional</label>
            <textarea id="repAreaPersonal" rows="3" placeholder="Estado afectivo, autorregulación emocional, autoimagen..." style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12px;resize:vertical;">El estudiante presenta adecuada disposición al diálogo, reportando periodos de sobrecarga y tensión ante evaluaciones.</textarea>
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Área Familiar y Red de Apoyo</label>
            <textarea id="repAreaFamiliar" rows="3" placeholder="Dinámica familiar, comunicación con tutores..." style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12px;resize:vertical;">Comunicación abierta con tutor legal, se mantiene seguimiento continuo en casa.</textarea>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Impresión Diagnóstica (CIE-11)</label>
            <input type="text" id="repDiagnostico" value="Reacción al estrés no especificada / Acompañamiento psicopedagógico" style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Valoración del Nivel de Riesgo *</label>
            <select id="repRiesgo" style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;">
              <option value="none">Sin riesgo</option>
              <option value="low" selected>Riesgo bajo (preventivo)</option>
              <option value="mid">Riesgo moderado</option>
              <option value="high">Riesgo alto</option>
              <option value="crisis">Crisis / Urgente</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:11px;font-weight:700;color:var(--ink-soft);margin-bottom:4px;">Recomendaciones y Plan de Acompañamiento *</label>
          <textarea id="repRecomendaciones" rows="3" required placeholder="Estrategias psicopedagógicas, acuerdos escolares y fechas de revisión..." style="width:100%;padding:8px;border-radius:6px;border:1.5px solid var(--line);font-size:12.5px;resize:vertical;">1. Continuar con sesiones quincenales de seguimiento emocional en cubículo de orientación.
2. Coordinación con docentes titulares para balancear entregas de proyectos.
3. Notificar a tutor legal los avances al término del periodo parcial.</textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn-maroon">
            💾 Guardar y Generar Reporte con Membrete →
          </button>
        </div>
      </form>
    </div>
  `);
}

function handleSaveOfficialReport(e, folio){
  e.preventDefault();
  const studentId = document.getElementById('repStudentSel').value;
  const s = db.students[studentId] || Object.values(db.students || {}).find(x => x.matricula === studentId || x.id === studentId);
  if(!s){
    alert('Por favor selecciona un estudiante.');
    return;
  }

  const newDoc = {
    id: 'doc_' + Date.now(),
    studentId: s.matricula || s.id,
    studentName: s.nombre,
    matricula: s.matricula || s.id,
    carrera: s.carrera,
    semestre: s.semestre,
    grupo: s.grupo,
    folio: folio,
    file_type: 'Reporte Oficial',
    title: document.getElementById('repTitulo').value.trim(),
    fecha: document.getElementById('repFecha').value,
    orientador: document.getElementById('repOrientador').value.trim(),
    cedula: document.getElementById('repCedula').value.trim(),
    motivo: document.getElementById('repMotivo').value.trim(),
    instrumentos: document.getElementById('repInstrumentos').value.trim(),
    areaPersonal: document.getElementById('repAreaPersonal').value.trim(),
    areaFamiliar: document.getElementById('repAreaFamiliar').value.trim(),
    diagnostico: document.getElementById('repDiagnostico').value.trim(),
    riesgo: document.getElementById('repRiesgo').value,
    recomendaciones: document.getElementById('repRecomendaciones').value.trim(),
    created_at: new Date().toISOString()
  };

  if(!db.documents) db.documents = [];
  db.documents.unshift(newDoc);
  saveDB();
  closeModal();
  alert(`✓ Reporte generado con éxito bajo el folio ${folio}.`);
  setAdminPsicoTab('reportes');
  printOfficialReportView(newDoc.id);
}

function deleteOfficialReport(docId){
  if(!confirm('¿Deseas eliminar este reporte oficial?')) return;
  db.documents = (db.documents || []).filter(d => d.id !== docId);
  saveDB();
  setAdminPsicoTab('reportes');
}

function printOfficialReportView(docId){
  const allDocs = (typeof getAllDocuments === 'function') ? getAllDocuments() : (db.documents || []);
  const doc = allDocs.find(d => d.id === docId);
  if(!doc){
    alert('Reporte no encontrado');
    return;
  }

  const s = db.students[doc.studentId] || Object.values(db.students || {}).find(x => x.matricula === doc.studentId || x.id === doc.studentId) || {};

  const printWindow = window.open('', '_blank');
  if(!printWindow){
    alert('Por favor permite ventanas emergentes para ver e imprimir el reporte.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte Oficial — ${doc.folio || 'CONALEP'}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: letter portrait;
          margin: 10mm 15mm 10mm 15mm;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1A1A1A;
          background: #FFF;
          font-size: 11.5px;
          line-height: 1.45;
          height: 100%;
        }
        .sheet {
          max-width: 820px;
          margin: 0 auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          min-height: 258mm;
          padding: 20px 24px;
        }
        .hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2.5px double #7E1C3E;
          padding-bottom: 10px;
        }
        .hdr-title { font-size: 14.5px; font-weight: 800; color: #7E1C3E; text-transform: uppercase; font-family:'Space Grotesk',sans-serif; }
        .hdr-sub { font-size: 10.5px; font-weight: 700; color: #333; margin-top: 2px; }
        .hdr-inst { font-size: 9.5px; color: #666; margin-top: 2px; }
        .folio-box { font-family: 'IBM Plex Mono',monospace; font-size: 10.5px; background: #FAF8F5; border: 1px solid #E2DDD5; padding: 6px 12px; border-radius: 4px; text-align: right; font-weight: 700; color: #7E1C3E; flex-shrink: 0; }
        
        .sec-title {
          font-size: 11px;
          font-weight: 800;
          color: #7E1C3E;
          text-transform: uppercase;
          letter-spacing: .03em;
          border-bottom: 1.5px solid #F0ECE1;
          padding-bottom: 3px;
          margin-bottom: 5px;
          font-family:'Space Grotesk',sans-serif;
        }
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 20px;
          font-size: 11.5px;
          background: #FAFAFA;
          border: 1px solid #ECE7DD;
          border-radius: 4px;
          padding: 8px 14px;
        }
        .item-lbl { font-size: 9.5px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: .02em; }
        .item-val { font-size: 12px; color: #111; font-weight: 600; margin-top: 1px; }

        .p-block {
          background: #FAF8F5;
          border: 1px solid #ECE7DD;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 11px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .sigs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          text-align: center;
        }
        .sig-line {
          border-top: 1.5px solid #222;
          margin-top: 36px;
          padding-top: 4px;
          font-size: 11px;
          font-weight: 700;
        }
        .sig-role { font-size: 10px; color: #444; margin-top: 2px; }
        .sig-sub { font-size: 9px; color: #777; margin-top: 2px; }

        .doc-footer {
          border-top: 1px dashed #DDD;
          padding-top: 7px;
          display: flex;
          justify-content: space-between;
          font-size: 8.5px;
          color: #888;
        }

        @media print {
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #FFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            min-height: 258mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="max-width:820px;margin:0 auto 12px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:700;color:#7E1C3E;">Vista Oficial CONALEP Mérida 1 (Formato Carta)</span>
        <button onclick="window.print()" style="background:#7E1C3E;color:#FFF;border:none;padding:8px 18px;border-radius:6px;font-size:12.5px;font-weight:700;cursor:pointer;">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <div class="sheet">
        <div class="hdr">
          <div>
            <div class="hdr-title">Colegio de Educación Profesional Técnica del Estado de Yucatán</div>
            <div class="hdr-sub">Plantel Mérida 1 · Departamento de Orientación Educativa & Tutorías</div>
            <div class="hdr-inst">Sistema Integral de Psicología Escolar · NAIMA OS</div>
          </div>
          <div class="folio-box">
            FOLIO OFICIAL<br>
            <span style="font-size:11px;">${doc.folio || 'MER1-OFIC'}</span>
          </div>
        </div>

        <div>
          <div class="sec-title">1. Datos del Estudiante</div>
          <div class="grid2">
            <div><div class="item-lbl">Nombre del Alumno:</div><div class="item-val">${escapeHTML(doc.studentName || s.nombre || '—')}</div></div>
            <div><div class="item-lbl">Matrícula Escolar:</div><div class="item-val">${escapeHTML(doc.matricula || s.matricula || doc.studentId)}</div></div>
            <div><div class="item-lbl">Carrera Técnica:</div><div class="item-val">${escapeHTML(doc.carrera || s.carrera || 'Técnico')}</div></div>
            <div><div class="item-lbl">Semestre / Grupo:</div><div class="item-val">${doc.semestre || s.semestre || '—'} · ${doc.grupo || s.grupo || '—'}</div></div>
            <div><div class="item-lbl">Fecha de Emisión:</div><div class="item-val">${doc.fecha || 'Reciente'}</div></div>
            <div><div class="item-lbl">Nivel de Riesgo Evaluado:</div><div class="item-val" style="color:#7E1C3E;">${PSICO_RISL_LABELS[doc.riesgo] || PSICO_RISK_LABELS[doc.riesgo] || doc.riesgo || 'Bajo'}</div></div>
          </div>
        </div>

        <div>
          <div class="sec-title">2. Motivo de Evaluación</div>
          <div class="p-block">${escapeHTML(doc.motivo || 'Evaluación psicopedagógica y seguimiento oportuno')}</div>
        </div>

        <div>
          <div class="sec-title">3. Instrumentos Aplicados</div>
          <div class="p-block">${escapeHTML(doc.instrumentos || 'Entrevista clínica y cuestionario PIOE')}</div>
        </div>

        <div>
          <div class="sec-title">4. Evaluación de Áreas del Desarrollo</div>
          <div class="grid2">
            <div>
              <div class="item-lbl">Área Personal y Emocional:</div>
              <div style="font-size:11px;margin-top:2px;">${escapeHTML(doc.areaPersonal || 'Adecuada regulación afectiva y disposición al acompañamiento.')}</div>
            </div>
            <div>
              <div class="item-lbl">Área Familiar y Contextual:</div>
              <div style="font-size:11px;margin-top:2px;">${escapeHTML(doc.areaFamiliar || 'Red de apoyo familiar presente.')}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="sec-title">5. Impresión Diagnóstica</div>
          <div class="p-block"><strong>Diagnóstico (CIE-11):</strong> ${escapeHTML(doc.diagnostico || 'En proceso de seguimiento')}</div>
        </div>

        <div>
          <div class="sec-title">6. Recomendaciones y Plan de Acompañamiento</div>
          <div class="p-block">${escapeHTML(doc.recomendaciones || 'Seguimiento psicopedagógico en el cubículo de orientación institucional.')}</div>
        </div>

        <div class="sigs">
          <div>
            <div class="sig-line">${escapeHTML(doc.orientador || 'Orientador Educativo')}</div>
            <div class="sig-role">Orientador(a) Institucional</div>
            <div class="sig-sub">Cédula: ${escapeHTML(doc.cedula || 'En trámite')} · Sello Oficial PIOE Mérida 1</div>
          </div>
          <div>
            <div class="sig-line">${escapeHTML(doc.studentName || s.nombre || 'Estudiante')}</div>
            <div class="sig-role">Firma del Estudiante / Tutor Legal</div>
            <div class="sig-sub">Enterado y de Conformidad · CONALEP Mérida 1</div>
          </div>
        </div>

        <div class="doc-footer">
          <span>Sistema Integral de Orientación Educativa y Tutorías (PIOE) · Plantel Mérida 1</span>
          <span>Expediente clínico-psicopedagógico institucional confidencial</span>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

