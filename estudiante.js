/* ============================================================
   NAIMA OS · CONALEP — Portal del Estudiante (estudiante.js)
   Lógica del Alumno, Check-in Emocional y Red de Apoyo IA
   ============================================================ */

// Validación estricta de sesión de estudiante en estudiante.js
const currentStudentUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
if (!currentStudentUser || currentStudentUser.rol !== 'estudiante') {
  window.location.replace('index.html');
  throw new Error('Sesión no autorizada. Redirigiendo al inicio de sesión institucional.');
}

const SECTIONS_STUDENT = [
  { id:'student_inicio',  label:'Mi Espacio',        icon:'🏠' },
  { id:'student_checkin', label:'Check-in Emocional',icon:'💖' },
  { id:'student_tamizaje',label:'Tamizaje PIOE',     icon:'📋' },
  { id:'student_eirene',  label:'Hablar con Eirén',  icon:'🌸', sep:'COMPAÑERAS IA' },
  { id:'student_orion',   label:'Consejos de Orión', icon:'✧' },
  { id:'student_campus3d',label:'Campus 3D & Juegos',icon:'🎮', sep:'ACTIVIDADES' },
  { id:'student_diario',  label:'Mi Diario',         icon:'📓' },
];

let currentStudentSection = 'student_inicio';
let selectedStudentMood = null;

/* ---------- Render Sidebar y Perfil del Alumno ---------- */
function renderStudentUserProfile(){
  const el = document.getElementById('userProfileBlock');
  if(!el) return;
  const user = getCurrentUser();
  const s = db.students[user.matricula || user.id] || user;
  const studentPhoto = (typeof getStudentPhoto === 'function') ? getStudentPhoto(s) : (s.photo || s.avatar?.photo || null);

  el.innerHTML = `
    <div class="up-avatar-wrap student-wrap" onclick="openStudentPhotoModal()" title="Haz clic para subir o cambiar tu foto de perfil">
      <div class="up-avatar student-av">
        ${studentPhoto ? `
          <img src="${escapeHTML(studentPhoto)}" class="up-avatar-img" alt="Foto de ${escapeHTML(s.nombre)}">
        ` : `
          ${initialOf(s.display || s.nombre)}
        `}
      </div>
      <span class="up-camera-badge" title="Cambiar foto">📷</span>
    </div>
    <div class="up-details">
      <span class="up-name" title="${escapeHTML(s.nombre)}">${escapeHTML(s.display || s.nombre)}</span>
      <span class="up-role-tag student">🎓 ${escapeHTML(s.matricula || 'Alumno')}</span>
    </div>
  `;

  const topUserEl = document.getElementById('studentHeaderUser');
  if(topUserEl) topUserEl.textContent = `${s.nombre} (${s.grupo || '4B'} · ${s.carrera || 'Informática'})`;
}

function renderStudentSidebar(){
  const navEl = document.getElementById('navlist');
  if(!navEl) return;

  navEl.innerHTML = SECTIONS_STUDENT.map(s => {
    const sep = s.sep ? `<div class="nav-sep">${s.sep}</div>` : '';
    return `${sep}<button data-sec="${s.id}" onclick="nav('${s.id}')"><span class="nicon">${s.icon}</span>${s.label}</button>`;
  }).join('');
}

function nav(sec){
  currentStudentSection = sec;
  document.querySelectorAll('#navlist button').forEach(b =>
    b.classList.toggle('active', b.dataset.sec === sec));
  closeSidebarMobile();
  const el = document.getElementById('content');
  window.scrollTo(0,0);

  if(sec === 'student_inicio')         el.innerHTML = renderStudentInicio();
  else if(sec === 'student_checkin')   el.innerHTML = renderStudentCheckin();
  else if(sec === 'student_tamizaje')  el.innerHTML = renderStudentTamizaje();
  else if(sec === 'student_eirene')    el.innerHTML = renderStudentEirene();
  else if(sec === 'student_orion')     el.innerHTML = renderStudentOrion();
  else if(sec === 'student_campus3d')  el.innerHTML = renderStudentCampus3D();
  else if(sec === 'student_diario')    el.innerHTML = renderStudentDiario();
}

function lastMood(s){
  const h = s.historial && s.historial[s.historial.length-1];
  return h ? MOODS.find(m => m.id === h.mood) : null;
}

/* ---------- VISTA: MI ESPACIO (INICIO ESTUDIANTE) ---------- */
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
        <span class="b-tag">Último registro de bienestar</span>
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
      <span style="font-size:22px;">🛡️</span>
      <div>
        <strong>Acompañamiento escolar en curso:</strong> Tu orientador(a) (<em>${s.guardian || 'Orientador(a) Institucional'}</em>) tiene conocimiento de tu reporte de ${pendingAlert.moodLabel}. Recuerda que estamos aquí para ti y puedes solicitar una plática en cualquier momento.
      </div>
    </div>
  ` : '';

  const tasks = getStudentTasks(s.matricula);
  const completedCount = tasks.filter(t => t.completed).length;
  const pct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const docs = getStudentDocuments(s.matricula);

  const studentPhoto = (typeof getStudentPhoto === 'function') ? getStudentPhoto(s) : (s.photo || s.avatar?.photo || null);

  return `
  <div class="student-hero">
    <div class="sh-avatar-wrap" onclick="openStudentPhotoModal()" title="Haz clic para subir o cambiar tu foto de perfil">
      ${studentPhoto ? `
        <img src="${escapeHTML(studentPhoto)}" alt="Foto de perfil de ${escapeHTML(s.nombre)}" class="sh-fb-photo">
      ` : `
        <div class="sh-fb-placeholder">
          <span class="sh-fb-placeholder-icon">👤</span>
          <span class="sh-fb-placeholder-initial">${initialOf(s.display || s.nombre)}</span>
        </div>
      `}
      <div class="sh-fb-camera-badge" title="Cambiar foto de perfil">
        <span>📷</span>
      </div>
    </div>
    <div class="sh-body">
      <span class="sh-badge">✦ Espacio del Alumno · CONALEP</span>
      <h1 class="sh-title">${greeting.text}, ${s.display || s.nombre}</h1>
      <p class="sh-desc">Este es tu espacio seguro para registrar tus emociones, tomar pausas activas y recibir apoyo cuando lo necesites.</p>
      <div class="sh-meta">
        <span class="sh-meta-item">Matrícula: <strong>${s.matricula || 'PTB-Demo'}</strong></span>
        <span class="sh-meta-item">Grupo: <strong>${s.grupo || '4B'}</strong></span>
        <span class="sh-meta-item">Carrera: <strong>${s.carrera || 'Informática'}</strong></span>
        <span class="sh-meta-item">Orientador(a): <strong>${s.guardian || 'Por asignar'}</strong></span>
        <button type="button" class="btn-ghost" style="padding:4px 10px;font-size:12px;border:1px solid #D1D5DB;border-radius:6px;cursor:pointer;background:white;" onclick="openStudentCambiarPasswordModal()">🔑 Cambiar mi contraseña</button>
      </div>
    </div>
  </div>
  ${alertNote}
  ${moodBanner}

  ${s.tamizaje ? `
    <div class="banner" style="border-left-color:var(--teal);margin-bottom:20px;">
      <div class="b-icon" style="background:var(--teal-soft);color:var(--teal);">📋</div>
      <div class="b-body">
        <span class="b-tag">Tamizaje Psicoemocional PIOE</span>
        <div class="b-title">Tamizaje completado el ${new Date(s.tamizaje.fecha).toLocaleDateString('es-MX')}</div>
        <div class="b-desc">Tus respuestas confidenciales fueron recibidas. Tu orientador(a) institucional está al tanto de tu bienestar.</div>
      </div>
      <button class="btn-maroon" onclick="nav('student_tamizaje')">Ver Mis Resultados →</button>
    </div>
  ` : `
    <div class="banner" style="border-left-color:var(--maroon);margin-bottom:20px;">
      <div class="b-icon" style="background:#FFF0F2;color:var(--maroon);">📋</div>
      <div class="b-body">
        <span class="b-tag">Evaluación de Bienestar PIOE</span>
        <div class="b-title">¿Ya respondiste tu cuestionario estudiantil?</div>
        <div class="b-desc">Toma 5 minutos para responder este tamizaje confidencial (PHQ-A y GAD-7) y recibir recomendaciones útiles.</div>
      </div>
      <button class="btn-maroon" onclick="nav('student_tamizaje')">Comenzar Tamizaje →</button>
    </div>
  `}

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
    <button class="quick-card" onclick="nav('student_tamizaje')">
      <div class="q-icon">📋</div>
      <div class="q-body">
        <span class="q-title">Tamizaje PIOE</span>
        <span class="q-sub">${s.tamizaje ? 'Ver mis resultados' : 'Comenzar cuestionario'}</span>
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

  <!-- SECCIÓN: MIS TAREAS Y ACUERDOS DE ORIENTACIÓN -->
  <div class="student-tasks-block" style="margin-top:28px;">
    <div class="section-head-row" style="margin-bottom:12px;">
      <div>
        <span class="section-label">Acompañamiento y Tutoría</span>
        <h2 class="section-title" style="margin-bottom:0;">📋 Mis Tareas y Compromisos de Orientación</h2>
      </div>
      <div style="text-align:right;">
        <span class="tasks-progress-badge ${pct === 100 && tasks.length ? 'all-done' : ''}">
          ${completedCount} de ${tasks.length} cumplidos (${pct}%)
        </span>
      </div>
    </div>

    ${tasks.length ? `
      <div class="task-progress-bar-wrap">
        <div class="task-progress-bar-fill" style="width:${pct}%;"></div>
      </div>
    ` : ''}

    <div class="student-tasks-container">
      ${tasks.length ? tasks.map(t => `
        <div class="student-task-item ${t.completed ? 'completed' : ''}" id="stItem_${t.id}">
          <label class="st-checkbox-label">
            <input type="checkbox" class="st-checkbox" ${t.completed ? 'checked' : ''} 
              onchange="toggleStudentTaskPortal('${t.id}')">
            <span class="st-custom-check"></span>
          </label>
          <div class="st-content">
            <div class="st-top-row">
              <span class="task-cat-badge ${t.category ? t.category.toLowerCase() : 'general'}">${t.category || 'Compromiso'}</span>
              <span class="st-title ${t.completed ? 'line-through' : ''}">${escapeHTML(t.title)}</span>
            </div>
            ${t.desc ? `<p class="st-desc">${escapeHTML(t.desc)}</p>` : ''}
            <div class="st-footer">
              <span>📅 Entrega / Revisión: <strong>${t.dueDate || 'Esta semana'}</strong></span>
              <span>· Asignado por: <strong>${t.assignedBy || 'Orientador Educativo'}</strong></span>
              ${t.completed ? `<span class="st-completed-badge">✓ ¡Cumplido!</span>` : ''}
            </div>
          </div>
        </div>
      `).join('') : `
        <div class="follow-empty" style="padding:24px 16px;">
          <div class="fe-icon">✨</div>
          <h4>¡Sin pendientes escolares por ahora!</h4>
          <p>Tu orientadora no ha asignado tareas en este momento. Continúa cuidando tu bienestar y ritmo de estudio.</p>
        </div>
      `}
    </div>
  </div>

  <!-- SECCIÓN: MIS DOCUMENTOS DEL EXPEDIENTE -->
  ${docs.length ? `
    <div class="student-docs-block" style="margin-top:28px;">
      <div class="section-head-row" style="margin-bottom:12px;">
        <div>
          <span class="section-label">Expediente Oficial</span>
          <h2 class="section-title" style="margin-bottom:0;">📁 Mis Documentos de Orientación Educativa</h2>
        </div>
      </div>
      <div class="student-docs-grid">
        ${docs.map(d => `
          <div class="student-doc-card">
            <div class="sdc-icon">📄</div>
            <div class="sdc-info">
              <span class="doc-type-badge">${d.category || 'Expediente'}</span>
              <strong class="sdc-title">${escapeHTML(d.title)}</strong>
              <div class="sdc-meta">📁 ${escapeHTML(d.fileName)} · ${d.fileSize} · Fecha: ${d.date}</div>
              ${d.notes ? `<div class="sdc-notes">"${escapeHTML(d.notes)}"</div>` : ''}
            </div>
            <button class="btn-outline-maroon" style="padding:6px 12px;font-size:12px;align-self:center;" 
              onclick="openOfficialReportModal('${s.matricula}', '${escapeHTML(d.title)}')">
              🖨️ Ver Documento
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''}

  <div class="section-head-row" style="margin-top:28px;">
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

function toggleStudentTaskPortal(taskId){
  const user = getCurrentUser();
  const s = db.students[user.matricula || user.id] || user;
  const task = toggleStudentTask(s.matricula, taskId);
  if(task && task.completed){
    showStudentToast('¡Excelente avance! Has cumplido: ' + task.title + ' ✨');
  }
  const el = document.getElementById('content');
  if(el && currentStudentSection === 'student_inicio'){
    el.innerHTML = renderStudentInicio();
  }
}

function showStudentToast(msg){
  let t = document.getElementById('studentToast');
  if(!t){
    t = document.createElement('div');
    t.id = 'studentToast';
    t.className = 'student-toast-badge';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(()=>{ t.classList.remove('visible'); }, 3800);
}

/* ---------- GENERADOR OFICIAL DE DOCUMENTOS (MODO ESTUDIANTE) ---------- */
function openOfficialReportModal(matricula, docTitle = null){
  const s = db.students[matricula] || getCurrentUser();
  const tasks = getStudentTasks(s.matricula);
  const hist = s.historial || [];
  const title = docTitle || 'Expediente de Acompañamiento Socioemocional';
  const folio = 'CONALEP-OE-MID1-2026-' + (s.matricula.replace(/[^0-9]/g,'') || '042');
  const hoyStr = new Date().toLocaleDateString('es-MX', {
    day:'2-digit', month:'long', year:'numeric'
  });

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--line);">
      <div>
        <span class="section-label" style="margin:0;">Expediente Institucional</span>
        <div style="font-size:12.5px;color:var(--ink-soft);">Documento oficial expedido por Orientación Educativa</div>
      </div>
      <button class="btn-maroon" style="padding:9px 18px;font-size:13px;display:flex;align-items:center;gap:6px;" onclick="window.print();">
        🖨️ Imprimir / Guardar PDF
      </button>
    </div>

    <div class="conalep-official-sheet">
      <div class="sheet-header">
        <div class="sheet-header-left">
          <div class="sheet-gov-crest"><span style="font-size:22px;">🏛️</span></div>
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

      <div class="sheet-doc-title-block">
        <h2 class="sheet-doc-title">${escapeHTML(title)}</h2>
        <div class="sheet-doc-subtitle">PROGRAMA INSTITUCIONAL DE ORIENTACIÓN EDUCATIVA Y TUTORÍAS (PIOE)</div>
      </div>

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

      <div class="sheet-section-title">II. REGISTRO RECIENTE DE BIENESTAR Y CHECK-INS EMOCIONALES</div>
      <table class="sheet-table-data">
        <thead>
          <tr>
            <th style="width:25%;">Fecha y Hora</th>
            <th style="width:25%;">Estado Reportado</th>
            <th style="width:50%;">Comentario del Alumno</th>
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

      <div class="sheet-section-title">III. BITÁCORA DE COMPROMISOS Y ACUERDOS DE SEGUIMIENTO</div>
      <table class="sheet-table-data">
        <thead>
          <tr>
            <th style="width:45%;">Compromiso / Actividad</th>
            <th style="width:20%;">Área</th>
            <th style="width:20%;">Fecha Límite</th>
            <th style="width:15%;">Estatus</th>
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

      <div class="sheet-disclaimer">
        <strong>NOTA DE CONFIDENCIALIDAD Y FUNDAMENTO INSTITUCIONAL:</strong> La información contenida en este documento forma parte del expediente socioemocional y de tutoría del estudiante, amparado por el Modelo Académico de Calidad para la Competitividad de CONALEP y la normatividad de protección de datos personales.
      </div>

      <div class="sheet-signatures">
        <div class="sheet-sig-box">
          <div class="sheet-sig-line"></div>
          <div class="sheet-sig-name">${s.guardian || 'Orientador(a) Institucional'}</div>
          <div class="sheet-sig-title">Orientación Educativa y Tutorías</div>
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

/* ---------- VISTA: CHECK-IN EMOCIONAL ---------- */
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
      ${MOODS.map(m => {
        const isNeg = NEGATIVE.includes(m.id);
        const isNeu = m.id === 'neutral';
        const tagText = isNeg ? 'Requiere apoyo' : (isNeu ? 'Atención preventiva' : 'Equilibrio');
        const cardClass = isNeg ? 'is-negative' : (isNeu ? 'is-neutral' : '');
        return `
        <div class="student-mood-card ${cardClass}" 
             id="smCard_${m.id}" 
             onclick="selectStudentMood('${m.id}')">
          <span class="smc-emoji">${m.emoji}</span>
          <span class="smc-label">${m.label}</span>
          <span class="smc-tag">${tagText}</span>
        </div>
      `}).join('')}
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

/* ---------- Servicio de Envío de Correo Real vía API Serverless ---------- */
async function dispatchApiEmailNotification(payload){
  try{
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok){
      console.warn('Aviso en /api/send-email:', data);
      return { success: false, ...data };
    }
    console.log('✅ Correo entregado al orientador vía /api/send-email:', data);
    return data;
  }catch(err){
    console.warn('Aviso: /api/send-email no está disponible en servidor local sin Node/Vercel:', err.message);
    return { success: false, error: err.message };
  }
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

  if(!s.historial) s.historial = [];
  s.historial.push({
    id: 'chk_' + Date.now(),
    mood: selectedStudentMood,
    date: fechaStr,
    note: note
  });

  const isNeg = NEGATIVE.includes(selectedStudentMood);
  const isNeutral = selectedStudentMood === 'neutral';
  const requiresSupport = isNeg || isNeutral;

  const psychInfo = getAssignedPsychologist(s);
  let newAlert = null;

  if(requiresSupport){
    s.prioridad = isNeg ? 'alto' : 'medio';
    const alertLevel = isNeg ? 'urgente' : 'preventivo';
    if(!db.alerts) db.alerts = [];

    const emailData = createPsychologistAlertEmail({
      student: s,
      moodObj,
      note,
      psychologist: psychInfo,
      alertLevel
    });

    newAlert = {
      id: 'alt_' + Date.now(),
      studentId: s.matricula,
      studentName: s.nombre,
      studentEmail: s.email,
      grupo: s.grupo,
      carrera: s.carrera,
      mood: selectedStudentMood,
      moodEmoji: moodObj.emoji,
      moodLabel: moodObj.label,
      level: alertLevel,
      status: 'pendiente',
      date: fechaStr,
      note: note || (isNeutral ? 'Reportó estado Neutral en check-in (requiere seguimiento preventivo)' : 'Reportó estado negativo en check-in'),
      psychologistName: psychInfo.nombre,
      psychologistEmail: psychInfo.email,
      emailSubject: emailData.subject,
      emailBody: emailData.body,
      emailDate: fechaStr
    };
    db.alerts.unshift(newAlert);

    if(!db.sentEmails) db.sentEmails = [];
    db.sentEmails.unshift({
      id: 'eml_' + Date.now(),
      alertId: newAlert.id,
      studentId: s.matricula,
      studentName: s.nombre,
      to: psychInfo.email,
      toName: psychInfo.nombre,
      subject: emailData.subject,
      body: emailData.body,
      date: fechaStr,
      mood: selectedStudentMood,
      status: 'Entregado'
    });

    // Despachar el correo real hacia la bandeja de entrada del psicólogo a través de la API Serverless
    dispatchApiEmailNotification({
      to: psychInfo.email,
      toName: psychInfo.nombre,
      studentName: s.nombre,
      matricula: s.matricula,
      grupo: s.grupo,
      carrera: s.carrera,
      studentEmail: s.email,
      mood: selectedStudentMood,
      moodEmoji: moodObj.emoji,
      moodLabel: moodObj.label,
      note: note,
      level: alertLevel,
      subject: emailData.subject
    });
  } else {
    s.prioridad = 'bajo';
  }

  saveDB();
  renderStudentSidebar();

  // Sincronizar Check-in y Alerta en Supabase en segundo plano si está disponible
  if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
    const client = typeof getActiveSupabaseClient === 'function' ? getActiveSupabaseClient() : null;
    if(client){
      client.from('checkins').insert({
        student_id: s.matricula,
        mood: selectedStudentMood,
        mood_label: moodObj.label,
        mood_emoji: moodObj.emoji,
        note: (note || '').trim(),
        is_negative: requiresSupport
      }).then(({ error }) => {
        if(error) console.warn('Supabase checkin sync notice:', error.message);
        else console.log('✅ Check-in registrado en Supabase');
      }).catch(err => console.warn('Supabase checkin error:', err));

      if(requiresSupport && newAlert){
        client.from('alerts').insert({
          student_id: s.matricula,
          level: newAlert.level,
          mood: selectedStudentMood,
          mood_label: moodObj.label,
          mood_emoji: moodObj.emoji,
          note: newAlert.note,
          status: 'pendiente'
        }).then(({ error }) => {
          if(error) console.warn('Supabase alert sync notice:', error.message);
          else console.log('✅ Alerta registrada en Supabase');
        }).catch(err => console.warn('Supabase alert error:', err));

        client.from('students').update({
          prioridad: s.prioridad,
          seg_fecha: 'Hoy'
        }).eq('matricula', s.matricula).then(()=>{}).catch(()=>{});
      }
    }
  }

  const resContainer = document.getElementById('studentCheckinResult');
  if(!resContainer) return;

  if(requiresSupport){
    resContainer.innerHTML = renderAiSupportContainer(s, moodObj, note, psychInfo, newAlert);
  } else {
    resContainer.innerHTML = renderPositiveAiSupport(s, moodObj, note);
  }

  resContainer.scrollIntoView({ behavior:'smooth', block:'start' });
}

/* --- Apoyo Emocional Inmediato (Eirén & Orión) --- */
function renderAiSupportContainer(student, mood, note, psychInfo, alertObj){
  const firstName = (student.display || student.nombre).split(' ')[0];
  const psych = psychInfo || getAssignedPsychologist(student);

  const eireneMsgs = {
    neutral: `Hola ${firstName}, los días neutros son completamente naturales y muy valiosos. A veces indican que llevas una carga pesada de tareas o que necesitas un momento de desconexión sin juzgarte. Tu orientador(a) ${psych.nombre} y yo estamos aquí para escucharte y acompañarte siempre. 🌿`,
    estresado: `Hola ${firstName}, te escucho con mucho cariño. El estrés en la escuela o en casa puede sentirse como una carga muy pesada, pero no tienes que resolver todo hoy ni hacerlo a solas. Respira hondo: eres una persona valiosa y capaz de superar esto a tu propio ritmo. 💚`,
    triste: `Hola ${firstName}, gracias por tener la valentía de compartir cómo te sientes. Está completamente bien no sentirse bien hoy. Tu tristeza es válida y no tienes por qué ocultarla. Aquí estoy contigo, sin juicios y a tu lado. Mereces un momento de calma hoy. 🌿`,
    enojado: `Hola ${firstName}, reconozco tu molestia y es normal sentir coraje o frustración ante situaciones difíciles. Tómate una pausa cómoda antes de tomar cualquier decisión. Vamos a cuidar tu energía para que recuperes tu tranquilidad. ✨`
  };

  const orionMsgs = {
    neutral: `✧ Consejo de Orión: 'El punto medio es una oportunidad para recalibrar tu energía'. Si sientes apatía, dudas o falta de motivación con tus módulos de CONALEP, no te preocupes: tu orientador(a) ${psych.nombre} ya tiene tu reporte y te contactará para orientarte a fijar metas claras a tu ritmo.`,
    estresado: `✧ Consejo de Orión: 'Las tormentas académicas más intensas son temporales'. Te sugiero dividir tus pendientes en partes pequeñas, tomar un vaso con agua y hacer 3 minutos de respiración. Tu orientador(a) ${psych.nombre} está disponible para respaldarte sin juzgarte.`,
    triste: `✧ Consejo de Orión: 'Incluso en la noche más oscura, las estrellas siguen ahí'. Hoy no te exijas perfección. Tu orientador(a) ${psych.nombre} ha recibido tu reporte de check-in para coordinar una plática de apoyo contigo. Tu equipo escolar está de tu lado.`,
    enojado: `✧ Consejo de Orión: 'La pausa es la mayor muestra de fuerza'. Cuando sientas enojo, aléjate unos minutos de la fuente de tensión, camina o realiza una pausa activa. Tu orientador(a) ${psych.nombre} te contactará para apoyarte en cualquier situación que estés viviendo.`
  };

  return `
  <div class="ai-support-container">
    <div class="ai-support-banner">
      <div class="as-pulse-icon">💚</div>
      <div>
        <h3 class="as-banner-title">${mood.id === 'neutral' ? 'Acompañamiento Socioemocional Preventivo activado' : 'Red de Apoyo Emocional Inmediata activada'}</h3>
        <p class="as-banner-sub">Eirén y Orión están aquí para acompañarte mientras tu reporte es notificado de forma confidencial a tu orientador(a).</p>
      </div>
    </div>

    <div class="ai-duo-chat-grid">
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
      <span style="font-size:26px;">📬</span>
      <div>
        <div style="font-weight:700;color:var(--maroon);font-size:14px;margin-bottom:3px;">
          Notificación institucional y correo electrónico enviados con éxito
        </div>
        <div style="font-size:12.8px;color:var(--ink);line-height:1.55;">
          Se notificó a tu orientador(a) asignado(a) <strong>${psych.nombre}</strong> (<code>${psych.email}</code>). 
          La plataforma le ha generado una alerta y un correo institucional para <strong>ponerse en contacto contigo a la brevedad</strong>.
        </div>
        ${alertObj ? `
        <div style="margin-top:8px;">
          <button class="btn-outline-maroon" style="padding:4px 12px;font-size:11.5px;background:#fff;" onclick="openStudentEmailPreviewModal('${alertObj.id}')">
            ✉️ Ver copia del correo enviado a ${psych.nombre.split(' ')[0]}
          </button>
        </div>` : ''}
      </div>
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

function openStudentEmailPreviewModal(alertId){
  const alt = (db.alerts || []).find(a => a.id === alertId);
  const psychName = alt?.psychologistName || 'Orientador Educativo';
  const psychEmail = alt?.psychologistEmail || 'orientacion.merida1@conalep.edu.mx';
  const subject = alt?.emailSubject || 'Alerta Socioemocional';
  const dateStr = alt?.date || 'Hoy';

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <div class="email-preview-wrapper">
      <div class="email-client-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">✉️</span>
          <strong>Notificación Institucional Enviada</strong>
        </div>
        <span class="mono" style="font-size:11px;background:rgba(255,255,255,0.2);padding:3px 8px;border-radius:100px;">
          Enviado Automáticamente
        </span>
      </div>

      <div class="email-meta-header">
        <div class="email-meta-row">
          <span class="em-lbl">De:</span>
          <span class="em-val"><strong>sistema.alertas@conalep.edu.mx</strong> (NAIMA OS · Orientación)</span>
        </div>
        <div class="email-meta-row">
          <span class="em-lbl">Para:</span>
          <span class="em-val"><strong>${psychEmail}</strong> (${psychName})</span>
        </div>
        <div class="email-meta-row">
          <span class="em-lbl">Fecha:</span>
          <span class="em-val">${dateStr}</span>
        </div>
        <div class="email-meta-row">
          <span class="em-lbl">Asunto:</span>
          <span class="em-subject">${subject}</span>
        </div>
      </div>

      <div class="email-body-content">
        <div class="email-institutional-badge">
          <div style="font-weight:700;color:var(--maroon);font-size:14px;">COLEGIO NACIONAL DE EDUCACIÓN PROFESIONAL TÉCNICA</div>
          <div style="font-size:11.5px;color:var(--ink-soft);">PLANTEL MÉRIDA I · ORIENTACIÓN EDUCATIVA Y TUTORÍAS</div>
        </div>

        <p style="font-size:13px;line-height:1.6;color:var(--ink);margin-bottom:12px;">
          Estimado/a <strong>${psychName}</strong>,<br>
          El sistema inteligente NAIMA OS ha registrado un check-in de bienestar que requiere atención institucional.
        </p>

        <div class="email-student-card">
          <div style="font-size:13.5px;font-weight:700;color:var(--ink);margin-bottom:4px;">
            ${alt?.studentName || 'Estudiante'} (${alt?.grupo || ''} · ${alt?.carrera || ''})
          </div>
          <div style="font-size:12.5px;color:var(--ink-soft);">
            Estado reportado: <strong>${alt?.moodEmoji || '⚠️'} ${alt?.moodLabel || alt?.mood || ''}</strong>
            ${alt?.note ? `<br>Comentario del alumno: <em>"${escapeHTML(alt.note)}"</em>` : ''}
          </div>
        </div>

        <div style="margin-top:14px;padding:10px 14px;background:#F0F8F4;border-radius:8px;border:1px solid rgba(23,121,91,.2);font-size:12.5px;color:var(--green);line-height:1.5;">
          ✓ <strong>Acción institucional en proceso:</strong> Tu orientador(a) ${psychName} ha recibido esta solicitud en su panel y te contactará para darte seguimiento personal y confidencial.
        </div>
      </div>

      <div class="email-footer-actions">
        <button class="btn-maroon" style="padding:8px 18px;font-size:12.5px;" onclick="closeModal()">
          Entendido ✓
        </button>
      </div>
    </div>
  `);
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
    <button class="btn-maroon" style="width:100%;margin-top:16px;" onclick="closeModal()">Terminar pausa</button>
  `);
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

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:44px;margin-bottom:12px;">🤝</div>
      <h3 style="font-size:20px;margin-bottom:8px;">Solicitud recibida con éxito</h3>
      <p style="font-size:14px;color:var(--ink-soft);line-height:1.6;margin-bottom:20px;">
        Tu orientador(a) <strong>${s.guardian || 'Orientador(a) Institucional'}</strong> ha recibido tu notificación prioritaria. Se pondrá en contacto contigo de forma privada y discreta en el plantel escolar.
      </p>
      <button class="btn-maroon" style="width:100%;" onclick="closeModal()">Entendido</button>
    </div>
  `);
}

/* ---------- VISTA: HABLAR CON EIRÉN ---------- */
function renderStudentEirene(){
  const g = eireneGreeting();

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">EIRÉNÉ · COMPAÑERA</span>
      <h1>Tu espacio con Eirén</h1>
      <p>Un espacio para escucharte, sin juicios y a tu ritmo.</p>
    </div>
  </div>

  <div class="eirene-hero">
    <div class="eirene-hero-body">
      <h2 class="eirene-greeting">${g.text} ${g.icon}</h2>
      <p class="eirene-line">Soy Eirene — aquí estoy, sin juicios, contigo y a tu ritmo. 💚</p>
      <p class="eirene-line">Cuéntame cómo va tu día. Si sientes cansancio o presión, podemos hacer una pausa juntos.</p>
    </div>
  </div>

  <div class="eirene-care" style="margin-top:24px;">
    <button class="eirene-care-card" onclick="eireneStartBreathing()">
      <div class="ecc-icon">💧</div>
      <div class="ecc-body">
        <span class="ecc-title">Pausa de Respiración</span>
        <span class="ecc-sub">3 minutos para bajar el ritmo</span>
      </div>
    </button>
    <button class="eirene-care-card" onclick="nav('student_diario')">
      <div class="ecc-icon">📓</div>
      <div class="ecc-body">
        <span class="ecc-title">Escribir lo que siento</span>
        <span class="ecc-sub">En mi Diario privado</span>
      </div>
    </button>
  </div>
  `;
}

/* ---------- VISTA: CONSEJOS DE ORIÓN ---------- */
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
      <span class="eyebrow">✧ ORIÓN · GUÍA ESCOLAR</span>
      <h1>Consejos de Orión</h1>
      <p>Orientación para tus hábitos de estudio y trayectoria en CONALEP.</p>
    </div>
  </div>

  <div class="panel" style="padding:28px;">
    <h2 class="orion-title">Hola ${firstName}, soy Orión.</h2>
    <div class="orion-msg" style="margin-bottom:20px;">
      Puedo ayudarte a organizar tus horarios, resolver bloqueos de estudio y brindarte consejos prácticos para tus materias técnicas.
    </div>

    <div class="orion-chips">
      ${chips.map(c => `
        <button class="orion-chip" onclick="orionStudentAnswer('${escapeHTML(c.q)}','${escapeHTML(c.a)}')">${c.q}</button>
      `).join('')}
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
  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">CAMPUS INTERACTIVO 3D</span>
      <h1>Campus 3D y Dinámicas</h1>
      <p>Recorridos virtuales del plantel CONALEP y juegos de concentración.</p>
    </div>
    <span class="demo-chip">Integración Mérida 3D</span>
  </div>

  <div class="quick-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">
    <div class="panel" style="padding:24px;">
      <div style="font-size:36px;margin-bottom:10px;">🏫</div>
      <h3>Plantel CONALEP Virtual (3D)</h3>
      <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;margin:8px 0 16px;">
        Recorrido virtual en 3D por las aulas, talleres de especialidad, explanada y cubículo de Orientación.
      </p>
      <button class="btn-maroon" style="width:100%;" onclick="open3dDemo('Plantel CONALEP')">Iniciar Recorrido 3D →</button>
    </div>

    <div class="panel" style="padding:24px;">
      <div style="font-size:36px;margin-bottom:10px;">🌉</div>
      <h3>Puente de Progreso (3D)</h3>
      <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;margin:8px 0 16px;">
        Paseo paisajístico relajante para despejar la mente y reducir el estrés.
      </p>
      <button class="btn-maroon" style="width:100%;" onclick="open3dDemo('Puente de Progreso')">Iniciar Experiencia →</button>
    </div>

    <div class="panel" style="padding:24px;">
      <div style="font-size:36px;margin-bottom:10px;">🧩</div>
      <h3>Laberinto de la Calma</h3>
      <p style="font-size:13px;color:var(--ink-soft);line-height:1.5;margin:8px 0 16px;">
        Minijuego de enfoque para antes de un examen o entrega de proyecto.
      </p>
      <button class="btn-maroon" style="width:100%;" onclick="open3dDemo('Laberinto de la Calma')">Jugar Dinámica →</button>
    </div>
  </div>
  `;
}

function open3dDemo(nombre){
  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <h3 style="font-size:18px;margin-bottom:12px;">🎮 ${nombre}</h3>
    <div style="width:100%;height:320px;background:#0F172A;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
      <div style="font-size:52px;margin-bottom:10px;">🎮</div>
      <p style="font-size:14px;color:#94A3B8;text-align:center;padding:0 20px;">
        Listo para conectar los modelos 3D y videojuegos generados para el plantel de Mérida.
      </p>
    </div>
  `);
}

/* ---------- VISTA: MI DIARIO ---------- */
function renderStudentDiario(){
  const user = getCurrentUser();
  const sId = user.matricula || user.id;
  const entries = (db.diary && db.diary[sId]) || [];

  return `
  <div class="page-head">
    <div>
      <span class="eyebrow">📔 MI ESPACIO PRIVADO</span>
      <h1>Mi Diario Emocional</h1>
      <p>Escribe lo que sientes de forma privada. Un espacio seguro para ti.</p>
    </div>
  </div>

  <div class="student-checkin-box">
    <div class="sc-header">
      <h3>Nueva reflexión</h3>
      <p>Tus notas se guardan de forma privada en tu dispositivo.</p>
    </div>

    <div class="student-note-field">
      <textarea id="diaryEntryInput" style="min-height:100px;" placeholder="¿Qué pasó hoy? ¿Qué pensamiento quieres soltar hoy?"></textarea>
    </div>

    <button class="btn-maroon" onclick="saveStudentDiarioEntry()">
      Guardar en mi Diario →
    </button>
  </div>

  <span class="section-label">Historial</span>
  <h2 class="section-title">Entradas anteriores</h2>
  <div class="panel">
    ${entries.length ? entries.slice().reverse().map(e => `
      <div class="follow-row">
        <div class="f-avatar" style="background:var(--green-soft);color:var(--green);font-size:18px;">📓</div>
        <div class="f-body"><span class="f-name">${escapeHTML(e.text)}</span></div>
        <div class="f-meta"><span class="f-date">${e.date}</span></div>
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

  db.diary[sId].push({ id:'dia_' + Date.now(), date:fechaStr, text });
  saveDB();
  nav('student_diario');
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

/* ---------- Modal y Lógica para que el Estudiante cambie su contraseña ---------- */
function openStudentCambiarPasswordModal(){
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : {};
  const s = db.students[user.matricula || user.id] || user;

  openModal(`
    <button class="close-x" onclick="closeModal()">✕</button>
    <span class="section-label">Seguridad de tu Cuenta</span>
    <h3 style="font-size:18px;margin-bottom:6px;">Cambiar Mi Contraseña de Acceso</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.55;margin-bottom:18px;">
      Estudiante: <strong>${escapeHTML(s.nombre || '')}</strong> (Matrícula: <strong>${escapeHTML(s.matricula || '')}</strong>)
    </p>

    <form id="formStudentChangePass" onsubmit="handleStudentCambiarPasswordSubmit(event)" autocomplete="off">
      <div class="proto-form-field">
        <label for="scpNewPass">Nueva Contraseña *</label>
        <input type="password" id="scpNewPass" placeholder="Mínimo 6 caracteres" minlength="6" required>
        <div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">Usa una contraseña que puedas recordar para tus próximos inicios de sesión.</div>
      </div>

      <div class="proto-form-field" style="margin-top:12px;">
        <label for="scpConfirmPass">Confirmar Nueva Contraseña *</label>
        <input type="password" id="scpConfirmPass" placeholder="Repite tu contraseña" minlength="6" required>
      </div>

      <div class="proto-form-error" id="scpError" style="margin-top:12px;"></div>

      <div class="proto-form-actions" style="margin-top:20px;">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn-maroon">Guardar Contraseña →</button>
      </div>
    </form>
  `);
}

async function handleStudentCambiarPasswordSubmit(e){
  e.preventDefault();
  const newPass = document.getElementById('scpNewPass').value.trim();
  const confirmPass = document.getElementById('scpConfirmPass').value.trim();
  const errEl = document.getElementById('scpError');

  if(newPass.length < 6){
    if(errEl){ errEl.textContent = 'La contraseña debe tener mínimo 6 caracteres.'; errEl.style.display = 'block'; }
    return;
  }
  if(newPass !== confirmPass){
    if(errEl){ errEl.textContent = 'Las contraseñas no coinciden.'; errEl.style.display = 'block'; }
    return;
  }

  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const s = user ? (db.students[user.matricula || user.id] || user) : null;
  if(!s){
    if(errEl){ errEl.textContent = 'No se encontró la sesión del alumno.'; errEl.style.display = 'block'; }
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if(submitBtn){
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando contraseña...';
  }

  try{
    const pwdHash = (typeof hashPassword === 'function') ? await hashPassword(newPass) : newPass;
    s.password = newPass;
    s.passwordHash = pwdHash;
    s.avatar = s.avatar || {};
    s.avatar._auth_hash = pwdHash;

    if(db.students[s.matricula]){
      db.students[s.matricula] = { ...db.students[s.matricula], password: newPass, passwordHash: pwdHash, avatar: s.avatar };
    }
    if(db.users[s.matricula]){
      db.users[s.matricula] = { ...db.users[s.matricula], password: newPass, passwordHash: pwdHash, avatar: s.avatar };
    }
    saveDB();

    // Guardar hash en Supabase cloud en avatar_config
    if(typeof isSupabaseLive === 'function' && isSupabaseLive()){
      const client = (typeof getActiveSupabaseClient === 'function') ? getActiveSupabaseClient() : null;
      if(client){
        try{
          await client.from('students').update({ avatar_config: s.avatar }).eq('matricula', s.matricula);
        }catch(e){
          console.warn('Aviso sincronizando avatar_config en Supabase:', e);
        }
        if(client.auth){
          try{
            await client.auth.updateUser({ password: newPass });
          }catch(e){}
        }
      }
    }

    closeModal();
    alert('✅ Tu contraseña ha sido cambiada exitosamente. Úsala en tu próximo inicio de sesión.');
  }catch(err){
    if(errEl){
      errEl.textContent = err.message || 'Error al actualizar contraseña.';
      errEl.style.display = 'block';
    }
    if(submitBtn){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Contraseña →';
    }
  }
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
  renderStudentUserProfile();
  renderStudentSidebar();
  nav('student_inicio');

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
  renderStudentUserProfile();
  renderStudentSidebar();
  nav(currentStudentSection);
});

/* ============================================================
   GESTIÓN DE FOTO DE PERFIL ESTILO RED SOCIAL (FACEBOOK)
   ============================================================ */
let tempProfilePhotoDataUrl = null;

function openStudentPhotoModal(){
  tempProfilePhotoDataUrl = null;
  const user = getCurrentUser();
  const s = db.students[user.matricula || user.id] || user;
  const currentPhoto = (typeof getStudentPhoto === 'function') ? getStudentPhoto(s) : (s.photo || s.avatar?.photo || null);

  openModal(`
    <div class="photo-modal-card">
      <button class="close-x" onclick="closeModal()">✕</button>
      
      <div class="pm-header">
        <div class="pm-icon-wrap">📷</div>
        <div>
          <h3 style="margin:0;font-size:18px;color:var(--ink);">Foto de Perfil del Alumno</h3>
          <p style="margin:4px 0 0;font-size:13px;color:var(--ink-soft);line-height:1.45;">
            Sube tu foto real tal como en Facebook para que tu orientador(a) te identifique fácilmente en tus reportes y expediente.
          </p>
        </div>
      </div>

      <div class="pm-preview-container">
        <div class="pm-preview-circle" id="photoPreviewCircle">
          ${currentPhoto ? `
            <img src="${escapeHTML(currentPhoto)}" id="photoPreviewImg" alt="Foto de perfil actual">
          ` : `
            <div class="pm-placeholder-view" id="photoPlaceholderView">
              <span style="font-size:48px;">👤</span>
              <span style="font-size:12px;color:var(--ink-muted);margin-top:4px;">Sin foto seleccionada</span>
            </div>
          `}
        </div>
      </div>

      <div class="pm-actions-bar">
        <input type="file" id="studentPhotoFileInput" accept="image/png, image/jpeg, image/jpg, image/webp" style="display:none;" onchange="handleStudentPhotoFileChosen(event)">
        
        <button type="button" class="btn-maroon" onclick="document.getElementById('studentPhotoFileInput').click()" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <span>📁</span> Seleccionar foto de tu dispositivo
        </button>

        ${currentPhoto ? `
          <button type="button" class="btn-ghost" style="color:var(--danger);display:inline-flex;align-items:center;gap:4px;cursor:pointer;" onclick="deleteStudentProfilePhoto()">
            <span>🗑️</span> Quitar foto actual
          </button>
        ` : ''}
      </div>

      <div id="photoSaveSection" style="display:none;margin-top:22px;padding-top:16px;border-top:1px solid var(--line);">
        <div style="font-size:12.5px;color:var(--green);font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:6px;justify-content:center;">
          <span>✓</span> Vista previa lista. ¿Deseas guardar esta foto?
        </div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button type="button" class="btn-ghost" onclick="cancelPhotoUpload()">Descartar</button>
          <button type="button" class="btn-maroon" id="btnConfirmPhotoSave" onclick="saveStudentProfilePhoto()">
            Guardar como foto de perfil →
          </button>
        </div>
      </div>
    </div>
  `);
}

function handleStudentPhotoFileChosen(e){
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
      tempProfilePhotoDataUrl = canvas.toDataURL('image/jpeg', 0.88);

      // Actualizar vista previa en el modal
      const circleEl = document.getElementById('photoPreviewCircle');
      if(circleEl){
        circleEl.innerHTML = `<img src="${tempProfilePhotoDataUrl}" alt="Nueva foto de perfil">`;
      }
      const saveSec = document.getElementById('photoSaveSection');
      if(saveSec) saveSec.style.display = 'block';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function cancelPhotoUpload(){
  tempProfilePhotoDataUrl = null;
  const user = getCurrentUser();
  const s = db.students[user.matricula || user.id] || user;
  const currentPhoto = (typeof getStudentPhoto === 'function') ? getStudentPhoto(s) : (s.photo || s.avatar?.photo || null);
  const circleEl = document.getElementById('photoPreviewCircle');
  if(circleEl){
    if(currentPhoto){
      circleEl.innerHTML = `<img src="${escapeHTML(currentPhoto)}" alt="Foto de perfil actual">`;
    } else {
      circleEl.innerHTML = `
        <div class="pm-placeholder-view" id="photoPlaceholderView">
          <span style="font-size:48px;">👤</span>
          <span style="font-size:12px;color:var(--ink-muted);margin-top:4px;">Sin foto seleccionada</span>
        </div>
      `;
    }
  }
  const saveSec = document.getElementById('photoSaveSection');
  if(saveSec) saveSec.style.display = 'none';
}

async function saveStudentProfilePhoto(){
  if(!tempProfilePhotoDataUrl) return;
  const user = getCurrentUser();
  const matricula = user.matricula || user.id;
  const s = db.students[matricula] || user;

  const saveBtn = document.getElementById('btnConfirmPhotoSave');
  if(saveBtn){
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando foto...';
  }

  // 1. Guardar localmente
  s.photo = tempProfilePhotoDataUrl;
  if(!s.avatar) s.avatar = {};
  s.avatar.photo = tempProfilePhotoDataUrl;

  db.students[matricula] = s;
  if(db.users[matricula]) db.users[matricula] = s;
  saveDB();

  // Actualizar sesión activa
  if(typeof setSessionUser === 'function'){
    setSessionUser(s);
  }

  // 2. Sincronizar a Supabase si está en vivo
  if(isSupabaseLive()){
    try{
      const client = getActiveSupabaseClient();
      if(client){
        await client.from('students').update({
          avatar_config: { ...(s.avatar || {}), photo: tempProfilePhotoDataUrl }
        }).eq('matricula', matricula);
        console.log('✅ Foto de perfil sincronizada con Supabase para matrícula:', matricula);
      }
    }catch(err){
      console.warn('Aviso sincronizando foto con Supabase:', err);
    }
  }

  closeModal();
  renderStudentUserProfile();
  if(currentStudentSection === 'student_inicio'){
    nav('student_inicio');
  }
}

async function deleteStudentProfilePhoto(){
  if(!confirm('¿Estás seguro de que deseas eliminar tu foto de perfil actual?')) return;
  const user = getCurrentUser();
  const matricula = user.matricula || user.id;
  const s = db.students[matricula] || user;

  delete s.photo;
  if(s.avatar) delete s.avatar.photo;

  db.students[matricula] = s;
  if(db.users[matricula]) db.users[matricula] = s;
  saveDB();

  if(typeof setSessionUser === 'function'){
    setSessionUser(s);
  }

  if(isSupabaseLive()){
    try{
      const client = getActiveSupabaseClient();
      if(client){
        await client.from('students').update({
          avatar_config: { ...(s.avatar || {}), photo: null }
        }).eq('matricula', matricula);
        console.log('✅ Foto eliminada en Supabase para matrícula:', matricula);
      }
    }catch(err){
      console.warn('Aviso eliminando foto en Supabase:', err);
    }
  }

  closeModal();
  renderStudentUserProfile();
  if(currentStudentSection === 'student_inicio'){
    nav('student_inicio');
  }
}

/* ============================================================
   SECCIÓN: TAMIZAJE PSICOEMOCIONAL ESTUDIANTIL (PIOE - 100% NATIVO)
   ============================================================ */

let tamizajeQuizActive = false;
let tamizajeCurrentStep = 1; // 1: PHQ-A, 2: GAD-7, 3: Hábitos y Recursos
let tamizajeAnswers = {};

const TAMIZAJE_OPTS = [
  { val: 0, lbl: 'Para nada (0)' },
  { val: 1, lbl: 'Varios días (1)' },
  { val: 2, lbl: 'Más de la mitad (2)' },
  { val: 3, lbl: 'Casi todos los días (3)' }
];

const PHQ_QUESTIONS = [
  { id: 'phq1', text: '1. ¿Poco interés o placer en hacer cosas que antes disfrutabas?' },
  { id: 'phq2', text: '2. ¿Sensación de estar decaído/a, triste, deprimido/a o sin esperanzas?' },
  { id: 'phq3', text: '3. ¿Dificultad para conciliar el sueño, permanecer dormido/a, o dormir demasiado?' },
  { id: 'phq4', text: '4. ¿Sensación de cansancio crónico, agotamiento o falta de energía?' },
  { id: 'phq5', text: '5. ¿Poco apetito o tendencia a comer en exceso?' },
  { id: 'phq6', text: '6. ¿Sentirte mal contigo mismo/a, sentir que has fracasado o decepcionado a tu familia?' },
  { id: 'phq7', text: '7. ¿Dificultad para concentrarte en tus tareas escolares, clases o lecturas?' },
  { id: 'phq8', text: '8. ¿Moverte o hablar tan lento que otros lo notan, o al revés, inquietud excesiva?' },
  { id: 'phq9', text: '9. ¿Pensamientos de que estarías mejor muerto/a o deseos de hacerte daño?' }
];

const GAD_QUESTIONS = [
  { id: 'gad1', text: '1. ¿Sentirte nervioso/a, intranquilo/a o con los nervios de punta?' },
  { id: 'gad2', text: '2. ¿No poder parar o controlar las preocupaciones constantes?' },
  { id: 'gad3', text: '3. ¿Preocuparte demasiado por diferentes cosas a la vez?' },
  { id: 'gad4', text: '4. ¿Dificultad para relajarte o desconectarte de los pendientes?' },
  { id: 'gad5', text: '5. ¿Estar tan inquieto/a que te resulta difícil quedarte quieto/a?' },
  { id: 'gad6', text: '6. ¿Molestarte, irritarte o enojarte con mucha facilidad?' },
  { id: 'gad7', text: '7. ¿Sentir miedo o temor repentino como si algo terrible fuera a pasar?' }
];

const HABIT_QUESTIONS = [
  { id: 'hab1', text: '1. ¿Cuentas con al menos una persona de confianza en tu familia o amigos con quien hablar si tienes un problema?' },
  { id: 'hab2', text: '2. ¿Duermes entre 6 y 8 horas diarias de forma reparadora?' },
  { id: 'hab3', text: '3. ¿Sientes que puedes manejar la carga académica y las entregas de proyectos sin colapsar?' },
  { id: 'hab4', text: '4. ¿Realizas actividades recreativas, físicas o artísticas fuera del horario escolar?' }
];

function renderStudentTamizaje(){
  const user = getCurrentUser();
  const matricula = user.matricula || user.id;
  const s = db.students[matricula] || user;
  const t = s.tamizaje || null;

  if(!t || tamizajeQuizActive){
    return renderStudentTamizajeQuiz(s);
  } else {
    return renderStudentTamizajeDashboard(s, t);
  }
}

function startTamizajeQuiz(){
  tamizajeQuizActive = true;
  tamizajeCurrentStep = 1;
  tamizajeAnswers = {};
  nav('student_tamizaje');
}

function renderStudentTamizajeQuiz(s){
  let stepTitle = 'Dimensión 1: Estado de Ánimo & Afecto (PHQ-A)';
  let stepDesc = 'Durante las últimas 2 semanas, ¿con qué frecuencia te han molestado los siguientes problemas?';
  let questions = PHQ_QUESTIONS;

  if(tamizajeCurrentStep === 2){
    stepTitle = 'Dimensión 2: Ansiedad & Manejo del Estrés (GAD-7)';
    stepDesc = 'Durante las últimas 2 semanas, ¿con qué frecuencia te has sentido afectado/a por estas situaciones?';
    questions = GAD_QUESTIONS;
  } else if(tamizajeCurrentStep === 3){
    stepTitle = 'Dimensión 3: Hábitos Saludables & Factores Protectores';
    stepDesc = 'Evalúa tu entorno cotidiano y los recursos con los que cuentas en CONALEP Mérida 1.';
    questions = HABIT_QUESTIONS;
  }

  const totalSteps = 3;
  const pct = Math.round((tamizajeCurrentStep / totalSteps) * 100);

  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">PROGRAMA INSTITUCIONAL DE ORIENTACIÓN EDUCATIVA (PIOE)</span>
        <h1>Tamizaje Psicoemocional Estudiantil</h1>
        <p>Cuestionario confidencial de tamizaje escolar para acompañar tu bienestar integral en CONALEP Mérida 1.</p>
      </div>
      <span class="demo-chip">Paso ${tamizajeCurrentStep} de ${totalSteps}</span>
    </div>

    <!-- Barra de Progreso -->
    <div style="background:#FFF;border:1px solid var(--line);border-radius:10px;padding:16px 20px;margin-bottom:20px;box-shadow:var(--shadow-sm);">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;font-weight:700;color:var(--maroon);margin-bottom:6px;">
        <span>${stepTitle}</span>
        <span>${pct}% Completado</span>
      </div>
      <div style="height:8px;background:var(--sand);border-radius:10px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:var(--maroon);border-radius:10px;transition:width .3s ease;"></div>
      </div>
      <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">
        ${stepDesc}
      </div>
    </div>

    <!-- Formulario de Preguntas -->
    <div class="tamizaje-quiz-card">
      ${questions.map((q, idx) => {
        const currentVal = tamizajeAnswers[q.id];
        return `
          <div class="tamizaje-q-item">
            <div class="tamizaje-q-title">${escapeHTML(q.text)}</div>
            <div class="tamizaje-opts-row">
              ${TAMIZAJE_OPTS.map(opt => `
                <div class="tamizaje-opt-btn ${currentVal === opt.val ? 'active' : ''}"
                     id="btnOpt_${q.id}_${opt.val}"
                     onclick="selectTamizajeAnswer('${q.id}', ${opt.val})">
                  ${opt.lbl}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;padding-top:16px;border-top:1px solid var(--line);flex-wrap:wrap;gap:12px;">
        <div>
          ${tamizajeCurrentStep > 1 ? `
            <button type="button" class="btn-ghost" onclick="tamizajeGoStep(${tamizajeCurrentStep - 1})">
              ← Anterior
            </button>
          ` : `
            ${s.tamizaje ? `
              <button type="button" class="btn-ghost" onclick="tamizajeQuizActive=false; nav('student_tamizaje');">
                ✕ Cancelar y volver al informe
              </button>
            ` : ''}
          `}
        </div>

        <div>
          ${tamizajeCurrentStep < totalSteps ? `
            <button type="button" class="btn-maroon" onclick="tamizajeNextStep(${tamizajeCurrentStep + 1})">
              Siguiente Sección →
            </button>
          ` : `
            <button type="button" class="btn-maroon" onclick="finishTamizajeQuiz()">
              ✓ Finalizar y Generar Resultados
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

function selectTamizajeAnswer(qId, val){
  tamizajeAnswers[qId] = val;
  TAMIZAJE_OPTS.forEach(opt => {
    const el = document.getElementById(`btnOpt_${qId}_${opt.val}`);
    if(el) el.classList.toggle('active', opt.val === val);
  });
}

function tamizajeGoStep(step){
  tamizajeCurrentStep = step;
  nav('student_tamizaje');
  window.scrollTo(0, 0);
}

function tamizajeNextStep(nextStep){
  const currentQs = tamizajeCurrentStep === 1 ? PHQ_QUESTIONS : (tamizajeCurrentStep === 2 ? GAD_QUESTIONS : HABIT_QUESTIONS);
  const unanswered = currentQs.filter(q => tamizajeAnswers[q.id] === undefined);

  if(unanswered.length > 0){
    alert(`Por favor responde todas las preguntas antes de avanzar (${unanswered.length} pendiente${unanswered.length!==1?'s':''}).`);
    return;
  }

  tamizajeCurrentStep = nextStep;
  nav('student_tamizaje');
  window.scrollTo(0, 0);
}

function finishTamizajeQuiz(){
  const allQs = [...PHQ_QUESTIONS, ...GAD_QUESTIONS, ...HABIT_QUESTIONS];
  const unanswered = allQs.filter(q => tamizajeAnswers[q.id] === undefined);

  if(unanswered.length > 0){
    alert(`Por favor responde todas las preguntas del cuestionario (${unanswered.length} pendiente${unanswered.length!==1?'s':''}).`);
    return;
  }

  // 1. Puntaje PHQ-A (0-27)
  let phqScore = 0;
  PHQ_QUESTIONS.forEach(q => { phqScore += (tamizajeAnswers[q.id] || 0); });
  let phqLevel = 'Mínimo';
  if(phqScore >= 20) phqLevel = 'Grave';
  else if(phqScore >= 15) phqLevel = 'Moderadamente grave';
  else if(phqScore >= 10) phqLevel = 'Moderado';
  else if(phqScore >= 5) phqLevel = 'Leve';

  // 2. Puntaje GAD-7 (0-21)
  let gadScore = 0;
  GAD_QUESTIONS.forEach(q => { gadScore += (tamizajeAnswers[q.id] || 0); });
  let gadLevel = 'Mínima';
  if(gadScore >= 15) gadLevel = 'Severa';
  else if(gadScore >= 10) gadLevel = 'Moderada';
  else if(gadScore >= 5) gadLevel = 'Leve';

  // 3. Puntaje Hábitos y Factores Protectores (0-12)
  let habScore = 0;
  HABIT_QUESTIONS.forEach(q => { habScore += (tamizajeAnswers[q.id] || 0); });
  let habLevel = habScore >= 8 ? 'Alto' : (habScore >= 4 ? 'Moderado' : 'Bajo');

  // 4. Riesgo Global
  const selfHarmAlert = (tamizajeAnswers['phq9'] || 0) >= 1;
  let globalRisk = 'none';

  if(selfHarmAlert || phqScore >= 20 || gadScore >= 15){
    globalRisk = 'crisis';
  } else if(phqScore >= 15 || gadScore >= 10){
    globalRisk = 'high';
  } else if(phqScore >= 10 || gadScore >= 8){
    globalRisk = 'mid';
  } else if(phqScore >= 5 || gadScore >= 5){
    globalRisk = 'low';
  }

  const user = getCurrentUser();
  const matricula = user.matricula || user.id;
  const s = db.students[matricula] || user;

  const results = {
    fecha: new Date().toISOString(),
    respuestas: { ...tamizajeAnswers },
    resultados: {
      phq: { puntaje: phqScore, max: 27, nivel: phqLevel },
      gad: { puntaje: gadScore, max: 21, nivel: gadLevel },
      recursos: { puntaje: habScore, max: 12, nivel: habLevel },
      alertaAutolesion: selfHarmAlert,
      riesgoGlobal: globalRisk
    }
  };

  s.tamizaje = results;
  s.riesgo = globalRisk;
  db.students[matricula] = s;

  // Registrar alerta en orientador si es riesgo alto o crisis
  if(globalRisk === 'high' || globalRisk === 'crisis'){
    if(!db.alerts) db.alerts = [];
    const newAlert = {
      id: 'alt_tam_' + Date.now(),
      studentId: matricula,
      studentName: s.nombre,
      tipo: globalRisk === 'crisis' ? 'Tamizaje: Urgente / Crisis' : 'Tamizaje: Riesgo Alto',
      mensaje: `El estudiante ${s.nombre} completó el cuestionario PIOE con puntajes de atención prioritaria (PHQ-A: ${phqScore}/27, GAD-7: ${gadScore}/21${selfHarmAlert ? ', Indicador de alerta activa en reactivo 9' : ''}).`,
      priority: globalRisk === 'crisis' ? 'alta' : 'media',
      status: 'pendiente',
      created_at: new Date().toISOString()
    };
    db.alerts.unshift(newAlert);
  }

  saveDB();
  tamizajeQuizActive = false;
  nav('student_tamizaje');
  alert('✓ Evaluación procesada con éxito. Ya puedes consultar tu informe de bienestar.');
}

/* ============================================================
   PANEL DE RESULTADOS NATIVO (CHART.JS)
   ============================================================ */
function renderStudentTamizajeDashboard(s, t){
  const r = t.resultados || {};
  const globalRisk = r.riesgoGlobal || 'none';
  const phq = r.phq || { puntaje: 0, nivel: 'Mínimo' };
  const gad = r.gad || { puntaje: 0, nivel: 'Mínima' };
  const rec = r.recursos || { puntaje: 0, nivel: 'Moderado' };

  const riskLabel = {
    none: 'Sin riesgo / Bienestar estable',
    low: 'Riesgo bajo / Preventivo',
    mid: 'Riesgo moderado / Atención oportuna',
    high: 'Riesgo alto / Seguimiento prioritario',
    crisis: 'Alerta prioritaria / Acompañamiento inmediato'
  }[globalRisk] || 'En evaluación';

  setTimeout(() => mountTamizajeCharts(phq.puntaje, gad.puntaje, rec.puntaje), 150);

  return `
    <div class="page-head">
      <div>
        <span class="eyebrow">PROGRAMA INSTITUCIONAL DE ORIENTACIÓN EDUCATIVA (PIOE)</span>
        <h1>Informe de Bienestar Psicoemocional</h1>
        <p>Resultados individualizados conforme a las escalas validadas PHQ-A y GAD-7 de salud escolar.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-outline-maroon" onclick="printTamizajeView()" style="font-size:12px;padding:7px 14px;">
          🖨 Imprimir Informe
        </button>
        <button class="btn-maroon" onclick="startTamizajeQuiz()" style="font-size:12px;padding:7px 14px;">
          🔄 Repetir Evaluación
        </button>
      </div>
    </div>

    <!-- Banner de Estado Global -->
    <div class="tamizaje-student-card" style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
        <div>
          <span class="section-label" style="margin:0;">ESTADO GENERAL DE LA EVALUACIÓN</span>
          <h2 style="font-size:20px;margin:2px 0 0 0;color:var(--ink);">${riskLabel}</h2>
        </div>
        <span class="risk-badge-native ${globalRisk}" style="font-size:13px;padding:6px 14px;">
          ${(globalRisk).toUpperCase()}
        </span>
      </div>

      <p style="font-size:13px;color:var(--ink-soft);line-height:1.55;margin-bottom:16px;">
        Evaluación realizada el <strong>${new Date(t.fecha).toLocaleDateString('es-MX', {day:'2-digit',month:'long',year:'numeric'})}</strong>. Tus indicadores quedan resguardados de forma confidencial en el Departamento de Orientación y Tutorías de CONALEP Mérida 1.
      </p>

      <div class="tamizaje-kpi-grid">
        <div class="tamizaje-kpi-box">
          <div class="val" style="color:var(--maroon);">${phq.puntaje} / 27</div>
          <div class="lbl">Ánimo / Depresión (PHQ-A: ${phq.nivel})</div>
        </div>
        <div class="tamizaje-kpi-box">
          <div class="val" style="color:#B47D0A;">${gad.puntaje} / 21</div>
          <div class="lbl">Estrés / Ansiedad (GAD-7: ${gad.nivel})</div>
        </div>
        <div class="tamizaje-kpi-box">
          <div class="val" style="color:var(--green);">${rec.puntaje} / 12</div>
          <div class="lbl">Factores Protectores (${rec.nivel})</div>
        </div>
      </div>
    </div>

    <!-- Gráficas Nativas Chart.js -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:20px;margin-bottom:24px;">
      <div class="card">
        <div class="card-hdr" style="margin-bottom:14px;">
          <div class="card-ttl" style="font-size:14px;color:var(--ink);">
            📊 Puntuación por Escala Clínica
          </div>
        </div>
        <div style="position:relative;height:220px;">
          <canvas id="tamizajeChartBar"></canvas>
        </div>
      </div>

      <div class="card">
        <div class="card-hdr" style="margin-bottom:14px;">
          <div class="card-ttl" style="font-size:14px;color:var(--ink);">
            🕸️ Radar de Vulnerabilidad y Protección
          </div>
        </div>
        <div style="position:relative;height:220px;">
          <canvas id="tamizajeChartRadar"></canvas>
        </div>
      </div>
    </div>

    <!-- Recomendaciones Personalizadas -->
    <div class="card" style="border-left:4px solid var(--maroon);">
      <div class="card-hdr" style="margin-bottom:12px;">
        <div class="card-ttl" style="font-size:15px;color:var(--maroon);">
          💡 Orientaciones y Recomendaciones Institucionales
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:1.6;color:var(--ink-soft);">
        <div>
          <strong style="color:var(--ink);">1. Acompañamiento en Cubículo de Orientación:</strong>
          Si sientes que el estrés escolar, la carga de tareas o alguna situación personal te sobrepasa, puedes solicitar una cita directa con tu orientador(a) en cualquier momento desde tu portal.
        </div>
        <div>
          <strong style="color:var(--ink);">2. Hábitos de Sueño y Recuperación:</strong>
          Mantener horarios regulares para dormir ayuda a disminuir la fatiga mental y mejora notablemente la concentración durante tus módulos técnicos.
        </div>
        <div>
          <strong style="color:var(--ink);">3. Red de Apoyo Escolar:</strong>
          Recuerda que cuentas con docentes tutores y el equipo de tutorías en el Plantel Mérida 1 para apoyarte en cualquier ajuste académico que requieras.
        </div>
      </div>
    </div>
  `;
}

function mountTamizajeCharts(phq, gad, rec){
  if(typeof Chart === 'undefined') return;

  const barCtx = document.getElementById('tamizajeChartBar');
  if(barCtx){
    if(window._chartTamBar) window._chartTamBar.destroy();
    window._chartTamBar = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['PHQ-A (Ánimo)', 'GAD-7 (Ansiedad)', 'Factores Protectores'],
        datasets: [{
          label: 'Tu Puntuación',
          data: [phq, gad, rec],
          backgroundColor: ['#7E1C3E', '#B47D0A', '#1E7E34'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 27, grid: { color: 'rgba(0,0,0,0.06)' } },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  const radarCtx = document.getElementById('tamizajeChartRadar');
  if(radarCtx){
    if(window._chartTamRadar) window._chartTamRadar.destroy();
    window._chartTamRadar = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: ['Regulación Afectiva', 'Control de Ansiedad', 'Red de Apoyo', 'Sueño & Energía', 'Disposición Escolar'],
        datasets: [{
          label: 'Nivel Estimado',
          data: [
            Math.max(1, 10 - Math.round(phq / 3)),
            Math.max(1, 10 - Math.round(gad / 2.5)),
            Math.min(10, Math.round(rec * 2)),
            Math.max(2, 10 - Math.round((phq + gad) / 5)),
            8
          ],
          backgroundColor: 'rgba(126, 28, 62, 0.2)',
          borderColor: '#7E1C3E',
          pointBackgroundColor: '#7E1C3E'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 10,
            grid: { color: 'rgba(0,0,0,0.06)' },
            angleLines: { color: 'rgba(0,0,0,0.06)' }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

function printTamizajeView(){
  const user = getCurrentUser() || {};
  const matricula = user.matricula || user.id;
  const s = db.students[matricula] || user;
  const t = s.tamizaje || {};
  const r = t.resultados || {};
  const globalRisk = r.riesgoGlobal || 'none';
  const phq = r.phq || { puntaje: 0, nivel: 'Mínimo' };
  const gad = r.gad || { puntaje: 0, nivel: 'Mínima' };
  const rec = r.recursos || { puntaje: 0, nivel: 'Moderado' };

  const riskLabel = {
    none: 'Sin riesgo / Bienestar estable',
    low: 'Riesgo bajo / Preventivo',
    mid: 'Riesgo moderado / Atención oportuna',
    high: 'Riesgo alto / Seguimiento prioritario',
    crisis: 'Alerta prioritaria / Acompañamiento inmediato'
  }[globalRisk] || 'En evaluación';

  const riskColor = {
    none: '#1E7E34',
    low: '#007E67',
    mid: '#B47D0A',
    high: '#C0392B',
    crisis: '#7A0F0F'
  }[globalRisk] || '#7E1C3E';

  const now = new Date(t.fecha || Date.now());
  const dateStr = now.toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' });
  const folio = `PIOE-${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}-${String(matricula).replace(/[^a-zA-Z0-9]/g,'')}`;

  const printWindow = window.open('', '_blank');
  if(!printWindow){
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe Oficial de Tamizaje PIOE — ${escapeHTML(s.nombre || matricula)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter',sans-serif; color:#1A1A1A; background:#FFF; padding:24px; font-size:12px; line-height:1.55; }
        .sheet { max-width:820px; margin:0 auto; border:1px solid #D5D5D5; padding:32px; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,0.06); }
        .hdr { display:flex; justify-content:space-between; align-items:center; border-bottom:3px double #7E1C3E; padding-bottom:12px; margin-bottom:16px; }
        .hdr-title { font-size:15px; font-weight:800; color:#7E1C3E; text-transform:uppercase; font-family:'Space Grotesk',sans-serif; }
        .hdr-sub { font-size:10.5px; font-weight:700; color:#444; letter-spacing:.05em; text-transform:uppercase; margin-top:2px; }
        .folio-box { font-family:'IBM Plex Mono',monospace; font-size:10.5px; background:#FAF8F5; border:1px solid #E2DDD5; padding:6px 12px; border-radius:4px; text-align:right; font-weight:700; color:#7E1C3E; }
        .sec-title { font-size:11.5px; font-weight:800; color:#7E1C3E; text-transform:uppercase; letter-spacing:.05em; border-bottom:1.5px solid #F0ECE1; padding-bottom:4px; margin:14px 0 8px; font-family:'Space Grotesk',sans-serif; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; }
        .item-lbl { font-size:10px; font-weight:700; color:#666; text-transform:uppercase; }
        .item-val { font-size:12px; color:#111; font-weight:600; margin-top:1px; }
        .kpi-row { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin:12px 0; }
        .kpi-box { background:#FAF8F5; border:1px solid #E2DDD5; border-radius:6px; padding:12px; text-align:center; }
        .kpi-val { font-size:20px; font-weight:800; color:#7E1C3E; font-family:'Space Grotesk',sans-serif; }
        .kpi-lbl { font-size:10px; color:#555; font-weight:600; margin-top:2px; }
        .risk-banner { border:1.5px solid #E2DDD5; border-radius:6px; padding:12px 16px; margin:12px 0; display:flex; justify-content:space-between; align-items:center; background:#FAF8F5; }
        .risk-badge { font-weight:800; padding:4px 12px; border-radius:100px; font-size:11px; text-transform:uppercase; color:#FFF; }
        .p-block { background:#FAF8F5; border:1px solid #ECE7DD; border-radius:6px; padding:10px 14px; font-size:11.5px; margin-top:4px; line-height:1.55; }
        .sigs { display:grid; grid-template-columns:1fr 1fr 1fr; gap:18px; margin-top:32px; padding-top:12px; text-align:center; }
        .sig-line { border-top:1.5px solid #333; margin-top:36px; padding-top:4px; font-size:11px; font-weight:700; }
        .stamp { font-size:9.5px; color:#7E1C3E; font-weight:700; letter-spacing:.08em; margin-top:3px; }
        @media print {
          body { padding:0; background:#FFF; }
          .sheet { border:none; box-shadow:none; padding:10px; }
          .no-print { display:none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="max-width:820px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:700;color:#7E1C3E;">Vista Oficial CONALEP Mérida 1 — PIOE</span>
        <button onclick="window.print()" style="background:#7E1C3E;color:#FFF;border:none;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      <div class="sheet">
        <div class="hdr">
          <div>
            <div class="hdr-title">Colegio de Educación Profesional Técnica del Estado de Yucatán</div>
            <div class="hdr-sub">Plantel Mérida 1 · Departamento de Orientación Educativa & Tutorías</div>
            <div style="font-size:10px;color:#777;margin-top:2px;">Programa Institucional de Orientación Educativa (PIOE) · NAIMA OS</div>
          </div>
          <div class="folio-box">
            FOLIO REGISTRO<br>
            <span style="font-size:12px;">${folio}</span>
          </div>
        </div>

        <div class="sec-title">1. Datos del Estudiante</div>
        <div class="grid2">
          <div><div class="item-lbl">Nombre del Alumno:</div><div class="item-val">${escapeHTML(s.nombre || user.nombre || '—')}</div></div>
          <div><div class="item-lbl">Matrícula Escolar:</div><div class="item-val">${matricula}</div></div>
          <div><div class="item-lbl">Carrera Técnica:</div><div class="item-val">${escapeHTML(s.carrera || 'Técnico')}</div></div>
          <div><div class="item-lbl">Semestre / Grupo:</div><div class="item-val">${s.semestre || '—'} · ${s.grupo || '—'}</div></div>
          <div><div class="item-lbl">Fecha de Evaluación:</div><div class="item-val">${dateStr}</div></div>
          <div><div class="item-lbl">Orientador(a) Institucional:</div><div class="item-val">${escapeHTML(s.guardian || 'Departamento de Orientación y Tutorías')}</div></div>
        </div>

        <div class="sec-title">2. Estado Global de la Evaluación</div>
        <div class="risk-banner">
          <div>
            <div style="font-size:13px;font-weight:700;color:#111;">${riskLabel}</div>
            <div style="font-size:11px;color:#666;">Basado en las escalas psicométricas estandarizadas PHQ-A y GAD-7.</div>
          </div>
          <div class="risk-badge" style="background:${riskColor};">${globalRisk.toUpperCase()}</div>
        </div>

        <div class="sec-title">3. Puntuaciones Obtenidas por Dimensión Clínica</div>
        <div class="kpi-row">
          <div class="kpi-box">
            <div class="kpi-val">${phq.puntaje} / 27</div>
            <div class="kpi-lbl">Ánimo / Depresión (PHQ-A)</div>
            <div style="font-size:11px;font-weight:700;color:#7E1C3E;margin-top:2px;">Nivel: ${phq.nivel}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-val">${gad.puntaje} / 21</div>
            <div class="kpi-lbl">Ansiedad / Estrés (GAD-7)</div>
            <div style="font-size:11px;font-weight:700;color:#B47D0A;margin-top:2px;">Nivel: ${gad.nivel}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-val">${rec.puntaje} / 12</div>
            <div class="kpi-lbl">Factores Protectores</div>
            <div style="font-size:11px;font-weight:700;color:#1E7E34;margin-top:2px;">Nivel: ${rec.nivel}</div>
          </div>
        </div>

        <div class="sec-title">4. Interpretación Psicopedagógica</div>
        <div class="p-block">
          El presente instrumento de tamizaje socioemocional tiene fines preventivos y de detección temprana en el marco del Modelo Académico CONALEP. Los indicadores reflejan la percepción subjetiva del estudiante durante las últimas dos semanas lectivas.
        </div>

        <div class="sec-title">5. Recomendaciones de Acompañamiento y Autocuidado</div>
        <div class="p-block">
          • <strong>Orientación Escolar:</strong> El estudiante cuenta con el cubículo de orientación y tutorías para programar sesiones de seguimiento psicopedagógico en cualquier momento.<br>
          • <strong>Regulación de Hábitos:</strong> Mantener una higiene de sueño adecuada (6 a 8 horas) y balancear las horas dedicadas a proyectos técnicos con actividades de esparcimiento.<br>
          • <strong>Corresponsabilidad:</strong> La institución y la familia colaboran de forma confidencial para garantizar un entorno seguro y favorable al desarrollo académico.
        </div>

        <div class="sigs">
          <div>
            <div class="sig-line">${escapeHTML(s.nombre || user.nombre || 'Estudiante')}</div>
            <div>Firma del Estudiante</div>
            <div style="font-size:9.5px;color:#777;">Matrícula: ${matricula}</div>
          </div>
          <div>
            <div class="sig-line">${escapeHTML(s.guardian || 'Orientación Educativa')}</div>
            <div>Orientador(a) Institucional</div>
            <div class="stamp">✦ SELLO DIGITAL PIOE ✦</div>
          </div>
          <div>
            <div class="sig-line">Padre, Madre o Tutor Legal</div>
            <div>Firma de Enterado</div>
            <div style="font-size:9.5px;color:#777;">Plantel Mérida 1</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

