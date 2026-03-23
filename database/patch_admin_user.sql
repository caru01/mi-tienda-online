-- ============================================================
--  PARCHE: Vincular usuario admin con auth.users
--  Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Actualiza el rol en admin_usuarios para que coincida
--    con los valores que espera el frontend (superadmin, admin, editor, viewer)
ALTER TABLE admin_usuarios
  DROP CONSTRAINT IF EXISTS admin_usuarios_rol_check;

ALTER TABLE admin_usuarios
  ADD CONSTRAINT admin_usuarios_rol_check
  CHECK (rol IN ('superadmin', 'admin', 'editor', 'viewer'));

-- 2. Busca el UUID real del usuario en auth.users y actualiza admin_usuarios
--    (esto lo hace automáticamente buscando el email)
UPDATE admin_usuarios
SET auth_id = (
  SELECT id FROM auth.users WHERE email = 'camilo01198@gmail.com' LIMIT 1
)
WHERE email = 'camilo01198@gmail.com';

-- 3. Si la fila aún no existe, la inserta directamente
INSERT INTO admin_usuarios (auth_id, email, nombre, rol, activo)
SELECT 
  id,
  'camilo01198@gmail.com',
  'Camilo Rincones',
  'superadmin',
  true
FROM auth.users
WHERE email = 'camilo01198@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  auth_id = EXCLUDED.auth_id,
  rol     = 'superadmin',
  activo  = true;

-- 4. Verifica el resultado
SELECT au.id, au.auth_id, au.email, au.rol, au.activo, 
       u.id as auth_user_id
FROM admin_usuarios au
LEFT JOIN auth.users u ON u.id = au.auth_id
WHERE au.email = 'camilo01198@gmail.com';
