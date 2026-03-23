"use client";
import React, { useEffect, useState } from "react";
import { Settings, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

const GRUPOS: Record<string, string[]> = {
    "Información de la tienda": ["tienda_nombre", "tienda_whatsapp", "tienda_email", "moneda"],
    "Envíos": ["envio_costo_local", "envio_ciudad_local"],
    "Inventario": ["stock_alerta_minimo"],
    "Checkout": ["checkout_activo", "mensaje_checkout_cerrado", "pedido_horas_cancelacion"],
    "Redes Sociales": ["redes_instagram", "redes_facebook", "redes_tiktok"],
};

export default function TabConfiguracion({ toast }: { toast: (m: string, t?: any) => void }) {
    const [config, setConfig] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState<string | null>(null);

    useEffect(() => {
        const cargar = async () => {
            const { data } = await supabase.from("configuracion").select("*");
            const mapa: Record<string, any> = {};
            data?.forEach(row => { mapa[row.clave] = { ...row }; });
            setConfig(mapa);
            setLoading(false);
        };
        cargar();
    }, []);

    const guardar = async (clave: string) => {
        setGuardando(clave);
        const { error } = await supabase
            .from("configuracion")
            .update({ valor: config[clave].valor })
            .eq("clave", clave);
        if (error) toast(error.message, "err");
        else toast("Guardado ✓", "ok");
        setGuardando(null);
    };

    const actualizar = (clave: string, valor: string) => {
        setConfig(prev => ({ ...prev, [clave]: { ...prev[clave], valor } }));
    };

    if (loading) return (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#1a1a1a] rounded-xl animate-pulse" />)}</div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-black uppercase italic text-white">Configuración de la Tienda</h2>
                <p className="text-white/30 text-[10px] mt-1">Edita los valores y guarda individualmente.</p>
            </div>

            {Object.entries(GRUPOS).map(([grupo, claves]) => (
                <div key={grupo} className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                        <Settings size={14} className="text-white/30" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50">{grupo}</h3>
                    </div>
                    <div className="divide-y divide-white/5">
                        {claves.filter(c => config[c]).map(clave => {
                            const item = config[clave];
                            return (
                                <div key={clave} className="px-6 py-4 flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white/60 text-[10px] font-black uppercase mb-1">{clave.replace(/_/g, " ")}</p>
                                        {item.descripcion && <p className="text-white/25 text-[9px] mb-2">{item.descripcion}</p>}

                                        {/* Input según tipo */}
                                        {item.tipo === "booleano" ? (
                                            <div className="flex gap-2">
                                                {["true", "false"].map(v => (
                                                    <button key={v} onClick={() => actualizar(clave, v)}
                                                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${item.valor === v ? "bg-[#FCD7DE] text-black border-transparent" : "border-white/20 text-white/40 hover:border-white/40"
                                                            }`}>
                                                        {v === "true" ? "Activado" : "Desactivado"}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <input
                                                type={item.tipo === "numero" ? "number" : "text"}
                                                value={item.valor ?? ""}
                                                onChange={e => actualizar(clave, e.target.value)}
                                                className="w-full bg-[#111] border border-white/15 text-white px-3 py-2 rounded-lg text-[12px] font-bold outline-none focus:border-[#FCD7DE]/40"
                                            />
                                        )}
                                    </div>
                                    <button
                                        onClick={() => guardar(clave)}
                                        disabled={guardando === clave}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FCD7DE]/10 text-[#FCD7DE] hover:bg-[#FCD7DE] hover:text-black text-[10px] font-black uppercase transition-all disabled:opacity-40 flex-shrink-0"
                                    >
                                        <Save size={12} /> {guardando === clave ? "…" : "Guardar"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
