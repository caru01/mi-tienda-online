"use client";
import React, { useEffect, useState } from "react";
import { Users, TrendingUp, Mail, Phone, MapPin, ShoppingBag, Crown, Star, Repeat } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SEGMENTO_COLOR: Record<string, string> = {
    VIP: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Frecuente: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Recurrente: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Nuevo: "bg-white/10 text-white/50 border-white/10",
};

export default function TabClientes({ toast }: { toast: (m: string, t?: any) => void }) {
    const [clientes, setClientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [expandido, setExpandido] = useState<string | null>(null);

    useEffect(() => {
        const cargar = async () => {
            const { data } = await supabase
                .from("v_clientes_ltv")
                .select("*")
                .order("total_gastado", { ascending: false });
            setClientes(data ?? []);
            setLoading(false);
        };
        cargar();
    }, []);

    const filtrados = clientes.filter(c =>
        c.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.ciudad?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalIngresos = clientes.reduce((s, c) => s + Number(c.total_gastado ?? 0), 0);
    const vips = clientes.filter(c => c.segmento === "VIP").length;
    const frecuentes = clientes.filter(c => c.segmento === "Frecuente").length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black uppercase italic text-white">Base de Clientes</h2>
                    <p className="text-white/30 text-[10px] mt-1">{clientes.length} clientes registrados</p>
                </div>
                <input
                    placeholder="Buscar por nombre, email o ciudad…"
                    className="bg-[#1a1a1a] border border-white/15 text-white placeholder:text-white/20 px-4 py-2.5 rounded-xl text-[11px] font-bold outline-none focus:border-[#FCD7DE]/40 w-full sm:w-72"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
            </div>

            {/* KPIs rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: Users, label: "Total", value: clientes.length, color: "bg-blue-600" },
                    { icon: Crown, label: "VIP", value: vips, color: "bg-yellow-600" },
                    { icon: Star, label: "Frecuentes", value: frecuentes, color: "bg-purple-600" },
                    { icon: TrendingUp, label: "Ingresos", value: `$${totalIngresos.toLocaleString("es-CO")}`, color: "bg-green-600" },
                ].map(k => (
                    <div key={k.label} className="bg-[#1a1a1a] border border-white/8 rounded-xl p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${k.color}`}><k.icon size={16} className="text-white" /></div>
                        <div>
                            <p className="text-white/30 text-[9px] font-black uppercase">{k.label}</p>
                            <p className="text-white font-black text-sm">{k.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lista */}
            {loading ? (
                <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-[#1a1a1a] rounded-xl animate-pulse" />)}</div>
            ) : (
                <div className="space-y-2">
                    {filtrados.map(c => (
                        <div key={c.id} className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-all"
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-[#FCD7DE]/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[#FCD7DE] text-sm font-black">{(c.nombre ?? c.email)?.[0]?.toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-[12px] font-black uppercase truncate">{c.nombre ?? "Sin nombre"}</p>
                                    <p className="text-white/40 text-[10px]">{c.email}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${SEGMENTO_COLOR[c.segmento] ?? SEGMENTO_COLOR.Nuevo}`}>
                                        {c.segmento}
                                    </span>
                                    <div className="text-right">
                                        <p className="text-white text-[11px] font-black">${Number(c.total_gastado ?? 0).toLocaleString("es-CO")}</p>
                                        <p className="text-white/30 text-[9px]">{c.total_pedidos} pedidos</p>
                                    </div>
                                </div>
                            </button>

                            {/* Detalle expandible */}
                            {expandido === c.id && (
                                <div className="border-t border-white/5 px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="flex items-start gap-2">
                                        <Phone size={12} className="text-white/30 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-white/30 text-[9px] uppercase font-black">WhatsApp</p>
                                            <p className="text-white text-[11px] font-bold">{c.telefono ?? "—"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <MapPin size={12} className="text-white/30 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-white/30 text-[9px] uppercase font-black">Ciudad</p>
                                            <p className="text-white text-[11px] font-bold">{c.ciudad ?? "—"}, {c.departamento ?? "—"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <ShoppingBag size={12} className="text-white/30 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-white/30 text-[9px] uppercase font-black">Cliente desde</p>
                                            <p className="text-white text-[11px] font-bold">{new Date(c.created_at).toLocaleDateString("es-CO")}</p>
                                        </div>
                                    </div>
                                    {c.direccion && (
                                        <div className="sm:col-span-3 text-white/40 text-[10px]">{c.direccion}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {filtrados.length === 0 && (
                        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-16 text-center">
                            <Users size={40} className="mx-auto text-white/10 mb-4" />
                            <p className="text-white/30 text-[11px] uppercase font-black">No se encontraron clientes</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
