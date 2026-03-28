"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
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

const FALLBACK_BANNERS: Banner[] = [
  { id: "1", imagen_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80", titulo: "Nueva Colección", subtitulo: "Tendencias Globales 2024", orden: 0, enlace: "/categoria/todas" },
  { id: "2", imagen_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80", titulo: "Estilo & Confort", subtitulo: "Tu mejor versión te espera", orden: 1, enlace: "/categoria/todas" },
  { id: "3", imagen_url: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80", titulo: "Galu Experience", subtitulo: "Moda, Hogar y Estilo", orden: 2, enlace: "/categoria/todas" },
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

  const next = useCallback(() => {
    setCurrent(p => (p + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    setCurrent(p => (p - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [banners.length, next]);

  if (loading || banners.length === 0) {
    return <div className="w-full aspect-[16/9] md:aspect-[16/6] bg-zinc-50 animate-pulse" />;
  }

  const banner = banners[current];

  return (
    <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden bg-black select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          {/* Imagen Estática Optimizada (Más rápida) */}
          <div className="absolute inset-0">
             <img
               src={banner.imagen_movil || banner.imagen_url}
               alt={banner.titulo}
               className="w-full h-full object-cover opacity-70"
             />
          </div>

          {/* Overlay gradiente técnico */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />

          {/* Contenido Editorial */}
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-6 md:px-12 lg:px-20">
              <div className="max-w-3xl space-y-6">
                

                {/* Título Monumental */}
                <div className="overflow-hidden">
                   <motion.h1
                     initial={{ y: "100%" }}
                     animate={{ y: 0 }}
                     transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                     className="text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter leading-[0.9] drop-shadow-2xl"
                   >
                     {banner.titulo}
                   </motion.h1>
                </div>

                {/* Botón Call to Action */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="pt-4 flex flex-wrap gap-4"
                >
                  <a
                    href={banner.enlace || "/categoria/todas"}
                    className="group relative bg-white text-black px-8 py-4 text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all hover:bg-yellow-400 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:scale-95 border-2 border-white md:border-black"
                  >
                    Comprar Ahora <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                  </a>
                  
                  <div className="hidden md:flex items-center gap-2 text-white/50 text-[10px] font-bold uppercase tracking-widest border border-white/20 px-6 py-4 rounded-full backdrop-blur-md">
                    <ShoppingBag size={14} /> Envío Gratis en pedidos +$150k
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navegación Glassmorphism */}
      <div className="absolute bottom-10 right-6 md:right-12 flex items-center gap-2 z-20">
        <button 
          onClick={prev}
          className="p-3 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white hover:text-black transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2 px-4 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
           {banners.map((_, i) => (
             <div 
               key={i} 
               className={`h-1 duration-500 transition-all rounded-full ${i === current ? "w-8 bg-yellow-400" : "w-1.5 bg-white/30"}`} 
             />
           ))}
        </div>
        <button 
          onClick={next}
          className="p-3 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white hover:text-black transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <style jsx>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}