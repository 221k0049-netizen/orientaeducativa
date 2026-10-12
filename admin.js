/* ============================================================
   NAIMA OS · CONALEP — Portal de Administración (admin.js)
   Lógica del Coordinador y Orientador Educativo
   ============================================================ */

// Asegurar que el usuario activo sea coordinador al entrar a admin.html
if(!isCoordinator()){
  setCurrentUser('usr_coord_1');
}

const SECTIONS_ADMIN = [
  { id:'inicio',        label:'Inicio',           icon:'◆' },
  { id:'alumnos',       label:'Protoestrellas',   icon:'⊕' },
  { id:'pioe',          label:'PIOE Digital',     icon:'◎', sep:'MÓDULOS' },
  { id:'eirene',        label:'EIRÉNÉ',           icon:'◌' },
  { id:'orion',         label:'ORION Asistente',  icon:'✧' },
  { id:'catalogo',      label:'Documentos',       icon:'▤' },
  { id:'nova',          label:'NOVA Analítica',   icon:'◇' },
  { id:'campus3d',      label:'Campus 3D',        icon:'△' },
  { id:'config',        label:'Configuración',    icon:'⚙', sep:'SISTEMA' },
];

let currentSection = 'inicio';
let pioeOpen = null;

/* ---------- Render Sidebar y Perfil ---------- */
function renderAdminUserProfile(){
  const el = document.getElementById('userProfileBlock');
  if(!el) return;
  const user = getCurrentUser();

  el.innerHTML = `
    <div class="up-avatar">
      ${initialOf(user.display || user.nombre)}
    </div>
    <div class="up-details">
      <span class="up-name" title="${user.nombre}">${user.display || user.nombre}</span>
      <span class="up-role-tag coord">🛡️ Coordinadora</span>
    </div>
  `;

  const topUserEl = document.getElementById('adminHeaderUser');
  if(topUserEl) topUserEl.textContent = `${user.nombre} · ${user.plantel || 'CONALEP Mérida I'}`;
}

function renderAdminSidebar(){
  const navEl = document.getElementById('navlist');
  if(!navEl) return;
  const pendingAlerts = (db.alerts || []).filter(a => a.status === 'pendiente').length;

  navEl.innerHTML = SECTIONS_ADMIN.map(s => {
    const sep = s.sep ? `<div class="nav-sep">${s.sep}</div>` : '';
    const alertChip = (s.id === 'inicio' && pendingAlerts > 0)
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

  if(sec === 'inicio')        el.innerHTML = renderAdminInicio();
  else if(sec === 'alumnos')  el.innerHTML = renderProtoestrellas();
  else if(sec === 'pioe')     el.innerHTML = renderPioe();
  else if(sec === 'eirene')   el.innerHTML = renderEirene();
  else if(sec === 'orion')    el.innerHTML = renderOrionPanel();
  else if(sec === 'catalogo') el.innerHTML = renderDocumentos();
  else if(sec === 'nova')     el.innerHTML = renderNova();
  else if(sec === 'campus3d') el.innerHTML = renderCampus3DCoordinador();
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

/* ---------- Helpers de Datos ---------- */
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

/* ---------- VISTA: INICIO (ADMIN) ---------- */
function renderAdminInicio(){
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
              <button class="btn-outline-maroon" style="padding:6px 12px;font-size:12px;" onclick="openAlertEmailModal('${alt.id}')">✉️ Correo Notificado</button>
              <button class="btn-outline-maroon" style="padding:6px 14px;font-size:12px;" onclick="openStudentModal('${alt.studentId}')">Ver expediente</button>
              <button class="btn-resolve-alert" onclick="resolveAlert('${alt.id}')">✓ Marcar atendida</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const AVATAR_TONES = ['tone-a','tone-b','tone-c'];
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
      <div class="b-title">${rev} ${rev === 1 ? 'estudiante requiere' : 'estudiantes requieren'} revisión activa</div>
      <div class="b-desc">Consulta los casos priorizados y registra las acciones y bitácoras institucionales.</div>
    </div>
    <button class="btn-maroon" onclick="nav('alumnos')">Ver Protoestrellas →</button>
  </div>

  <span class="section-label">Panorama institucional</span>
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
    renderAdminSidebar();
    nav('inicio');
  }
}

/* ---------- VISTA: PROTOESTRELLAS ---------- */
function renderProtoestrellas(){
  const list = studentsList();

  const rows = list.map(s => `
    <tr>
      <td class="pt-name">${s.nombre}</td>
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
          <p>Puedes registrar un nuevo expediente para comenzar a darle seguimiento.</p>
          <button class="btn-maroon" onclick="quickNuevaProtoestrella()">+ Nueva Protoestrella</button>
        </div>
      </td>
    </tr>`;

  return `
  <div class="page-head">
    <div>
      <h1>Protoestrellas</h1>
      <p>Una persona, un expediente, una historia acompañada en CONALEP.</p>
    </div>
  </div>

  <div class="proto-banner">
    <div class="pb-body">
      <span class="pb-tag">Expediente Único Digital</span>
      <p class="pb-desc">Los datos se capturan una sola vez y alimentan todos los flujos autorizados.</p>
    </div>
    <button class="btn-maroon" onclick="quickNuevaProtoestrella()">+ Nueva Protoestrella</button>
  </div>

  <h2 class="proto-community-title">Comunidad Estudiantil</h2>

  <div class="proto-table-wrap">
    <table class="proto-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Matrícula</th>
          <th>Grupo / Carrera</th>
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

function quickNuevaProtoestrella(){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Expediente Único Digital</span>
    <h3 style="font-size:18px;margin-bottom:8px;">Nueva Protoestrella</h3>
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
        <input type="text" id="pfGuardian" value="Psic. Mariana Estrada" maxlength="60">
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
  const guardian  = document.getElementById('pfGuardian').value.trim() || 'Psic. Mariana Estrada';
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
  const s = db.students[matricula];
  if(!s) return;

  const tasks = getStudentTasks(matricula);
  const docs = getStudentDocuments(matricula);
  const hist = s.historial || [];
  const pendingAlert = (db.alerts || []).find(a => a.studentId === matricula && a.status === 'pendiente');

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

  // Selector del contenido según pestaña activa
  let activeTabHTML = checkinsTabContent;
  if(activeTab === 'tareas') activeTabHTML = tasksTabContent;
  if(activeTab === 'documentos') activeTabHTML = docsTabContent;

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    
    <!-- Encabezado del Alumno -->
    <div class="modal-head" style="align-items:flex-start;margin-bottom:14px;">
      <div class="thumb" style="width:68px;height:88px;border-radius:14px;overflow:hidden;flex-shrink:0;">
        ${buildAvatarSVG(s.avatar,'modal')}
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
          <span>🛡️ Guardián: <strong>${s.guardian || 'Psic. Mariana Estrada'}</strong></span>
          <span>🏫 Plantel Mérida I (Matutino)</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn-outline-maroon" style="padding:5px 12px;font-size:11.5px;border-radius:100px;" onclick="openOfficialReportModal('${matricula}', 'Expediente Integral del Estudiante')">
            🖨️ Generar Reporte Oficial CONALEP (PDF)
          </button>
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
    assignedBy: getCurrentUser()?.display || 'Psic. Mariana Estrada'
  });

  openStudentModal(matricula, 'tareas');
}

/* ---------- MODAL: VISTA PREVIA DEL CORREO INSTITUCIONAL DE ALERTA ---------- */
function openAlertEmailModal(alertId){
  const alt = (db.alerts || []).find(a => a.id === alertId);
  if(!alt) return;

  const s = db.students[alt.studentId] || {};

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
          Alerta Temprana · PIOE
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
          <span class="em-val">mariana.estrada@conalep.edu.mx (Psic. Mariana Estrada · Coordinadora PIOE)</span>
        </div>
        <div class="email-meta-row">
          <span class="em-lbl">Fecha:</span>
          <span class="em-val">${alt.date}</span>
        </div>
        <div class="email-meta-row">
          <span class="em-lbl">Asunto:</span>
          <span class="em-subject">🚨 [ALERTA SOCIOEMOCIONAL CRÍTICA] Check-in de ${alt.studentName} (${alt.grupo} · ${alt.carrera})</span>
        </div>
      </div>

      <!-- Cuerpo del mensaje institucional -->
      <div class="email-body-content">
        <div class="email-institutional-badge">
          <div style="font-weight:700;color:var(--maroon);font-size:14px;">COLEGIO NACIONAL DE EDUCACIÓN PROFESIONAL TÉCNICA</div>
          <div style="font-size:11.5px;color:var(--ink-soft);">PLANTEL MÉRIDA I · DEPARTAMENTO DE ORIENTACIÓN EDUCATIVA Y TUTORÍAS</div>
        </div>

        <p style="font-size:13.5px;line-height:1.6;color:var(--ink);margin-bottom:14px;">
          Estimada <strong>Psic. Mariana Estrada</strong>,<br>
          El sistema inteligente NAIMA OS ha registrado un check-in de bienestar que coincide con criterios de atención prioritaria según el protocolo institucional del PIOE.
        </p>

        <div class="email-student-card">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:28px;">${alt.moodEmoji || '⚠️'}</div>
            <div>
              <div style="font-size:15px;font-weight:700;color:var(--ink);">${alt.studentName}</div>
              <div class="mono" style="font-size:12px;color:var(--ink-soft);">
                Matrícula: ${alt.studentId} · Grupo: ${alt.grupo} · Carrera: ${alt.carrera}
              </div>
            </div>
          </div>
          <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);font-size:13px;">
            <div>Estado reportado: <strong style="color:var(--danger);">${alt.moodLabel || alt.mood}</strong></div>
            <div style="margin-top:4px;">Comentario del estudiante: <em>"${escapeHTML(alt.note || 'Sin nota adicional')}"</em></div>
          </div>
        </div>

        <div class="email-ai-intervention-box">
          <div style="font-weight:700;margin-bottom:4px;color:var(--green);font-size:12.5px;">
            🌿 Contención Inicial de IAs Activada en Plataforma:
          </div>
          <ul style="padding-left:18px;font-size:12px;line-height:1.55;color:var(--ink-soft);">
            <li><strong>Eirén:</strong> Validó la emoción del alumno, redujo la exigencia cognitiva y brindó ejercicio guiado de respiración diafragmática.</li>
            <li><strong>Orión:</strong> Ofreció recomendaciones prácticas de organización académica y recordó los canales oficiales de orientación.</li>
          </ul>
        </div>

        <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.5;margin-top:14px;">
          <strong>Acción recomendada:</strong> Citar al estudiante para entrevista de seguimiento, verificar acuerdos y adjuntar bitácora al expediente digital.
        </p>
      </div>

      <!-- Pie de acciones -->
      <div class="email-footer-actions">
        <button class="btn-maroon" style="padding:9px 18px;font-size:12.5px;" onclick="closeModal();openStudentModal('${alt.studentId}');">
          Abrir Expediente de ${alt.studentName.split(' ')[0]} →
        </button>
        <button class="btn-ghost" style="padding:9px 16px;font-size:12.5px;" onclick="closeModal();">
          Cerrar
        </button>
      </div>
    </div>
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
        <li><strong>${total}</strong> Protoestrellas registradas en CONALEP Mérida I.</li>
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
        <button class="btn-outline-maroon" style="padding:6px 12px;font-size:12px;" onclick="openOfficialReportModal('PTB-26001', '${d.title}')">
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
  openOfficialReportModal('PTB-26001', title);
}

/* ---------- GENERADOR OFICIAL DE DOCUMENTOS CON MEMBRETE CONALEP ---------- */
function openOfficialReportModal(matricula, docTitle = null){
  const s = db.students[matricula] || db.students['PTB-26001'] || {
    nombre: 'Carlos Mendoza López',
    matricula: 'PTB-26001',
    grupo: '4B',
    carrera: 'Informática',
    guardian: 'Psic. Mariana Estrada'
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
          <td class="sit-val">${s.guardian || 'Psic. Mariana Estrada'}</td>
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
          <div class="sheet-sig-name">Psic. Mariana Estrada</div>
          <div class="sheet-sig-title">Orientadora Educativa y Tutorías</div>
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
    author: getCurrentUser()?.display || 'Psic. Mariana Estrada'
  });

  alert('¡Documento adjuntado exitosamente al expediente de la Protoestrella!');
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
    <div class="stat-card"><div class="s-icon teal">◇</div><div class="s-num">${list.length}</div><div class="s-lbl">Protoestrellas activas</div></div>
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
