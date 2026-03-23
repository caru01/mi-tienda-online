-- ESQUEMA COMPLEMENTARIO: CLUB GALU
-- Tablas y Políticas faltantes para el funcionamiento del Club de Beneficios

-- 1. CONFIGURACIÓN DEL CLUB
CREATE TABLE IF NOT EXISTS public.club_galu_config (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    clave text NOT NULL UNIQUE,
    valor text NOT NULL,
    descripcion text,
    updated_at timestamptz DEFAULT now()
);

-- Configuraciones iniciales por defecto (Si no existen)
INSERT INTO public.club_galu_config (clave, valor, descripcion) VALUES
('umbral_plata', '200000', 'Gasto mínimo para nivel Plata'),
('umbral_oro', '500000', 'Gasto mínimo para nivel Oro'),
('descuento_referido', '5', 'Descuento % que recibe el amigo referido')
ON CONFLICT (clave) DO NOTHING;

-- 2. PUNTOS DE CLIENTE (HISTÓRICO)
CREATE TABLE IF NOT EXISTS public.puntos_cliente (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    cliente_email text NOT NULL,
    pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
    puntos integer NOT NULL,
    tipo text NOT NULL DEFAULT 'ganado' CHECK (tipo IN ('ganado', 'canjeado', 'expirado')),
    descripcion text,
    created_at timestamptz DEFAULT now()
);

-- 3. POLÍTICAS RLS (Seguridad)
-- Habilitar RLS en las nuevas tablas si no lo tienen
ALTER TABLE public.club_galu_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puntos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referidos ENABLE ROW LEVEL SECURITY;

-- Leer Configuración: Publica para todos
DROP POLICY IF EXISTS "Leer Config Club" ON public.club_galu_config;
CREATE POLICY "Leer Config Club" ON public.club_galu_config FOR SELECT USING (true);

-- Leer Clientes: Permitir buscar su propio cliente por email (o público basico para funcionar)
DROP POLICY IF EXISTS "Leer Clientes Publicos" ON public.clientes;
CREATE POLICY "Leer Clientes Publicos" ON public.clientes FOR SELECT USING (true);

-- Leer Puntos: Permitir buscar sus puntos
DROP POLICY IF EXISTS "Leer Puntos Publicos" ON public.puntos_cliente;
CREATE POLICY "Leer Puntos Publicos" ON public.puntos_cliente FOR SELECT USING (true);

-- Leer Referidos: Permitir buscar referidos
DROP POLICY IF EXISTS "Leer Referidos Publicos" ON public.referidos;
CREATE POLICY "Leer Referidos Publicos" ON public.referidos FOR SELECT USING (true);

-- Permitir Insertar Referidos:
DROP POLICY IF EXISTS "Insertar Referidos Publicos" ON public.referidos;
CREATE POLICY "Insertar Referidos Publicos" ON public.referidos FOR INSERT WITH CHECK (true);

-- 4. FUNCIÓN PARA GENERAR CÓDIGO DE REFERIDO ÚNICO
CREATE OR REPLACE FUNCTION generar_codigo_referido(p_nombre text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    base_code text;
    new_code text;
    random_chars text;
    exists_count int;
BEGIN
    -- Tomar los primeros 4 caracteres del nombre (limpiado) o 'GALU' si está vacío
    base_code := UPPER(REGEXP_REPLACE(SPLIT_PART(p_nombre, ' ', 1), '[^a-zA-Z]', '', 'g'));
    IF length(base_code) < 3 THEN
        base_code := 'GALU';
    ELSE
        base_code := SUBSTRING(base_code FROM 1 FOR 4);
    END IF;

    LOOP
        -- Generar 4 caracteres aleatorios (números y letras)
        random_chars := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
        new_code := base_code || '-' || random_chars;

        -- Verificar si ya existe en la tabla de cupones o referidos
        SELECT COUNT(*) INTO exists_count FROM public.referidos WHERE codigo = new_code;
        
        IF exists_count = 0 THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$;
