-- ============================================================
--  GALU SHOP — REPARACIÓN COMPLETA DE PERMISOS
--  Ejecutar completo en Supabase → SQL Editor
-- ============================================================

-- PASO 1: Desactivar RLS temporalmente para verificar
-- (lo volvemos a activar al final)
ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar políticas existentes que puedan estar en conflicto
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- PASO 3: Dar permisos de esquema primero
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- PASO 4: GRANT sobre todas las tablas de una vez
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- PASO 5: Reactivar RLS solo en las tablas que lo necesitan
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

-- PASO 6: Recrear políticas simples y correctas

-- ── CONFIGURACION ──────────────────────────────────────────
CREATE POLICY "conf_public_read"  ON configuracion FOR SELECT USING (true);
CREATE POLICY "conf_admin_write"  ON configuracion FOR ALL   USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── CATEGORIAS ─────────────────────────────────────────────
CREATE POLICY "cat_public_read"  ON categorias FOR SELECT USING (true);
CREATE POLICY "cat_admin_all"    ON categorias FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── ATRIBUTOS ──────────────────────────────────────────────
CREATE POLICY "attr_public_read"  ON atributos FOR SELECT USING (true);
CREATE POLICY "attr_admin_all"    ON atributos FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "attrv_public_read" ON atributo_valores FOR SELECT USING (true);
CREATE POLICY "attrv_admin_all"   ON atributo_valores FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── PRODUCTOS ──────────────────────────────────────────────
CREATE POLICY "prod_public_read"  ON productos FOR SELECT USING (true);
CREATE POLICY "prod_admin_all"    ON productos FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "pimg_public_read"  ON producto_imagenes FOR SELECT USING (true);
CREATE POLICY "pimg_admin_all"    ON producto_imagenes FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "var_public_read"   ON variantes_producto FOR SELECT USING (true);
CREATE POLICY "var_admin_all"     ON variantes_producto FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "vara_public_read"  ON variante_atributos FOR SELECT USING (true);
CREATE POLICY "vara_admin_all"    ON variante_atributos FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── BANNERS ────────────────────────────────────────────────
CREATE POLICY "ban_public_read"  ON banners FOR SELECT USING (true);
CREATE POLICY "ban_admin_all"    ON banners FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── CLIENTES ────────────────────────────────────────────────
CREATE POLICY "cli_public_read"   ON clientes FOR SELECT USING (true);
CREATE POLICY "cli_public_insert" ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "cli_admin_all"     ON clientes FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── CUPONES ────────────────────────────────────────────────
CREATE POLICY "cup_public_read"   ON cupones FOR SELECT USING (true);
CREATE POLICY "cup_public_insert" ON cupones FOR INSERT WITH CHECK (true);
CREATE POLICY "cup_admin_all"     ON cupones FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "cupuso_public_insert" ON cupon_uso FOR INSERT WITH CHECK (true);
CREATE POLICY "cupuso_admin_all"     ON cupon_uso FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── PEDIDOS ────────────────────────────────────────────────
CREATE POLICY "ped_public_insert" ON pedidos      FOR INSERT WITH CHECK (true);
CREATE POLICY "ped_admin_all"     ON pedidos      FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "pi_public_insert"  ON pedido_items FOR INSERT WITH CHECK (true);
CREATE POLICY "pi_admin_all"      ON pedido_items FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── RESEÑAS ────────────────────────────────────────────────
CREATE POLICY "res_public_read"   ON resenas FOR SELECT USING (aprobada = true);
CREATE POLICY "res_public_insert" ON resenas FOR INSERT WITH CHECK (true);
CREATE POLICY "res_admin_all"     ON resenas FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── NOTIFICACIONES ─────────────────────────────────────────
CREATE POLICY "notif_admin_all"   ON notificaciones_admin FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── ADMIN USUARIOS ─────────────────────────────────────────
CREATE POLICY "admuser_admin_all" ON admin_usuarios FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── CLUB GALU ──────────────────────────────────────────────
CREATE POLICY "clubcfg_public_read"  ON club_galu_config FOR SELECT USING (true);
CREATE POLICY "clubcfg_admin_all"    ON club_galu_config FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "puntos_public_read"   ON puntos_cliente FOR SELECT USING (true);
CREATE POLICY "puntos_public_insert" ON puntos_cliente FOR INSERT WITH CHECK (true);
CREATE POLICY "puntos_admin_all"     ON puntos_cliente FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "ref_public_read"   ON referidos FOR SELECT USING (true);
CREATE POLICY "ref_public_insert" ON referidos FOR INSERT WITH CHECK (true);
CREATE POLICY "ref_admin_all"     ON referidos FOR ALL    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── PERMISOS A VISTAS ──────────────────────────────────────
GRANT SELECT ON v_clientes_ltv       TO authenticated;
GRANT SELECT ON v_club_galu_clientes TO authenticated;

-- ── FUNCIONES RPC ──────────────────────────────────────────
GRANT EXECUTE ON FUNCTION generar_codigo_referido(text) TO anon;
GRANT EXECUTE ON FUNCTION generar_codigo_referido(text) TO authenticated;

-- ── VERIFICACIÓN FINAL ─────────────────────────────────────
-- Corre esto para ver el estado:
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
