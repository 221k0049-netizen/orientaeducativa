/* ============================================================
   NAIMA OS · CONALEP Mérida I — API Serverless para Vercel
   Ruta: POST /api/send-email
   Envío de correo real al psicólogo/orientador asignado
   ============================================================ */

const nodemailer = require('nodemailer');

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

    // 1. MÉTODO 1: RESEND API (Si existe RESEND_API_KEY)
    if (process.env.RESEND_API_KEY) {
      console.log('📨 Enviando correo a través de Resend API hacia:', to);
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'NAIMA OS Alertas <onboarding@resend.dev>',
          to: [to],
          subject: emailSubject,
          html: htmlBody
        })
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        throw new Error(resendData.message || 'Error en Resend API');
      }

      return res.status(200).json({
        success: true,
        service: 'resend',
        message: 'Correo entregado exitosamente a la bandeja de entrada.',
        details: resendData
      });
    }

    // 2. MÉTODO 2: GMAIL / SMTP (Si existen SMTP_USER y SMTP_PASS)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log('📨 Enviando correo a través de Nodemailer SMTP hacia:', to);
      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || (process.env.SMTP_HOST ? undefined : 'gmail'),
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: Number(process.env.SMTP_PORT) === 465 || !process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'NAIMA OS Orientación'}" <${process.env.SMTP_USER}>`,
        to: to,
        subject: emailSubject,
        html: htmlBody
      });

      return res.status(200).json({
        success: true,
        service: 'smtp',
        messageId: info.messageId,
        message: 'Correo enviado a la bandeja de entrada del psicólogo vía SMTP.'
      });
    }

    // 3. MODO PREPARADO / AUDITORÍA (Cuando aún no se han configurado credenciales en Vercel)
    console.log('ℹ️ Solicitud de correo recibida para:', to);
    return res.status(200).json({
      success: true,
      configured: false,
      service: 'simulated_queue',
      to: to,
      subject: emailSubject,
      message: 'El endpoint /api/send-email está listo y funcionando. Para que el correo llegue físicamente a tu bandeja de Gmail o institucional, agrega SMTP_USER y SMTP_PASS (o RESEND_API_KEY) en las variables de entorno de Vercel.'
    });

  } catch (error) {
    console.error('❌ Error al procesar envío de correo en /api/send-email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno al enviar el correo.'
    });
  }
};
