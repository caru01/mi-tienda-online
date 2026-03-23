-- ============================================================
--  GALU SHOP — ESQUEMA PROFESIONAL V2 (RESET TOTAL - VERSIÓN FINAL CORREGIDA)
-- ============================================================

-- 1. LIMPIEZA TOTAL
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 2. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. CONFIGURACIÓN
CREATE TABLE public.configuracion (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    clave text NOT NULL UNIQUE,
    valor text,
    tipo text DEFAULT 'texto',
    descripcion text,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.club_galu_config (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    clave text NOT NULL UNIQUE,
    valor text NOT NULL,
    descripcion text,
    updated_at timestamptz DEFAULT now()
);

-- 4. CATÁLOGO
CREATE TABLE public.categorias (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    slug text NOT NULL UNIQUE,
    imagen text,
    descripcion text,
    activa boolean DEFAULT true,
    orden integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.productos (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    precio_base numeric NOT NULL DEFAULT 0,
    precio_oferta numeric,
    categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
    imagen_principal text,
    activo boolean DEFAULT true,
    destacado boolean DEFAULT false,
    stock integer DEFAULT 0,
    es_ropa boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.atributos (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.atributo_valores (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    atributo_id uuid REFERENCES public.atributos(id) ON DELETE CASCADE,
    valor text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.variantes_producto (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    producto_id uuid REFERENCES public.productos(id) ON DELETE CASCADE,
    sku text UNIQUE,
    precio numeric,
    stock integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.variante_atributos (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    variante_id uuid REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
    atributo_valor_id uuid REFERENCES public.atributo_valores(id) ON DELETE CASCADE
);

-- 5. USUARIOS ADMIN
CREATE TABLE public.admin_usuarios (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    auth_id uuid UNIQUE,
    email text NOT NULL UNIQUE,
    nombre text,
    avatar_url text,
    rol text DEFAULT 'editor' CHECK (rol IN ('superadmin', 'admin', 'editor', 'viewer')),
    activo boolean DEFAULT true,
    ultimo_acceso timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. PEDIDOS Y CLIENTES
CREATE TABLE public.clientes (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    nombre text,
    telefono text,
    cedula text,
    ciudad text,
    departamento text,
    direccion text,
    total_gastado numeric DEFAULT 0,
    total_pedidos integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.pedidos (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_pedido integer GENERATED ALWAYS AS IDENTITY UNIQUE,
    cliente_nombre text NOT NULL,
    cliente_email text NOT NULL,
    numero_whatsapp text,
    cedula text,
    departamento text,
    ciudad text,
    barrio text,
    direccion text,
    metodo_pago text,
    subtotal numeric DEFAULT 0,
    descuento numeric DEFAULT 0,
    total_final numeric DEFAULT 0,
    estado text DEFAULT 'pendiente_pago',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.pedido_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
    producto_id uuid REFERENCES public.productos(id),
    variante_id uuid REFERENCES public.variantes_producto(id),
    producto_nombre_snapshot text NOT NULL,
    variante_detalle_snapshot text,
    cantidad integer NOT NULL DEFAULT 1,
    precio_unitario numeric NOT NULL,
    subtotal numeric DEFAULT 0
);

-- 6.5. CUPONES Y REFERIDOS
CREATE TABLE public.cupones (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo text NOT NULL UNIQUE,
    tipo text DEFAULT 'porcentaje' CHECK (tipo IN ('porcentaje', 'monto')),
    valor numeric NOT NULL,
    uso_maximo integer,
    usos_actuales integer DEFAULT 0,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cupon_uso (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    cupon_id uuid REFERENCES public.cupones(id) ON DELETE CASCADE,
    pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
    cliente_email text NOT NULL,
    fecha_uso timestamptz DEFAULT now()
);

CREATE TABLE public.referidos (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    codigo text NOT NULL UNIQUE,
    cliente_email text,
    estado text DEFAULT 'pendiente',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.banners (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo text,
    subtitulo text,
    imagen_url text NOT NULL,
    imagen_movil text,
    enlace text,
    activo boolean DEFAULT true,
    orden integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.resenas (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    producto_id uuid REFERENCES public.productos(id) ON DELETE CASCADE,
    cliente_email text NOT NULL,
    cliente_nombre text,
    calificacion integer NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario text,
    aprobada boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.notificaciones_admin (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo text,
    titulo text NOT NULL,
    mensaje text,
    leida boolean DEFAULT false,
    link text,
    created_at timestamptz DEFAULT now()
);

-- 7. VISTAS LTV
CREATE OR REPLACE VIEW public.v_clientes_ltv AS
SELECT
    c.id, c.email, c.nombre, c.telefono, c.ciudad, c.departamento, c.direccion,
    c.total_gastado, c.total_pedidos, c.created_at,
    CASE
        WHEN c.total_gastado >= (SELECT COALESCE(valor::numeric, 500000) FROM club_galu_config WHERE clave = 'umbral_oro' LIMIT 1) THEN 'oro'
        WHEN c.total_gastado >= (SELECT COALESCE(valor::numeric, 200000) FROM club_galu_config WHERE clave = 'umbral_plata' LIMIT 1) THEN 'plata'
        ELSE 'bronce'
    END AS nivel,
    COALESCE((SELECT COUNT(*) FROM pedidos p WHERE p.cliente_email = c.email), 0) as referidos_exitosos,
    CASE
        WHEN c.total_pedidos >= 5 THEN 'VIP'
        WHEN c.total_pedidos >= 2 THEN 'Frecuente'
        ELSE 'Nuevo'
    END as segmento
FROM clientes c;

CREATE OR REPLACE VIEW public.v_club_galu_clientes AS
SELECT * FROM v_clientes_ltv ORDER BY total_gastado DESC;

-- 8. SEGURIDAD MAESTRA (Acceso total para admins)
ALTER TABLE public.admin_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select Global" ON public.admin_usuarios FOR SELECT USING (true);

DO $$ 
DECLARE 
  t text;
BEGIN
  -- Solo aplicamos a 'BASE TABLE' (Tablas), ignoramos las vistas (VIEW)
  FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Master Policy" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Master Policy" ON public.%I FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.admin_usuarios WHERE auth_id = auth.uid() AND activo = true)
    )', t);
  END LOOP;
END $$;

-- Acceso público
CREATE POLICY "L1" ON public.productos FOR SELECT USING (activo = true);
CREATE POLICY "L1" ON public.categorias FOR SELECT USING (activa = true);
CREATE POLICY "L1" ON public.banners FOR SELECT USING (activo = true);
CREATE POLICY "L1" ON public.variantes_producto FOR SELECT USING (activo = true);
CREATE POLICY "L1" ON public.atributos FOR SELECT USING (true);
CREATE POLICY "L1" ON public.atributo_valores FOR SELECT USING (true);
CREATE POLICY "L1" ON public.variante_atributos FOR SELECT USING (true);
CREATE POLICY "L1" ON public.producto_imagenes FOR SELECT USING (true);
CREATE POLICY "L1" ON public.resenas FOR SELECT USING (aprobada = true);
CREATE POLICY "L1" ON public.cupones FOR SELECT USING (activo = true);
CREATE POLICY "I1" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "I1" ON public.pedido_items FOR INSERT WITH CHECK (true);
CREATE POLICY "I1" ON public.cupon_uso FOR INSERT WITH CHECK (true);

-- 9. DATOS INICIALES
INSERT INTO public.configuracion (clave, valor, tipo, descripcion) VALUES
('tienda_nombre', 'GALU SHOP', 'texto', 'Nombre de la tienda'),
('tienda_whatsapp', '573022461068', 'texto', 'WhatsApp de contacto'),
('tienda_email', 'contacto@galushop.com', 'texto', 'Email de soporte'),
('moneda', 'COP', 'texto', 'Moneda principal'),
('envio_costo_local', '6000', 'numero', 'Costo envío en Valledupar'),
('envio_ciudad_local', 'Valledupar', 'texto', 'Ciudad de origen'),
('stock_alerta_minimo', '5', 'numero', 'Alerta de stock bajo'),
('checkout_activo', 'true', 'booleano', 'Habilitar compras en la web'),
('redes_instagram', 'https://instagram.com/galushop', 'texto', 'URL Instagram'),
('redes_tiktok', 'https://tiktok.com/@galushop', 'texto', 'URL TikTok');

INSERT INTO public.club_galu_config (clave, valor, descripcion) VALUES
('umbral_plata', '200000', 'Gasto para nivel Plata'),
('umbral_oro', '500000', 'Gasto para nivel Oro'),
('descuento_referido', '5', '% descuento bienvenida');

-- Vincular al Administrador
INSERT INTO public.admin_usuarios (email, nombre, rol, activo, auth_id)
VALUES ('camilo01198@gmail.com', 'Camilo Rincones', 'superadmin', true, auth.uid())
ON CONFLICT (email) DO UPDATE SET auth_id = auth.uid(), activo = true, rol = 'superadmin';

-- Permisos Globales
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
