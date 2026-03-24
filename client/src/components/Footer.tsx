"use client";
import React, { useState, useEffect } from "react";
import { Facebook, Instagram, Mail, Phone, MapPin, MessageCircle, Star } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [categorias, setCategorias] = useState<{ id: string; nombre: string; slug: string }[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("categorias")
      .select("id, nombre, slug")
      .eq("activa", true)
      .order("nombre", { ascending: true })
      .then(({ data }) => { if (data) setCategorias(data); });

    supabase
      .from("configuracion")
      .select("clave, valor")
      .in("clave", [
        "tienda_whatsapp", "tienda_email",
        "redes_instagram", "redes_facebook",
      ])
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((r: any) => (map[r.clave] = r.valor));
          setConfig(map);
        }
      });
  }, []);

  const whatsapp = config.tienda_whatsapp || "573022461068";
  const email = config.tienda_email || "contacto@galushop.com";

  return (
    <footer
      className="bg-black text-white pt-14 pb-6 border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">

        {/* COL 1 — Marca + Redes */}
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter text-white">GALU SHOP</h2>
            <p className="text-white/40 text-[11px] mt-2 leading-relaxed uppercase tracking-wide">
              Tu tienda de confianza para encontrar lo último en tendencia y estilo.
              Calidad garantizada en cada prenda.
            </p>
          </div>

          {/* Club GALU CTA */}
          <Link
            href="/club"
            className="inline-flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-all"
          >
            <Star size={12} className="fill-black" />
            Club GALU — Ver mis puntos
          </Link>

          {/* Redes */}
          <div className="flex items-center gap-4 pt-1">
            {config.redes_instagram && (
              <a href={config.redes_instagram} target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition" title="Instagram">
                <Instagram size={20} />
              </a>
            )}
            {config.redes_facebook && (
              <a href={config.redes_facebook} target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition" title="Facebook">
                <Facebook size={20} />
              </a>
            )}
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition" title="WhatsApp">
              <MessageCircle size={20} />
            </a>
          </div>
        </div>

        {/* COL 2 — Categorías dinámicas */}
        <div>
          <h3 className="text-[11px] font-black mb-5 uppercase tracking-[0.2em] border-b border-white/10 pb-2 text-white">
            Categorías
          </h3>
          {categorias.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {categorias.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/categoria/${cat.slug}`}
                    className="text-[12px] text-white/50 hover:text-white hover:underline transition-colors font-medium uppercase tracking-wide"
                  >
                    {cat.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* COL 3 — Contacto */}
        <div>
          <h3 className="text-[11px] font-black mb-5 uppercase tracking-[0.2em] border-b border-white/10 pb-2 text-white">
            Contáctanos
          </h3>
          <ul className="space-y-3.5">
            <li>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 group">
                <MessageCircle size={15} className="text-white/40 mt-0.5 flex-shrink-0 group-hover:text-white transition" />
                <span className="text-[12px] text-white/50 group-hover:text-white group-hover:underline transition-colors font-medium">
                  +{whatsapp}
                </span>
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Mail size={15} className="text-white/40 mt-0.5 flex-shrink-0" />
              <span className="text-[12px] text-white/50 font-medium">{email}</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={15} className="text-white/40 mt-0.5 flex-shrink-0" />
              <span className="text-[12px] text-white/50 font-medium">Valledupar, Cesar — Colombia</span>
            </li>
          </ul>
        </div>

        {/* COL 4 — Legal */}
        <div>
          <h3 className="text-[11px] font-black mb-5 uppercase tracking-[0.2em] border-b border-white/10 pb-2 text-white">
            Información
          </h3>
          <ul className="space-y-2.5">
            {[
              { href: "/club", label: "⭐ Club GALU" },
              { href: "/politica", label: "Política de Privacidad" },
              { href: "/terminos", label: "Términos y Condiciones" },
              { href: "/envios", label: "Políticas de Envío" },
              { href: "/contactos", label: "Contacto" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-[12px] text-white/50 hover:text-white hover:underline transition-colors font-medium uppercase tracking-wide"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-12 pt-6 border-t border-white/10 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
          © {currentYear} GALU SHOP · Todos los derechos reservados · Valledupar, Colombia
        </p>
        <p className="text-[9px] text-white/15 uppercase tracking-widest mt-1">
          Hecho con ❤️ para ti
        </p>
      </div>
    </footer>
  );
}