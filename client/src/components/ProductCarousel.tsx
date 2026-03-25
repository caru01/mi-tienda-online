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
  const { addToCart, setIsOpen } = useCart();
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
  const [seleccionarId, setSeleccionarId] = useState<string | null>(null);
  const [opcionTemporal, setOpcionTemporal] = useState<string>(""); // Cambiado de talla a opcion
  const [cantidadTemporal, setCantidadTemporal] = useState<number>(1);
  const [stockMaximo, setStockMaximo] = useState<number>(0);
  const [variantes, setVariantes] = useState<any[]>([]);
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

  const cargarVariantesProducto = async (productoId: string) => {
    // Resetear estados previos antes de cargar nuevas variantes
    setVariantes([]);
    setStockMaximo(0);
    setOpcionTemporal("");
    setCantidadTemporal(1);

    const { data } = await supabase
      .from('variantes_producto')
      .select(`
        id, 
        stock,
        sku,
        variante_atributos (
          atributo_valores (
            valor,
            atributos (nombre)
          )
        )
      `)
      .eq('producto_id', productoId)
      .eq('activo', true);

    if (data) {
      setVariantes(data);
      // Si el producto NO tiene variantes configuradas (es único), asignar stock base
      const prodActual = productos.find(p => p.id === productoId);
      if (!prodActual?.es_ropa && data.length === 1 && !data[0].variante_atributos.length) {
        setStockMaximo(data[0].stock);
      }
    }
  };

  useEffect(() => {
    fetchDestacados();
  }, []);

  // Sincronizar stock cuando cambia la opción elegida (Sea Talla S o Color Negro)
  useEffect(() => {
    if (opcionTemporal && variantes.length > 0) {
      const varianteElegida = variantes.find(v =>
        v.variante_atributos.some((va: any) => va.atributo_valores.valor === opcionTemporal)
      );
      setStockMaximo(varianteElegida?.stock || 0);
    }
  }, [opcionTemporal, variantes]);

  const totalPages = Math.ceil(productos.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentProducts = productos.slice(startIndex, startIndex + itemsPerPage);

  const handleNext = () => setCurrentPage((prev) => (prev + 1) % totalPages);
  const handlePrev = () => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);

  const handleConfirmarAdd = (prod: any) => {
    // Validar si tiene variantes (ropa o tecnología con opciones)
    const tieneOpciones = variantes.some(v => v.variante_atributos.length > 0);
    if (tieneOpciones && !opcionTemporal) {
      toast("Por favor selecciona una opción", "warning");
      return;
    }

    if (cantidadTemporal > stockMaximo) {
      toast("No hay suficiente stock disponible", "error");
      return;
    }

    addToCart({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio_base,
      cantidad: cantidadTemporal,
      talla: opcionTemporal || "Única",
      imagen: prod.imagen_principal
    });

    setSeleccionarId(null);
    setOpcionTemporal("");
    setCantidadTemporal(1);
    setIsOpen(true);
    toast(`¡${prod.nombre} agregado a tu bolsa!`, "success");
  };


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
                        className={`absolute inset-0 bg-black/5 transition-opacity flex items-center justify-center p-2 
                        ${activeActionsId === prod.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 md:group-hover/item:opacity-100 pointer-events-none md:group-hover/item:pointer-events-auto'}`}
                        onClick={(e) => {
                          if (e.target === e.currentTarget && window.innerWidth < 1024) {
                            router.push(`/producto/${prod.id}`);
                          }
                        }}
                      >
                        {seleccionarId === prod.id ? (
                          <motion.div 
                            initial={{ y: 20, opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            exit={{ y: 20, opacity: 0 }}
                            className="bg-white/95 backdrop-blur-xl p-5 w-[92%] sm:w-full max-w-[280px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-4 border-[3px] border-black relative z-50 transform -translate-y-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-between items-center border-b-2 border-black/10 pb-2">
                              <span className="text-[11px] font-black uppercase text-black italic tracking-tighter">Personaliza tu orden</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSeleccionarId(null); }} 
                                className="text-black hover:rotate-90 transition-transform duration-300"
                              >
                                <X size={18} strokeWidth={3} />
                              </button>
                            </div>
    
                            {/* SELECTOR INTELIGENTE: TALLA O COLOR */}
                            {variantes.some(v => v.variante_atributos.length > 0) && (
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-black/60 uppercase tracking-widest leading-none">
                                  {variantes[0]?.variante_atributos?.[0]?.atributo_valores?.atributos?.nombre || "Opciones"}:
                                </label>
                                <div className="relative group/sel">
                                  <select
                                    value={opcionTemporal}
                                    onChange={(e) => { e.stopPropagation(); setOpcionTemporal(e.target.value); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full border-2 border-black p-2.5 text-[11px] font-black text-black bg-white outline-none cursor-pointer hover:bg-zinc-50 transition-colors appearance-none"
                                  >
                                    <option value="">Elegir variante...</option>
                                    {variantes.map((v: any) => {
                                      const nombreOpcion = v.variante_atributos?.length > 0 
                                        ? v.variante_atributos.map((va:any) => va.atributo_valores?.valor).join(' / ') 
                                        : v.sku;
                                      return (
                                        <option key={v.id} value={nombreOpcion} disabled={v.stock <= 0}>
                                          {nombreOpcion} {v.stock <= 0 ? '(AGOTADO)' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Plus size={12} className="text-black" />
                                  </div>
                                </div>
                              </div>
                            )}
    
                            <div className="space-y-2">
                              <div className="flex justify-between items-end">
                                <label className="text-[10px] font-black text-black/60 uppercase tracking-widest leading-none">Cantidades:</label>
                                {(opcionTemporal || !variantes.some(v => v.variante_atributos.length > 0)) && (
                                  <div className="flex items-center gap-1.5">
                                     <span className={`w-2 h-2 rounded-full animate-pulse ${stockMaximo > 3 ? "bg-green-500" : "bg-orange-500"}`}></span>
                                     <span className={`text-[9px] font-black uppercase italic ${stockMaximo > 5 ? "text-green-600" : stockMaximo > 0 ? "text-orange-500" : "text-red-500"}`}>
                                       Disp: {stockMaximo}
                                     </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between border-2 border-black p-1 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
                                <button onClick={() => setCantidadTemporal(prev => Math.max(1, prev - 1))} className="p-2 text-black hover:bg-zinc-100 transition-colors"><Minus size={14} strokeWidth={3} /></button>
                                <span className="text-sm font-black text-black px-4">{cantidadTemporal}</span>
                                <button onClick={() => setCantidadTemporal(prev => prev < stockMaximo ? prev + 1 : prev)} className="p-2 text-black hover:bg-zinc-100 transition-colors"><Plus size={14} strokeWidth={3} /></button>
                              </div>
                            </div>
    
                            <button
                               disabled={(variantes.length > 0 && variantes.some(v => v.variante_atributos.length > 0) && !opcionTemporal) || (opcionTemporal && stockMaximo <= 0) || (variantes.length === 0)}
                               onClick={(e) => { e.stopPropagation(); handleConfirmarAdd(prod); }}
                               className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 border-black relative overflow-hidden group/btn ${
                                  (variantes.length > 0 && !(opcionTemporal && stockMaximo <= 0)) 
                                  ? "bg-black text-white hover:bg-[#FCD7DE] hover:text-black hover:translate-x-1 hover:-translate-y-1 hover:shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none" 
                                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                }`}
                            >
                              <span className="relative z-10">
                                {variantes.length === 0 ? "Buscando stock..." : 
                                 (variantes.some(v => v.variante_atributos.length > 0) && !opcionTemporal) ? "Elegir Opción" :
                                 stockMaximo <= 0 ? "Sin existencias" : "Confirmar Selección"}
                              </span>
                            </button>
                          </motion.div>
                        ) : (
                          <div className={`flex items-center gap-3 transition-opacity ${activeActionsId === prod.id ? 'opacity-100' : 'opacity-0 md:group-hover/item:opacity-100'}`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSeleccionarId(prod.id);
                                cargarVariantesProducto(prod.id);
                              }}
                              className="bg-white text-black p-3 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-colors border-2 border-black"
                            >
                              <ShoppingCart size={18} />
                            </button>
                            <Link 
                              href={`/producto/${prod.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-white text-black p-3 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-colors border-2 border-black"
                            >
                              <Eye size={18} />
                            </Link>
                          </div>
                        )}
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