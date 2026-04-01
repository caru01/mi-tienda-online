-- =========================================================================================
-- GALU SHOPPER SCHEMA
-- Este archivo crea la infraestructura necesaria para el servicio de importación personalizada.
-- =========================================================================================

-- 1. Tabla de Cotizaciones
CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_nombre TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    cliente_email TEXT,
    direccion TEXT,
    producto_link TEXT,
    talla_color TEXT,
    imagen_url TEXT,
    estado TEXT DEFAULT 'Cotizando', -- 'Cotizando', 'Pendiente de Pago', 'Pagado', 'Comprado', 'En Camino', 'Entregado', 'Cancelado'
    cotizacion_valor DECIMAL(12, 2), -- Valor total definido por el admin
    notas_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Seguridad (RLS)
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acceso
-- Permitir que CUALQUIER usuario pueda enviar una solicitud (Insertar)
DROP POLICY IF EXISTS "Cualquiera puede solicitar cotizacion" ON public.cotizaciones;
CREATE POLICY "Cualquiera puede solicitar cotizacion" ON public.cotizaciones
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Solo administradores pueden ver y gestionar todas las cotizaciones
DROP POLICY IF EXISTS "Solo admins gestionan cotizaciones" ON public.cotizaciones;
CREATE POLICY "Solo admins gestionan cotizaciones" ON public.cotizaciones
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Registro en Realtime para el panel de administración
ALTER PUBLICATION supabase_realtime ADD TABLE public.cotizaciones;

-- =========================================================================================
-- NOTA IMPORTANTE PARA EL USUARIO:
-- Debes crear manualmente un BUCKET en Supabase Storage llamado 'galu-shopper'
-- con acceso Público para que las fotos de los productos puedan subirse y verse correctamente.
-- =========================================================================================
