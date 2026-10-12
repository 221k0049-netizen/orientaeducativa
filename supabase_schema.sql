-- ============================================================
-- NAIMA OS · CONALEP Mérida I — Esquema de Base de Datos
-- Plataforma de Orientación Educativa y Acompañamiento Digital
-- Motor: PostgreSQL 15+ / Compatible con Supabase
-- ============================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('coordinador', 'estudiante');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('bajo', 'medio', 'alto');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('pendiente', 'atendida', 'en_proceso');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------
-- 2. TABLA: profiles (Vinculada a auth.users de Supabase)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  display TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rol user_role NOT NULL DEFAULT 'estudiante',
  cargo TEXT,
  plantel TEXT DEFAULT 'CONALEP Mérida I',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2.1 TABLA: coordinadores (Profesores, Orientadores y Coordinación)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coordinadores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  display TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cargo TEXT DEFAULT 'Orientador Educativo',
  plantel TEXT DEFAULT 'CONALEP Mérida I',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. TABLA: students (Expediente Único Digital de la Protoestrella)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  matricula TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  display TEXT NOT NULL,
  email TEXT NOT NULL,
  grupo TEXT NOT NULL,
  carrera TEXT NOT NULL,
  guardian TEXT DEFAULT 'Psic. Mariana Estrada',
  prioridad priority_level DEFAULT 'bajo',
  seg_fecha TEXT DEFAULT 'Hoy',
  avatar_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. TABLA: checkins (Check-ins de Bienestar y Estado Emocional)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES public.students(matricula) ON DELETE CASCADE,
  mood TEXT NOT NULL, -- 'feliz', 'tranquilo', 'neutral', 'estresado', 'triste', 'enojado'
  mood_label TEXT NOT NULL,
  mood_emoji TEXT NOT NULL,
  note TEXT,
  is_negative BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. TABLA: alerts (Alertas Tempranas para la Coordinadora)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES public.students(matricula) ON DELETE CASCADE,
  checkin_id UUID REFERENCES public.checkins(id) ON DELETE SET NULL,
  mood TEXT NOT NULL,
  mood_label TEXT NOT NULL,
  mood_emoji TEXT NOT NULL,
  level TEXT DEFAULT 'urgente',
  status alert_status DEFAULT 'pendiente',
  note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. TABLA: tasks (Acuerdos, Tareas y Compromisos de Orientación)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES public.students(matricula) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Bienestar', -- 'Académico', 'Bienestar', 'Salud', 'Vocacional', 'Tutoría'
  assigned_by TEXT DEFAULT 'Psic. Mariana Estrada',
  due_date TEXT DEFAULT 'Próxima sesión',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. TABLA: documents (Expedientes y Documentos Anexados)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES public.students(matricula) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Expediente', -- 'Expediente', 'Acuerdo PIOE', 'Justificante', 'Instrumento', 'Consentimiento'
  file_name TEXT NOT NULL,
  file_size TEXT DEFAULT '150 KB',
  file_url TEXT,
  notes TEXT,
  author TEXT DEFAULT 'Psic. Mariana Estrada',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 8. TABLA: diary_entries (Diario Personal Privado del Estudiante)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES public.students(matricula) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 9. TABLA: support_requests (Citas y Solicitudes Directas con Orientación)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES public.students(matricula) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 10. ÍNDICES DE RENDIMIENTO
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_checkins_student ON public.checkins(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_student ON public.tasks(student_id, completed);
CREATE INDEX IF NOT EXISTS idx_documents_student ON public.documents(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_student ON public.diary_entries(student_id, created_at DESC);

-- ------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Funciones auxiliares para RLS
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'coordinador'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas de Coordinador: acceso total a la gestión del plantel
CREATE POLICY "Coordinador puede ver todos los perfiles"
  ON public.profiles FOR ALL USING (public.is_coordinator());

CREATE POLICY "Coordinador puede gestionar estudiantes"
  ON public.students FOR ALL USING (public.is_coordinator());

CREATE POLICY "Coordinador puede ver todos los checkins"
  ON public.checkins FOR ALL USING (public.is_coordinator());

CREATE POLICY "Coordinador puede ver y actualizar alertas"
  ON public.alerts FOR ALL USING (public.is_coordinator());

CREATE POLICY "Coordinador puede gestionar tareas"
  ON public.tasks FOR ALL USING (public.is_coordinator());

CREATE POLICY "Coordinador puede gestionar documentos"
  ON public.documents FOR ALL USING (public.is_coordinator());

-- Políticas de Estudiante: acceso restringido a su propia información
CREATE POLICY "Estudiante puede ver su propio expediente"
  ON public.students FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Estudiante puede registrar sus checkins"
  ON public.checkins FOR INSERT WITH CHECK (
    student_id IN (SELECT matricula FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "Estudiante puede ver sus checkins"
  ON public.checkins FOR SELECT USING (
    student_id IN (SELECT matricula FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "Estudiante puede ver y marcar sus tareas"
  ON public.tasks FOR SELECT USING (
    student_id IN (SELECT matricula FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "Estudiante puede actualizar estado de sus tareas"
  ON public.tasks FOR UPDATE USING (
    student_id IN (SELECT matricula FROM public.students WHERE user_id = auth.uid())
  ) WITH CHECK (
    student_id IN (SELECT matricula FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "Estudiante puede ver sus documentos"
  ON public.documents FOR SELECT USING (
    student_id IN (SELECT matricula FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "Estudiante tiene acceso exclusivo a su diario"
  ON public.diary_entries FOR ALL USING (
    student_id IN (SELECT matricula FROM public.students WHERE user_id = auth.uid())
  );

-- ============================================================
-- SEED DATA DE PRUEBA (CONALEP MÉRIDA I)
-- ============================================================
INSERT INTO public.students (matricula, nombre, display, email, grupo, carrera, guardian, prioridad, seg_fecha)
VALUES 
  ('PTB-26001', 'Carlos Mendoza López', 'Carlos M.', 'carlos.mendoza@alumnos.conalep.edu.mx', '4B', 'Informática', 'Psic. Mariana Estrada', 'alto', '11 oct'),
  ('PTB-26002', 'Valeria Gómez Pech', 'Valeria G.', 'valeria.gomez@alumnos.conalep.edu.mx', '2A', 'Enfermería General', 'Psic. Mariana Estrada', 'medio', '10 oct'),
  ('PTB-26003', 'Alejandro Ruiz Cauich', 'Alejandro R.', 'alejandro.ruiz@alumnos.conalep.edu.mx', '6A', 'Mecatrónica', 'Psic. Mariana Estrada', 'bajo', '08 oct')
ON CONFLICT (matricula) DO NOTHING;

INSERT INTO public.tasks (student_id, title, description, category, due_date, completed)
VALUES
  ('PTB-26001', 'Técnica Pomodoro 25/5 para entrega de proyectos', 'Organizar sesiones de estudio con 5 min de descanso para el módulo de Redes.', 'Académico', '14 oct 2026', false),
  ('PTB-26001', 'Pausa de respiración de 3 min con Eirén', 'Realizar ejercicio de respiración diafragmática al iniciar la tarde.', 'Bienestar', '12 oct 2026', true),
  ('PTB-26002', 'Registro de bitácora de descanso en prácticas clínicas', 'Monitorear horas de sueño y reporte de fatiga.', 'Salud', '15 oct 2026', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.documents (student_id, title, category, file_name, file_size, notes)
VALUES
  ('PTB-26001', 'Cédula de Identificación del Estudiante', 'Expediente', 'Cedula_Carlos_Mendoza_2026.pdf', '184 KB', 'Expediente validado por Servicios Escolares.'),
  ('PTB-26002', 'Carta Compromiso y Plan de Acompañamiento PIOE', 'Acuerdo PIOE', 'Carta_Compromiso_Valeria_Gomez.pdf', '220 KB', 'Acuerdos en sesión de tutoría.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. PERMISOS COMPLETOS PARA LA APLICACIÓN WEB (ROL ANON)
-- Ejecuta este bloque en el SQL Editor de Supabase para permitir
-- que el formulario de Registro guarde alumnos y perfiles:
-- ============================================================
DROP POLICY IF EXISTS "Anon lectura estudiantes" ON public.students;
DROP POLICY IF EXISTS "Anon lectura perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon gestión estudiantes" ON public.students;
DROP POLICY IF EXISTS "Anon gestión perfiles" ON public.profiles;

-- Políticas de lectura y escritura completa:
CREATE POLICY "Anon gestión estudiantes" ON public.students FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon gestión perfiles" ON public.profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon gestión checkins" ON public.checkins FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon gestión alertas" ON public.alerts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon gestión tareas" ON public.tasks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon gestión documentos" ON public.documents FOR ALL TO anon USING (true) WITH CHECK (true);


