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

let protoestrellasTab = 'mis_alumnos';

function setProtoTab(tab){
  protoestrellasTab = tab;
  const el = document.getElementById('content');
  if(el) el.innerHTML = renderProtoestrellas();
}

/* ---------- VISTA: ESTUDIANTES ---------- */
function renderProtoestrellas(){
  const user = getCurrentUser();
  const allStudents = studentsList();
  const myStudents = myStudentsList();
  const isMine = protoestrellasTab === 'mis_alumnos';
  const list = isMine ? myStudents : allStudents;

  const rows = list.map(s => {
    const isAssignedToCurrent = isStudentAssignedToMe(s, user);
    return `
    <tr>
      <td class="pt-name">
        ${s.nombre}
        ${isAssignedToCurrent ? '<span style="color:var(--green);font-size:11px;font-weight:700;margin-left:6px;">(Tu estudiante)</span>' : ''}
        ${s.tamizaje ? `<span class="badge-tamizaje ${(s.tamizaje.resultados && s.tamizaje.resultados.riesgoGlobal) || 'bajo'}" style="margin-left:6px;" title="Tamizaje PIOE realizado">🩺 ${(s.tamizaje.resultados && s.tamizaje.resultados.riesgoGlobal ? s.tamizaje.resultados.riesgoGlobal.toUpperCase() : 'PIOE')}</span>` : ''}
      </td>
      <td class="pt-mat mono">${s.matricula}</td>
      <td>${s.grupo} · ${s.carrera || 'Sin carrera'}</td>
      <td>
        <span style="font-weight:${isAssignedToCurrent ? '700' : '400'};">
          ${s.guardian || 'Por asignar'}
        </span>
      </td>
      <td class="pt-action" style="white-space:nowrap;">
        <button class="btn-outline-maroon" onclick="openStudentModal('${s.matricula}')">Abrir expediente</button>
        <a href="reporte-psicologico.html?matricula=${encodeURIComponent(s.matricula)}" target="_blank" class="btn-outline-maroon" style="padding:6px 10px;font-size:12px;margin-left:4px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Generar Reporte Psicológico Oficial">📋 Reporte</a>
      </td>
    </tr>`;
  }).join('');

  const emptyState = `
    <tr class="proto-empty-row">
      <td colspan="5">
        <div class="proto-empty" style="padding:36px 20px;text-align:center;">
          <div class="pe-icon" style="font-size:28px;margin-bottom:8px;">✦</div>
          <h3 style="margin:0 0 6px 0;font-size:16px;">
            ${isMine ? 'No tienes estudiantes asignados todavía' : 'Aún no hay estudiantes registrados'}
          </h3>
          <p style="color:var(--ink-soft);max-width:500px;margin:0 auto 16px auto;font-size:13px;line-height:1.5;">
            ${isMine 
              ? `En cuanto los estudiantes se registren y seleccionen a <strong>${escapeHTML(user.nombre)}</strong> como su orientador, aparecerán aquí para gestionar sus expedientes.` 
              : 'Puedes registrar un nuevo expediente para comenzar a darle seguimiento.'}
          </p>
          <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
            ${isMine && allStudents.length > 0 ? `
              <button class="btn-outline-maroon" onclick="setProtoTab('todos')">
                Ver los ${allStudents.length} estudiantes del plantel →
              </button>
            ` : ''}
            <a href="psicologia-escolar.html#tab-importar" class="btn-outline-maroon" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;text-decoration:none;background:#FFF;display:inline-flex;align-items:center;gap:6px;">📥 Importar Excel / CSV</a>
            <button class="btn-maroon" onclick="quickNuevaProtoestrella()">+ Nuevo Estudiante</button>
          </div>
        </div>
      </td>
    </tr>`;

  return `
  <div class="page-head">
    <div>
      <h1>Estudiantes</h1>
      <p>Una persona, un expediente, una historia acompañada en CONALEP.</p>
    </div>
  </div>

  <div class="proto-banner">
    <div class="pb-body">
      <span class="pb-tag">Expediente Único Digital</span>
      <p class="pb-desc">Los datos se capturan una sola vez y alimentan todos los flujos autorizados.</p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="psicologia-escolar.html#tab-importar" class="btn-outline-maroon" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;text-decoration:none;background:#FFF;display:inline-flex;align-items:center;gap:6px;">📥 Importar Excel / CSV</a>
      <a href="psicologia-escolar.html#tab-agenda" class="btn-outline-maroon" style="padding:8px 14px;border-radius:8px;font-size:12.5px;font-weight:700;text-decoration:none;background:#FFF;display:inline-flex;align-items:center;gap:6px;">📅 Agenda de Citas</a>
      <button class="btn-maroon" onclick="quickNuevaProtoestrella()">+ Nuevo Estudiante</button>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:20px 0 14px;">
    <h2 class="proto-community-title" style="margin:0;">Comunidad Estudiantil</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn-outline-maroon" style="padding:6px 14px;border-radius:100px;font-size:12.5px;font-weight:600;background:${isMine ? 'var(--maroon)' : '#FFF'};color:${isMine ? '#FFF' : 'var(--maroon)'};border-color:var(--maroon);" onclick="setProtoTab('mis_alumnos')">
        📌 Mis Estudiantes Asignados (${myStudents.length})
      </button>
      <button class="btn-outline-maroon" style="padding:6px 14px;border-radius:100px;font-size:12.5px;font-weight:600;background:${!isMine ? 'var(--maroon)' : '#FFF'};color:${!isMine ? '#FFF' : 'var(--maroon)'};border-color:var(--maroon);" onclick="setProtoTab('todos')">
        🌐 Todos los Estudiantes del Plantel (${allStudents.length})
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
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${list.length ? rows : emptyState}
      </tbody>
    </table>
  </div>`;
}

function quickNuevaProtoestrella(){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Expediente Único Digital</span>
    <h3 style="font-size:18px;margin-bottom:8px;">Nuevo Estudiante</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.55;margin-bottom:18px;">
      Registra un nuevo estudiante en el sistema institucional CONALEP.
    </p>

    <form id="protoForm" onsubmit="event.preventDefault();saveProtoestrella();" autocomplete="off">
      <div class="proto-form-field">
        <label for="pfNombre">Nombre completo *</label>
        <input type="text" id="pfNombre" placeholder="Ej. Andrea Méndez López" required maxlength="80">
      </div>

      <div class="proto-form-grid">
        <div class="proto-form-field">
          <label for="pfMatricula">Matrícula *</label>
          <input type="text" id="pfMatricula" placeholder="Ej. PTB-26004" required maxlength="20">
        </div>
        <div class="proto-form-field">
          <label for="pfGrupo">Grupo *</label>
          <input type="text" id="pfGrupo" placeholder="Ej. 2A" required maxlength="10">
        </div>
      </div>

      <div class="proto-form-field">
        <label for="pfCarrera">Carrera técnica *</label>
        <select id="pfCarrera" required>
          <option value="">Selecciona una carrera</option>
          <option>Informática</option>
          <option>Enfermería General</option>
          <option>Mecatrónica</option>
          <option>Electromecánica</option>
          <option>Administración</option>
          <option>Contabilidad</option>
          <option>Autotrónica</option>
          <option>Otro</option>
        </select>
      </div>

      <div class="proto-form-field">
        <label for="pfGuardian">Guardián / Orientador asignado</label>
        <input type="text" id="pfGuardian" value="${escapeHTML(getCurrentUser()?.nombre || 'Orientador Educativo')}" maxlength="60">
      </div>

      <div class="proto-form-error" id="pfError"></div>

      <div class="proto-form-actions">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-maroon">Guardar Estudiante</button>
      </div>
    </form>
  `);
}

function saveProtoestrella(){
  const nombre    = document.getElementById('pfNombre').value.trim();
  const matricula = document.getElementById('pfMatricula').value.trim();
  const grupo     = document.getElementById('pfGrupo').value.trim();
  const carrera   = document.getElementById('pfCarrera').value;
  const guardian  = document.getElementById('pfGuardian').value.trim() || getCurrentUser()?.nombre || 'Orientador Educativo';
  const err       = document.getElementById('pfError');

  if(!nombre || !matricula || !grupo || !carrera){
    err.textContent = 'Completa todos los campos obligatorios (*).';
    err.style.display = 'block';
    return;
  }
  if(db.students[matricula]){
    err.textContent = 'Ya existe un estudiante con esa matrícula.';
    err.style.display = 'block';
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
    email: `${matricula.toLowerCase()}@alumnos.conalep.edu.mx`,
    rol: 'estudiante',
    grupo,
    carrera,
    guardian,
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

  // Selector del contenido según pestaña activa
  let activeTabHTML = checkinsTabContent;
  if(activeTab === 'tareas') activeTabHTML = tasksTabContent;
  if(activeTab === 'documentos') activeTabHTML = docsTabContent;
  if(activeTab === 'tamizaje') activeTabHTML = tamizajeTabContent;

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
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <h3 style="font-size:19px;margin:0;color:var(--ink);">${s.nombre}</h3>
          <span class="prio-chip ${s.prioridad}">Prioridad ${s.prioridad}</span>
        </div>
        <div class="mono" style="font-size:12px;color:var(--ink-soft);margin:3px 0 6px;">
          ${s.matricula} · Grupo ${s.grupo} · Carrera: ${s.carrera || 'Informática'}
        </div>
        <div style="font-size:12px;color:var(--ink-soft);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span>🛡️ Orientador(a): <strong>${s.guardian || 'Por asignar'}</strong></span>
          ${(!isStudentAssignedToMe(s)) ? `
            <button class="btn-outline-maroon" style="padding:2px 8px;font-size:11px;border-radius:4px;" onclick="assignStudentToMe('${s.matricula}')">
              📌 Asignar a mi tutoría
            </button>
          ` : `
            <span style="color:var(--green);font-weight:600;font-size:11.5px;">✓ Asignado a ti</span>
          `}
          <span>🏫 Plantel Mérida I (Matutino)</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn-outline-maroon" style="padding:5px 12px;font-size:11.5px;border-radius:100px;" onclick="openOfficialReportModal('${matricula}', 'Expediente Integral del Estudiante')">
            🖨️ Generar Reporte Oficial CONALEP (PDF)
          </button>
          <a href="reporte-psicologico.html?matricula=${encodeURIComponent(matricula)}" target="_blank" class="btn-outline-maroon" style="padding:5px 12px;font-size:11.5px;border-radius:100px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
            📋 Reporte Psicológico Oficial (Folio)
          </a>
        </div>
      </div>
    </div>

    <!-- Pestañas de Navegación del Modal -->
    <div class="student-modal-tabs">
      <button class="sm-tab-btn ${activeTab === 'checkins' ? 'active' : ''}" onclick="openStudentModal('${matricula}', 'checkins')">
        💖 Check-ins (${hist.length})
      </button>
      <button class="sm-tab-btn ${activeTab === 'tareas' ? 'active' : ''}" onclick="openStudentModal('${matricula}', 'tareas')">
        📋 Acuerdos y Tareas (${tasks.length})
      </button>
      <button class="sm-tab-btn ${activeTab === 'documentos' ? 'active' : ''}" onclick="openStudentModal('${matricula}', 'documentos')">
        📁 Documentos (${docs.length})
      </button>
      <button class="sm-tab-btn ${activeTab === 'tamizaje' ? 'active' : ''}" onclick="openStudentModal('${matricula}', 'tamizaje')">
        🩺 Tamizaje PIOE ${s.tamizaje ? '✓' : ''}
      </button>
    </div>

    <!-- Contenedor Dinámico de la Pestaña -->
    <div class="student-modal-tab-body">
      ${activeTabHTML}
    </div>

    <!-- Acciones Inferiores -->
    <div style="display:flex;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line);">
      <button class="btn-maroon" style="flex:1;padding:11px 16px;font-size:13px;" onclick="markReviewed('${matricula}')">
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
   SECCIONES: PSICOLOGÍA ESCOLAR, AGENDA Y REPORTES OFICIALES
   ============================================================ */
function renderAdminPsicologia(){
  const allStudents = studentsList();
  const withTamizaje = allStudents.filter(s => s.tamizaje).length;
  const highRisk = allStudents.filter(s => s.prioridad === 'alto' || (s.tamizaje && (s.tamizaje.resultados?.riesgoGlobal === 'alto' || s.tamizaje.resultados?.riesgoGlobal === 'crisis'))).length;

  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">DIRECCIÓN GENERAL · ÁREA DE PSICOLOGÍA ESCOLAR</span>
        <h1>Psicología Escolar & Orientación Clínica</h1>
        <p>Acompañamiento psicopedagógico, expedientes clínicos, agenda semanal de sesiones y reportes oficiales con membrete CONALEP.</p>
      </div>
      <span class="demo-chip">CONALEP Mérida I</span>
    </div>

    <div class="clinical-card-grid">
      <div class="clinical-card">
        <div class="clinical-card-icon">👤</div>
        <div class="clinical-card-title">Expedientes & Notas Clínicas</div>
        <div class="clinical-card-desc">
          Consulta fichas completas, notas evolutivas cronológicas, registro de citas y acuerdos individuales de tutoría.
        </div>
        <div class="clinical-card-actions">
          <a href="psicologia-escolar.html#tab-expedientes" target="_blank" class="btn-maroon" style="text-decoration:none;font-size:12.5px;padding:8px 14px;">
            Abrir Expedientes Clínicos ↗
          </a>
        </div>
      </div>

      <div class="clinical-card">
        <div class="clinical-card-icon">📅</div>
        <div class="clinical-card-title">Agenda & Disponibilidad Semanal</div>
        <div class="clinical-card-desc">
          Control de citas por fecha y hora, disponibilidad de cubículo de orientación y confirmación de asistencia.
        </div>
        <div class="clinical-card-actions">
          <a href="psicologia-escolar.html#tab-agenda" target="_blank" class="btn-maroon" style="text-decoration:none;font-size:12.5px;padding:8px 14px;">
            Ver Agenda de Citas ↗
          </a>
        </div>
      </div>

      <div class="clinical-card">
        <div class="clinical-card-icon">📥</div>
        <div class="clinical-card-title">Importador Masivo (Excel / CSV)</div>
        <div class="clinical-card-desc">
          Carga listas grupales en formato .xlsx o .csv con detección inteligente de columnas y creación automática de expedientes.
        </div>
        <div class="clinical-card-actions">
          <a href="psicologia-escolar.html#tab-importar" target="_blank" class="btn-maroon" style="text-decoration:none;font-size:12.5px;padding:8px 14px;">
            Importar Alumnos desde Excel ↗
          </a>
        </div>
      </div>

      <div class="clinical-card">
        <div class="clinical-card-icon">📋</div>
        <div class="clinical-card-title">Reporte Psicológico Oficial (Folio)</div>
        <div class="clinical-card-desc">
          Generador de reportes formales con folio MER1-YYMM-XXX, escalas clínicas, diagnóstico CIE-11 y firmas para impresión o PDF.
        </div>
        <div class="clinical-card-actions">
          <a href="reporte-psicologico.html" target="_blank" class="btn-maroon" style="text-decoration:none;font-size:12.5px;padding:8px 14px;">
            Elaborar Reporte Oficial ↗
          </a>
        </div>
      </div>
    </div>

    <div class="section-head-row" style="margin:28px 0 14px;">
      <div>
        <span class="section-label">Sistema Integral Embebido</span>
        <h2 class="section-title" style="margin-bottom:0;">Entorno de Trabajo Clínico Integrado</h2>
      </div>
      <a href="psicologia-escolar.html" target="_blank" class="btn-outline-maroon" style="text-decoration:none;padding:7px 14px;font-size:12.5px;">
        Abrir en Pantalla Completa ↗
      </a>
    </div>

    <div class="embed-iframe-container">
      <iframe src="psicologia-escolar.html" title="Sistema Integral de Psicología Escolar CONALEP"></iframe>
    </div>
  `;
}

function renderAdminAgenda(){
  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">PROGRAMACIÓN DE CITAS Y CUBÍCULO</span>
        <h1>Agenda de Orientación & Tutorías</h1>
        <p>Gestión de citas programadas, sesiones de seguimiento con estudiantes y reuniones con padres de familia.</p>
      </div>
      <div style="display:flex;gap:8px;">
        <a href="psicologia-escolar.html#tab-agenda" target="_blank" class="btn-maroon" style="text-decoration:none;padding:8px 16px;font-size:12.5px;">
          Abrir en Pantalla Completa ↗
        </a>
      </div>
    </div>

    <div class="embed-iframe-container">
      <iframe src="psicologia-escolar.html#tab-agenda" title="Agenda de Citas CONALEP"></iframe>
    </div>
  `;
}

function renderAdminReportesOficiales(){
  const allDocs = (typeof getAllDocuments === 'function') ? getAllDocuments() : (db.documents || []);

  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">EXPEDIENTES CLÍNICOS & FORMATOS OFICIALES</span>
        <h1>Reportes Psicológicos Escolares</h1>
        <p>Generación y resguardo de reportes oficiales de evaluación psicológica, intervenciones y actas con folio institucional.</p>
      </div>
      <a href="reporte-psicologico.html" target="_blank" class="btn-maroon" style="text-decoration:none;padding:8px 16px;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
        ＋ Elaborar Nuevo Reporte Oficial (Folio) ↗
      </a>
    </div>

    <div class="pioe-banner" style="margin-bottom:24px;">
      <div class="pioe-banner-body">
        <span class="pioe-banner-tag">Documento Oficial CONALEP</span>
        <p class="pioe-banner-desc">
          El formato oficial incluye membrete oficial del Plantel Mérida 1, folio automatizado, evaluación de 6 áreas del desarrollo, valoración del riesgo y firmas oficiales.
        </p>
      </div>
      <a href="reporte-psicologico.html" target="_blank" class="btn-maroon" style="text-decoration:none;font-size:12.5px;">
        Abrir Formato en Blanco →
      </a>
    </div>

    <div class="section-head-row">
      <div>
        <span class="section-label">Historial de Reportes</span>
        <h2 class="section-title" style="margin-bottom:0;">Expedientes Registrados en el Sistema (${allDocs.length})</h2>
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
                <a href="reporte-psicologico.html?studentId=${encodeURIComponent(d.studentId)}" target="_blank" class="btn-outline-maroon" style="padding:5px 12px;font-size:12px;text-decoration:none;">
                  🖨️ Ver / Imprimir
                </a>
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
  `;
}
