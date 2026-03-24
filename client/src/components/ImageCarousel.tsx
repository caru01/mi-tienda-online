"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Banner {
  id: string;
  titulo?: string;
  subtitulo?: string;
  imagen_url: string;
  imagen_movil?: string;
  enlace?: string;
  orden: number;
}

// Banners de fallback si la tabla está vacía
const FALLBACK_BANNERS: Banner[] = [
  { id: "1", imagen_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80", titulo: "Nueva Colección", subtitulo: "Descubre las últimas tendencias", orden: 0 },
  { id: "2", imagen_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1400&q=80", titulo: "Estilo Único", subtitulo: "Moda que te define", orden: 1 },
  { id: "3", imagen_url: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1400&q=80", titulo: "GALU SHOP", subtitulo: "Tu tienda de moda en Valledupar", orden: 2 },
];

export default function ImageCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("activo", true)
        .order("orden", { ascending: true });

      if (error) console.error("Error fetching banners:", error);
      setBanners(data && data.length > 0 ? data : FALLBACK_BANNERS);
      setLoading(false);
    };
    fetchBanners();
  }, []);

  // Auto-advance cada 5 segundos
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(p => (p + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const prev = () => setCurrent(p => (p - 1 + banners.length) % banners.length);
  const next = () => setCurrent(p => (p + 1) % banners.length);

  if (loading || banners.length === 0) {
    return <div className="w-full aspect-[16/6] md:aspect-[16/5] bg-zinc-100 animate-pulse" />;
  }

  const banner = banners[current];

  return (
    <div className={`relative w-full ${banner?.imagen_movil ? 'aspect-[4/5]' : 'aspect-square'} md:aspect-[16/5] overflow-hidden bg-gray-900 select-none transition-all duration-500`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          {/* Imagen PC */}
          <img
            src={banner.imagen_url}
            alt={banner.titulo ?? "Banner"}
            className={`w-full h-full object-cover ${banner.imagen_movil ? 'hidden md:block' : ''}`}
          />
          {/* Imagen Móvil */}
          {banner.imagen_movil && (
            <img
              src={banner.imagen_movil}
              alt={banner.titulo ?? "Banner Movil"}
              className="w-full h-full object-cover block md:hidden"
            />
          )}
          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />

          {/* Texto (si tiene título) */}
          {banner.titulo && (
            <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-3 shadow-black/20 drop-shadow-sm"
              >
                {banner.titulo}
              </motion.h2>
              {banner.subtitulo && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="text-white/80 text-sm md:text-lg font-bold uppercase tracking-widest bg-black/5 w-fit px-2 backdrop-blur-sm"
                >
                  {banner.subtitulo}
                </motion.p>
              )}
              {banner.enlace && (
                <motion.a
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  href={banner.enlace}
                  className="mt-5 inline-flex items-center gap-2 bg-white text-black font-black uppercase tracking-widest text-xs px-6 py-3 w-fit border-2 border-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
                >
                  Ver más <ExternalLink size={14} />
                </motion.a>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Controles de navegación */}
      {banners.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full transition-all backdrop-blur-sm">
            <ChevronLeft size={20} />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full transition-all backdrop-blur-sm">
            <ChevronRight size={20} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`rounded-full transition-all ${i === current ? "bg-white w-6 h-2" : "bg-white/40 w-2 h-2"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}