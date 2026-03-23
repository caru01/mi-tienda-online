"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import {
    Star, Gift, Users, Copy, Check,
    Trophy, Zap, Clock, ShoppingBag, ChevronRight
} from "lucide-react";

import { useToast } from "@/context/ToastContext";

/* ─── helpers ─── */
const fmt = (n: number) => n.toLocaleString("es-CO");

type Nivel = "bronce" | "plata" | "oro";

interface NivelInfo {
    label: string;
    color: string;
    bgCard: string;
    borderCard: string;
    icon: string;
    pct: number;
    umbralSiguiente: number;
    labelSiguiente: string;
    barColor: string;
}

const NIVELES: Record<Nivel, NivelInfo> = {
    bronce: {
        label: "Bronce",
        color: "#92400e",
        bgCard: "bg-amber-50",
        borderCard: "border-amber-200",
        icon: "🥉",
        pct: 3,
        umbralSiguiente: 200000,
        labelSiguiente: "Plata",
        barColor: "#cd7f32",
    },
    plata: {
        label: "Plata",
        color: "#374151",
        bgCard: "bg-gray-50",
        borderCard: "border-gray-300",
        icon: "🥈",
        pct: 5,
        umbralSiguiente: 500000,
        labelSiguiente: "Oro",
        barColor: "#6b7280",
    },
    oro: {
        label: "Oro",
        color: "#78350f",
        bgCard: "bg-yellow-50",
        borderCard: "border-yellow-300",
        icon: "🥇",
        pct: 8,
        umbralSiguiente: 0,
        labelSiguiente: "Máximo",
        barColor: "#f59e0b",
    },
};

export default function ClubGaluPage() {
    const [email, setEmail] = useState("");
    const [buscando, setBuscando] = useState(false);
    const [cliente, setCliente] = useState<any>(null);
    const [puntos, setPuntos] = useState<any[]>([]);
    const [referidos, setReferidos] = useState<any[]>([]);
    const [config, setConfig] = useState<Record<string, string>>({});
    const [copiado, setCopiado] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [generandoCodigo, setGenerandoCodigo] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        supabase
            .from("club_galu_config")
            .select("clave, valor")
            .then(({ data }) => {
                if (data) {
                    const map: Record<string, string> = {};
                    data.forEach((r: any) => (map[r.clave] = r.valor));
                    setConfig(map);
                }
            });
    }, []);

    const buscar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setBuscando(true);
        setError("");
        setCliente(null);
        const emailLower = email.toLowerCase().trim();

        const [{ data: cli }, { data: pts }, { data: refs }] = await Promise.all([
            supabase.from("clientes").select("*").eq("email", emailLower).single(),
            supabase
                .from("puntos_cliente")
                .select("*")
                .eq("cliente_email", emailLower)
                .order("created_at", { ascending: false })
                .limit(20),
            supabase
                .from("referidos")
                .select("*")
                .eq("cliente_email", emailLower)
                .order("created_at", { ascending: false }),
        ]);

        if (!cli) {
            setError("No encontramos tu email. ¿Ya hiciste una compra en GALU SHOP?");
        } else {
            setCliente(cli);
            setPuntos(pts ?? []);
            setReferidos(refs ?? []);
        }
        setBuscando(false);
    };

    const generarCodigoReferido = async () => {
        if (!cliente) return;
        setGenerandoCodigo(true);
        try {
            const { data: codigoData } = await supabase.rpc("generar_codigo_referido", {
                p_nombre: cliente.nombre || cliente.email,
            });
            const pctReferido = parseFloat(config.descuento_referido ?? "5");
            const { error: cuponError } = await supabase.from("cupones").insert([{
                codigo: codigoData,
                tipo: "porcentaje",
                valor: pctReferido,
                uso_maximo: 1,
                activo: true
            }]);
            if (cuponError) throw cuponError;
            const { error: refError } = await supabase.from("referidos").insert([{
                cliente_email: cliente.email,
                codigo: codigoData,
                estado: 'pendiente'
            }]);
            
            if (refError) throw refError;

            const { data: refs } = await supabase
                .from("referidos")
                .select("*")
                .eq("cliente_email", cliente.email)
                .order("created_at", { ascending: false });
            setReferidos(refs ?? []);
            toast("¡Tu código ha sido generado exitosamente!", "success");
        } catch (err: any) {
            toast("Error al generar código: " + err.message, "error");
            setError("Error al generar código: " + err.message);
        }
        setGenerandoCodigo(false);
    };

    const copiarCodigo = (codigo: string) => {
        navigator.clipboard.writeText(codigo);
        setCopiado(codigo);
        setTimeout(() => setCopiado(null), 2000);
    };

    /* ─── Cálculos ─── */
    const nivel: Nivel = cliente
        ? cliente.total_gastado >= parseFloat(config.umbral_oro ?? "500000")
            ? "oro"
            : cliente.total_gastado >= parseFloat(config.umbral_plata ?? "200000")
                ? "plata"
                : "bronce"
        : "bronce";

    const nivelInfo = NIVELES[nivel];

    const saldoPuntos =
        puntos.filter(p => p.tipo === "ganado").reduce((s, p) => s + Number(p.puntos), 0) -
        puntos.filter(p => p.tipo === "canjeado" || p.tipo === "expirado").reduce((s, p) => s + Math.abs(Number(p.puntos)), 0);

    const progresoNivel =
        nivel === "oro"
            ? 100
            : Math.min(100, (cliente?.total_gastado / nivelInfo.umbralSiguiente) * 100);

    const referidosPendientes = referidos.filter(r => r.estado === "pendiente").length;
    const referidosExitosos = referidos.filter(r => r.estado === "completado").length;

    return (
        <div className="min-h-screen bg-white text-black" style={{ fontFamily: "Arial, sans-serif" }}>
            <Navbar />

            {/* ──────────── HERO ──────────── */}
            <div className="border-b border-black/10 bg-white py-14 px-4 text-center">
                <div className="inline-flex items-center gap-2 border border-black/20 rounded-full px-5 py-1.5 mb-5">
                    <Star size={12} className="fill-black" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Programa de Fidelización</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tight mb-3">
                    Club <span className="underline underline-offset-4 decoration-2">GALU</span>
                </h1>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                    Acumula puntos en cada compra, sube de nivel y trae amigos para ganar
                    recompensas exclusivas.
                </p>
            </div>

            {/* ──────────── CÓMO FUNCIONA (solo si no hay cliente) ──────────── */}
            {!cliente && (
                <div className="max-w-5xl mx-auto px-4 py-14 space-y-12">

                    {/* Cards de cómo funciona */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: ShoppingBag,
                                step: "01",
                                title: "Compra y Acumula",
                                desc: "En pedidos mayores a $50.000 acumulas puntos automáticamente según tu nivel.",
                            },
                            {
                                icon: Trophy,
                                step: "02",
                                title: "Sube de Nivel",
                                desc: "Bronce → Plata → Oro. A mayor nivel, mayor porcentaje de puntos acumulas.",
                            },
                            {
                                icon: Users,
                                step: "03",
                                title: "Trae Amigos",
                                desc: "Comparte tu código. Tu amigo recibe 5% de descuento y tú ganas un cupón del 10%.",
                            },
                        ].map(({ icon: Icon, step, title, desc }) => (
                            <div key={step} className="border border-black/10 p-8 rounded-sm hover:border-black/30 transition-colors">
                                <div className="flex items-start justify-between mb-6">
                                    <Icon size={22} className="text-black" />
                                    <span className="text-[11px] font-black text-gray-300 uppercase">{step}</span>
                                </div>
                                <h3 className="text-[13px] font-black uppercase tracking-widest mb-2">{title}</h3>
                                <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabla de niveles */}
                    <div className="border border-black/10">
                        <div className="px-6 py-4 border-b border-black/10 flex items-center gap-2">
                            <Trophy size={14} />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Niveles del Club</h3>
                        </div>
                        <div className="divide-y divide-black/5">
                            {(["bronce", "plata", "oro"] as Nivel[]).map((n) => {
                                const info = NIVELES[n];
                                return (
                                    <div key={n} className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className="text-xl">{info.icon}</span>
                                            <div>
                                                <p className="font-black uppercase text-[12px] tracking-widest">{info.label}</p>
                                                <p className="text-gray-400 text-[10px] mt-0.5">
                                                    {n === "bronce"
                                                        ? "Desde el primer pedido"
                                                        : n === "plata"
                                                            ? `Desde $${fmt(200000)} acumulados`
                                                            : `Desde $${fmt(500000)} acumulados`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-xl" style={{ color: info.barColor }}>
                                                {info.pct}%
                                            </p>
                                            <p className="text-gray-400 text-[10px]">en puntos</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ──────────── BUSCADOR / PANEL CLIENTE ──────────── */}
            <div className={`max-w-5xl mx-auto px-4 pb-20 ${!cliente ? "" : "pt-10"}`}>
                {!cliente ? (
                    /* — Formulario de búsqueda — */
                    <div className="max-w-md mx-auto border border-black/10 p-8">
                        <h2 className="text-[13px] font-black uppercase tracking-[0.2em] mb-1">
                            Consulta tu cuenta
                        </h2>
                        <p className="text-gray-400 text-[11px] mb-6">
                            Ingresa el email con el que hiciste tu compra
                        </p>
                        <form onSubmit={buscar} className="space-y-4">
                            <input
                                type="email"
                                required
                                placeholder="tucorreo@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-black/20 text-black placeholder:text-gray-300 px-4 py-3 text-sm font-bold outline-none focus:border-black transition-colors"
                            />
                            {error && <p className="text-red-500 text-[11px] font-bold">{error}</p>}
                            <button
                                type="submit"
                                disabled={buscando}
                                className="w-full bg-black text-white font-black uppercase tracking-[0.2em] py-4 hover:bg-gray-800 transition-all text-[11px] disabled:opacity-50"
                            >
                                {buscando ? "Buscando..." : "Ver mis puntos →"}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* — Panel del cliente — */
                    <div className="space-y-8">

                        {/* ── Tarjeta de nivel ── */}
                        <div className={`border-2 ${nivelInfo.borderCard} ${nivelInfo.bgCard} p-8 relative overflow-hidden`}>
                            {/* Emoji decorativo de fondo */}
                            <div className="absolute -right-4 -top-4 text-[120px] opacity-5 select-none pointer-events-none">
                                {nivelInfo.icon}
                            </div>

                            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Info del cliente */}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
                                        Bienvenida de vuelta
                                    </p>
                                    <h2 className="text-2xl font-black uppercase">{cliente.nombre ?? cliente.email}</h2>
                                    <p className="text-gray-400 text-[11px] mt-0.5">{cliente.email}</p>

                                    {/* Badge de nivel */}
                                    <div
                                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 border-2 font-black text-[11px] uppercase tracking-widest rounded-full"
                                        style={{ borderColor: nivelInfo.barColor, color: nivelInfo.color }}
                                    >
                                        {nivelInfo.icon} Nivel {nivelInfo.label} — {nivelInfo.pct}% por compra
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: "Puntos", value: `$${fmt(saldoPuntos)}`, icon: Zap, color: "#f59e0b" },
                                        { label: "Gastado", value: `$${fmt(cliente.total_gastado ?? 0)}`, icon: ShoppingBag, color: "#374151" },
                                        { label: "Pedidos", value: cliente.total_pedidos ?? 0, icon: Star, color: "#374151" },
                                    ].map(({ label, value, icon: Icon, color }) => (
                                        <div key={label} className="bg-white border border-black/10 p-4 text-center">
                                            <Icon size={16} className="mx-auto mb-2" style={{ color }} />
                                            <p className="font-black text-base leading-none">{value}</p>
                                            <p className="text-gray-400 text-[9px] uppercase tracking-wide mt-1">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Barra de progreso */}
                            {nivel !== "oro" && (
                                <div className="relative mt-6 pt-6 border-t border-black/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            Progreso hacia Nivel {nivelInfo.labelSiguiente}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-600">
                                            ${fmt(cliente.total_gastado)} / ${fmt(nivelInfo.umbralSiguiente)}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${progresoNivel}%`, backgroundColor: nivelInfo.barColor }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2">
                                        Te faltan{" "}
                                        <strong className="text-black">
                                            ${fmt(nivelInfo.umbralSiguiente - (cliente.total_gastado ?? 0))}
                                        </strong>{" "}
                                        para alcanzar el nivel {nivelInfo.labelSiguiente} y acumular{" "}
                                        {nivel === "bronce" ? "5" : "8"}% en puntos
                                    </p>
                                </div>
                            )}
                            {nivel === "oro" && (
                                <div className="mt-6 pt-6 border-t border-yellow-200">
                                    <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest">
                                        🎉 ¡Eres cliente Oro! Acumulas 8% en cada compra y tienes beneficios exclusivos.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ── Referidos ── */}
                        <div className="border border-black/10">
                            <div className="px-6 py-4 border-b border-black/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Users size={16} />
                                    <h3 className="font-black uppercase text-[12px] tracking-widest">Mis Referidos</h3>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] text-gray-400 font-black">
                                    <span>✅ {referidosExitosos} exitosos</span>
                                    <span>⏳ {referidosPendientes} pendientes</span>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Explicación */}
                                <div className="bg-gray-50 border border-gray-200 p-4 text-[11px] text-gray-600 leading-relaxed">
                                    <p className="font-black text-black mb-1 uppercase text-[10px] tracking-widest">¿Cómo funciona?</p>
                                    Genera un código y compártelo con tus amigos. Cuando ellos hagan su
                                    primera compra, recibirán un{" "}
                                    <strong>{config.descuento_referido ?? 5}% de descuento</strong> y tú
                                    ganarás un cupón del{" "}
                                    <strong>{config.descuento_referente ?? 10}%</strong> para tu próxima compra.
                                </div>

                                {/* Lista de códigos */}
                                {referidos.length > 0 ? (
                                    <div className="space-y-2">
                                        {referidos.map((ref) => (
                                            <div
                                                key={ref.id}
                                                className="flex items-center justify-between border border-black/10 px-4 py-3 hover:bg-gray-50 transition-colors"
                                            >
                                                <div>
                                                    <p className="font-black text-[13px] font-mono tracking-widest text-black">{ref.codigo}</p>
                                                    <p className={`text-[9px] mt-0.5 uppercase font-bold ${ref.estado === 'completado' ? 'text-green-600' : 'text-gray-400'}`}>
                                                        {ref.estado === "completado"
                                                            ? `✅ Usado y Recompensado`
                                                            : ref.estado === "expirado"
                                                                ? "❌ Expirado"
                                                                : "⏳ Pendiente — esperando que alguien lo use"}
                                                    </p>
                                                </div>
                                                {ref.estado === "pendiente" && (
                                                    <button
                                                        onClick={() => copiarCodigo(ref.codigo)}
                                                        className="flex items-center gap-1.5 border border-black px-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                                                    >
                                                        {copiado === ref.codigo ? <Check size={10} /> : <Copy size={10} />}
                                                        {copiado === ref.codigo ? "Copiado" : "Copiar"}
                                                    </button>
                                                )}
                                                {ref.estado === "completado" && ref.cupon_generado_id && (
                                                    <span className="border border-green-300 text-green-700 bg-green-50 px-3 py-1 text-[9px] font-black uppercase">
                                                        🎁 Cupón listo
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-300 text-[11px] text-center py-6 uppercase font-bold tracking-widest">
                                        Aún no tienes códigos generados
                                    </p>
                                )}

                                {/* Botón generar: solo si no hay referidos (1 por cliente) */}
                                {referidos.length === 0 && (
                                    <button
                                        onClick={generarCodigoReferido}
                                        disabled={generandoCodigo}
                                        className="w-full border border-black bg-black text-white font-black uppercase text-[11px] tracking-widest py-3 hover:bg-gray-800 transition-all disabled:opacity-40"
                                    >
                                        {generandoCodigo ? "Generando..." : "Generar mi código único"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Historial de puntos ── */}
                        <div className="border border-black/10">
                            <div className="px-6 py-4 border-b border-black/10 flex items-center gap-3">
                                <Clock size={16} />
                                <h3 className="font-black uppercase text-[12px] tracking-widest">Historial de Puntos</h3>
                            </div>
                            {puntos.length > 0 ? (
                                <div className="divide-y divide-black/5">
                                    {puntos.map((mov) => (
                                        <div key={mov.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div>
                                                <p className="text-[12px] font-bold">{mov.descripcion || 'Movimiento de puntos'}</p>
                                                <p className="text-gray-400 text-[10px] mt-0.5 uppercase tracking-wide">
                                                    {new Date(mov.created_at).toLocaleDateString("es-CO", {
                                                        day: "2-digit",
                                                        month: "long",
                                                        year: "numeric",
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black text-sm ${mov.tipo === "ganado" ? "text-green-600" : "text-red-500"}`}>
                                                    {mov.tipo === "ganado" ? "+" : "-"}{fmt(Math.abs(Number(mov.puntos)))}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <Gift size={36} className="mx-auto text-gray-200 mb-3" />
                                    <p className="text-gray-300 text-[11px] uppercase font-black tracking-widest">Aún no tienes movimientos</p>
                                    <p className="text-gray-300 text-[10px] mt-1">
                                        Haz una compra mayor a{" "}
                                        {config.compra_minima_puntos
                                            ? `$${fmt(parseInt(config.compra_minima_puntos))}`
                                            : "$50.000"}{" "}
                                        para empezar a acumular
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Botón salir */}
                        <button
                            onClick={() => { setCliente(null); setPuntos([]); setReferidos([]); setEmail(""); }}
                            className="w-full text-gray-300 text-[10px] font-black uppercase tracking-widest hover:text-black transition-all py-2"
                        >
                            ← Buscar otro email
                        </button>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
