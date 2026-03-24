"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Eye, X, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { SkeletonProductCard } from "@/components/SkeletonCard";

export default function ParaTiSection() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, setIsOpen } = useCart();

  // --- ESTADOS PARA SELECCIÓN INTERACTIVA ---
  const [seleccionarId, setSeleccionarId] = useState<string | null>(null);
  const [opcionTemporal, setOpcionTemporal] = useState<string>("");
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

  // Cargar variantes cuando se intenta añadir al carrito
  const cargarVariantesProducto = async (productoId: string) => {
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
      const prodActual = productos.find(p => p.id === productoId);
      if (data.length === 1 && (!data[0].variante_atributos || data[0].variante_atributos.length === 0)) {
        setStockMaximo(data[0].stock);
      }
    }
  };

  useEffect(() => {
    fetchRandomProducts();
  }, []);

  // Sincronizar stock cuando cambia la opción elegida
  useEffect(() => {
    if (opcionTemporal && variantes.length > 0) {
      const varianteElegida = variantes.find(v => {
        const nombreV = v.variante_atributos?.length > 0 
          ? v.variante_atributos.map((va:any) => va.atributo_valores?.valor).join(' / ') 
          : v.sku || 'Única';
        return nombreV === opcionTemporal;
      });
      setStockMaximo(varianteElegida?.stock || 0);
    }
  }, [opcionTemporal, variantes]);

  const handleConfirmarAdd = (prod: any) => {
    const tieneOpciones = variantes.some(v => v.variante_atributos && v.variante_atributos.length > 0);
    if (tieneOpciones && !opcionTemporal) return;

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
  };

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
                onClick={(e) => {
                  // Solo activamos el toggle por clic si es una pantalla pequeña/táctil
                  if (window.innerWidth < 1024) {
                     setActiveActionsId(activeActionsId === prod.id ? null : prod.id);
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
                    // Detenemos que el clic llegue a la imagen si hacemos clic en la capa de botones/menú
                    e.stopPropagation();
                    // Pero si NO estamos en un menú, cerramos las acciones
                    if (!seleccionarId && window.innerWidth < 1024) {
                      setActiveActionsId(null);
                    }
                  }}
                >

                  {seleccionarId === prod.id ? (
                    /* --- MENÚ DE CONFIGURACIÓN IGUAL AL CAROUSEL --- */
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="bg-white p-3 w-full rounded-sm shadow-2xl space-y-2 border-2 border-black"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center border-b pb-1 border-gray-100">
                        <span className="text-[8px] font-black uppercase text-black italic">Añadir</span>
                        <button onClick={(e) => { e.stopPropagation(); setSeleccionarId(null); }} className="text-black"><X size={12} /></button>
                      </div>

                      {variantes.some(v => v.variante_atributos && v.variante_atributos.length > 0) && (
                        <select
                          value={opcionTemporal}
                          onChange={(e) => { e.stopPropagation(); setOpcionTemporal(e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full border-2 border-black p-1 text-[10px] font-bold text-black bg-white outline-none"
                        >
                          <option value="">{variantes[0]?.variante_atributos?.[0]?.atributo_valores?.atributos?.nombre || "Opción"}...</option>
                          {variantes.map((v: any) => {
                             const nombreOpcion = v.variante_atributos?.length > 0 
                               ? v.variante_atributos.map((va:any) => va.atributo_valores?.valor).join(' / ') 
                               : v.sku || 'Única';
                             return (
                               <option key={v.id} value={nombreOpcion} disabled={v.stock <= 0}>
                                 {nombreOpcion} {v.stock <= 0 ? '(Agotado)' : ''}
                               </option>
                             );
                          })}
                        </select>
                      )}

                      <div className="flex justify-between items-center px-1 pt-1">
                         {(opcionTemporal || !variantes.some(v => v.variante_atributos && v.variante_atributos.length > 0)) && (
                           <span className={`text-[8px] font-black uppercase italic ${stockMaximo > 5 ? "text-green-600" : stockMaximo > 0 ? "text-orange-600" : "text-red-500"}`}>Stock disp: {stockMaximo}</span>
                         )}
                      </div>

                      <div className="flex items-center justify-between border-2 border-black p-1 bg-white">
                        <button onClick={() => setCantidadTemporal(prev => Math.max(1, prev - 1))} className="p-1 text-black"><Minus size={10} /></button>
                        <span className="text-[10px] font-black text-black">{cantidadTemporal}</span>
                        <button onClick={() => setCantidadTemporal(prev => prev < stockMaximo ? prev + 1 : prev)} className="p-1 text-black"><Plus size={10} /></button>
                      </div>

                      <button
                        disabled={(variantes.some(v => v.variante_atributos?.length > 0) && !opcionTemporal) || stockMaximo <= 0}
                        onClick={(e) => { e.stopPropagation(); handleConfirmarAdd(prod); }}
                        className={`w-full py-1.5 text-[8px] font-black uppercase tracking-widest transition-all border-2 border-black ${stockMaximo > 0 ? "bg-black text-white hover:bg-zinc-800" : "bg-gray-100 text-gray-400 border-gray-200"
                          }`}
                      >
                        {stockMaximo <= 0 ? "Agotado" : "Confirmar"}
                      </button>
                    </motion.div>
                  ) : (
                    /* --- BOTONES INICIALES --- */
                    <div className={`flex items-end justify-center w-full h-full pb-6 gap-3 transition-opacity ${activeActionsId === prod.id ? 'opacity-100' : 'opacity-0 md:group-hover/item:opacity-100'}`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSeleccionarId(prod.id);
                          cargarVariantesProducto(prod.id);
                        }}
                        className="bg-white text-black p-3 rounded-full shadow-xl hover:bg-black hover:text-white transition-colors border-2 border-black"
                      >
                        <ShoppingCart size={18} />
                      </button>
                      <Link
                        href={`/producto/${prod.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white text-black p-3 rounded-full shadow-xl hover:bg-black hover:text-white transition-colors border-2 border-black"
                      >
                        <Eye size={18} />
                      </Link>
                    </div>
                  )}
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