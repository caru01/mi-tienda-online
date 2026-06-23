-- SCRIPT PARA CREAR TABLAS DE LA APP DE PEDIDOS
-- Ejecutar en el SQL Editor de Supabase

-- 1. Tabla de Configuración de la App de Pedidos
CREATE TABLE IF NOT EXISTS public.pedidos_app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    whatsapp_number TEXT NOT NULL DEFAULT '573000000000',
    nequi_number TEXT NOT NULL DEFAULT '3206375509',
    bancolombia_number TEXT NOT NULL DEFAULT '3206375509',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración por defecto si no existe
INSERT INTO public.pedidos_app_settings (id, whatsapp_number, nequi_number, bancolombia_number)
VALUES (1, '573000000000', '3206375509', '3206375509')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.pedidos_app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.pedidos_app_settings FOR ALL USING (true);


-- 2. Tabla de Productos de la App de Pedidos
CREATE TABLE IF NOT EXISTS public.pedidos_app_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.pedidos_app_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.pedidos_app_products FOR ALL USING (true);
