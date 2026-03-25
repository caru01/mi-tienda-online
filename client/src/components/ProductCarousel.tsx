"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, ShoppingCart, Eye, X, Plus, Minus
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { SkeletonProductCard } from "@/components/SkeletonCard";
import { useToast } from "@/context/ToastContext";



export default function ProductCarousel() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const { addToCart, setIsOpen, setQuickViewId } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setItemsPerPage(2);
      else setItemsPerPage(4);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- ESTADOS PARA SELECCIÓN ---
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);

  // Sistema de cierre al hacer clic fuera (Especial para móviles)
  useEffect(() => {
    const handleGlobalClick = (e: any) => {
      // Si el clic NO es dentro de un contenedor de producto, cerramos acciones
      if (!e.target.closest('.product-card-global')) {
        setActiveActionsId(null);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  const fetchDestacados = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .eq('destacado', true)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setProductos(data);
    } catch (error) {
      console.error("Error cargando destacados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestacados();
  }, []);

  useEffect(() => {
    fetchDestacados();
  }, []);

  const totalPages = Math.ceil(productos.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentProducts = productos.slice(startIndex, startIndex + itemsPerPage);

  const handleNext = () => setCurrentPage((prev) => (prev + 1) % totalPages);
  const handlePrev = () => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);


  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-4 w-48 bg-gray-100 rounded mx-auto mb-16 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonProductCard key={i} />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 relative">

        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-center mb-16 text-black italic">
          Novedades de Temporada
        </h2>

        <div className="flex items-center group">
          {productos.length > itemsPerPage && (
            <>
              <button onClick={handlePrev} className="absolute left-[-10px] sm:left-[-20px] md:left-0 z-20 p-3 bg-white border border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-95">
                <ChevronLeft size={20} />
              </button>
              <button onClick={handleNext} className="absolute right-[-10px] sm:right-[-20px] md:right-0 z-20 p-3 bg-white border border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-95">
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="w-full overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-8"
              >
                {currentProducts.map((prod) => (
                  <div 
                    key={prod.id} 
                    className="group/item flex flex-col bg-white product-card-global relative"
                  >
                    <div 
                      className="aspect-[3/4] overflow-hidden bg-gray-50 rounded-none mb-5 relative border border-gray-100 cursor-pointer"
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                           if (activeActionsId === prod.id) {
                            router.push(`/producto/${prod.id}`);
                          } else {
                            setActiveActionsId(prod.id);
                          }
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
                      <h3 className="text-[11px] text-gray-800 uppercase tracking-widest font-black leading-tight">{prod.nombre}</h3>
                      <p className="font-black text-lg text-black italic">${Number(prod.precio_base).toLocaleString("es-CO")}</p>
                      <div className="w-8 h-[3px] bg-black mx-auto mt-2 transition-all group-hover/item:w-16" />
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}