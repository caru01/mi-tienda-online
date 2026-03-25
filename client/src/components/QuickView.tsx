"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingCart, ArrowRight, Star } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";

export default function QuickView() {
  const { quickViewId, setQuickViewId, addToCart } = useCart();
  const { toast } = useToast();
  const [producto, setProducto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [variantes, setVariantes] = useState<any[]>([]);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [stockMaximo, setStockMaximo] = useState(0);

  // Cargar datos cuando se abre
  useEffect(() => {
    if (!quickViewId) {
      setProducto(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const { data: prodData, error: prodErr } = await supabase
          .from('productos')
          .select('*, resenas(calificacion)')
          .eq('id', quickViewId)
          .single();

        if (prodErr) throw prodErr;
        setProducto(prodData);

        const { data: varData, error: varErr } = await supabase
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
          .eq('producto_id', quickViewId)
          .eq('activo', true);

        if (varErr) throw varErr;
        setVariantes(varData || []);

        // Si es producto único (sin variantes específicas)
        if (!varData || varData.length === 0) {
            setStockMaximo(prodData.stock_total || 0);
        } else {
            setOpcionSeleccionada("");
            setStockMaximo(0);
        }

      } catch (err) {
        console.error("Error QuickView:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [quickViewId]);

  // Actualizar stock cuando cambia la variante
  useEffect(() => {
    if (opcionSeleccionada && variantes.length > 0) {
      const v = variantes.find(v => {
        const nombre = v.variante_atributos?.length > 0 
          ? v.variante_atributos.map((va:any) => va.atributo_valores?.valor).join(' / ') 
          : v.sku;
        return nombre === opcionSeleccionada;
      });
      setStockMaximo(v ? v.stock : 0);
    }
  }, [opcionSeleccionada, variantes]);

  const handleAddToCart = () => {
    if (variantes.length > 0 && !opcionSeleccionada) {
      toast("Elige una opción antes de continuar", "warning");
      return;
    }

    addToCart({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio_base,
      cantidad: cantidad,
      talla: opcionSeleccionada || "Única",
      imagen: producto.imagen_principal
    });

    toast("¡Agregado al carrito!", "success");
    setQuickViewId(null);
  };

  if (!quickViewId) return null;

  const promedioResenas = producto?.resenas?.length > 0 
    ? producto.resenas.reduce((acc: any, curr: any) => acc + curr.calificacion, 0) / producto.resenas.length 
    : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        {/* Backdrop con Blur extremo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={() => setQuickViewId(null)}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden border-[4px] border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-2 z-50"
        >
          {/* BOTÓN CERRAR */}
          <button 
            onClick={() => setQuickViewId(null)}
            className="absolute top-4 right-4 z-10 bg-black text-white p-2 hover:rotate-90 transition-transform"
          >
            <X size={20} />
          </button>

          {loading ? (
            <div className="col-span-2 h-[500px] flex items-center justify-center">
               <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin rounded-full"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black">Cargando Previsualización...</p>
               </div>
            </div>
          ) : (
            <>
              {/* Lado Izquierdo: IMAGEN */}
              <div className="relative bg-gray-50 flex items-center justify-center overflow-hidden border-b-4 md:border-b-0 md:border-r-4 border-black">
                <img 
                  src={producto?.imagen_principal} 
                  alt={producto?.nombre} 
                  className="w-full h-full object-cover"
                />
                
                {/* Badge de Oferta o Nuevo */}
                {producto?.destacado && (
                   <span className="absolute top-6 left-6 bg-yellow-400 text-black px-4 py-1.5 font-black uppercase italic text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-3 border-2 border-black">
                      Destacado
                   </span>
                )}
              </div>

              {/* Lado Derecho: INFO */}
              <div className="p-8 flex flex-col justify-between overflow-y-auto bg-white">
                <div className="space-y-6">
                   {/* CABECERA */}
                   <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                           {[1,2,3,4,5].map(s => (
                             <Star key={s} size={12} className={s <= Math.round(promedioResenas) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                           ))}
                        </div>
                        <span className="text-[9px] font-black text-gray-400">({producto?.resenas?.length || 0})</span>
                      </div>
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-black leading-none">
                        {producto?.nombre}
                      </h2>
                      <p className="text-2xl font-black text-black">
                        ${Number(producto?.precio_base).toLocaleString("es-CO")}
                      </p>
                   </div>

                   {/* DESCRIPCIÓN CORTA */}
                   <div className="border-l-4 border-black pl-4 py-1">
                      <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">
                        {producto?.descripcion || "Previsualización detallada de este producto premium diseñado para mejorar tu estilo de vida Galu Shop."}
                      </p>
                   </div>

                   {/* VARIANTES */}
                   {variantes.length > 0 && (
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Selecciona Opción:</label>
                        <div className="flex flex-wrap gap-2">
                           {variantes.map((v:any) => {
                              const nombre = v.variante_atributos?.length > 0 
                                ? v.variante_atributos.map((va:any) => va.atributo_valores?.valor).join(' / ') 
                                : v.sku;
                              const isSelected = opcionSeleccionada === nombre;
                              const isAgotado = v.stock <= 0;
                              return (
                                <button
                                  key={v.id}
                                  disabled={isAgotado}
                                  onClick={() => setOpcionSeleccionada(nombre)}
                                  className={`px-4 py-2 text-[10px] font-black uppercase transition-all border-2 border-black relative ${
                                    isAgotado ? "opacity-30 cursor-not-allowed bg-gray-100" : 
                                    isSelected ? "bg-black text-white translate-x-1 -translate-y-1 shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black hover:bg-zinc-50"
                                  }`}
                                >
                                  {nombre}
                                  {isSelected && <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 border border-black rounded-full shadow-sm" />}
                                </button>
                              );
                           })}
                        </div>
                     </div>
                   )}

                   {/* CANTIDAD Y STOCK */}
                   <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center border-[3px] border-black p-1 bg-white">
                        <button onClick={() => setCantidad(p => Math.max(1, p-1))} className="p-2"><Minus size={16} strokeWidth={3} /></button>
                        <span className="w-12 text-center text-lg font-black">{cantidad}</span>
                        <button onClick={() => setCantidad(p => p < stockMaximo ? p + 1 : p)} className="p-2"><Plus size={16} strokeWidth={3} /></button>
                      </div>
                      
                      <div className="flex flex-col items-end">
                         {stockMaximo > 0 ? (
                           <>
                              <div className="flex items-center gap-1.5 animate-pulse">
                                 <div className="w-2 h-2 rounded-full bg-green-500" />
                                 <span className="text-[10px] font-black uppercase italic text-green-600">Stock Disponible</span>
                              </div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{stockMaximo} unidades</span>
                           </>
                         ) : (
                           <span className="text-[10px] font-black uppercase italic text-red-500">Sin existencias</span>
                         )}
                      </div>
                   </div>
                </div>

                {/* ACCIONES FINALES */}
                <div className="mt-8 space-y-4">
                   <button
                     disabled={stockMaximo <= 0 || (variantes.length > 0 && !opcionSeleccionada)}
                     onClick={handleAddToCart}
                     className={`w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all border-2 border-black ${
                       (stockMaximo > 0 && (variantes.length === 0 || opcionSeleccionada)) 
                       ? "bg-black text-white hover:bg-[#111] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-x-1 hover:-translate-y-1 active:shadow-none active:translate-x-0 active:translate-y-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                       : "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"
                     }`}
                   >
                     Añadir al Carrito <ShoppingCart size={18} />
                   </button>
                   
                   <a 
                     href={`/producto/${producto?.id}`}
                     onClick={() => setQuickViewId(null)}
                     className="w-full py-4 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group text-black/40 hover:text-black transition-colors"
                   >
                     Ver página completa <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                   </a>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
