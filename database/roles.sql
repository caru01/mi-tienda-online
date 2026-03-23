-- ═══════════════════════════════════════════════════════════════
-- GALU SHOP — Sistema de Roles para el Panel de Administración
-- Ejecutar en: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. CREAR TABLA DE USUARIOS ADMIN
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_usuarios (
  id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  nombre      text,
  rol         text        NOT NULL DEFAULT 'analista'
                          CHECK (rol IN ('super_admin', 'admin_tienda', 'logistica', 'analista')),
  activo      boolean     NOT NULL DEFAULT true,
  avatar_url  text,
  notas       text,
  ultimo_acceso timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_usuarios_pkey PRIMARY KEY (id)
);

-- Índice para búsqueda rápida por email
CREATE INDEX IF NOT EXISTS idx_admin_usuarios_email ON public.admin_usuarios(email);
CREATE INDEX IF NOT EXISTS idx_admin_usuarios_rol   ON public.admin_usuarios(rol);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_admin_usuarios_updated_at ON public.admin_usuarios;
CREATE TRIGGER trg_admin_usuarios_updated_at
  BEFORE UPDATE ON public.admin_usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger para registrar el último acceso
CREATE OR REPLACE FUNCTION public.registrar_ultimo_acceso()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.admin_usuarios
  SET ultimo_acceso = now()
  WHERE id = NEW.id;
  RETURN NEW;
END; $$;

-- ─────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.admin_usuarios ENABLE ROW LEVEL SECURITY;

-- Solo los admins autenticados pueden leer la tabla
CREATE POLICY "admin_read_own" ON public.admin_usuarios
  FOR SELECT USING (auth.uid() = id);

-- Solo super_admin puede ver todos los usuarios
CREATE POLICY "super_admin_read_all" ON public.admin_usuarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios
      WHERE id = auth.uid() AND rol = 'super_admin' AND activo = true
    )
  );

-- Solo super_admin puede insertar, actualizar o eliminar
CREATE POLICY "super_admin_write" ON public.admin_usuarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios
      WHERE id = auth.uid() AND rol = 'super_admin' AND activo = true
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. FUNCIÓN HELPER: Obtener rol del usuario actual
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_mi_rol()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT rol FROM public.admin_usuarios
  WHERE id = auth.uid() AND activo = true
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. INSERTAR USUARIOS INICIALES
-- (Reemplaza los UUIDs con los IDs reales de auth.users)
-- ─────────────────────────────────────────────────────────────

-- Primero ve a Supabase → Authentication → Users y copia el UUID del usuario
-- Luego ejecuta algo como:
--
-- INSERT INTO public.admin_usuarios (id, email, nombre, rol) VALUES
--   ('UUID-DEL-USUARIO', 'admin@galushop.com', 'Camilo Rincones', 'super_admin');

-- ─────────────────────────────────────────────────────────────
-- 5. TABLA DE AUDITORÍA DE ACCESOS ADMIN (opcional pero recomendado)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_sesiones (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid        REFERENCES public.admin_usuarios(id) ON DELETE SET NULL,
  rol        text,
  accion     text,        -- 'login', 'logout', 'cambio_estado', etc.
  detalle    jsonb,
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sesiones_usuario ON public.admin_sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_admin_sesiones_fecha   ON public.admin_sesiones(created_at DESC);
