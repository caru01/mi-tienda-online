"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

// ─── Tipos ───────────────────────────────────────────────────────────────────
export type AdminRol = "superadmin" | "admin" | "editor" | "viewer" | null;

export interface AdminUser {
    id: string;
    email: string;
    nombre: string | null;
    rol: AdminRol;
    avatar_url: string | null;
}

// ─── Matriz de permisos ───────────────────────────────────────────────────────
// Define qué roles tienen cada permiso
export const PERMISOS = {
    // Catálogo
    crear_productos:     ["superadmin", "admin"],
    editar_productos:    ["superadmin", "admin"],
    eliminar_productos:  ["superadmin"],
    editar_precios:      ["superadmin", "admin"],

    // Categorías
    crear_categorias:    ["superadmin", "admin"],
    editar_categorias:   ["superadmin", "admin"],
    borrar_categorias:   ["superadmin"],

    // Stock / Inventario
    cambiar_stock:       ["superadmin", "admin", "editor"],

    // Pedidos
    ver_pedidos:            ["superadmin", "admin", "editor", "viewer"],
    cambiar_estado_pedido:  ["superadmin", "admin", "editor"],
    confirmar_pagos:        ["superadmin", "admin", "editor"],

    // Cupones
    gestionar_cupones: ["superadmin", "admin"],

    // Clientes
    ver_clientes: ["superadmin", "admin", "viewer"],

    // Contenido
    gestionar_banners: ["superadmin", "admin"],
    moderar_resenas:   ["superadmin", "admin"],

    // Configuración
    ver_configuracion:    ["superadmin"],
    editar_configuracion: ["superadmin"],

    // Notificaciones
    ver_notificaciones: ["superadmin", "admin", "editor"],

    // Dashboard
    ver_dashboard: ["superadmin", "admin", "editor", "viewer"],

    // Gestión de usuarios admin
    gestionar_usuarios: ["superadmin"],
} as const;

export type Permiso = keyof typeof PERMISOS;

// ─── Tabs visibles por rol ────────────────────────────────────────────────────
export const TABS_POR_ROL: Record<NonNullable<AdminRol>, string[]> = {
    superadmin: ["dashboard", "pedidos", "productos", "stock", "categorias", "atributos", "cupones", "clientes", "club", "resenas", "banners", "configuracion", "notificaciones", "usuarios"],
    admin: ["dashboard", "pedidos", "productos", "stock", "categorias", "atributos", "cupones", "clientes", "club", "resenas", "banners", "notificaciones"],
    editor: ["dashboard", "pedidos", "stock", "notificaciones"],
    viewer: ["dashboard", "pedidos", "clientes"],
};

// ─── Labels amigables por rol ─────────────────────────────────────────────────
export const ROL_LABELS: Record<NonNullable<AdminRol>, { label: string; color: string; bg: string }> = {
    superadmin: { label: "Super Admin", color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/30" },
    admin: { label: "Admin Tienda", color: "text-blue-400", bg: "bg-blue-500/20  border-blue-500/30" },
    editor: { label: "Editor", color: "text-green-400", bg: "bg-green-500/20 border-green-500/30" },
    viewer: { label: "Analista", color: "text-purple-400", bg: "bg-purple-500/20 border-purple-500/30" },
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface AdminRoleContextType {
    adminUser: AdminUser | null;
    rol: AdminRol;
    loading: boolean;
    /** Retorna true si el usuario tiene el permiso indicado */
    can: (permiso: Permiso) => boolean;
    /** Retorna true si el tab debe ser visible para este rol */
    canSeeTab: (tabId: string) => boolean;
}

const AdminRoleContext = createContext<AdminRoleContextType>({
    adminUser: null,
    rol: null,
    loading: true,
    can: () => false,
    canSeeTab: () => false,
});

export function AdminRoleProvider({ children }: { children: ReactNode }) {
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarRol = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) { setLoading(false); return; }

            const { data } = await supabase
                .from("admin_usuarios")
                .select("id, email, nombre, rol, avatar_url")
                .eq("auth_id", session.user.id)   // ← busca por auth_id, no por id
                .eq("activo", true)
                .single();

            if (data) {
                setAdminUser(data as AdminUser);
                // Actualizar último acceso sin esperar
                supabase.from("admin_usuarios")
                    .update({ ultimo_acceso: new Date().toISOString() })
                    .eq("id", data.id)
                    .then(() => { });
            } else {
                // Si no está en admin_usuarios, asignar rol mínimo basado en email
                // (útil durante desarrollo antes de migrar)
                setAdminUser({
                    id: session.user.id,
                    email: session.user.email ?? "",
                    nombre: session.user.email ?? null,
                    rol: "superadmin",
                    avatar_url: null,
                });
            }
            setLoading(false);
        };

        cargarRol();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => cargarRol());
        return () => subscription.unsubscribe();
    }, []);

    const can = (permiso: Permiso): boolean => {
        if (!adminUser?.rol) return false;
        return (PERMISOS[permiso] as readonly string[]).includes(adminUser.rol);
    };

    const canSeeTab = (tabId: string): boolean => {
        if (!adminUser?.rol) return false;
        return TABS_POR_ROL[adminUser.rol]?.includes(tabId) ?? false;
    };

    return (
        <AdminRoleContext.Provider value={{ adminUser, rol: adminUser?.rol ?? null, loading, can, canSeeTab }}>
            {children}
        </AdminRoleContext.Provider>
    );
}

export function useAdminRole() {
    return useContext(AdminRoleContext);
}
