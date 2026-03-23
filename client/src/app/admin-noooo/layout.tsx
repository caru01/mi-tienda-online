"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard, Package, Tag, Hash, ShoppingBag,
    Layers, Ticket, LogOut, ExternalLink, Menu, X,
    Users, Star, Image as ImageIcon, Bell, Sliders, Shield
} from "lucide-react";
import { AdminRoleProvider, useAdminRole, ROL_LABELS, TABS_POR_ROL } from "@/context/AdminRoleContext";

// ── Nav items completos (el provider filtra según el rol) ──
const ALL_NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
    { id: "productos", label: "Catálogo", icon: Package },
    { id: "stock", label: "Inventario", icon: Hash },
    { id: "categorias", label: "Categorías", icon: Tag },
    { id: "atributos", label: "Atributos", icon: Layers },
    { id: "cupones", label: "Cupones", icon: Ticket },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "resenas", label: "Reseñas", icon: Star },
    { id: "banners", label: "Banners", icon: ImageIcon },
    { id: "configuracion", label: "Configuración", icon: Sliders },
    { id: "notificaciones", label: "Notificaciones", icon: Bell },
    { id: "usuarios", label: "Usuarios Admin", icon: Shield },
];

// ── Inner layout (necesita acceso al context ya montado) ──
function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { adminUser, rol, canSeeTab } = useAdminRole();

    const isLoginPage = pathname === "/admin/login";

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session && !isLoginPage) {
                router.push("/admin/login");
            } else {
                setUser(session?.user ?? null);
                setChecking(false);
            }
        };
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session && !isLoginPage) router.push("/admin/login");
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [isLoginPage, router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/admin/login");
    };

    // Página de login — sin layout
    if (isLoginPage) return <>{children}</>;

    // Spinner mientras verifica sesión
    if (checking) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#FCD7DE] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#FCD7DE] text-[10px] font-black uppercase tracking-widest">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    // Filtrar nav items según rol del usuario
    const navItems = ALL_NAV_ITEMS.filter(item => canSeeTab(item.id));
    const rolCfg = rol ? ROL_LABELS[rol] : null;

    // Tab activo desde la URL
    const tabActual = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab") ?? "dashboard"
        : "dashboard";

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex" style={{ fontFamily: "Arial, sans-serif" }}>

            {/* Overlay móvil */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── SIDEBAR ── */}
            <aside className={`
                fixed top-0 left-0 h-full w-64 bg-[#111111] border-r border-white/5 z-50 flex flex-col
                transition-transform duration-300
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                lg:translate-x-0 lg:static lg:flex
            `}>
                {/* Logo + Rol */}
                <div className="px-6 py-6 border-b border-white/5">
                    <div className="text-[#FCD7DE] text-2xl font-black italic tracking-tighter">GALU</div>
                    <div className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em] mt-0.5">Admin Panel</div>
                    {rolCfg && (
                        <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase ${rolCfg.bg} ${rolCfg.color}`}>
                            <Shield size={9} /> {rolCfg.label}
                        </div>
                    )}
                </div>

                {/* Nav — solo tabs permitidos por el rol */}
                <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === "dashboard"
                            ? tabActual === "dashboard"
                            : tabActual === item.id;
                        const href = item.id === "dashboard" ? "/admin" : `/admin?tab=${item.id}`;
                        return (
                            <Link key={item.id} href={href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${isActive ? "bg-[#FCD7DE] text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                                    }`}>
                                <Icon size={15} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer sidebar */}
                <div className="px-3 py-4 border-t border-white/5 space-y-1">
                    <a href="/" target="_blank"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/5 transition-all">
                        <ExternalLink size={15} /> Ver Tienda
                    </a>
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-red-400 hover:text-white hover:bg-red-500/20 transition-all">
                        <LogOut size={15} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* ── CONTENIDO PRINCIPAL ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-[#111111] border-b border-white/5 px-6 flex items-center justify-between sticky top-0 z-30">
                    <button className="text-white/50 hover:text-white transition-colors lg:hidden"
                        onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                    <div className="hidden lg:block" />

                    {/* Usuario + Rol */}
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-white text-[11px] font-black uppercase">
                                {adminUser?.nombre ?? user?.email}
                            </p>
                            {rolCfg && (
                                <p className={`text-[8px] font-black uppercase tracking-widest ${rolCfg.color}`}>
                                    {rolCfg.label}
                                </p>
                            )}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-[#FCD7DE] flex items-center justify-center">
                            {adminUser?.avatar_url
                                ? <img src={adminUser.avatar_url} className="w-full h-full rounded-full object-cover" />
                                : <span className="text-black text-[12px] font-black">
                                    {(adminUser?.nombre ?? user?.email)?.[0]?.toUpperCase() ?? "A"}
                                </span>
                            }
                        </div>
                    </div>
                </header>

                {/* Contenido */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

// ── Root export — wraps everything in the provider ──
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminRoleProvider>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </AdminRoleProvider>
    );
}
