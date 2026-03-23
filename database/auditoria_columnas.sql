-- ============================================================
--  AUDITORÍA COMPLETA: Frontend vs Base de Datos GALU SHOP
-- ============================================================

## TABLA: configuracion
| Columna BD    | Columna Frontend           | Estado |
|---------------|---------------------------|--------|
| clave         | clave                     | ✅     |
| valor         | valor                     | ✅     |
| descripcion   | item.descripcion          | ✅     |
| updated_at    | —                         | OK     |

TabConfiguracion usa claves: moneda, envio_costo_local, envio_ciudad_local,
stock_alerta_minimo, checkout_activo, mensaje_checkout_cerrado,
pedido_horas_cancelacion, redes_instagram, redes_facebook, redes_tiktok
→ Algunas no existían en el INSERT inicial → AGREGADAS en patch_maestro_final.sql ✅

## TABLA: categorias
| Columna BD   | Columna Frontend | Estado |
|--------------|-----------------|--------|
| nombre       | nombre          | ✅     |
| slug         | slug            | ✅     |
| imagen       | imagen          | ✅     |
| activa       | activa          | ✅     |
| orden        | orden           | ✅     |
| descripcion  | —               | OK     |

## TABLA: productos
| Columna BD       | Columna Frontend    | Estado |
|------------------|---------------------|--------|
| nombre           | nombre              | ✅     |
| precio_base      | precio_base         | ✅     |
| categoria_id     | categoria_id        | ✅     |
| imagen_principal | imagen_principal    | ✅     |
| activo           | activo              | ✅     |
| destacado        | destacado           | ✅     |
| descripcion      | descripcion         | ✅     |
| es_ropa          | es_ropa             | ✅ AGREGADA |
| stock            | stock               | ✅     |

## TABLA: banners
| Columna BD    | Columna Frontend | Status |
|---------------|-----------------|--------|
| imagen_url    | imagen_url      | ✅     |
| titulo        | titulo          | ✅     |
| subtitulo     | subtitulo       | ✅     |
| enlace        | enlace          | ✅ AGREGADA (antes era 'link') |
| imagen_movil  | imagen_movil    | ✅ AGREGADA |
| activo        | activo          | ✅     |
| orden         | orden           | ✅     |

## TABLA: pedidos
| Columna BD          | Columna Frontend      | Status |
|---------------------|-----------------------|--------|
| cliente_nombre      | cliente_nombre        | ✅     |
| cliente_email       | cliente_email         | ✅     |
| cliente_telefono    | cliente_telefono      | ✅     |
| cliente_cedula      | cliente_cedula        | ✅     |
| departamento        | departamento          | ✅     |
| ciudad              | ciudad                | ✅     |
| barrio              | barrio                | ✅     |
| direccion           | direccion             | ✅     |
| metodo_pago         | metodo_pago           | ✅     |
| subtotal            | subtotal              | ✅     |
| descuento           | descuento             | ✅     |
| descuento_referido  | descuento_referido    | ✅     |
| costo_envio         | costo_envio           | ✅     |
| total_final         | total_final           | ✅     |
| cupon_codigo        | cupon_codigo          | ✅     |
| codigo_referido     | codigo_referido       | ✅     |
| estado              | estado                | ✅     |
| notas               | notas                 | ✅     |

## TABLA: pedido_items
| Columna BD      | Columna Frontend | Status |
|-----------------|-----------------|--------|
| nombre_producto | nombre_producto  | ✅     |
| imagen          | imagen           | ✅     |
| talla           | talla            | ✅     |
| cantidad        | cantidad         | ✅     |
| precio_unitario | precio_unitario  | ✅     |
| subtotal        | subtotal         | ✅ (GENERATED) |

## TABLA: resenas
| Columna BD     | Columna Frontend | Status |
|----------------|-----------------|--------|
| producto_id    | producto_id     | ✅     |
| cliente_email  | cliente_email   | ✅     |
| cliente_nombre | cliente_nombre  | ✅     |
| calificacion   | calificacion    | ✅     |
| comentario     | comentario      | ✅     |
| aprobada       | aprobada        | ✅     |

## TABLA: admin_usuarios
| Columna BD     | Columna Frontend | Status |
|----------------|-----------------|--------|
| auth_id        | auth_id         | ✅ (busca por auth_id) |
| email          | email           | ✅     |
| nombre         | nombre          | ✅     |
| rol            | rol             | ✅ (superadmin/admin/editor/viewer) |
| activo         | activo          | ✅     |
| ultimo_acceso  | ultimo_acceso   | ✅ AGREGADA |

## TABLA: puntos_cliente
| Columna BD     | Columna Frontend  | Status |
|----------------|------------------|--------|
| cliente_email  | cliente_email    | ✅     |
| pedido_id      | pedido_id        | ✅     |
| tipo           | tipo             | ✅     |
| puntos         | puntos           | ✅     |
| saldo_anterior | saldo_anterior   | ✅ AGREGADA |
| saldo_nuevo    | saldo_nuevo      | ✅     |
| concepto       | concepto         | ✅     |
| nivel_aplicado | nivel_aplicado   | ✅     |

## VISTAS
| Vista                | Columnas Frontend                                      | Status |
|---------------------|-------------------------------------------------------|--------|
| v_clientes_ltv      | email, nombre, telefono, ciudad, departamento,        | ✅     |
|                     | total_gastado, total_pedidos, created_at,             |        |
|                     | segmento, saldo_puntos, puntos_disponibles,           | ✅ RECREADA |
|                     | referidos_exitosos, nivel_club, nivel                 | ✅ RECREADA |
| v_club_galu_clientes| igual + orden por total_gastado DESC                  | ✅ RECREADA |

## ROLES admin_usuarios
| Valor BD    | Valor Frontend | Status |
|-------------|---------------|--------|
| superadmin  | superadmin    | ✅     |
| admin       | admin         | ✅     |
| editor      | editor        | ✅     |
| viewer      | viewer        | ✅     |
