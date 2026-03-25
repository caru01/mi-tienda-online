"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { SkeletonProductCard } from "@/components/SkeletonCard";

export default function ParaTiSection() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { setQuickViewId } = useCart();
  const router = useRouter();
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);

  // Sistema de cierre al hacer clic fuera (Especial para móviles)
  useEffect(() => {
    const handleGlobalClick = (e: any) => {
      if (!e.target.closest('.product-card-global')) {
        setActiveActionsId(null);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  const fetchRandomProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .eq('activo', true)
        .limit(60);

      if (error) throw error;

      if (data) {
        const shuffled = [...data]
          .sort(() => 0.5 - Math.random())
          .slice(0, 20);
        setProductos(shuffled);
      }
    } catch (error) {
      console.error("Error cargando Para Ti:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomProducts();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-4 w-48 bg-gray-100 rounded mx-auto mb-16 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-2 md:gap-x-6 gap-y-8 md:gap-y-12">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonProductCard key={i} />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4">

        <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-center mb-16 text-black italic">
          Seleccionado Para Ti
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-2 md:gap-x-6 gap-y-8 md:gap-y-12">
          {productos.map((prod, index) => (
            <motion.div
              key={prod.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (index % 5) * 0.1 }}
              className="group/item flex flex-col bg-white product-card-global relative"
            >
              <div 
                className="aspect-[3/4] overflow-hidden bg-gray-50 rounded-sm mb-5 relative cursor-pointer"
                onClick={() => {
                   if (window.innerWidth < 1024) {
                    if (activeActionsId === prod.id) {
                      router.push(`/producto/${prod.id}`);
                    } else {
                      setActiveActionsId(prod.id);
                    }
                  } else {
                    router.push(`/producto/${prod.id}`);
                  }
                }}
              >
                <img
                  src={prod.imagen_principal}
                  alt={prod.nombre}
                  className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-700"
                />

                <div 
                  className={`absolute inset-0 transition-opacity flex items-center justify-center pointer-events-none p-4`}
                >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickViewId(prod.id);
                      }}
                      className={`absolute top-3 right-3 bg-white text-black p-2.5 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black hover:bg-black hover:text-white hover:translate-x-1 hover:-translate-y-1 hover:shadow-[-2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all pointer-events-auto flex items-center justify-center group ${activeActionsId === prod.id ? 'opacity-100' : 'opacity-0 md:group-hover/item:opacity-100'}`}
                    >
                      <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-bold truncate px-2">
                  {prod.nombre}
                </h3>
                <p className="font-bold text-lg text-black">
                  ${Number(prod.precio_base).toLocaleString("es-CO")}
                </p>
                <div className="w-8 h-[2px] bg-black mx-auto mt-2 transition-all group-hover/item:w-16" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}