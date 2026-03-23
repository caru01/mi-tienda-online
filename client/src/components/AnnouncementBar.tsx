"use client";
import React, { useState, useEffect } from "react";
import { X, Star, Truck, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Anuncio {
    texto: string;
    icono?: string;
    activo: boolean;
}

export default function AnnouncementBar() {
    const [visible, setVisible] = useState(true);
    const [anuncios, setAnuncios] = useState<Anuncio[]>([
        { texto: "Envío GRATIS a toda Colombia en compras mayores a $150.000", icono: "truck", activo: true },
        { texto: "Express en Valledupar ⚡ Entrega en 24 horas", icono: "zap", activo: true },
        { texto: "⭐ Club GALU — Acumula puntos con cada compra", icono: "star", activo: true },
    ]);
    const [current, setCurrent] = useState(0);
    const [dbTexto, setDbTexto] = useState<string | null>(null);

    // Cargar anuncio desde BD si existe
    useEffect(() => {
        supabase
            .from("configuracion")
            .select("valor")
            .eq("clave", "barra_anuncio")
            .single()
            .then(({ data }) => {
                if (data?.valor) setDbTexto(data.valor);
            });
    }, []);

    // Rotar anuncios cada 4 segundos
    useEffect(() => {
        if (!visible) return;
        const interval = setInterval(() => {
            setCurrent((prev) => (prev + 1) % anuncios.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [visible, anuncios.length]);

    if (!visible) return null;

    const anuncio = anuncios[current];
    const IconoComp =
        anuncio.icono === "truck" ? Truck :
            anuncio.icono === "zap" ? Zap :
                Star;

    return (
        <div
            className="w-full bg-black text-white relative overflow-hidden"
            style={{ fontFamily: "Arial, sans-serif" }}
        >
            {/* Línea de brillo superior */}
            <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />

            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
                {/* Lado izquierdo vacío para centrar */}
                <div className="w-6 flex-shrink-0" />

                {/* Mensaje central con transición */}
                <div className="flex-1 flex items-center justify-center gap-2">
                    <IconoComp size={13} className="text-white/70 flex-shrink-0" />
                    <p
                        key={current}
                        className="text-[11px] font-black uppercase tracking-[0.15em] text-center text-white animate-pulse"
                        style={{ animationDuration: "0.3s", animationIterationCount: 1 }}
                    >
                        {dbTexto ?? anuncio.texto}
                    </p>
                    {/* Indicadores de posición */}
                    <div className="hidden md:flex items-center gap-1 ml-4">
                        {anuncios.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                className={`rounded-full transition-all ${i === current
                                        ? "w-4 h-1.5 bg-white"
                                        : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Cerrar */}
                <button
                    onClick={() => setVisible(false)}
                    className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                    aria-label="Cerrar anuncio"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
