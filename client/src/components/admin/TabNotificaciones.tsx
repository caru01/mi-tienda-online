"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, ShoppingBag, AlertTriangle, Star, Info, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

const TIPO_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
    pedido_nuevo: { icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    stock_bajo: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    pago_pendiente: { icon: ShoppingBag, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
    resena_nueva: { icon: Star, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    sistema: { icon: Info, color: "text-white/50", bg: "bg-white/5 border-white/10" },
};

export default function TabNotificaciones({ toast }: { toast: (m: string, t?: any) => void }) {
    const [notifs, setNotifs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<"todas" | "no_leidas">("no_leidas");

    const cargar = async () => {
        const q = supabase.from("notificaciones_admin").select("*").order("created_at", { ascending: false }).limit(100);
        const { data } = filtro === "no_leidas" ? await q.eq("leida", false) : await q;
        setNotifs(data ?? []);
        setLoading(false);
    };

    useEffect(() => { cargar(); }, [filtro]);

    const marcarLeida = async (id: string) => {
        await supabase.from("notificaciones_admin").update({ leida: true }).eq("id", id);
        setNotifs(p => p.filter(n => n.id !== id));
    };

    const marcarTodas = async () => {
        await supabase.from("notificaciones_admin").update({ leida: true }).eq("leida", false);
        toast("Todas marcadas como leídas ✓", "ok");
        cargar();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black uppercase italic text-white">Notificaciones</h2>
                    <p className="text-white/30 text-[10px] mt-1">{notifs.length} sin leer</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex gap-1 bg-[#1a1a1a] border border-white/8 rounded-lg p-1">
                        {(["no_leidas", "todas"] as const).map(f => (
                            <button key={f} onClick={() => setFiltro(f)}
                                className={`px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all ${filtro === f ? "bg-[#FCD7DE] text-black" : "text-white/40 hover:text-white"}`}>
                                {f === "no_leidas" ? "Sin Leer" : "Todas"}
                            </button>
                        ))}
                    </div>
                    <button onClick={marcarTodas}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] border border-white/8 text-[10px] font-black uppercase text-white/50 hover:text-white transition-all">
                        <CheckCheck size={14} /> Marcar todas
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-[#1a1a1a] rounded-xl animate-pulse" />
                ))}</div>
            ) : notifs.length === 0 ? (
                <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-16 text-center">
                    <Bell size={40} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/30 text-[11px] uppercase font-black">Sin notificaciones pendientes</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifs.map(n => {
                        const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.sistema;
                        const Icon = cfg.icon;
                        return (
                            <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                className={`flex items-start gap-4 p-4 rounded-xl border ${cfg.bg} group`}>
                                <div className={`p-2 rounded-lg bg-black/20 ${cfg.color} flex-shrink-0`}>
                                    <Icon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-[12px] font-black">{n.titulo}</p>
                                    {n.mensaje && <p className="text-white/50 text-[10px] mt-0.5">{n.mensaje}</p>}
                                    <p className="text-white/20 text-[9px] mt-1">{new Date(n.created_at).toLocaleString("es-CO")}</p>
                                </div>
                                <button onClick={() => marcarLeida(n.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
                                    <X size={14} />
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
