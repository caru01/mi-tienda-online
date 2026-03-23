"use client";
import React, { useEffect, useState } from "react";
import { Star, Check, X, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function TabResenas({ toast }: { toast: (m: string, t?: any) => void }) {
    const [resenas, setResenas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<"pendientes" | "aprobadas" | "todas">("pendientes");

    const cargar = async () => {
        let query = supabase
            .from("resenas")
            .select("*, productos(nombre, imagen_principal)")
            .order("created_at", { ascending: false });

        if (filtro === "pendientes") query = query.eq("aprobada", false);
        if (filtro === "aprobadas") query = query.eq("aprobada", true);

        const { data } = await query;
        setResenas(data ?? []);
        setLoading(false);
    };

    useEffect(() => { cargar(); }, [filtro]);

    const aprobar = async (id: string) => {
        await supabase.from("resenas").update({ aprobada: true }).eq("id", id);
        toast("Reseña aprobada y publicada ✓", "ok");
        cargar();
    };

    const eliminar = async (id: string) => {
        if (!confirm("¿Eliminar esta reseña?")) return;
        await supabase.from("resenas").delete().eq("id", id);
        toast("Reseña eliminada", "ok");
        cargar();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-black uppercase italic text-white">Moderación de Reseñas</h2>
                    <p className="text-white/30 text-[10px] mt-1">{resenas.length} reseñas</p>
                </div>
                <div className="flex gap-1 bg-[#1a1a1a] border border-white/8 rounded-lg p-1">
                    {(["pendientes", "aprobadas", "todas"] as const).map(f => (
                        <button key={f} onClick={() => setFiltro(f)}
                            className={`px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all ${filtro === f ? "bg-[#FCD7DE] text-black" : "text-white/40 hover:text-white"}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#1a1a1a] rounded-xl animate-pulse" />)}</div>
            ) : resenas.length === 0 ? (
                <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-16 text-center">
                    <Star size={40} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/30 text-[11px] uppercase font-black">Sin reseñas en esta categoría</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {resenas.map(r => (
                        <div key={r.id} className={`bg-[#1a1a1a] border rounded-xl p-5 flex gap-4 ${r.aprobada ? "border-green-500/20" : "border-yellow-500/30"}`}>
                            {/* Producto thumbnail */}
                            {r.productos?.imagen_principal && (
                                <img src={r.productos.imagen_principal} alt="" className="w-14 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <p className="text-white text-[12px] font-black uppercase">{r.cliente_nombre}</p>
                                        <p className="text-white/30 text-[9px]">{r.cliente_email} · {new Date(r.created_at).toLocaleDateString("es-CO")}</p>
                                        <p className="text-white/40 text-[9px] mt-0.5">Producto: {r.productos?.nombre ?? "—"}</p>
                                    </div>
                                    <div className="flex gap-0.5 flex-shrink-0">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} size={12} className={s <= r.calificacion ? "text-yellow-400 fill-yellow-400" : "text-white/10"} />
                                        ))}
                                    </div>
                                </div>
                                {r.comentario && <p className="text-white/60 text-[11px] leading-relaxed">{r.comentario}</p>}
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                                {!r.aprobada && (
                                    <button onClick={() => aprobar(r.id)}
                                        className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-all" title="Aprobar">
                                        <Check size={14} />
                                    </button>
                                )}
                                <button onClick={() => eliminar(r.id)}
                                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all" title="Eliminar">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
