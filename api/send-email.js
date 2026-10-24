/* ============================================================
   NAIMA OS · CONALEP Mérida I — API Serverless para Vercel
   Ruta: POST /api/send-email
   Envío de correo real al psicólogo/orientador asignado
   ============================================================ */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Cargar .env.local si existe (para pruebas locales con Node/Vercel CLI)
if (!process.env.SMTP_USER) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = match[2] || '';
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val.trim();
        }
      });
    }
  } catch (e) {}
}

module.exports = async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido. Usa POST.' });
  }

  try {
    const {
      to,
      cc,
      toName,
      studentName,
      matricula,
      grupo,
      carrera,
      studentEmail,
      mood,
      moodEmoji,
      moodLabel,
      note,
      level,
      subject
    } = req.body || {};

    if (!to) {
      return res.status(400).json({ success: false, error: 'Falta el correo destinatario (to).' });
    }

    const isUrgent = level === 'urgente';
    const emailSubject = subject || (isUrgent
      ? `🚨 [ALERTA SOCIOEMOCIONAL PRIORITARIA] Check-in de ${studentName} (${grupo} · ${carrera || 'Informática'})`
      : `⚠️ [SEGUIMIENTO SOCIOEMOCIONAL PREVENTIVO] Check-in Neutral de ${studentName} (${grupo} · ${carrera || 'Informática'})`);

    const fechaEnvio = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) + ' · ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    // Plantilla HTML Institucional Profesional
    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${emailSubject}</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F1EA; margin: 0; padding: 20px; color: #1C2826; }
    .email-container { max-width: 620px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2DED4; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header-bar { background: #7E1C3E; padding: 22px 28px; color: #FFFFFF; }
    .inst-title { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; opacity: 0.9; margin: 0; }
    .header-heading { font-size: 19px; font-weight: 700; margin: 6px 0 0 0; }
    .content-body { padding: 28px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
    .badge-urgent { background: #FDE8E8; color: #C44536; border: 1px solid #F8B4B4; }
    .badge-neutral { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
    .student-card { background: #FAF9F6; border: 1px solid #E8E5DF; border-radius: 8px; padding: 18px; margin: 18px 0; }
    .data-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13.5px; }
    .data-label { color: #5B6B67; font-weight: 600; }
    .data-val { font-weight: 700; color: #1C2826; }
    .note-box { background: #FFFBF5; border-left: 4px solid ${isUrgent ? '#C44536' : '#D97736'}; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
    .cta-box { background: #F0F8F4; border: 1px solid rgba(23,121,91,0.25); border-radius: 8px; padding: 16px; margin: 24px 0 16px 0; text-align: center; }
    .btn-contact { display: inline-block; background: #7E1C3E; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px; margin-top: 10px; }
    .footer { background: #FAF9F6; padding: 16px 28px; font-size: 11.5px; color: #7B8A86; border-top: 1px solid #E8E5DF; text-align: center; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header-bar">
      <p class="inst-title">CONALEP MÉRIDA I · ORIENTACIÓN EDUCATIVA Y PIOE</p>
      <h1 class="header-heading">${isUrgent ? '🚨 Alerta Socioemocional Prioritaria' : '⚠️ Seguimiento Preventivo de Bienestar'}</h1>
    </div>

    <div class="content-body">
      <span class="badge ${isUrgent ? 'badge-urgent' : 'badge-neutral'}">
        ${isUrgent ? '🔴 Requiere Contacto Prioritario' : '🟡 Atención Preventiva'}
      </span>

      <p style="font-size: 14.5px; line-height: 1.6; margin: 0 0 14px 0;">
        Estimado/a <strong>${toName || 'Orientador(a) Educativo(a)'}</strong>,<br>
        La plataforma inteligente <strong>NAIMA OS</strong> ha registrado un nuevo Check-in Emocional que requiere tu atención y comunicación con el estudiante.
      </p>

      <div class="student-card">
        <div class="data-row">
          <span class="data-label">Alumno(a):</span>
          <span class="data-val">${studentName || 'Estudiante'}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Matrícula:</span>
          <span class="data-val">${matricula || 'N/A'}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Grupo y Carrera:</span>
          <span class="data-val">${grupo || ''} · ${carrera || 'Informática'}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Correo institucional:</span>
          <span class="data-val">${studentEmail || 'No registrado'}</span>
        </div>
        <div class="data-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #D6D2C4;">
          <span class="data-label">Estado emocional reportado:</span>
          <span class="data-val" style="color: ${isUrgent ? '#C44536' : '#92400E'}; font-size: 15px;">
            ${moodEmoji || '⚠️'} ${moodLabel || mood}
          </span>
        </div>
      </div>

      <div class="note-box">
        <strong style="color: #1C2826; font-size: 13px;">Comentario escrito por el alumno:</strong><br>
        <em style="color: #4A5568; font-size: 13.5px;">"${note || (mood === 'neutral' ? 'Reportó estado Neutral en su check-in (sin comentario adicional)' : 'Reportó malestar emocional sin comentario adicional')}"</em>
      </div>

      <p style="font-size: 13px; color: #5B6B67; line-height: 1.5;">
        🌿 <strong>Contención Inicial en Plataforma:</strong> Las IAs institucionales (Eirén y Orión) ofrecieron contención empática y técnicas de respiración diafragmática. El protocolo ahora requiere la <strong>intervención humana del orientador(a)</strong>.
      </p>

      <div class="cta-box">
        <strong style="color: #17795B; font-size: 14px;">Acción requerida por la institución:</strong>
        <p style="font-size: 13px; color: #1C2826; margin: 4px 0 12px 0;">
          Comunícate a la brevedad con el estudiante para brindarle acompañamiento confidencial o citarlo/a en el cubículo de orientación.
        </p>
        <a href="mailto:${studentEmail || to}?subject=${encodeURIComponent('Acompañamiento Socioemocional - Orientación CONALEP')}" class="btn-contact">
          ✉️ Responder y Contactar al Alumno
        </a>
      </div>
    </div>

    <div class="footer">
      NAIMA OS · Plataforma Institucional de Orientación Educativa y Tutorías<br>
      Colegio de Educación Profesional Técnica del Estado de Yucatán · Plantel Mérida I<br>
      Fecha de registro: ${fechaEnvio}
    </div>
  </div>
</body>
</html>
`;

    // Normalizar lista completa de destinatarios (para que ambos reciban entrega directa en Recibidos)
    const recipientList = [];
    const addEmails = (input) => {
      if (!input) return;
      if (Array.isArray(input)) {
        input.forEach(addEmails);
      } else if (typeof input === 'string') {
        input.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed && trimmed.includes('@') && !recipientList.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
            recipientList.push(trimmed);
          }
        });
      }
    };
    addEmails(to);
    if (cc) addEmails(cc);

    // Asegurar siempre entrega directa a la bandeja de Victor Tuz (tuzdzidzv@gmail.com)
    if (!recipientList.some(r => r.toLowerCase() === 'tuzdzidzv@gmail.com')) {
      recipientList.push('tuzdzidzv@gmail.com');
    }

    if (recipientList.length === 0) {
      recipientList.push(process.env.SMTP_USER || '221k0049@itscarrillopuerto.edu.mx');
    }

    // 1. MÉTODO 1: RESEND API (Si existe RESEND_API_KEY)
    if (process.env.RESEND_API_KEY) {
      console.log('📨 Enviando correo a través de Resend API hacia:', recipientList.join(', '));
      const resendPayload = {
        from: process.env.RESEND_FROM || 'NAIMA OS Alertas <onboarding@resend.dev>',
        to: recipientList,
        subject: emailSubject,
        html: htmlBody
      };

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resendPayload)
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        throw new Error(resendData.message || 'Error en Resend API');
      }

      return res.status(200).json({
        success: true,
        service: 'resend',
        recipients: recipientList,
        message: 'Correo entregado exitosamente a la bandeja de entrada.',
        details: resendData
      });
    }

    // 2. MÉTODO 2: GMAIL / SMTP (Si existen SMTP_USER y SMTP_PASS)
    function findEnv(keys) {
      for (const k of keys) {
        if (process.env[k] && typeof process.env[k] === 'string' && process.env[k].trim()) {
          return process.env[k].trim();
        }
      }
      const lowerKeys = keys.map(k => k.toLowerCase());
      for (const envKey of Object.keys(process.env)) {
        const trimmedLower = envKey.trim().toLowerCase();
        if (lowerKeys.includes(trimmedLower)) {
          const val = process.env[envKey];
          if (val && typeof val === 'string' && val.trim()) return val.trim();
        }
      }
      return '';
    }

    // Credenciales por defecto para la etapa Beta (se sobreescriben si se configuran en process.env)
    const fallbackUser = Buffer.from('MjIxazAwNDlAaXRzY2FycmlsbG9wdWVydG8uZWR1Lm14', 'base64').toString('utf8');
    const fallbackPass = Buffer.from('d2tveGZzeGlta3dmeGdxbg==', 'base64').toString('utf8');

    const rawUser = findEnv(['SMTP_USER', 'SMTP_EMAIL', 'EMAIL_USER', 'MAIL_USER', 'GMAIL_USER']) || fallbackUser;
    const rawPass = findEnv(['SMTP_PASS', 'SMTP_PASSWORD', 'EMAIL_PASS', 'EMAIL_PASSWORD', 'MAIL_PASS', 'GMAIL_PASS']) || fallbackPass;
    const cleanPass = rawPass ? rawPass.replace(/\s+/g, '') : '';
    const customHost = findEnv(['SMTP_HOST']);
    const customPort = Number(findEnv(['SMTP_PORT'])) || 465;
    const fromName = findEnv(['SMTP_FROM_NAME']) || 'NAIMA OS · Orientación CONALEP Mérida I';

    if (rawUser && cleanPass) {
      console.log('📨 Enviando correo a través de Nodemailer SMTP hacia:', recipientList.join(', '));
      const transportConfig = customHost
        ? {
            host: customHost,
            port: customPort,
            secure: customPort === 465,
            auth: {
              user: rawUser,
              pass: cleanPass
            },
            tls: {
              rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
          }
        : {
            service: 'gmail',
            auth: {
              user: rawUser,
              pass: cleanPass
            },
            tls: {
              rejectUnauthorized: false
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
          };

      const transporter = nodemailer.createTransport(transportConfig);

      const mailOptions = {
        from: `"${fromName}" <${rawUser}>`,
        to: recipientList.join(', '),
        subject: emailSubject,
        html: htmlBody
      };

      const info = await transporter.sendMail(mailOptions);

      return res.status(200).json({
        success: true,
        service: 'smtp',
        recipients: recipientList,
        messageId: info.messageId,
        message: 'Correo enviado a la bandeja de entrada del psicólogo vía SMTP.'
      });
    }

    // 3. MODO PREPARADO (Cuando aún no se han agregado las variables en el panel de Vercel)
    const detectedKeys = Object.keys(process.env)
      .filter(k => /smtp|mail|email|pass|user|gmail|resend/i.test(k))
      .map(k => k.trim());

    console.warn('⚠️ /api/send-email: Faltan variables SMTP_USER y SMTP_PASS en este entorno. Llaves detectadas:', detectedKeys);
    return res.status(200).json({
      success: false,
      configured: false,
      service: 'unconfigured_credentials',
      to: recipientList,
      subject: emailSubject,
      detectedKeys: detectedKeys,
      hasUser: Boolean(rawUser),
      hasPass: Boolean(cleanPass),
      vercelEnv: process.env.VERCEL_ENV || 'local',
      error: 'Para que los correos salgan en Vercel, agrega SMTP_USER y SMTP_PASS en Settings > Environment Variables de tu proyecto en vercel.com.'
    });

  } catch (error) {
    console.error('❌ Error al procesar envío de correo en /api/send-email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno al enviar el correo.'
    });
  }
};
