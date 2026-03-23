"use client";
import React from "react";
import { Truck, Zap, Star, Tag } from "lucide-react";

const ITEMS = [
    "Envíos a toda Colombia ⚡ Express en Valledupar",
    "🛍️ Club GALU — Acumula puntos en cada compra",
    "✦ Pago seguro por transferencia o pasa y recoge",
    "📦 Entrega estimada de 3 a 7 días hábiles",
    "⭐ Nuevo ingreso de temporada — ¡No te lo pierdas!",
    "Envíos a toda Colombia ⚡ Express en Valledupar",
    "🛍️ Club GALU — Acumula puntos en cada compra",
    "✦ Pago seguro por transferencia o pasa y recoge",
    "📦 Entrega estimada de 3 a 7 días hábiles",
    "⭐ Nuevo ingreso de temporada — ¡No te lo pierdas!",
];

export default function Marquee() {
    return (
        <div
            className="w-full bg-black overflow-hidden border-b border-white/10 py-3 select-none"
            style={{ fontFamily: "Arial, sans-serif" }}
        >
            <div
                className="flex gap-0 whitespace-nowrap"
                style={{
                    animation: "marquee-scroll 35s linear infinite",
                }}
            >
                {ITEMS.map((item, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center gap-3 mx-8 text-[11px] font-black uppercase tracking-[0.2em] text-white/80"
                    >
                        {item}
                        <span className="text-white/20 mx-2">|</span>
                    </span>
                ))}
            </div>

            <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
        </div>
    );
}
