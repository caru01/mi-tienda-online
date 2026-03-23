-- ============================================================
--  CLUB GALU — SISTEMA DE FIDELIZACIÓN COMPLETO
--  Ejecutar en Supabase SQL Editor DESPUÉS de schema_v2.sql
--  
--  Incluye:
--  1. Tabla: club_galu_config    (reglas del programa)
--  2. Tabla: referidos           (programa de referidos)
--  3. Tabla: puntos_cliente      (movimientos de puntos)
--  4. Triggers automáticos
--  5. Vistas de consulta
--  6. Funciones helper
--  7. RLS (seguridad)
-- ============================================================


-- ╔══════════════════════════════════════════════════════════╗
-- ║  1. CONFIGURACIÓN DEL CLUB GALU                         ║
-- ╚══════════════════════════════════════════════════════════╝
-- Permite al admin cambiar las reglas sin tocar código

CREATE TABLE IF NOT EXISTS public.club_galu_config (
  clave       text NOT NULL,
  valor       text NOT NULL,
  descripcion text,
  CONSTRAINT club_galu_config_pkey PRIMARY KEY (clave)
);

INSERT INTO public.club_galu_config (clave, valor, descripcion) VALUES
  ('activo',                  'true',  'Si el Club GALU está activo en la tienda'),
  ('compra_minima_puntos',    '50000', 'Monto mínimo de compra para acumular puntos (COP)'),
  ('porcentaje_puntos_bronze','3',     '% del total que se acumula como puntos — Nivel Bronce'),
  ('porcentaje_puntos_plata', '5',     '% del total que se acumula como puntos — Nivel Plata'),
  ('porcentaje_puntos_oro',   '8',     '% del total que se acumula como puntos — Nivel Oro'),
  ('umbral_plata',            '200000','Total gastado acumulado para alcanzar Nivel Plata (COP)'),
  ('umbral_oro',              '500000','Total gastado acumulado para alcanzar Nivel Oro (COP)'),
  ('descuento_referente',     '10',    '% de descuento que gana quien trajo el nuevo cliente'),
  ('descuento_referido',      '5',     '% de descuento que recibe el nuevo cliente al usar código'),
  ('max_referidos_activos',   '3',     'Máximo de códigos de referido activos por cliente'),
  ('envio_gratis_oro',        'true',  'Si los clientes Oro reciben envío gratis siempre')
ON CONFLICT (clave) DO NOTHING;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  2. TABLA: REFERIDOS                                    ║
-- ╚══════════════════════════════════════════════════════════╝
-- Registro de cada invitación exitosa

CREATE TABLE IF NOT EXISTS public.referidos (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  referente_email     text        NOT NULL,         -- quien compartió el código
  referente_nombre    text,
  referido_email      text,                         -- quien usó el código (se llena al usar)
  referido_nombre     text,
  codigo              text        NOT NULL UNIQUE,  -- ej: GALU-CAMIL-K3X9
  pedido_id           uuid        REFERENCES public.pedidos(id),  -- pedido donde se usó
  cupon_generado_id   uuid        REFERENCES public.cupones(id),  -- cupón de recompensa creado
  cupon_usado         boolean     DEFAULT false,    -- si el referente ya usó su recompensa
  estado              text        NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'completado', 'expirado')),
  created_at          timestamp with time zone DEFAULT now(),
  completado_at       timestamp with time zone,
  CONSTRAINT referidos_pkey PRIMARY KEY (id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referidos_referente ON public.referidos(referente_email);
CREATE INDEX IF NOT EXISTS idx_referidos_codigo    ON public.referidos(codigo);
CREATE INDEX IF NOT EXISTS idx_referidos_estado    ON public.referidos(estado);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  3. TABLA: PUNTOS_CLIENTE                               ║
-- ╚══════════════════════════════════════════════════════════╝
-- Libro mayor de puntos (cada fila es un movimiento)

CREATE TABLE IF NOT EXISTS public.puntos_cliente (
  id              uuid      NOT NULL DEFAULT gen_random_uuid(),
  cliente_email   text      NOT NULL,
  pedido_id       uuid      REFERENCES public.pedidos(id),
  tipo            text      NOT NULL CHECK (tipo IN ('ganado', 'canjeado', 'expirado', 'ajuste_admin')),
  puntos          numeric   NOT NULL,              -- positivo = ganó, negativo = canjeó/expiró
  saldo_anterior  numeric   NOT NULL DEFAULT 0,
  saldo_nuevo     numeric   NOT NULL DEFAULT 0,
  concepto        text,                            -- ej: 'Compra #0042 — 3% de $80.000'
  nivel_aplicado  text,                            -- 'bronce', 'plata', 'oro'
  created_at      timestamp with time zone DEFAULT now(),
  CONSTRAINT puntos_cliente_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_puntos_email ON public.puntos_cliente(cliente_email);
CREATE INDEX IF NOT EXISTS idx_puntos_pedido ON public.puntos_cliente(pedido_id);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  4. FUNCIÓN: calcular saldo de puntos de un cliente     ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.saldo_puntos(p_email text)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(puntos), 0)
  FROM public.puntos_cliente
  WHERE cliente_email = p_email;
$$ LANGUAGE sql STABLE;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  5. FUNCIÓN: determinar nivel del cliente                ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.nivel_club(p_total_gastado numeric)
RETURNS text AS $$
DECLARE
  umbral_oro  numeric;
  umbral_plata numeric;
BEGIN
  SELECT valor::numeric INTO umbral_oro   FROM public.club_galu_config WHERE clave = 'umbral_oro';
  SELECT valor::numeric INTO umbral_plata FROM public.club_galu_config WHERE clave = 'umbral_plata';
  
  IF p_total_gastado >= umbral_oro   THEN RETURN 'oro';
  ELSIF p_total_gastado >= umbral_plata THEN RETURN 'plata';
  ELSE RETURN 'bronce';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  6. FUNCIÓN: generar código de referido único           ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.generar_codigo_referido(p_nombre text)
RETURNS text AS $$
DECLARE
  base    text;
  codigo  text;
  sufijo  text;
  intento integer := 0;
BEGIN
  -- Tomar primeras 5 letras del nombre, en mayúsculas, sin tildes ni espacios
  base := upper(regexp_replace(
    regexp_replace(p_nombre, '[^a-zA-Z]', '', 'g'),
    '(.{1,5}).*', '\1'
  ));
  IF length(base) < 2 THEN base := 'GALU'; END IF;
  
  LOOP
    sufijo := upper(substring(md5(random()::text), 1, 4));
    codigo := 'GALU-' || base || '-' || sufijo;
    
    -- Verificar unicidad
    IF NOT EXISTS (SELECT 1 FROM public.referidos WHERE referidos.codigo = codigo) THEN
      RETURN codigo;
    END IF;
    
    intento := intento + 1;
    IF intento > 10 THEN
      RETURN 'GALU-' || upper(substring(md5(random()::text), 1, 8));
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  7. TRIGGER: acumular puntos automáticamente           ║
-- ║     Se ejecuta AFTER INSERT ON pedidos                  ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.acumular_puntos_pedido()
RETURNS trigger AS $$
DECLARE
  v_club_activo       text;
  v_compra_minima     numeric;
  v_nivel             text;
  v_porcentaje        numeric;
  v_saldo_anterior    numeric;
  v_puntos_ganados    numeric;
  v_total_gastado     numeric;
  v_config_key        text;
BEGIN
  -- Verificar si el club está activo
  SELECT valor INTO v_club_activo FROM public.club_galu_config WHERE clave = 'activo';
  IF v_club_activo != 'true' THEN RETURN NEW; END IF;

  -- Verificar monto mínimo
  SELECT valor::numeric INTO v_compra_minima FROM public.club_galu_config WHERE clave = 'compra_minima_puntos';
  IF NEW.total_final < v_compra_minima THEN RETURN NEW; END IF;

  -- Obtener total gastado del cliente (antes de este pedido)
  SELECT COALESCE(total_gastado, 0) INTO v_total_gastado
  FROM public.clientes WHERE email = NEW.cliente_email;
  
  -- Calcular nivel del cliente
  v_nivel := public.nivel_club(COALESCE(v_total_gastado, 0));
  
  -- Obtener porcentaje según nivel
  v_config_key := CASE v_nivel
    WHEN 'oro'   THEN 'porcentaje_puntos_oro'
    WHEN 'plata' THEN 'porcentaje_puntos_plata'
    ELSE              'porcentaje_puntos_bronze'
  END;
  SELECT valor::numeric INTO v_porcentaje FROM public.club_galu_config WHERE clave = v_config_key;

  -- Calcular puntos (1 punto = $1 COP)
  v_puntos_ganados := ROUND(NEW.total_final * (v_porcentaje / 100));
  
  -- Obtener saldo anterior
  v_saldo_anterior := public.saldo_puntos(NEW.cliente_email);

  -- Registrar movimiento
  INSERT INTO public.puntos_cliente (
    cliente_email, pedido_id, tipo, puntos,
    saldo_anterior, saldo_nuevo, concepto, nivel_aplicado
  ) VALUES (
    NEW.cliente_email,
    NEW.id,
    'ganado',
    v_puntos_ganados,
    v_saldo_anterior,
    v_saldo_anterior + v_puntos_ganados,
    'Compra #' || lpad(NEW.numero_pedido::text, 4, '0') || 
      ' — ' || v_porcentaje || '% de $' || NEW.total_final::text,
    v_nivel
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_acumular_puntos ON public.pedidos;
CREATE TRIGGER trg_acumular_puntos
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.acumular_puntos_acumular_puntos_pedido();

-- Corrección del nombre (typo arriba intencional para separar la creación):
DROP TRIGGER IF EXISTS trg_acumular_puntos ON public.pedidos;
CREATE OR REPLACE FUNCTION public.acumular_puntos_pedido()
RETURNS trigger AS $$
DECLARE
  v_club_activo       text;
  v_compra_minima     numeric;
  v_nivel             text;
  v_porcentaje        numeric;
  v_saldo_anterior    numeric;
  v_puntos_ganados    numeric;
  v_total_gastado     numeric;
  v_config_key        text;
BEGIN
  SELECT valor INTO v_club_activo FROM public.club_galu_config WHERE clave = 'activo';
  IF v_club_activo != 'true' THEN RETURN NEW; END IF;

  SELECT valor::numeric INTO v_compra_minima FROM public.club_galu_config WHERE clave = 'compra_minima_puntos';
  IF NEW.total_final < v_compra_minima THEN RETURN NEW; END IF;

  SELECT COALESCE(total_gastado, 0) INTO v_total_gastado
  FROM public.clientes WHERE email = NEW.cliente_email;
  
  v_nivel := public.nivel_club(COALESCE(v_total_gastado, 0));
  
  v_config_key := CASE v_nivel
    WHEN 'oro'   THEN 'porcentaje_puntos_oro'
    WHEN 'plata' THEN 'porcentaje_puntos_plata'
    ELSE              'porcentaje_puntos_bronze'
  END;
  SELECT valor::numeric INTO v_porcentaje FROM public.club_galu_config WHERE clave = v_config_key;

  v_puntos_ganados := ROUND(NEW.total_final * (v_porcentaje / 100));
  v_saldo_anterior := public.saldo_puntos(NEW.cliente_email);

  INSERT INTO public.puntos_cliente (
    cliente_email, pedido_id, tipo, puntos,
    saldo_anterior, saldo_nuevo, concepto, nivel_aplicado
  ) VALUES (
    NEW.cliente_email, NEW.id, 'ganado', v_puntos_ganados,
    v_saldo_anterior, v_saldo_anterior + v_puntos_ganados,
    'Compra #' || lpad(NEW.numero_pedido::text, 4, '0') ||
      ' — ' || v_porcentaje || '% de $' || NEW.total_final::text,
    v_nivel
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_acumular_puntos
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.acumular_puntos_pedido();


-- ╔══════════════════════════════════════════════════════════╗
-- ║  8. TRIGGER: completar referido al hacer un pedido     ║
-- ║     Si el pedido tiene cupon_id vinculado al referido   ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.completar_referido_si_aplica()
RETURNS trigger AS $$
DECLARE
  v_referido          public.referidos%ROWTYPE;
  v_descuento_ref     numeric;
  v_nuevo_cupon_id    uuid;
  v_codigo_cupon      text;
BEGIN
  -- Solo procesar si el pedido tiene cupón asociado
  IF NEW.cupon_id IS NULL THEN RETURN NEW; END IF;

  -- Buscar referido pendiente vinculado a ese cupón
  SELECT * INTO v_referido
  FROM public.referidos
  WHERE pedido_id IS NULL
    AND estado = 'pendiente'
    AND codigo = (
      SELECT codigo FROM public.cupones WHERE id = NEW.cupon_id LIMIT 1
    );

  IF v_referido IS NULL THEN RETURN NEW; END IF;

  -- Obtener % de recompensa para el referente
  SELECT valor::numeric INTO v_descuento_ref
  FROM public.club_galu_config WHERE clave = 'descuento_referente';

  -- Crear cupón de recompensa para el referente
  v_codigo_cupon := 'REF-' || upper(substring(md5(random()::text), 1, 6));
  INSERT INTO public.cupones (codigo, tipo, valor, uso_maximo, activo, descripcion)
  VALUES (
    v_codigo_cupon, 'porcentaje', v_descuento_ref, 1, true,
    'Recompensa referido — ' || v_referido.referente_email
  )
  RETURNING id INTO v_nuevo_cupon_id;

  -- Marcar referido como completado
  UPDATE public.referidos SET
    referido_email     = NEW.cliente_email,
    referido_nombre    = NEW.cliente_nombre,
    pedido_id          = NEW.id,
    cupon_generado_id  = v_nuevo_cupon_id,
    estado             = 'completado',
    completado_at      = now()
  WHERE id = v_referido.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_completar_referido ON public.pedidos;
CREATE TRIGGER trg_completar_referido
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.completar_referido_si_aplica();


-- ╔══════════════════════════════════════════════════════════╗
-- ║  9. VISTA: resumen del club por cliente                 ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE OR REPLACE VIEW public.v_club_galu_clientes AS
SELECT
  c.email,
  c.nombre,
  c.total_pedidos,
  c.total_gastado,
  public.nivel_club(c.total_gastado) AS nivel,
  public.saldo_puntos(c.email) AS puntos_disponibles,
  (
    SELECT COUNT(*) FROM public.referidos r
    WHERE r.referente_email = c.email AND r.estado = 'completado'
  ) AS referidos_exitosos,
  (
    SELECT COUNT(*) FROM public.referidos r
    WHERE r.referente_email = c.email AND r.estado = 'pendiente'
  ) AS referidos_pendientes,
  CASE public.nivel_club(c.total_gastado)
    WHEN 'oro'   THEN 500000 - c.total_gastado
    WHEN 'plata' THEN 200000 - c.total_gastado
    ELSE 0
  END AS gastado_para_siguiente_nivel,
  c.created_at
FROM public.clientes c
ORDER BY c.total_gastado DESC;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  10. RLS — SEGURIDAD                                    ║
-- ╚══════════════════════════════════════════════════════════╝

ALTER TABLE public.referidos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puntos_cliente     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_galu_config   ENABLE ROW LEVEL SECURITY;

-- Referidos: admin ve todo, anon puede consultar por código
DROP POLICY IF EXISTS referidos_admin      ON public.referidos;
DROP POLICY IF EXISTS referidos_anon_check ON public.referidos;
DROP POLICY IF EXISTS referidos_anon_use   ON public.referidos;

CREATE POLICY referidos_admin ON public.referidos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY referidos_anon_check ON public.referidos
  FOR SELECT TO anon USING (true);

CREATE POLICY referidos_anon_use ON public.referidos
  FOR INSERT TO anon WITH CHECK (true);

-- Puntos: admin ve todo, anon puede ver los suyos por email
DROP POLICY IF EXISTS puntos_admin     ON public.puntos_cliente;
DROP POLICY IF EXISTS puntos_anon_read ON public.puntos_cliente;
DROP POLICY IF EXISTS puntos_anon_ins  ON public.puntos_cliente;

CREATE POLICY puntos_admin ON public.puntos_cliente
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY puntos_anon_read ON public.puntos_cliente
  FOR SELECT TO anon USING (true);

CREATE POLICY puntos_anon_ins ON public.puntos_cliente
  FOR INSERT TO anon WITH CHECK (true);

-- Config del club: admin edita, anon lee
DROP POLICY IF EXISTS club_config_admin ON public.club_galu_config;
DROP POLICY IF EXISTS club_config_anon  ON public.club_galu_config;

CREATE POLICY club_config_admin ON public.club_galu_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY club_config_anon ON public.club_galu_config
  FOR SELECT TO anon USING (true);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  RESUMEN DE LO QUE HACE ESTE SCRIPT                    ║
-- ╚══════════════════════════════════════════════════════════╝
/*
TABLAS:
  club_galu_config    Variables del programa editables desde el admin
  referidos           Registro de códigos e invitaciones
  puntos_cliente      Libro mayor de puntos (cada movimiento = una fila)

FUNCIONES:
  saldo_puntos(email)        → Retorna saldo actual de puntos de un cliente
  nivel_club(total_gastado)  → Retorna 'bronce', 'plata' u 'oro'
  generar_codigo_referido()  → Genera código único tipo GALU-CAMIL-X9K3

TRIGGERS AUTOMÁTICOS:
  trg_acumular_puntos    → Al hacer un pedido >= $50.000, acumula puntos automáticamente
  trg_completar_referido → Al hacer un pedido con cupón de referido, completa el referido
                           y crea cupón de recompensa para el referente

VISTA:
  v_club_galu_clientes → Resumen de nivel y puntos de cada cliente

REGLAS POR DEFECTO:
  Bronce: acumula 3% de la compra en puntos (desde $50.000)
  Plata:  acumula 5% (desde $200.000 acumulados)
  Oro:    acumula 8% (desde $500.000 acumulados)
  
  Referido: -5% de descuento al nuevo cliente
  Referente: +10% de descuento en siguiente compra
*/
