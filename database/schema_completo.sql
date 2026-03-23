-- ============================================================
--  GALU SHOP — BASE DE DATOS COMPLETA DESDE CERO
--  Ejecutar en Supabase → SQL Editor (en orden)
-- ============================================================

-- ─────────────────────────────────────────────
-- 0. EXTENSIONES
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";


-- ─────────────────────────────────────────────
-- 1. CONFIGURACIÓN GENERAL DE LA TIENDA
-- ─────────────────────────────────────────────
CREATE TABLE configuracion (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave         text UNIQUE NOT NULL,
  valor         text,
  descripcion   text,
  updated_at    timestamptz DEFAULT now()
);

-- Datos iniciales de configuración
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('tienda_nombre',        'GALU SHOP',                    'Nombre de la tienda'),
  ('tienda_whatsapp',      '573022461068',                 'Número WhatsApp (sin +)'),
  ('tienda_email',         'contacto@galushop.com',        'Email de contacto'),
  ('redes_instagram',      'https://instagram.com/galushop','Instagram URL'),
  ('redes_facebook',       '',                             'Facebook URL'),
  ('redes_tiktok',         '',                             'TikTok URL'),
  ('envio_gratis_desde',   '150000',                       'Valor mínimo para envío gratis'),
  ('costo_envio_base',     '12000',                        'Costo fijo de envío'),
  ('barra_anuncio',        '',                             'Texto barra superior (vacío = usa el predeterminado)'),
  ('iva_porcentaje',       '0',                            'IVA en porcentaje (0 = no aplica)');


-- ─────────────────────────────────────────────
-- 2. CATEGORÍAS
-- ─────────────────────────────────────────────
CREATE TABLE categorias (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      text NOT NULL,
  slug        text UNIQUE NOT NULL,
  imagen      text,
  descripcion text,
  activa      boolean DEFAULT true,
  orden       int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO categorias (nombre, slug, activa, orden) VALUES
  ('Ropa de Mujer',              'ropa-de-mujer',               true, 1),
  ('Ropa Interior y Ropa para Dormir', 'ropa-interior-y-ropa-para-dormir', true, 2),
  ('Ropa para Hombre',           'ropa-para-hombre',            true, 3),
  ('Trajes de Baño',             'trajes-de-bano',              true, 4),
  ('Niños',                      'ninos',                       true, 5),
  ('Bebé y Maternidad',          'bebe-y-maternidad',           true, 6),
  ('Celulares y Accesorios',     'celulares-y-accesorios',      true, 7),
  ('Hogar y Vida',               'hogar-y-vida',                true, 8);


-- ─────────────────────────────────────────────
-- 3. ATRIBUTOS Y VALORES (tallas, colores, etc.)
-- ─────────────────────────────────────────────
CREATE TABLE atributos (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre     text UNIQUE NOT NULL,   -- ej: TALLA, COLOR
  created_at timestamptz DEFAULT now()
);

CREATE TABLE atributo_valores (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  atributo_id  uuid REFERENCES atributos(id) ON DELETE CASCADE,
  valor        text NOT NULL,        -- ej: S, M, L, XL, ROJO
  created_at   timestamptz DEFAULT now(),
  UNIQUE(atributo_id, valor)
);

-- Datos base de atributos
INSERT INTO atributos (nombre) VALUES ('TALLA'), ('COLOR');

INSERT INTO atributo_valores (atributo_id, valor)
SELECT id, unnest(ARRAY['XS','S','M','L','XL','XXL','XXXL'])
FROM atributos WHERE nombre = 'TALLA';

INSERT INTO atributo_valores (atributo_id, valor)
SELECT id, unnest(ARRAY['NEGRO','BLANCO','GRIS','AZUL','ROJO','ROSADO','VERDE','MORADO','NARANJA','BEIGE'])
FROM atributos WHERE nombre = 'COLOR';


-- ─────────────────────────────────────────────
-- 4. PRODUCTOS
-- ─────────────────────────────────────────────
CREATE TABLE productos (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre            text NOT NULL,
  descripcion       text,
  precio_base       numeric(12,2) NOT NULL DEFAULT 0,
  precio_oferta     numeric(12,2),
  categoria_id      uuid REFERENCES categorias(id) ON DELETE SET NULL,
  imagen_principal  text,
  activo            boolean DEFAULT true,
  destacado         boolean DEFAULT false,
  stock             int DEFAULT 0,           -- stock rápido (suma de variantes)
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Imágenes adicionales del producto
CREATE TABLE producto_imagenes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id uuid REFERENCES productos(id) ON DELETE CASCADE,
  url         text NOT NULL,
  orden       int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- Variantes (combinación de atributos: talla + color + precio + stock)
CREATE TABLE variantes_producto (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id uuid REFERENCES productos(id) ON DELETE CASCADE,
  sku         text UNIQUE,
  precio      numeric(12,2),              -- null = usa precio_base del producto
  stock       int DEFAULT 0,
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Relación variante ↔ atributo_valor (muchos a muchos)
CREATE TABLE variante_atributos (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  variante_id         uuid REFERENCES variantes_producto(id) ON DELETE CASCADE,
  atributo_valor_id   uuid REFERENCES atributo_valores(id) ON DELETE CASCADE,
  UNIQUE(variante_id, atributo_valor_id)
);


-- ─────────────────────────────────────────────
-- 5. BANNERS DEL CARRUSEL
-- ─────────────────────────────────────────────
CREATE TABLE banners (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo      text,
  subtitulo   text,
  imagen_url  text NOT NULL,
  link        text,
  boton_texto text,
  activo      boolean DEFAULT true,
  orden       int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 6. CLIENTES
-- ─────────────────────────────────────────────
CREATE TABLE clientes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           text UNIQUE NOT NULL,
  nombre          text,
  telefono        text,
  cedula          text,
  ciudad          text,
  departamento    text,
  direccion       text,
  total_gastado   numeric(14,2) DEFAULT 0,
  total_pedidos   int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 7. CUPONES DE DESCUENTO
-- ─────────────────────────────────────────────
CREATE TABLE cupones (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo          text UNIQUE NOT NULL,
  tipo            text CHECK (tipo IN ('porcentaje','fijo')) DEFAULT 'porcentaje',
  valor           numeric(10,2) NOT NULL,
  uso_maximo      int DEFAULT 1,
  usos_actuales   int DEFAULT 0,
  activo          boolean DEFAULT true,
  fecha_expira    timestamptz,
  descripcion     text,
  created_at      timestamptz DEFAULT now()
);

-- Registro de uso de cupones
CREATE TABLE cupon_uso (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cupon_id        uuid REFERENCES cupones(id) ON DELETE CASCADE,
  pedido_id       uuid,                   -- se llena cuando se crea el pedido
  cliente_email   text,
  fecha_uso       timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 8. PEDIDOS
-- ─────────────────────────────────────────────
CREATE TABLE pedidos (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Datos del cliente
  cliente_nombre    text NOT NULL,
  cliente_email     text NOT NULL,
  cliente_telefono  text,
  cliente_cedula    text,
  -- Dirección de envío
  departamento      text,
  ciudad            text,
  barrio            text,
  direccion         text,
  -- Pago
  metodo_pago       text,
  subtotal          numeric(14,2) DEFAULT 0,
  descuento         numeric(14,2) DEFAULT 0,
  descuento_referido numeric(14,2) DEFAULT 0,
  costo_envio       numeric(14,2) DEFAULT 0,
  total_final       numeric(14,2) DEFAULT 0,
  -- Códigos aplicados
  cupon_codigo      text,
  codigo_referido   text,
  -- Estado
  estado            text DEFAULT 'pendiente_pago'
                    CHECK (estado IN ('pendiente_pago','pagado','en_preparacion','enviado','entregado','cancelado')),
  notas             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Ítems del pedido (detalle de productos)
CREATE TABLE pedido_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id       uuid REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id     uuid REFERENCES productos(id) ON DELETE SET NULL,
  variante_id     uuid REFERENCES variantes_producto(id) ON DELETE SET NULL,
  nombre_producto text NOT NULL,
  imagen          text,
  talla           text,
  cantidad        int NOT NULL DEFAULT 1,
  precio_unitario numeric(12,2) NOT NULL,
  subtotal        numeric(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);


-- ─────────────────────────────────────────────
-- 9. RESEÑAS DE PRODUCTOS
-- ─────────────────────────────────────────────
CREATE TABLE resenas (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id     uuid REFERENCES productos(id) ON DELETE CASCADE,
  cliente_email   text NOT NULL,
  cliente_nombre  text,
  calificacion    int CHECK (calificacion BETWEEN 1 AND 5) NOT NULL,
  comentario      text,
  aprobada        boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 10. NOTIFICACIONES DEL ADMIN
-- ─────────────────────────────────────────────
CREATE TABLE notificaciones_admin (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        text,     -- 'pedido_nuevo', 'stock_bajo', 'resena_nueva', etc.
  titulo      text NOT NULL,
  mensaje     text,
  leida       boolean DEFAULT false,
  link        text,     -- URL a donde navegar al hacer click
  created_at  timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 11. USUARIOS ADMIN (RBAC)
-- ─────────────────────────────────────────────
CREATE TABLE admin_usuarios (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     uuid UNIQUE,              -- referencia al auth.users de Supabase
  email       text UNIQUE NOT NULL,
  nombre      text,
  avatar_url  text,
  rol         text DEFAULT 'editor'
              CHECK (rol IN ('superadmin','admin','editor','viewer')),
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 12. CLUB GALU — PROGRAMA DE FIDELIZACIÓN
-- ─────────────────────────────────────────────

-- Configuración del programa
CREATE TABLE club_galu_config (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave       text UNIQUE NOT NULL,
  valor       text NOT NULL,
  descripcion text,
  updated_at  timestamptz DEFAULT now()
);

INSERT INTO club_galu_config (clave, valor, descripcion) VALUES
  ('pct_bronce',              '3',      'Porcentaje de puntos nivel Bronce'),
  ('pct_plata',               '5',      'Porcentaje de puntos nivel Plata'),
  ('pct_oro',                 '8',      'Porcentaje de puntos nivel Oro'),
  ('umbral_plata',            '200000', 'Total gastado para alcanzar nivel Plata'),
  ('umbral_oro',              '500000', 'Total gastado para alcanzar nivel Oro'),
  ('compra_minima_puntos',    '50000',  'Compra mínima para acumular puntos'),
  ('descuento_referido',      '5',      'Descuento % que recibe el nuevo cliente al usar código'),
  ('descuento_referente',     '10',     'Descuento % que recibe quien compartió el código'),
  ('max_referidos_activos',   '3',      'Máx. códigos activos por cliente a la vez');

-- Historial de puntos por cliente
CREATE TABLE puntos_cliente (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_email   text NOT NULL,
  pedido_id       uuid REFERENCES pedidos(id) ON DELETE SET NULL,
  tipo            text CHECK (tipo IN ('ganado','canjeado','expirado','ajuste')) NOT NULL,
  puntos          numeric(14,2) NOT NULL,
  saldo_nuevo     numeric(14,2) DEFAULT 0,
  concepto        text,
  nivel_aplicado  text,
  created_at      timestamptz DEFAULT now()
);

-- Referidos
CREATE TABLE referidos (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referente_email     text NOT NULL,
  referente_nombre    text,
  referido_email      text,
  referido_nombre     text,
  codigo              text UNIQUE NOT NULL,
  cupon_generado_id   uuid REFERENCES cupones(id) ON DELETE SET NULL,
  estado              text DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','completado','expirado')),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 13. VISTAS ÚTILES
-- ─────────────────────────────────────────────

-- Vista de clientes con LTV y nivel Club GALU
CREATE OR REPLACE VIEW v_clientes_ltv AS
SELECT
  c.id,
  c.email,
  c.nombre,
  c.telefono,
  c.ciudad,
  c.total_gastado,
  c.total_pedidos,
  c.created_at,
  CASE
    WHEN c.total_gastado >= (SELECT valor::numeric FROM club_galu_config WHERE clave = 'umbral_oro')   THEN 'oro'
    WHEN c.total_gastado >= (SELECT valor::numeric FROM club_galu_config WHERE clave = 'umbral_plata') THEN 'plata'
    ELSE 'bronce'
  END AS nivel_club,
  COALESCE((
    SELECT SUM(CASE WHEN p.tipo = 'ganado' THEN p.puntos ELSE -ABS(p.puntos) END)
    FROM puntos_cliente p WHERE p.cliente_email = c.email
  ), 0) AS saldo_puntos
FROM clientes c;

-- Vista para el admin de Club GALU
CREATE OR REPLACE VIEW v_club_galu_clientes AS
SELECT * FROM v_clientes_ltv ORDER BY total_gastado DESC;


-- ─────────────────────────────────────────────
-- 14. FUNCIONES
-- ─────────────────────────────────────────────

-- Generar código de referido único
CREATE OR REPLACE FUNCTION generar_codigo_referido(p_nombre text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_codigo text;
  v_existe  boolean;
BEGIN
  LOOP
    v_codigo := 'GALU-' ||
                UPPER(SUBSTRING(REGEXP_REPLACE(UNACCENT(p_nombre), '[^a-zA-Z0-9]', '', 'g'), 1, 5)) ||
                '-' ||
                UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 4));
    SELECT EXISTS (SELECT 1 FROM referidos WHERE codigo = v_codigo) INTO v_existe;
    EXIT WHEN NOT v_existe;
  END LOOP;
  RETURN v_codigo;
END;
$$;

-- Actualizar stock del producto padre al cambiar variantes
CREATE OR REPLACE FUNCTION sync_stock_producto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE productos
  SET stock = (
    SELECT COALESCE(SUM(stock), 0)
    FROM variantes_producto
    WHERE producto_id = COALESCE(NEW.producto_id, OLD.producto_id)
      AND activo = true
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.producto_id, OLD.producto_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_stock
AFTER INSERT OR UPDATE OR DELETE ON variantes_producto
FOR EACH ROW EXECUTE FUNCTION sync_stock_producto();

-- Actualizar datos del cliente al pagar un pedido
CREATE OR REPLACE FUNCTION actualizar_cliente_al_pagar()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'pagado' AND OLD.estado != 'pagado' THEN
    -- Upsert cliente
    INSERT INTO clientes (email, nombre, telefono, cedula, ciudad, departamento, direccion)
    VALUES (
      lower(NEW.cliente_email), NEW.cliente_nombre,
      NEW.cliente_telefono, NEW.cliente_cedula,
      NEW.ciudad, NEW.departamento, NEW.direccion
    )
    ON CONFLICT (email) DO UPDATE SET
      nombre       = EXCLUDED.nombre,
      telefono     = COALESCE(EXCLUDED.telefono, clientes.telefono),
      ciudad       = COALESCE(EXCLUDED.ciudad, clientes.ciudad),
      departamento = COALESCE(EXCLUDED.departamento, clientes.departamento),
      direccion    = COALESCE(EXCLUDED.direccion, clientes.direccion),
      updated_at   = now();

    -- Acumular gasto y pedidos
    UPDATE clientes
    SET
      total_gastado = total_gastado + NEW.total_final,
      total_pedidos = total_pedidos + 1,
      updated_at    = now()
    WHERE email = lower(NEW.cliente_email);

    -- Decrementar stock de variantes
    UPDATE variantes_producto vp
    SET stock = GREATEST(0, vp.stock - pi.cantidad)
    FROM pedido_items pi
    WHERE pi.pedido_id = NEW.id AND pi.variante_id = vp.id;

    -- Notificación al admin
    INSERT INTO notificaciones_admin (tipo, titulo, mensaje, link)
    VALUES (
      'pedido_pagado',
      'Nuevo pago recibido',
      'El pedido de ' || NEW.cliente_nombre || ' por $' || NEW.total_final || ' ha sido marcado como pagado.',
      '/admin?tab=pedidos'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_actualizar_cliente
AFTER UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION actualizar_cliente_al_pagar();

-- Acumular puntos al crear un pedido (cuando se marca pagado)
CREATE OR REPLACE FUNCTION acumular_puntos_club_galu()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_compra_min  numeric;
  v_pct_bronce  numeric;
  v_pct_plata   numeric;
  v_pct_oro     numeric;
  v_umbral_plata numeric;
  v_umbral_oro  numeric;
  v_gastado     numeric;
  v_nivel       text;
  v_pct         numeric;
  v_puntos      numeric;
  v_saldo_ant   numeric;
BEGIN
  IF NEW.estado = 'pagado' AND OLD.estado != 'pagado' THEN
    SELECT valor::numeric INTO v_compra_min  FROM club_galu_config WHERE clave = 'compra_minima_puntos';
    SELECT valor::numeric INTO v_pct_bronce  FROM club_galu_config WHERE clave = 'pct_bronce';
    SELECT valor::numeric INTO v_pct_plata   FROM club_galu_config WHERE clave = 'pct_plata';
    SELECT valor::numeric INTO v_pct_oro     FROM club_galu_config WHERE clave = 'pct_oro';
    SELECT valor::numeric INTO v_umbral_plata FROM club_galu_config WHERE clave = 'umbral_plata';
    SELECT valor::numeric INTO v_umbral_oro  FROM club_galu_config WHERE clave = 'umbral_oro';

    IF NEW.total_final >= v_compra_min THEN
      SELECT COALESCE(total_gastado, 0) INTO v_gastado
      FROM clientes WHERE email = lower(NEW.cliente_email);

      -- Determinar nivel
      IF v_gastado >= v_umbral_oro    THEN v_nivel := 'oro';    v_pct := v_pct_oro;
      ELSIF v_gastado >= v_umbral_plata THEN v_nivel := 'plata'; v_pct := v_pct_plata;
      ELSE v_nivel := 'bronce'; v_pct := v_pct_bronce;
      END IF;

      v_puntos := ROUND((NEW.total_final * v_pct / 100), 0);

      SELECT COALESCE(SUM(CASE WHEN tipo='ganado' THEN puntos ELSE -ABS(puntos) END), 0)
      INTO v_saldo_ant
      FROM puntos_cliente WHERE cliente_email = lower(NEW.cliente_email);

      INSERT INTO puntos_cliente (cliente_email, pedido_id, tipo, puntos, saldo_nuevo, concepto, nivel_aplicado)
      VALUES (
        lower(NEW.cliente_email), NEW.id, 'ganado', v_puntos,
        v_saldo_ant + v_puntos,
        'Compra #' || substring(NEW.id::text, 1, 8),
        v_nivel
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_acumular_puntos
AFTER UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION acumular_puntos_club_galu();

-- Notificación al crear pedido nuevo
CREATE OR REPLACE FUNCTION notificar_pedido_nuevo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notificaciones_admin (tipo, titulo, mensaje, link)
  VALUES (
    'pedido_nuevo',
    'Nuevo pedido recibido',
    NEW.cliente_nombre || ' realizó un pedido por $' || NEW.total_final,
    '/admin?tab=pedidos'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notificar_pedido
AFTER INSERT ON pedidos
FOR EACH ROW EXECUTE FUNCTION notificar_pedido_nuevo();


-- ─────────────────────────────────────────────
-- 15. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────
ALTER TABLE configuracion        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE atributos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE atributo_valores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_imagenes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes_producto   ENABLE ROW LEVEL SECURITY;
ALTER TABLE variante_atributos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupon_uso            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE resenas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_galu_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntos_cliente       ENABLE ROW LEVEL SECURITY;
ALTER TABLE referidos            ENABLE ROW LEVEL SECURITY;

-- ── Lectura pública (tienda) ──────────────────────────────
CREATE POLICY "pub_read_config"     ON configuracion     FOR SELECT USING (true);
CREATE POLICY "pub_read_categorias" ON categorias        FOR SELECT USING (activa = true);
CREATE POLICY "pub_read_atributos"  ON atributos         FOR SELECT USING (true);
CREATE POLICY "pub_read_atrib_val"  ON atributo_valores  FOR SELECT USING (true);
CREATE POLICY "pub_read_productos"  ON productos         FOR SELECT USING (activo = true);
CREATE POLICY "pub_read_prod_img"   ON producto_imagenes FOR SELECT USING (true);
CREATE POLICY "pub_read_variantes"  ON variantes_producto FOR SELECT USING (activo = true);
CREATE POLICY "pub_read_var_attr"   ON variante_atributos FOR SELECT USING (true);
CREATE POLICY "pub_read_banners"    ON banners           FOR SELECT USING (activo = true);
CREATE POLICY "pub_read_cupones"    ON cupones           FOR SELECT USING (activo = true);
CREATE POLICY "pub_read_club_cfg"   ON club_galu_config  FOR SELECT USING (true);
CREATE POLICY "pub_read_resenas"    ON resenas           FOR SELECT USING (aprobada = true);

-- ── Escritura pública (sin login) ──────────────────────────
-- Cualquiera puede crear pedidos (el checkout no requiere login)
CREATE POLICY "pub_insert_pedidos"  ON pedidos      FOR INSERT WITH CHECK (true);
CREATE POLICY "pub_insert_items"    ON pedido_items FOR INSERT WITH CHECK (true);
CREATE POLICY "pub_insert_resenas"  ON resenas      FOR INSERT WITH CHECK (true);
CREATE POLICY "pub_insert_cuponuso" ON cupon_uso    FOR INSERT WITH CHECK (true);

-- Club GALU (tienda — acceso por email, sin auth)
CREATE POLICY "pub_read_clientes"   ON clientes       FOR SELECT USING (true);
CREATE POLICY "pub_read_puntos"     ON puntos_cliente FOR SELECT USING (true);
CREATE POLICY "pub_read_referidos"  ON referidos      FOR SELECT USING (true);
CREATE POLICY "pub_insert_referidos" ON referidos     FOR INSERT WITH CHECK (true);
CREATE POLICY "pub_insert_cupones"  ON cupones        FOR INSERT WITH CHECK (true);
CREATE POLICY "pub_insert_puntos"   ON puntos_cliente FOR INSERT WITH CHECK (true);

-- ── Admin (solo usuarios autenticados de Supabase Auth) ───
CREATE POLICY "admin_all_config"       ON configuracion        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_categorias"   ON categorias           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_productos"    ON productos            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_prod_img"     ON producto_imagenes    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_variantes"    ON variantes_producto   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_var_attr"     ON variante_atributos   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_atributos"    ON atributos            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_atrib_val"    ON atributo_valores     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_banners"      ON banners              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_clientes"     ON clientes             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_update_pedidos"   ON pedidos              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_items"        ON pedido_items         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_cupones"      ON cupones              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_cupon_uso"    ON cupon_uso            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_resenas"      ON resenas              FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_notif"        ON notificaciones_admin FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_usuarios"     ON admin_usuarios       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_club_cfg"     ON club_galu_config     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_puntos"       ON puntos_cliente       FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_referidos"    ON referidos            FOR ALL USING (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────
-- 16. USUARIO ADMIN INICIAL
--     IMPORTANTE: primero crea el usuario en
--     Supabase → Authentication → Add user:
--       Email: camilo01198@gmail.com
--       Password: 123456
--     Luego copia el UUID generado y reemplaza
--     'REEMPLAZAR_CON_UUID_DEL_AUTH_USER' abajo.
-- ─────────────────────────────────────────────
INSERT INTO admin_usuarios (auth_id, email, nombre, rol, activo)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- <-- pega aquí el UUID
  'camilo01198@gmail.com',
  'Camilo Rincones',
  'superadmin',
  true
)
ON CONFLICT (email) DO NOTHING;
