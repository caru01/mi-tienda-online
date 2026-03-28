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
  const [atributosSeleccionados, setAtributosSeleccionados] = useState<Record<string, string>>({});
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

        if (!varData || varData.length === 0) {
            setStockMaximo(prodData.stock_total || 0);
        } else {
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

   // Agrupar atributos disponibles dinámicamente
   const gruposAtributos = React.useMemo(() => {
     const grupos: Record<string, string[]> = {};
     variantes.forEach(v => {
       v.variante_atributos?.forEach((va: any) => {
         const nombreAttr = va.atributo_valores?.atributos?.nombre;
         const valorAttr = va.atributo_valores?.valor;
         if (nombreAttr && valorAttr) {
           if (!grupos[nombreAttr]) grupos[nombreAttr] = [];
           if (!grupos[nombreAttr].includes(valorAttr)) {
             grupos[nombreAttr].push(valorAttr);
           }
         }
       });
     });
     return grupos;
   }, [variantes]);

   // Actualizar stock basado en combinaciones dinámicas
   useEffect(() => {
     if (variantes.length > 0) {
       const nombresRequeridos = Object.keys(gruposAtributos);
       const seleccionCompleta = nombresRequeridos.every(n => atributosSeleccionados[n]);

       if (nombresRequeridos.length > 0) {
         if (seleccionCompleta) {
           const vFound = variantes.find(v => {
             return nombresRequeridos.every(nombre => {
               const valSel = atributosSeleccionados[nombre];
               return v.variante_atributos?.some((va: any) => 
                 va.atributo_valores?.atributos?.nombre === nombre && 
                 va.atributo_valores?.valor === valSel
               );
             });
           });
           setStockMaximo(vFound ? vFound.stock : 0);
         } else {
           setStockMaximo(0);
         }
       } else {
         setStockMaximo(variantes[0]?.stock || 0);
       }
     } else {
        setStockMaximo(producto?.stock_total || 0);
     }
   }, [atributosSeleccionados, variantes, gruposAtributos, producto?.stock_total]);

   const handleAddToCart = () => {
     const nombresRequeridos = Object.keys(gruposAtributos);
     const faltantes = nombresRequeridos.filter(n => !atributosSeleccionados[n]);

     if (variantes.length > 0 && faltantes.length > 0) {
       toast(`Falta elegir: ${faltantes.join(', ')}`, "warning");
       return;
     }

     const detalleVar = Object.entries(atributosSeleccionados)
       .map(([k,v]) => `${k}: ${v.split('|')[0]}`)
       .join(' / ');

     addToCart({
       id: producto.id,
       nombre: producto.nombre,
       precio: producto.precio_base,
       cantidad: cantidad,
       talla: detalleVar || "Única",
       imagen: producto.imagen_principal
     });

     toast("¡Agregado al carrito!", "success");
     setQuickViewId(null);
   };

  if (!quickViewId) return null;

  const promedioResenas = producto?.resenas?.length > 0 
    ? producto.resenas.reduce((acc: any, curr: any) => acc + curr.calificacion, 0) / producto.resenas.length 
    : 5;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-md">
        
        {/* Backdrop overlay */}
        <div className="absolute inset-0 z-0" onClick={() => setQuickViewId(null)} />

        {/* Modal / Bottom Sheet - Diseño Sencillo y Familiar */}
        <motion.div
           initial={{ y: "100%", opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: "100%", opacity: 0 }}
           transition={{ type: "spring", damping: 30, stiffness: 300 }}
           className="relative z-10 bg-white w-full max-w-5xl h-[92vh] md:h-[85vh] overflow-hidden border-t md:border border-gray-100 flex flex-col md:grid md:grid-cols-2 rounded-t-[2.5rem] md:rounded-2xl shadow-2xl"
        >
           {/* CERRAR */}
           <button 
             onClick={() => setQuickViewId(null)}
             className="absolute top-5 right-5 z-40 bg-white/80 backdrop-blur-sm md:bg-gray-50 text-black p-2 md:p-2.5 rounded-full shadow-lg hover:bg-black hover:text-white transition-all active:scale-95 border md:border-transparent border-gray-100"
           >
             <X size={20} strokeWidth={2} />
           </button>

          {loading ? (
             <div className="flex-1 col-span-2 flex items-center justify-center h-[500px]">
                <div className="w-10 h-10 border-2 border-black border-t-transparent animate-spin rounded-full" />
             </div>
          ) : (
            <>
              {/* IMAGEN: Estilo limpio como la página de producto detallada */}
              <div className="relative bg-gray-50 h-[35vh] md:h-full flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-100 group overflow-hidden">
                <img src={producto?.imagen_principal} className="w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-1000" alt={producto?.nombre} />
                {producto?.destacado && (
                   <span className="absolute top-4 left-4 bg-black text-white px-3 py-1 font-bold uppercase italic text-[8px] md:text-[10px] tracking-widest rounded-sm">
                      Destacado
                   </span>
                )}
              </div>

              {/* CONTENIDO: Estilo mimetizado con /producto/[id] */}
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                
                {/* Scrollable: Aquí vive la info y opciones con diseño limpio */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                   <div className="space-y-4">
                      {/* Cabecera info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 border-b border-gray-50 pb-2">
                          <div className="flex text-yellow-500">
                            {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Math.round(promedioResenas) ? "fill-current" : "text-gray-200"} />)}
                          </div>
                          <span className="text-[10px] font-black uppercase text-gray-400">
                             {producto?.resenas?.length > 0 ? `${producto.resenas.length} opiniones` : "Sin opiniones aún"}
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black leading-tight italic">
                          {producto?.nombre}
                        </h2>
                        <div className="flex items-center gap-4">
                            <p className="text-2xl md:text-3xl font-bold text-black font-sans">
                                ${Number(producto?.precio_base).toLocaleString("es-CO")}
                            </p>
                        </div>
                      </div>

                      {/* Descripción corta: Estilo similar a la web completa */}
                      <p className="text-[13px] md:text-[15px] text-gray-500 leading-relaxed font-medium pb-6">
                        {producto?.descripcion || "Detalles premium del producto Galu Shop."}
                      </p>
                   </div>

                   {/* Variantes DINÁMICAS */}
                   {variantes.length > 0 && (
                     <div className="space-y-8">
                        {Object.entries(gruposAtributos).map(([nombreGroup, valores], idx) => (
                           <div key={nombreGroup} className="space-y-4 animate-in fade-in slide-in-from-top-1">
                              <div className="flex justify-between items-end">
                                 <label className="text-[11px] font-black uppercase tracking-widest text-black italic">{idx + 1}. Elige {nombreGroup}</label>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase italic">
                                    {atributosSeleccionados[nombreGroup] || 'Sin seleccionar'}
                                 </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                 {valores.map((val) => {
                                    const isSelected = atributosSeleccionados[nombreGroup] === val;
                                    return (
                                       <button
                                          key={val}
                                          onClick={() => setAtributosSeleccionados(prev => ({...prev, [nombreGroup]: val}))}
                                          className={`relative py-3 px-4 border-2 font-black text-[11px] uppercase transition-all tracking-tighter ${
                                             isSelected ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]" : 
                                             "bg-white text-black border-black hover:bg-zinc-50 active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]"
                                          }`}
                                       >
                                          {val.split('|')[0]}
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>
                        ))}
                     </div>
                   )}

                   {/* SELECTOR DE CANTIDAD */}
                   <div className="space-y-4 pt-4 border-t">
                      <label className="text-[11px] md:text-[12px] font-bold uppercase tracking-widest text-gray-400 italic">Cantidad</label>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                        <div className="flex items-center gap-1">
                           <button onClick={() => setCantidad(p => Math.max(1, p-1))} className="p-2 border border-gray-200 rounded-sm hover:bg-gray-50"><Minus size={16} /></button>
                           <span className="w-12 text-center text-lg font-bold">{cantidad}</span>
                           <button onClick={() => setCantidad(p => p < stockMaximo ? p + 1 : p)} className="p-2 border border-gray-200 rounded-sm hover:bg-gray-50"><Plus size={16} /></button>
                        </div>
                        <div className="text-right flex flex-col">
                            <span className={`text-[10px] md:text-[11px] font-bold uppercase ${stockMaximo > 0 ? "text-green-600" : "text-red-500"}`}>
                               {stockMaximo > 0 ? `${stockMaximo} unidades útiles` : "Sin existencias"}
                            </span>
                        </div>
                      </div>
                   </div>

                   <div className="h-4" />
                </div>

                {/* ACCIONES FINALES */}
                <div className="p-6 md:p-10 bg-white border-t border-gray-50 md:border-t-2 flex-shrink-0 space-y-4">
                    <button
                      disabled={stockMaximo <= 0 || Object.keys(gruposAtributos).some(n => !atributosSeleccionados[n])}
                      onClick={handleAddToCart}
                      className={`w-full py-5 text-[12px] md:text-[14px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all rounded-sm ${
                        (stockMaximo > 0 && Object.keys(gruposAtributos).every(n => atributosSeleccionados[n])) 
                        ? "bg-black text-white hover:bg-zinc-900 shadow-xl active:scale-[0.98]" 
                        : (variantes.length === 0 && stockMaximo > 0)
                        ? "bg-black text-white hover:bg-zinc-900 shadow-xl active:scale-[0.98]"
                        : "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                      }`}
                    >
                      Añadir al Carrito <ShoppingCart size={22} strokeWidth={2} />
                    </button>
                   
                   <Link 
                     href={`/producto/${producto?.id}`}
                     onClick={() => setQuickViewId(null)}
                     className="block text-center text-[10px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-gray-300 hover:text-black transition-colors"
                   >
                     Información completa <ArrowRight size={14} className="inline ml-1" />
                   </Link>

                   {/* BADGES DE CONFIANZA */}
                   <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50">
                      {[
                        {icon: "https://cdn-icons-png.flaticon.com/512/2501/2501784.png", text: "Pago Seguro"},
                        {icon: "https://cdn-icons-png.flaticon.com/512/709/709790.png", text: "Envío Express"},
                        {icon: "https://cdn-icons-png.flaticon.com/512/411/411763.png", text: "Calidad Galu"}
                      ].map((b, i) => (
                        <div key={i} className="flex flex-col items-center text-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                           <div className="p-2 bg-gray-50 rounded-full"><img src={b.icon} className="w-5 h-5 grayscale opacity-70" alt={b.text} /></div>
                           <p className="text-[7px] font-black uppercase leading-tight">{b.text.split(' ')[0]}<br/>{b.text.split(' ')[1]}</p>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
