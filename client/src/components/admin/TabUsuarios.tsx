"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Crown, ShieldCheck, Truck, BarChart2, Plus, Pencil, X, Check, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ROL_LABELS, AdminRol } from "@/context/AdminRoleContext";

const ROLES: { value: AdminRol; icon: any; desc: string }[] = [
    { value: "superadmin", icon: Crown,       desc: "Acceso total — crear, editar y borrar cualquier cosa" },
    { value: "admin",      icon: ShieldCheck,  desc: "Gestión de catálogo, pedidos, cupones y contenido" },
    { value: "editor",     icon: Truck,        desc: "Stock, pedidos y confirmación de pagos" },
    { value: "viewer",     icon: BarChart2,    desc: "Solo lectura — dashboard, pedidos y clientes" },
];

export default function TabUsuarios({ toast }: { toast: (m: string, t?: any) => void }) {
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState<string | null>(null);
    const [form, setForm] = useState({ email: "", nombre: "", rol: "viewer" as AdminRol, password: "" });
    const [guardando, setGuardando] = useState(false);
    const [modalNuevo, setModalNuevo] = useState(false);

    const cargar = async () => {
        const { data } = await supabase
            .from("admin_usuarios")
            .select("*")
            .order("created_at", { ascending: false });
        setUsuarios(data ?? []);
        setLoading(false);
    };

    useEffect(() => { cargar(); }, []);

    const cambiarRol = async (id: string, rol: string) => {
        setGuardando(true);
        const { error } = await supabase.from("admin_usuarios").update({ rol }).eq("id", id);
        if (error) toast(error.message, "err");
        else { toast("Rol actualizado ✓", "ok"); cargar(); setEditando(null); }
        setGuardando(false);
    };

    const toggleActivo = async (id: string, activo: boolean) => {
        await supabase.from("admin_usuarios").update({ activo: !activo }).eq("id", id);
        toast(activo ? "Usuario desactivado" : "Usuario activado ✓", "ok");
        cargar();
    };

    const eliminar = async (id: string) => {
        if (!confirm("¿Eliminar este usuario admin? (No elimina el usuario de Supabase Auth)")) return;
        await supabase.from("admin_usuarios").delete().eq("id", id);
        toast("Usuario eliminado del panel", "ok");
        cargar();
    };

    const crearUsuario = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        try {
            // Crear en Supabase Auth
            const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
                email: form.email,
                password: form.password,
                email_confirm: true,
            });
            if (authErr) throw authErr;

            // Registrar en admin_usuarios
            const { error } = await supabase.from("admin_usuarios").insert([{
                auth_id: authData.user.id,
                email: form.email,
                nombre: form.nombre,
                rol: form.rol,
                activo: true,
            }]);
            if (error) throw error;

            toast(`Usuario ${form.email} creado con rol ${form.rol} ✓`, "ok");
            setForm({ email: "", nombre: "", rol: "viewer", password: "" });
            setModalNuevo(false);
            cargar();
        } catch (err: any) {
            toast(err.message, "err");
        }
        setGuardando(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-black uppercase italic text-white">Usuarios del Panel</h2>
                    <p className="text-white/30 text-[10px] mt-1">{usuarios.length} usuarios registrados</p>
                </div>
                <button onClick={() => setModalNuevo(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#FCD7DE] text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white transition-all">
                    <Plus size={14} /> Nuevo Usuario
                </button>
            </div>

            {/* Tarjetas de roles explicativas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {ROLES.map(r => {
                    const cfg = ROL_LABELS[r.value!];
                    const Icon = r.icon;
                    return (
                        <div key={r.value} className={`rounded-xl border p-4 ${cfg.bg}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Icon size={14} className={cfg.color} />
                                <span className={`text-[10px] font-black uppercase ${cfg.color}`}>{cfg.label}</span>
                            </div>
                            <p className="text-white/40 text-[9px] leading-relaxed">{r.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* Tabla de usuarios */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#1a1a1a] rounded-xl animate-pulse" />)}
                </div>
            ) : (
                <div className="space-y-2">
                    {usuarios.map(u => {
                        const cfg = ROL_LABELS[(u.rol as NonNullable<AdminRol>) ?? "viewer"] ?? ROL_LABELS.viewer;
                        return (
                            <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className={`bg-[#1a1a1a] border rounded-xl overflow-hidden ${u.activo ? "border-white/8" : "border-white/3 opacity-50"}`}>

                                <div className="flex items-center gap-4 px-5 py-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-[#FCD7DE]/20 flex items-center justify-center flex-shrink-0">
                                        {u.avatar_url
                                            ? <img src={u.avatar_url} className="w-full h-full rounded-full object-cover" />
                                            : <span className="text-[#FCD7DE] font-black text-sm">{(u.nombre ?? u.email)?.[0]?.toUpperCase()}</span>
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-[12px] font-black">{u.nombre ?? "Sin nombre"}</p>
                                        <p className="text-white/40 text-[10px] truncate">{u.email}</p>
                                        {u.ultimo_acceso && (
                                            <p className="text-white/20 text-[9px]">
                                                Último acceso: {new Date(u.ultimo_acceso).toLocaleString("es-CO")}
                                            </p>
                                        )}
                                    </div>

                                    {/* Rol — editable */}
                                    <div className="flex-shrink-0">
                                        {editando === u.id ? (
                                            <div className="flex gap-2 items-center">
                                                <select defaultValue={u.rol}
                                                    onChange={e => cambiarRol(u.id, e.target.value)}
                                                    className="bg-[#111] border border-white/20 text-white text-[10px] font-black px-3 py-2 rounded-lg outline-none">
                                                    {ROLES.map(r => (
                                                        <option key={r.value} value={r.value!}>{ROL_LABELS[r.value!].label}</option>
                                                    ))}
                                                </select>
                                                <button onClick={() => setEditando(null)}
                                                    className="p-1.5 text-white/30 hover:text-white">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setEditando(u.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase cursor-pointer hover:opacity-80 transition-all ${cfg.bg} ${cfg.color}`}>
                                                {u.rol.replace("_", " ")} <Pencil size={10} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => toggleActivo(u.id, u.activo)}
                                            title={u.activo ? "Desactivar" : "Activar"}
                                            className={`p-2 rounded-lg transition-all ${u.activo ? "text-green-400 hover:bg-green-500/20" : "text-white/20 hover:bg-white/5"}`}>
                                            <Check size={14} />
                                        </button>
                                        <button onClick={() => eliminar(u.id)}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                    {usuarios.length === 0 && (
                        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-16 text-center">
                            <Users size={40} className="mx-auto text-white/10 mb-4" />
                            <p className="text-white/30 text-[11px] uppercase font-black">
                                Sin usuarios admin. Crea el primero.
                            </p>
                            <p className="text-white/15 text-[9px] mt-2">
                                También puedes copiar tu UUID desde Supabase → Auth y ejecutar roles.sql
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal — nuevo usuario */}
            <AnimatePresence>
                {modalNuevo && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setModalNuevo(false)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#111] border border-white/15 rounded-2xl p-8 w-full max-w-md space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white text-[14px] font-black uppercase italic">Nuevo Usuario</h3>
                                <button onClick={() => setModalNuevo(false)} className="text-white/30 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={crearUsuario} className="space-y-4">
                                <input required type="text" placeholder="Nombre completo"
                                    className="w-full bg-[#1a1a1a] border border-white/15 text-white px-4 py-3 rounded-xl text-[12px] font-bold outline-none focus:border-[#FCD7DE]/40"
                                    value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                                <input required type="email" placeholder="Email"
                                    className="w-full bg-[#1a1a1a] border border-white/15 text-white px-4 py-3 rounded-xl text-[12px] font-bold outline-none focus:border-[#FCD7DE]/40"
                                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                <input required type="password" placeholder="Contraseña temporal" minLength={8}
                                    className="w-full bg-[#1a1a1a] border border-white/15 text-white px-4 py-3 rounded-xl text-[12px] font-bold outline-none focus:border-[#FCD7DE]/40"
                                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />

                                <div>
                                    <p className="text-white/40 text-[9px] font-black uppercase mb-2">Rol</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ROLES.map(r => {
                                            const cfg = ROL_LABELS[r.value!];
                                            const Icon = r.icon;
                                            return (
                                                <button key={r.value} type="button"
                                                    onClick={() => setForm({ ...form, rol: r.value })}
                                                    className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-black uppercase transition-all ${form.rol === r.value ? `${cfg.bg} ${cfg.color}` : "border-white/10 text-white/30 hover:border-white/30"
                                                        }`}>
                                                    <Icon size={12} /> {cfg.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-white/20 text-[9px] mt-2">
                                        {ROLES.find(r => r.value === form.rol)?.desc}
                                    </p>
                                </div>

                                <button type="submit" disabled={guardando}
                                    className="w-full bg-[#FCD7DE] text-black font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-white transition-all text-[11px] disabled:opacity-40">
                                    {guardando ? "Creando…" : "Crear Usuario"}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
