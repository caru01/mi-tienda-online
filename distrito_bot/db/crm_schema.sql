-- ==========================================
-- SCRIPT SQL PARA EL CRM V1 (DISTRITO BOT)
-- ==========================================
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. TABLA: customers (Clientes)
-- Almacena la información principal y métricas de cada cliente
CREATE TABLE IF NOT EXISTS public.customers (
    phone TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Nuevos', -- Puede ser: Nuevos, Frecuentes, VIP, Inactivos
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    last_order_date TIMESTAMP WITH TIME ZONE,
    favorite_address TEXT,
    neighborhood TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) para customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.customers FOR ALL USING (true);

-- 2. TABLA: customer_notes (Notas del CRM)
-- Almacena las notas manuales que los operadores dejan sobre un cliente
CREATE TABLE IF NOT EXISTS public.customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT REFERENCES public.customers(phone) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) para customer_notes
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.customer_notes FOR ALL USING (true);

-- 3. TABLA: crm_campaigns (Campañas de WhatsApp)
-- Historial y métricas de los envíos masivos
CREATE TABLE IF NOT EXISTS public.crm_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    segment TEXT NOT NULL, -- Todos, VIP, Frecuentes, Inactivos, Nuevos
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) para crm_campaigns
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.crm_campaigns FOR ALL USING (true);

-- ==========================================
-- Función (Trigger) para actualizar el 'updated_at' en customers
-- ==========================================
CREATE OR REPLACE FUNCTION update_customers_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear el Trigger para la tabla customers
DROP TRIGGER IF EXISTS update_customers_modtime ON public.customers;
CREATE TRIGGER update_customers_modtime
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at_column();

-- ==========================================
-- Migración opcional (Si ya tienes clientes en 'sales')
-- ==========================================
-- Descomenta y ejecuta la siguiente línea si quieres poblar la tabla de clientes con los que ya han comprado:
-- INSERT INTO public.customers (phone, name, last_order_date, total_orders, total_spent)
-- SELECT customer_phone, MAX(customer_name), MAX(created_at), COUNT(*), SUM(total_amount)
-- FROM public.sales
-- GROUP BY customer_phone
-- ON CONFLICT (phone) DO NOTHING;
