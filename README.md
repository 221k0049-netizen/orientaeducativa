# NAIMA OS · Orientación Educativa
### Colegio Nacional de Educación Profesional Técnica (CONALEP) · Plantel Mérida I
**Proyecto de Residencia Profesional — Acompañamiento Socioemocional y Tutorías (PIOE)**

---

## 📌 Descripción del Proyecto

**NAIMA OS** es una plataforma institucional diseñada para la gestión integral del **Programa Institucional de Orientación Educativa y Tutorías (PIOE)** en el plantel CONALEP Mérida I.

La solución integra dos portales especializados:
1. **Portal del Estudiante (`estudiante.html`):**
   - Check-in emocional diario interactivo (6 estados de ánimo).
   - Red de contención inmediata con agentes IA (**Eirén** para apoyo emocional y **Orión** para estrategia académica).
   - Bitácora de acuerdos, tareas de seguimiento y compromisos socioemocionales.
   - Expediente digital y visualización oficial de documentos.
   - Campus 3D, ejercicios de respiración diafragmática y diario personal confidencial.

2. **Portal del Coordinador / Orientador (`admin.html`):**
   - Monitoreo en tiempo real de Protoestrellas (alumnos en seguimiento).
   - Semáforo de riesgo y gestión de alertas urgentes por estado de ánimo negativo.
   - Gestión y asignación de compromisos de tutoría y acuerdos formativos.
   - Carga de expedientes y anexos documentales oficiales.
   - Generador e impresión directa de **Cédulas Oficiales de Expediente PIOE** con membrete institucional del Gobierno de México y CONALEP.

---

## 🛠️ Arquitectura y Tecnologías

- **Frontend:** HTML5 Semántico, Vanilla CSS (diseño institucional con paleta oficial Guinda `#7E1C3E` y Verde `#17795B`), JavaScript ES6+.
- **Base de Datos & Backend:** [Supabase](https://supabase.com) (PostgreSQL 15), con tablas relacionales (`students`, `coordinadores`, `checkins`, `alerts`, `tasks`, `documents`).
- **Autenticación:** Híbrida con soporte para Supabase Auth y validación institucional por matrícula/correo.
- **Despliegue:** Optimizado para [Vercel](https://vercel.com) mediante configuración `vercel.json`.

---

## 📁 Estructura del Repositorio

```text
├── index.html              # Pantalla oficial de Acceso (Inicio de Sesión y Registro)
├── admin.html              # Portal del Coordinador y Orientador Educativo
├── admin.js                # Lógica del Portal Administrativo
├── estudiante.html         # Portal del Alumno (Mi Espacio y Red de Apoyo)
├── estudiante.js           # Lógica del Portal del Estudiante
├── db.js                   # Capa de datos unificada y sincronización con Supabase
├── supabase.js             # Configuración y cliente oficial de Supabase
├── supabase_schema.sql     # Esquema completo de base de datos en PostgreSQL
├── styles.css              # Sistema de diseño institucional y estilos de impresión (@media print)
├── vercel.json             # Configuración de despliegue para Vercel
└── README.md               # Documentación general del proyecto
```

---

## 🚀 Despliegue en Vercel

La plataforma está configurada como una Single Page Application estática sin dependencias complejas:
1. Conecta este repositorio en [Vercel](https://vercel.com).
2. Deja el framework preset como **Other** (HTML/JS estándar).
3. Haz clic en **Deploy**.

---

*CONALEP Mérida I · Dirección Estatal Yucatán · Modelo Académico de Calidad para la Competitividad.*
