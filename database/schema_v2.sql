-- ============================================================
--  GALU SHOP — ESTRUCTURA DE BASE DE DATOS COMPLETA v2.0
--  Ejecutar en Supabase SQL Editor
--  ⚠️  Primero ejecuta el BLOQUE 1 (tablas base existentes)
--      Luego el BLOQUE 2 (mejoras a tablas existentes)
--      Luego el BLOQUE 3 (tablas nuevas)
--      Luego el BLOQUE 4 (índices + funciones + triggers)
--      Luego el BLOQUE 5 (RLS - seguridad)
-- ============================================================


-- ╔══════════════════════════════════════════════════════════╗
-- ║  BLOQUE 1 — TABLAS BASE (YA EXISTEN, NO TOCAR)          ║
-- ║  Solo se muestran como referencia                        ║
-- ╚══════════════════════════════════════════════════════════╝

/*
  atributos              ✓ ya existe
  atributo_valores       ✓ ya existe
  categorias             ✓ ya existe
  cupones                ✓ ya existe
  cupon_uso              ✓ ya existe
  pagos                  ✓ ya existe
  pedidos                ✓ ya existe
  pedido_items           ✓ ya existe
  productos              ✓ ya existe
  variantes_producto     ✓ ya existe
  variante_atributos     ✓ ya existe
*/


-- ╔══════════════════════════════════════════════════════════╗
-- ║  BLOQUE 2 — MEJORAS A TABLAS EXISTENTES                 ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── productos: agregar columnas que faltan ──────────────────
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS precio_comparacion  numeric       CHECK (precio_comparacion >= 0),  -- precio "tachado" (antes costaba X)
  ADD COLUMN IF NOT EXISTS costo_produccion    numeric       CHECK (costo_produccion >= 0),    -- para calcular margen
  ADD COLUMN IF NOT EXISTS peso_gramos         integer,                                        -- para calcular flete
  ADD COLUMN IF NOT EXISTS slug                text          UNIQUE,                           -- URL amigable /producto/camiseta-blanca
  ADD COLUMN IF NOT EXISTS meta_titulo         text,                                           -- SEO
  ADD COLUMN IF NOT EXISTS meta_descripcion    text,                                           -- SEO
  ADD COLUMN IF NOT EXISTS tags                text[],                                         -- etiquetas para búsqueda
  ADD COLUMN IF NOT EXISTS total_vendido       integer       DEFAULT 0,                        -- contador de ventas
  ADD COLUMN IF NOT EXISTS total_vistas        integer       DEFAULT 0,                        -- contador de vistas
  ADD COLUMN IF NOT EXISTS orden_display       integer       DEFAULT 0;                        -- orden manual en listados

-- ── categorias: agregar columnas que faltan ─────────────────
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS descripcion         text,
  ADD COLUMN IF NOT EXISTS imagen_banner       text,                                           -- banner grande en la página de categoría
  ADD COLUMN IF NOT EXISTS meta_titulo         text,
  ADD COLUMN IF NOT EXISTS meta_descripcion    text,
  ADD COLUMN IF NOT EXISTS categoria_padre_id  uuid REFERENCES public.categorias(id),         -- subcategorías (ej: Ropa > Camisetas)
  ADD COLUMN IF NOT EXISTS orden_display       integer DEFAULT 0;

-- ── pedidos: agregar columnas que faltan ────────────────────
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS numero_guia         text,                                           -- guía de la transportadora
  ADD COLUMN IF NOT EXISTS transportadora      text,                                           -- Interrapidísimo, Servientrega, etc.
  ADD COLUMN IF NOT EXISTS costo_envio         numeric        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notas_admin         text,                                           -- notas internas del admin
  ADD COLUMN IF NOT EXISTS ip_cliente          text,
  ADD COLUMN IF NOT EXISTS updated_at          timestamp with time zone DEFAULT now();

-- ── variantes_producto: agregar columnas ────────────────────
ALTER TABLE public.variantes_producto
  ADD COLUMN IF NOT EXISTS stock_minimo        integer DEFAULT 0,                              -- para alertas de stock bajo
  ADD COLUMN IF NOT EXISTS imagen_variante     text,                                           -- imagen específica de la variante (ej: foto del color)
  ADD COLUMN IF NOT EXISTS updated_at          timestamp with time zone DEFAULT now();

-- ── cupones: agregar columnas ───────────────────────────────
ALTER TABLE public.cupones
  ADD COLUMN IF NOT EXISTS descripcion         text,
  ADD COLUMN IF NOT EXISTS solo_primera_compra boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS categorias_aplica   uuid[],                                        -- NULL = aplica a todo
  ADD COLUMN IF NOT EXISTS productos_aplica    uuid[],                                        -- NULL = aplica a todo
  ADD COLUMN IF NOT EXISTS updated_at          timestamp with time zone DEFAULT now();


-- ╔══════════════════════════════════════════════════════════╗
-- ║  BLOQUE 3 — TABLAS NUEVAS                               ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── 3.1 IMÁGENES ADICIONALES DE PRODUCTO ───────────────────
-- Permite múltiples fotos por producto (galería)
CREATE TABLE IF NOT EXISTS public.producto_imagenes (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  producto_id  uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  url          text NOT NULL,
  alt_text     text,
  orden        integer DEFAULT 0,
  created_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT producto_imagenes_pkey PRIMARY KEY (id)
);

-- ── 3.2 GUÍA DE TALLAS ─────────────────────────────────────
-- Tabla de medidas por categoría (ej: Talla S = busto 88cm, cintura 68cm)
CREATE TABLE IF NOT EXISTS public.guias_talla (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria_id   uuid REFERENCES public.categorias(id) ON DELETE CASCADE,
  titulo         text NOT NULL,                        -- ej: "Guía de Tallas Camisetas"
  tabla_json     jsonb NOT NULL,                       -- { "S": {"busto":"88","cintura":"68"}, "M": {...} }
  created_at     timestamp with time zone DEFAULT now(),
  CONSTRAINT guias_talla_pkey PRIMARY KEY (id)
);

-- ── 3.3 HISTORIAL DE ESTADOS DEL PEDIDO ────────────────────
-- Registro de cada cambio de estado (para mostrar al cliente)
CREATE TABLE IF NOT EXISTS public.pedido_historial (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id     uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estado_desde  text,
  estado_hacia  text NOT NULL,
  nota          text,                                  -- ej: "Guía 123456 - Interrapidísimo"
  cambiado_por  text,                                  -- email del admin
  created_at    timestamp with time zone DEFAULT now(),
  CONSTRAINT pedido_historial_pkey PRIMARY KEY (id)
);

-- ── 3.4 MOVIMIENTOS DE INVENTARIO ──────────────────────────
-- Log de cada cambio de stock (para auditoría y trazabilidad)
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  variante_id      uuid NOT NULL REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
  tipo             text NOT NULL CHECK (tipo = ANY (ARRAY[
                     'entrada'::text,         -- compra de inventario
                     'salida'::text,          -- venta
                     'ajuste'::text,          -- corrección manual
                     'devolucion'::text       -- devolución de cliente
                   ])),
  cantidad         integer NOT NULL,                   -- positivo = entrada, negativo = salida
  stock_anterior   integer NOT NULL,
  stock_nuevo      integer NOT NULL,
  referencia       text,                               -- ej: número de pedido o nota
  creado_por       text,                               -- email del admin
  created_at       timestamp with time zone DEFAULT now(),
  CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id)
);

-- ── 3.5 CLIENTES ────────────────────────────────────────────
-- Perfil de clientes que compran frecuentemente
-- Se crea automáticamente al hacer el primer pedido
CREATE TABLE IF NOT EXISTS public.clientes (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  email            text NOT NULL UNIQUE,
  nombre           text,
  telefono         text,
  cedula           text,
  ciudad           text,
  departamento     text,
  direccion        text,
  total_pedidos    integer DEFAULT 0,
  total_gastado    numeric DEFAULT 0,
  acepta_marketing boolean DEFAULT false,
  notas_admin      text,
  created_at       timestamp with time zone DEFAULT now(),
  updated_at       timestamp with time zone DEFAULT now(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);

-- ── 3.6 FAVORITOS / WISHLIST ────────────────────────────────
-- Para que los clientes guarden productos que les gustan
CREATE TABLE IF NOT EXISTS public.favoritos (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  sesion_id    text NOT NULL,                          -- ID de sesión del browser (localStorage)
  producto_id  uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  created_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT favoritos_pkey PRIMARY KEY (id),
  CONSTRAINT favoritos_unique UNIQUE (sesion_id, producto_id)
);

-- ── 3.7 RESEÑAS / CALIFICACIONES ───────────────────────────
CREATE TABLE IF NOT EXISTS public.resenas (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  producto_id     uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  pedido_id       uuid REFERENCES public.pedidos(id),
  cliente_email   text NOT NULL,
  cliente_nombre  text NOT NULL,
  calificacion    integer NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  titulo          text,
  comentario      text,
  aprobada        boolean DEFAULT false,               -- moderación manual antes de publicar
  created_at      timestamp with time zone DEFAULT now(),
  CONSTRAINT resenas_pkey PRIMARY KEY (id),
  CONSTRAINT resenas_unique UNIQUE (pedido_id, producto_id)  -- 1 reseña por pedido×producto
);

-- ── 3.8 BANNERS / CARRUSEL ─────────────────────────────────
-- Control del carrusel principal desde el admin (ya no hardcodeado)
CREATE TABLE IF NOT EXISTS public.banners (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo       text,
  subtitulo    text,
  imagen_url   text NOT NULL,
  imagen_movil text,                                   -- versión optimizada para móvil
  enlace       text,                                   -- URL al hacer clic
  activo       boolean DEFAULT true,
  orden        integer DEFAULT 0,
  fecha_inicio timestamp with time zone,
  fecha_fin    timestamp with time zone,
  created_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT banners_pkey PRIMARY KEY (id)
);

-- ── 3.9 COLECCIONES / LANDING PAGES ────────────────────────
-- Grupos de productos para campañas (ej: "Rebajas de Invierno", "Nuevo Ingreso")
CREATE TABLE IF NOT EXISTS public.colecciones (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre        text NOT NULL,
  slug          text NOT NULL UNIQUE,
  descripcion   text,
  imagen_banner text,
  activa        boolean DEFAULT true,
  fecha_inicio  timestamp with time zone,
  fecha_fin     timestamp with time zone,
  orden         integer DEFAULT 0,
  created_at    timestamp with time zone DEFAULT now(),
  CONSTRAINT colecciones_pkey PRIMARY KEY (id)
);

-- Productos en colecciones (muchos a muchos)
CREATE TABLE IF NOT EXISTS public.coleccion_productos (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  coleccion_id   uuid NOT NULL REFERENCES public.colecciones(id) ON DELETE CASCADE,
  producto_id    uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  orden          integer DEFAULT 0,
  CONSTRAINT coleccion_productos_pkey PRIMARY KEY (id),
  CONSTRAINT coleccion_productos_unique UNIQUE (coleccion_id, producto_id)
);

-- ── 3.10 CONFIGURACIÓN DE LA TIENDA ─────────────────────────
-- Variables globales editables desde el admin (sin tocar código)
CREATE TABLE IF NOT EXISTS public.configuracion (
  clave        text NOT NULL,
  valor        text,
  tipo         text DEFAULT 'texto' CHECK (tipo = ANY (ARRAY['texto'::text, 'numero'::text, 'booleano'::text, 'json'::text])),
  descripcion  text,
  updated_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT configuracion_pkey PRIMARY KEY (clave)
);

-- Valores iniciales de configuración
INSERT INTO public.configuracion (clave, valor, tipo, descripcion) VALUES
  ('tienda_nombre',           'GALU SHOP',                    'texto',    'Nombre de la tienda'),
  ('tienda_whatsapp',         '573022461068',                 'texto',    'Número WhatsApp (con código país, sin +)'),
  ('tienda_email',            'contacto@galushop.com',        'texto',    'Email de contacto'),
  ('envio_costo_local',       '6000',                         'numero',   'Costo de envío en Valledupar (COP)'),
  ('envio_ciudad_local',      'Valledupar',                   'texto',    'Ciudad para envío local gratis o diferenciado'),
  ('stock_alerta_minimo',     '5',                            'numero',   'Unidades mínimas antes de mostrar alerta de stock bajo'),
  ('pedido_horas_cancelacion','2',                            'numero',   'Horas antes de cancelar pedido sin pago'),
  ('moneda',                  'COP',                          'texto',    'Código de moneda'),
  ('iva_porcentaje',          '0',                            'numero',   'Porcentaje IVA (0 = precios con IVA incluido)'),
  ('checkout_activo',         'true',                         'booleano', 'Si la tienda acepta pedidos actualmente'),
  ('mensaje_checkout_cerrado','Estamos fuera de línea',       'texto',    'Mensaje cuando el checkout está cerrado'),
  ('redes_instagram',         '',                             'texto',    'URL perfil Instagram'),
  ('redes_facebook',          '',                             'texto',    'URL perfil Facebook'),
  ('redes_tiktok',            '',                             'texto',    'URL perfil TikTok')
ON CONFLICT (clave) DO NOTHING;

-- ── 3.11 ENVÍOS / ZONAS DE ENVÍO ────────────────────────────
-- Precios de envío por departamento o ciudad
CREATE TABLE IF NOT EXISTS public.zonas_envio (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre         text NOT NULL,                        -- ej: "Valledupar", "Costa Caribe", "Nacional"
  departamentos  text[],                               -- departamentos que cubre
  ciudades       text[],                               -- ciudades específicas (más granular)
  costo          numeric NOT NULL DEFAULT 0,
  dias_entrega   text,                                 -- ej: "3-5 días hábiles"
  activa         boolean DEFAULT true,
  orden          integer DEFAULT 0,
  created_at     timestamp with time zone DEFAULT now(),
  CONSTRAINT zonas_envio_pkey PRIMARY KEY (id)
);

-- Datos iniciales de zonas
INSERT INTO public.zonas_envio (nombre, departamentos, costo, dias_entrega) VALUES
  ('Valledupar (ciudad)',    ARRAY['Cesar'],     6000,   '2-3 días hábiles'),
  ('Nacional Interrapidísimo', NULL,             15000,  '5-10 días hábiles')
ON CONFLICT DO NOTHING;

-- ── 3.12 NOTIFICACIONES INTERNAS DEL ADMIN ──────────────────
-- Alertas que aparecen en el dashboard del admin
CREATE TABLE IF NOT EXISTS public.notificaciones_admin (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo        text NOT NULL CHECK (tipo = ANY (ARRAY[
                'pedido_nuevo'::text,
                'stock_bajo'::text,
                'pago_pendiente'::text,
                'resena_nueva'::text,
                'sistema'::text
              ])),
  titulo      text NOT NULL,
  mensaje     text,
  leida       boolean DEFAULT false,
  referencia_id text,                                  -- ID del pedido, producto, etc.
  created_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT notificaciones_admin_pkey PRIMARY KEY (id)
);

-- ── 3.13 SESIONES DE CARRITO ABANDONADO ─────────────────────
-- Para potencial recuperación de carritos (analytics + remarketing)
CREATE TABLE IF NOT EXISTS public.carritos_abandonados (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  sesion_id     text NOT NULL,
  email         text,
  telefono      text,
  items_json    jsonb NOT NULL,                        -- snapshot del carrito
  total         numeric,
  recuperado    boolean DEFAULT false,
  created_at    timestamp with time zone DEFAULT now(),
  updated_at    timestamp with time zone DEFAULT now(),
  CONSTRAINT carritos_abandonados_pkey PRIMARY KEY (id)
);

-- ── 3.14 TABLA DE AUDITORÍA GENERAL ─────────────────────────
-- Log de acciones del admin (quién cambió qué)
CREATE TABLE IF NOT EXISTS public.auditoria (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  tabla        text NOT NULL,
  registro_id  text NOT NULL,
  accion       text NOT NULL CHECK (accion = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  datos_antes  jsonb,
  datos_despues jsonb,
  usuario      text,
  created_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT auditoria_pkey PRIMARY KEY (id)
);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  BLOQUE 4 — ÍNDICES, FUNCIONES Y TRIGGERS               ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── Índices para performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_productos_categoria     ON public.productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo        ON public.productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_destacado     ON public.productos(destacado);
CREATE INDEX IF NOT EXISTS idx_productos_slug          ON public.productos(slug);
CREATE INDEX IF NOT EXISTS idx_variantes_producto_id   ON public.variantes_producto(producto_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido     ON public.pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado          ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_email           ON public.pedidos(cliente_email);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at      ON public.pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resenas_producto        ON public.resenas(producto_id);
CREATE INDEX IF NOT EXISTS idx_favoritos_sesion        ON public.favoritos(sesion_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_variante    ON public.movimientos_inventario(variante_id);
CREATE INDEX IF NOT EXISTS idx_notif_leida             ON public.notificaciones_admin(leida);

-- ── Función: auto-generar SLUG para productos ──────────────
-- Convierte "Camiseta Blanca Talla S" → "camiseta-blanca-talla-s"
CREATE OR REPLACE FUNCTION public.generar_slug(texto text)
RETURNS text AS $$
DECLARE
  slug text;
BEGIN
  slug := lower(texto);
  slug := regexp_replace(slug, '[áàäâ]', 'a', 'g');
  slug := regexp_replace(slug, '[éèëê]', 'e', 'g');
  slug := regexp_replace(slug, '[íìïî]', 'i', 'g');
  slug := regexp_replace(slug, '[óòöô]', 'o', 'g');
  slug := regexp_replace(slug, '[úùüû]', 'u', 'g');
  slug := regexp_replace(slug, '[ñ]',    'n', 'g');
  slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
  slug := regexp_replace(slug, '\s+', '-', 'g');
  slug := regexp_replace(slug, '-+', '-', 'g');
  slug := trim(both '-' from slug);
  RETURN slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── Trigger: slug automático en productos ──────────────────
CREATE OR REPLACE FUNCTION public.trigger_producto_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generar_slug(NEW.nombre) || '-' || substring(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_producto_slug ON public.productos;
CREATE TRIGGER trg_producto_slug
  BEFORE INSERT ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_producto_slug();

-- ── Trigger: actualizar updated_at automáticamente ─────────
CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();

-- ── Trigger: historial automático de cambios de estado ─────
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado_pedido()
RETURNS trigger AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.pedido_historial (pedido_id, estado_desde, estado_hacia)
    VALUES (NEW.id, OLD.estado, NEW.estado);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_historial_pedido ON public.pedidos;
CREATE TRIGGER trg_historial_pedido
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_estado_pedido();

-- ── Trigger: actualizar stats del cliente al hacer pedido ──
CREATE OR REPLACE FUNCTION public.actualizar_stats_cliente()
RETURNS trigger AS $$
BEGIN
  -- Crear cliente si no existe, o actualizar sus stats
  INSERT INTO public.clientes (email, nombre, telefono, cedula, ciudad, departamento, direccion, total_pedidos, total_gastado)
  VALUES (
    NEW.cliente_email, NEW.cliente_nombre, NEW.numero_whatsapp,
    NEW.cedula, NEW.ciudad, NEW.departamento, NEW.direccion, 1, NEW.total_final
  )
  ON CONFLICT (email) DO UPDATE SET
    total_pedidos  = public.clientes.total_pedidos + 1,
    total_gastado  = public.clientes.total_gastado + EXCLUDED.total_gastado,
    updated_at     = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stats_cliente ON public.pedidos;
CREATE TRIGGER trg_stats_cliente
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_stats_cliente();

-- ── Trigger: notificación automática en nuevo pedido ───────
CREATE OR REPLACE FUNCTION public.notificar_nuevo_pedido()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notificaciones_admin (tipo, titulo, mensaje, referencia_id)
  VALUES (
    'pedido_nuevo',
    'Nuevo pedido #' || lpad(NEW.numero_pedido::text, 4, '0'),
    'Cliente: ' || NEW.cliente_nombre || ' · Total: $' || NEW.total_final::text,
    NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notif_pedido ON public.pedidos;
CREATE TRIGGER trg_notif_pedido
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.notificar_nuevo_pedido();

-- ── Trigger: alerta de stock bajo ──────────────────────────
CREATE OR REPLACE FUNCTION public.alerta_stock_bajo()
RETURNS trigger AS $$
DECLARE
  v_minimo integer;
  v_nombre text;
BEGIN
  -- Solo alertar cuando stock disminuye
  IF NEW.stock < OLD.stock THEN
    SELECT COALESCE(stock_minimo, 5) INTO v_minimo FROM public.variantes_producto WHERE id = NEW.id;
    IF NEW.stock <= v_minimo THEN
      SELECT p.nombre INTO v_nombre
      FROM public.productos p WHERE p.id = NEW.producto_id;

      INSERT INTO public.notificaciones_admin (tipo, titulo, mensaje, referencia_id)
      VALUES (
        'stock_bajo',
        'Stock bajo: ' || v_nombre,
        'Solo quedan ' || NEW.stock || ' unidades · SKU: ' || COALESCE(NEW.sku, 'SIN SKU'),
        NEW.id::text
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alerta_stock ON public.variantes_producto;
CREATE TRIGGER trg_alerta_stock
  AFTER UPDATE OF stock ON public.variantes_producto
  FOR EACH ROW EXECUTE FUNCTION public.alerta_stock_bajo();

-- ── Función: calificación promedio de un producto ──────────
CREATE OR REPLACE FUNCTION public.calificacion_promedio(p_producto_id uuid)
RETURNS numeric AS $$
  SELECT ROUND(AVG(calificacion), 1)
  FROM public.resenas
  WHERE producto_id = p_producto_id AND aprobada = true;
$$ LANGUAGE sql STABLE;

-- ── Vista: productos con stock total ───────────────────────
CREATE OR REPLACE VIEW public.v_productos_stock AS
SELECT
  p.id,
  p.nombre,
  p.slug,
  p.precio_base,
  p.activo,
  p.destacado,
  c.nombre AS categoria,
  COALESCE(SUM(v.stock), 0) AS stock_total,
  COUNT(v.id) AS num_variantes,
  public.calificacion_promedio(p.id) AS calificacion_avg
FROM public.productos p
LEFT JOIN public.categorias c ON c.id = p.categoria_id
LEFT JOIN public.variantes_producto v ON v.producto_id = p.id AND v.activo = true
GROUP BY p.id, c.nombre;

-- ── Vista: resumen de pedidos por día ──────────────────────
CREATE OR REPLACE VIEW public.v_ventas_diarias AS
SELECT
  DATE(created_at AT TIME ZONE 'America/Bogota') AS fecha,
  COUNT(*) FILTER (WHERE estado != 'cancelado') AS pedidos_efectivos,
  COUNT(*) FILTER (WHERE estado = 'cancelado') AS pedidos_cancelados,
  SUM(total_final) FILTER (WHERE estado != 'cancelado') AS ingresos
FROM public.pedidos
GROUP BY DATE(created_at AT TIME ZONE 'America/Bogota')
ORDER BY fecha DESC;

-- ── Vista: clientes con valor de vida (LTV) ────────────────
CREATE OR REPLACE VIEW public.v_clientes_ltv AS
SELECT
  c.*,
  CASE
    WHEN c.total_gastado > 500000 THEN 'VIP'
    WHEN c.total_gastado > 200000 THEN 'Frecuente'
    WHEN c.total_pedidos > 1      THEN 'Recurrente'
    ELSE 'Nuevo'
  END AS segmento
FROM public.clientes c
ORDER BY c.total_gastado DESC;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  BLOQUE 5 — RLS (ROW LEVEL SECURITY)                    ║
-- ║  Protege los datos: clientes solo ven lo suyo,          ║
-- ║  el admin ve todo                                        ║
-- ╚══════════════════════════════════════════════════════════╝

-- Habilitar RLS en tablas sensibles
ALTER TABLE public.pedidos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resenas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones_admin    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion           ENABLE ROW LEVEL SECURITY;

-- ── Tablas públicas (sin RLS = lectura libre para la tienda)
-- productos, categorias, variantes_producto, atributos,
-- atributo_valores, banners, colecciones, resenas (aprobadas), zonas_envio

-- ── POLÍTICA: pedidos ───────────────────────────────────────
-- Usuarios autenticados (admin) ven todos los pedidos
-- Anónimos: solo pueden INSERTAR (hacer pedido) y leer el suyo por email

DROP POLICY IF EXISTS pedidos_admin_all    ON public.pedidos;
DROP POLICY IF EXISTS pedidos_insert_anon  ON public.pedidos;

CREATE POLICY pedidos_admin_all ON public.pedidos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY pedidos_insert_anon ON public.pedidos
  FOR INSERT TO anon
  WITH CHECK (true);

-- ── POLÍTICA: notificaciones (solo admin) ───────────────────
DROP POLICY IF EXISTS notif_admin_all ON public.notificaciones_admin;
CREATE POLICY notif_admin_all ON public.notificaciones_admin
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── POLÍTICA: clientes (solo admin) ─────────────────────────
DROP POLICY IF EXISTS clientes_admin_all ON public.clientes;
CREATE POLICY clientes_admin_all ON public.clientes
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── POLÍTICA: movimientos inventario (solo admin) ───────────
DROP POLICY IF EXISTS movimientos_admin_all ON public.movimientos_inventario;
CREATE POLICY movimientos_admin_all ON public.movimientos_inventario
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── POLÍTICA: configuracion ─────────────────────────────────
-- Admin puede editar, anon solo leer valores no sensibles
DROP POLICY IF EXISTS config_admin_all  ON public.configuracion;
DROP POLICY IF EXISTS config_anon_read  ON public.configuracion;

CREATE POLICY config_admin_all ON public.configuracion
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY config_anon_read ON public.configuracion
  FOR SELECT TO anon
  USING (clave NOT IN ('tienda_whatsapp_privado', 'api_secret'));

-- ── POLÍTICA: reseñas ───────────────────────────────────────
-- Anon puede ver las aprobadas e insertar nuevas; Admin ve todas
DROP POLICY IF EXISTS resenas_anon_read    ON public.resenas;
DROP POLICY IF EXISTS resenas_anon_insert  ON public.resenas;
DROP POLICY IF EXISTS resenas_admin_all    ON public.resenas;

CREATE POLICY resenas_anon_read ON public.resenas
  FOR SELECT TO anon
  USING (aprobada = true);

CREATE POLICY resenas_anon_insert ON public.resenas
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY resenas_admin_all ON public.resenas
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── Auditoria y pagos: solo admin ───────────────────────────
DROP POLICY IF EXISTS auditoria_admin ON public.auditoria;
CREATE POLICY auditoria_admin ON public.auditoria
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pagos_admin ON public.pagos;
CREATE POLICY pagos_admin ON public.pagos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permitir insertar pagos anónimamente (al finalizar checkout)
DROP POLICY IF EXISTS pagos_insert_anon ON public.pagos;
CREATE POLICY pagos_insert_anon ON public.pagos
  FOR INSERT TO anon WITH CHECK (true);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  RESUMEN - ¿QUÉ HACE CADA TABLA?                        ║
-- ╚══════════════════════════════════════════════════════════╝
/*
TABLAS EXISTENTES (mejoradas):
  productos               Catálogo principal (+ slug, SEO, tags, precio_comparacion)
  categorias              Jerarquía de categorías (+ subcategorías, banner)
  variantes_producto      Tallas/colores con stock (+ stock_minimo, imagen_variante)
  variante_atributos      Relación variante ↔ atributo_valor
  atributos               Atributos (TALLA, COLOR, etc.)
  atributo_valores        Valores de atributos (S, M, L, ROJO, AZUL)
  pedidos                 Órdenes de compra (+ guía, transportadora, notas_admin)
  pedido_items            Ítems de cada pedido (snapshot precio y nombre)
  pagos                   Registro de pagos por pedido
  cupones                 Descuentos (+ compra_minima, categorias_aplica)
  cupon_uso               Log de uso de cupones

TABLAS NUEVAS:
  producto_imagenes       Galería de fotos por producto
  guias_talla             Tablas de medidas por categoría
  pedido_historial        Log automático de cambios de estado del pedido
  movimientos_inventario  Auditoría de entradas/salidas de stock
  clientes                Perfil de compradores (se crea automáticamente)
  favoritos               Wishlist por sesión
  resenas                 Reseñas y calificaciones (con moderación)
  banners                 Carrusel y banners desde el admin
  colecciones             Grupos de productos para campañas
  coleccion_productos     Relación colección ↔ producto
  configuracion           Variables globales de la tienda
  zonas_envio             Precios de envío por zona geográfica
  notificaciones_admin    Alertas en el dashboard del admin
  carritos_abandonados    Log de carritos no completados
  auditoria               Log de acciones del admin

VISTAS:
  v_productos_stock       Productos con stock total y calificación promedio
  v_ventas_diarias        Ingresos y pedidos por día
  v_clientes_ltv          Segmentación de clientes por gasto acumulado

FUNCIONES:
  generar_slug()          Convierte texto a URL amigable
  calificacion_promedio() Promedio de reseñas de un producto

TRIGGERS AUTOMÁTICOS:
  trg_producto_slug       Genera slug al crear producto
  trg_pedidos_updated_at  Actualiza updated_at en pedidos
  trg_clientes_updated_at Actualiza updated_at en clientes
  trg_historial_pedido    Registra cambios de estado automáticamente
  trg_stats_cliente       Actualiza estadísticas del cliente al comprar
  trg_notif_pedido        Crea notificación en el admin al recibir pedido
  trg_alerta_stock        Alerta cuando stock cae bajo el mínimo
*/
