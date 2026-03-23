"use client";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
    Trophy, Users, Zap, Settings2, RefreshCw,
    Save, ChevronDown, ChevronUp, ShoppingBag, Gift
} from "lucide-react";

const fmt = (n: number) => n.toLocaleString("es-CO");

type Nivel = "bronce" | "plata" | "oro";

const NIVEL_ICON: Record<Nivel, string> = {
    bronce: "🥉", plata: "🥈", oro: "🥇",
};
const NIVEL_COLOR: Record<Nivel, string> = {
    bronce: "text-amber-400", plata: "text-slate-300", oro: "text-yellow-400",
};

interface Props {
    toast: (msg: string, type?: "ok" | "err" | "warn") => void;
}

export default function TabClubGalu({ toast }: Props) {
    const [loading, setLoading] = useState(false);
    const [seccion, setSeccion] = useState<"stats" | "config" | "referidos" | "puntos">("stats");

    const [clientes, setClientes] = useState<any[]>([]);
    const [referidos, setReferidos] = useState<any[]>([]);
    const [puntos, setPuntos] = useState<any[]>([]);
    const [config, setConfig] = useState<Record<string, string>>({});
    const [configEdit, setConfigEdit] = useState<Record<string, string>>({});

    const cargar = useCallback(async () => {
        setLoading(true);
        const [{ data: cli }, { data: refs }, { data: pts }, { data: cfg }] =
            await Promise.all([
                supabase
                    .from("v_club_galu_clientes")
                    .select("*")
                    .order("total_gastado", { ascending: false })
                    .limit(50),
                supabase
                    .from("referidos")
                    .select("*")
                    .order("created_at", { ascending: false }),
                supabase
                    .from("puntos_cliente")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(100),
                supabase.from("club_galu_config").select("clave, valor"),
            ]);
        if (cli) setClientes(cli);
        if (refs) setReferidos(refs);
        if (pts) setPuntos(pts);
        if (cfg) {
            const map: Record<string, string> = {};
            cfg.forEach((r: any) => (map[r.clave] = r.valor));
            setConfig(map);
            setConfigEdit(map);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const guardarConfig = async () => {
        setLoading(true);
        try {
            for (const [clave, valor] of Object.entries(configEdit)) {
                await supabase
                    .from("club_galu_config")
                    .update({ valor })
                    .eq("clave", clave);
            }
            toast("Configuración guardada ✓", "ok");
            cargar();
        } catch (err: any) {
            toast(err.message, "err");
        }
        setLoading(false);
    };

    const ajustarPuntos = async (email: string, puntosDelta: number, concepto: string) => {
        const saldoActual = puntos
            .filter((p) => p.cliente_email === email && p.tipo === "ganado")
            .reduce((s, p) => s + Number(p.puntos), 0) -
            puntos
                .filter((p) => p.cliente_email === email && (p.tipo === "canjeado" || p.tipo === "expirado"))
                .reduce((s, p) => s + Math.abs(Number(p.puntos)), 0);

        const { error } = await supabase.from("puntos_cliente").insert([{
            cliente_email: email,
            tipo: puntosDelta >= 0 ? "ganado" : "canjeado",
            puntos: Math.abs(puntosDelta),
            saldo_anterior: saldoActual,
            saldo_nuevo: saldoActual + puntosDelta,
            concepto: concepto || "Ajuste manual admin",
            nivel_aplicado: "ajuste_admin",
        }]);
        if (error) toast(error.message, "err");
        else { toast("Puntos ajustados ✓", "ok"); cargar(); }
    };

    /* ── Stats ── */
    const totalPuntos = puntos.filter(p => p.tipo === "ganado").reduce((s, p) => s + Number(p.puntos), 0);
    const totalReferidosExitosos = referidos.filter(r => r.estado === "completado").length;
    const clientesOro = clientes.filter(c => c.nivel === "oro").length;
    const clientesPlata = clientes.filter(c => c.nivel === "plata").length;

    const NAV = [
        { id: "stats" as const, label: "Resumen", icon: Trophy },
        { id: "config" as const, label: "Configuración", icon: Settings2 },
        { id: "referidos" as const, label: "Referidos", icon: Users },
        { id: "puntos" as const, label: "Puntos", icon: Zap },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black uppercase italic">Club GALU</h2>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">
                        Programa de fidelización
                    </p>
                </div>
                <button
                    onClick={cargar}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase text-white/30 hover:text-white hover:bg-white/5 transition-all"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    Sync
                </button>
            </div>

            {/* Sub-nav */}
            <div className="flex gap-1 bg-[#1a1a1a] border border-white/8 rounded-xl p-1.5">
                {NAV.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setSeccion(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${seccion === id
                                ? "bg-[#FCD7DE] text-black"
                                : "text-white/40 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <Icon size={12} />
                        {label}
                    </button>
                ))}
            </div>

            {/* ══ RESUMEN ══ */}
            {seccion === "stats" && (
                <div className="space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Puntos Emitidos", value: `$${fmt(totalPuntos)}`, icon: Zap, color: "bg-yellow-600" },
                            { label: "Referidos Exitosos", value: totalReferidosExitosos, icon: Users, color: "bg-purple-600" },
                            { label: "Clientes Oro 🥇", value: clientesOro, icon: Trophy, color: "bg-amber-600" },
                            { label: "Clientes Plata 🥈", value: clientesPlata, icon: Trophy, color: "bg-slate-500" },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="bg-[#1a1a1a] border border-white/8 rounded-xl p-5 flex flex-col gap-3">
                                <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
                                    <Icon size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">{label}</p>
                                    <p className="text-white text-xl font-black">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabla de clientes del club */}
                    <div className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/8">
                            <p className="text-[11px] font-black uppercase tracking-widest text-white/40">
                                Clientes del Club (top 50 por gasto)
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] font-bold text-white">
                                <thead>
                                    <tr className="border-b border-white/8 text-white/30 text-[9px] uppercase">
                                        <th className="p-4 text-left">Cliente</th>
                                        <th className="p-4 text-center">Nivel</th>
                                        <th className="p-4 text-right">Total Gastado</th>
                                        <th className="p-4 text-right">Puntos</th>
                                        <th className="p-4 text-center">Pedidos</th>
                                        <th className="p-4 text-center">Referidos ✅</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientes.map((c) => (
                                        <tr key={c.email} className="border-b border-white/5 hover:bg-white/3">
                                            <td className="p-4">
                                                <p className="font-black uppercase">{c.nombre ?? "—"}</p>
                                                <p className="text-white/30 text-[9px]">{c.email}</p>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`font-black uppercase text-[10px] ${NIVEL_COLOR[c.nivel as Nivel] ?? ""}`}>
                                                    {NIVEL_ICON[c.nivel as Nivel] ?? "?"} {c.nivel}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-black">
                                                ${fmt(Number(c.total_gastado ?? 0))}
                                            </td>
                                            <td className="p-4 text-right text-yellow-400 font-black">
                                                ${fmt(Number(c.puntos_disponibles ?? 0))}
                                            </td>
                                            <td className="p-4 text-center text-white/60">
                                                {c.total_pedidos ?? 0}
                                            </td>
                                            <td className="p-4 text-center text-green-400 font-black">
                                                {c.referidos_exitosos ?? 0}
                                            </td>
                                        </tr>
                                    ))}
                                    {clientes.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-white/20 text-[10px] uppercase">
                                                Sin clientes registrados aún
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ CONFIGURACIÓN ══ */}
            {seccion === "config" && (
                <div className="space-y-4">
                    <div className="bg-[#1a1a1a] border border-white/8 rounded-xl p-6 space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 border-b border-white/8 pb-4 mb-2">
                            Reglas del Programa
                        </h3>
                        {[
                            { key: "activo", label: "Club activo", desc: "true o false", type: "text" },
                            { key: "compra_minima_puntos", label: "Compra mínima para puntos (COP)", desc: "Ej: 50000", type: "number" },
                            { key: "porcentaje_puntos_bronze", label: "% puntos Bronce", desc: "Ej: 3", type: "number" },
                            { key: "porcentaje_puntos_plata", label: "% puntos Plata", desc: "Ej: 5", type: "number" },
                            { key: "porcentaje_puntos_oro", label: "% puntos Oro", desc: "Ej: 8", type: "number" },
                            { key: "umbral_plata", label: "Umbral Nivel Plata (COP)", desc: "Ej: 200000", type: "number" },
                            { key: "umbral_oro", label: "Umbral Nivel Oro (COP)", desc: "Ej: 500000", type: "number" },
                            { key: "descuento_referente", label: "% descuento referente", desc: "Ej: 10", type: "number" },
                            { key: "descuento_referido", label: "% descuento referido", desc: "Ej: 5", type: "number" },
                            { key: "max_referidos_activos", label: "Máx. códigos activos por cliente", desc: "Ej: 3", type: "number" },
                        ].map(({ key, label, desc, type }) => (
                            <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center py-3 border-b border-white/5">
                                <div className="md:col-span-2">
                                    <p className="text-white text-[11px] font-black uppercase">{label}</p>
                                    <p className="text-white/30 text-[9px] mt-0.5">{desc}</p>
                                </div>
                                <input
                                    type={type}
                                    value={configEdit[key] ?? ""}
                                    onChange={(e) =>
                                        setConfigEdit((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    className="bg-[#111] border border-white/15 text-white px-3 py-2 rounded-lg text-[12px] font-black outline-none focus:border-[#FCD7DE]/50 text-right"
                                />
                            </div>
                        ))}

                        <button
                            onClick={guardarConfig}
                            disabled={loading}
                            className="w-full bg-[#FCD7DE] text-black font-black uppercase tracking-widest py-4 rounded-lg hover:bg-white transition-all text-[11px] flex items-center justify-center gap-2 mt-4"
                        >
                            <Save size={14} /> Guardar Configuración
                        </button>
                    </div>
                </div>
            )}

            {/* ══ REFERIDOS ══ */}
            {seccion === "referidos" && (
                <div className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/8">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/40">
                            Historial de Referidos ({referidos.length})
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px] font-bold text-white">
                            <thead>
                                <tr className="border-b border-white/8 text-white/30 text-[9px] uppercase">
                                    <th className="p-4 text-left">Código</th>
                                    <th className="p-4 text-left">Referente</th>
                                    <th className="p-4 text-left">Referido</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-center">Cupón Recompensa</th>
                                    <th className="p-4 text-right">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referidos.map((r) => (
                                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/3">
                                        <td className="p-4 font-black text-[#FCD7DE] font-mono text-[10px]">
                                            {r.codigo}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-black uppercase">{r.referente_nombre ?? "—"}</p>
                                            <p className="text-white/30 text-[9px]">{r.referente_email}</p>
                                        </td>
                                        <td className="p-4">
                                            {r.referido_email ? (
                                                <>
                                                    <p className="font-black uppercase">{r.referido_nombre ?? "—"}</p>
                                                    <p className="text-white/30 text-[9px]">{r.referido_email}</p>
                                                </>
                                            ) : (
                                                <span className="text-white/20 text-[9px]">Pendiente…</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${r.estado === "completado"
                                                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                                                        : r.estado === "expirado"
                                                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                                                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                                    }`}
                                            >
                                                {r.estado}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {r.cupon_generado_id ? (
                                                <span className="text-green-400 text-[9px] font-black">✅ Generado</span>
                                            ) : (
                                                <span className="text-white/20 text-[9px]">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right text-white/30 text-[9px]">
                                            {new Date(r.created_at).toLocaleDateString("es-CO")}
                                        </td>
                                    </tr>
                                ))}
                                {referidos.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-white/20 text-[10px] uppercase">
                                            Sin referidos registrados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══ PUNTOS ══ */}
            {seccion === "puntos" && (
                <div className="space-y-4">
                    {/* Ajuste manual */}
                    <AjustePuntosPanel clientes={clientes} onAjuste={ajustarPuntos} />

                    {/* Historial */}
                    <div className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/8">
                            <p className="text-[11px] font-black uppercase tracking-widest text-white/40">
                                Últimos 100 movimientos
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] font-bold text-white">
                                <thead>
                                    <tr className="border-b border-white/8 text-white/30 text-[9px] uppercase">
                                        <th className="p-4 text-left">Cliente</th>
                                        <th className="p-4 text-left">Concepto</th>
                                        <th className="p-4 text-center">Tipo</th>
                                        <th className="p-4 text-right">Puntos</th>
                                        <th className="p-4 text-right">Saldo</th>
                                        <th className="p-4 text-right">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {puntos.map((p) => (
                                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                                            <td className="p-4 text-white/60 text-[9px]">{p.cliente_email}</td>
                                            <td className="p-4 text-white/70">{p.concepto}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${p.tipo === "ganado"
                                                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                                                        : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                                    }`}>
                                                    {p.tipo}
                                                </span>
                                            </td>
                                            <td className={`p-4 text-right font-black ${p.tipo === "ganado" ? "text-green-400" : "text-orange-400"}`}>
                                                {p.tipo === "ganado" ? "+" : "-"}${fmt(Math.abs(Number(p.puntos)))}
                                            </td>
                                            <td className="p-4 text-right text-white/50">
                                                ${fmt(Number(p.saldo_nuevo))}
                                            </td>
                                            <td className="p-4 text-right text-white/30 text-[9px]">
                                                {new Date(p.created_at).toLocaleDateString("es-CO")}
                                            </td>
                                        </tr>
                                    ))}
                                    {puntos.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-white/20 text-[10px] uppercase">
                                                Sin movimientos de puntos
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Sub-componente: ajuste manual de puntos ─── */
function AjustePuntosPanel({
    clientes,
    onAjuste,
}: {
    clientes: any[];
    onAjuste: (email: string, puntos: number, concepto: string) => void;
}) {
    const [emailSel, setEmailSel] = useState("");
    const [puntosVal, setPuntosVal] = useState("");
    const [concepto, setConcepto] = useState("");
    const [expandido, setExpandido] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailSel || !puntosVal) return;
        onAjuste(emailSel, parseFloat(puntosVal), concepto);
        setPuntosVal("");
        setConcepto("");
    };

    return (
        <div className="bg-[#1a1a1a] border border-white/8 rounded-xl overflow-hidden">
            <button
                onClick={() => setExpandido(!expandido)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/3 transition-all"
            >
                <div className="flex items-center gap-3">
                    <Gift size={16} className="text-[#FCD7DE]" />
                    <p className="text-[11px] font-black uppercase tracking-widest">
                        Ajuste Manual de Puntos
                    </p>
                </div>
                {expandido ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
            </button>
            {expandido && (
                <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3 border-t border-white/8 pt-4">
                    <p className="text-white/30 text-[9px]">
                        Usa valores positivos para dar puntos y negativos para restar.
                        Ej: 5000 = dar $5.000 en puntos · -5000 = restar $5.000 en puntos
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select
                            required
                            value={emailSel}
                            onChange={(e) => setEmailSel(e.target.value)}
                            className="bg-[#111] border border-white/15 text-white px-3 py-2 rounded-lg text-[11px] font-bold outline-none"
                        >
                            <option value="">Seleccionar cliente…</option>
                            {clientes.map((c) => (
                                <option key={c.email} value={c.email}>
                                    {c.nombre ?? c.email} — ${fmt(Number(c.puntos_disponibles ?? 0))} pts
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            placeholder="Puntos (ej: 5000 o -3000)"
                            required
                            value={puntosVal}
                            onChange={(e) => setPuntosVal(e.target.value)}
                            className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-3 py-2 rounded-lg text-[11px] font-bold outline-none"
                        />
                        <input
                            placeholder="Concepto"
                            value={concepto}
                            onChange={(e) => setConcepto(e.target.value)}
                            className="bg-[#111] border border-white/15 text-white placeholder:text-white/20 px-3 py-2 rounded-lg text-[11px] font-bold outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-[#FCD7DE] text-black font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-lg hover:bg-white transition-all"
                    >
                        Aplicar Ajuste
                    </button>
                </form>
            )}
        </div>
    );
}
