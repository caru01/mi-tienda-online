"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingCart, ArrowRight, Star, Copy, ShieldCheck, Truck, RefreshCw } from "lucide-react";
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
  const [skuActual, setSkuActual] = useState("");

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
          .select(`id, stock, sku, variante_atributos (atributo_valores (valor, atributos (nombre)))`)
          .eq('producto_id', quickViewId)
          .eq('activo', true);

        if (varErr) throw varErr;
        setVariantes(varData || []);

        if (!varData || varData.length === 0) {
            setStockMaximo(prodData.stock_total || 0);
            setSkuActual(prodData.sku || "");
        } else {
            setStockMaximo(varData[0]?.stock || 0);
            setSkuActual(varData[0]?.sku || "");
        }

      } catch (err) {
        console.error("Error QuickView:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [quickViewId]);

   const gruposAtributos = React.useMemo(() => {
     const grupos: Record<string, string[]> = {};
     variantes.forEach(v => {
       v.variante_atributos?.forEach((va: any) => {
         const nombreAttr = va.atributo_valores?.atributos?.nombre;
         const valorAttr = va.atributo_valores?.valor;
         if (nombreAttr && valorAttr) {
           if (!grupos[nombreAttr]) grupos[nombreAttr] = [];
           if (!grupos[nombreAttr].includes(valorAttr)) grupos[nombreAttr].push(valorAttr);
         }
       });
     });
     return grupos;
   }, [variantes]);

   useEffect(() => {
     if (variantes.length > 0) {
       const nombresRequeridos = Object.keys(gruposAtributos);
       const seleccionCompleta = nombresRequeridos.every(n => atributosSeleccionados[n]);
       if (nombresRequeridos.length > 0) {
         if (seleccionCompleta) {
           const vFound = variantes.find(v => {
             return nombresRequeridos.every(nombre => {
               const valSel = atributosSeleccionados[nombre];
               return v.variante_atributos?.some((va: any) => va.atributo_valores?.atributos?.nombre === nombre && va.atributo_valores?.valor === valSel);
             });
           });
           if (vFound) {
             setStockMaximo(vFound.stock);
             if (vFound.sku) setSkuActual(vFound.sku);
           } else setStockMaximo(0);
         } else setStockMaximo(variantes[0]?.stock || 0);
       } else setStockMaximo(variantes[0]?.stock || 0);
     } else {
        setStockMaximo(producto?.stock_total || 0);
        if (producto?.sku) setSkuActual(producto?.sku);
     }
   }, [atributosSeleccionados, variantes, gruposAtributos, producto?.stock_total, producto?.sku]);

   const handleAddToCart = () => {
     const nombresRequeridos = Object.keys(gruposAtributos);
     const faltantes = nombresRequeridos.filter(n => !atributosSeleccionados[n]);
     if (variantes.length > 0 && faltantes.length > 0) {
       toast(`Falta elegir: ${faltantes.join(', ')}`, "warning");
       return;
     }
     const detalleVar = Object.entries(atributosSeleccionados).map(([k,v]) => `${k}: ${v.split('|')[0]}`).join(' / ');
     addToCart({ id: producto.id, nombre: producto.nombre, precio: producto.precio_base, cantidad: cantidad, talla: detalleVar || "Única", imagen: producto.imagen_principal });
     toast("¡Agregado al carrito!", "success");
     setQuickViewId(null);
   };

  if (!quickViewId) return null;
  const promedioResenas = producto?.resenas?.length > 0 ? producto.resenas.reduce((acc: any, curr: any) => acc + curr.calificacion, 0) / producto.resenas.length : 5;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0 z-0" onClick={() => setQuickViewId(null)} />
        <motion.div
           initial={{ y: "100%", opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: "100%", opacity: 0 }}
           transition={{ type: "spring", damping: 25, stiffness: 200 }}
           className="relative z-10 bg-white w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col md:grid md:grid-cols-2 rounded-t-3xl md:rounded-2xl shadow-2xl"
        >
           <button onClick={() => setQuickViewId(null)} className="absolute top-4 right-4 z-40 bg-gray-50 text-black p-2 rounded-full hover:bg-black hover:text-white transition-all shadow-sm"><X size={18} /></button>

          {loading ? (
             <div className="flex-1 col-span-2 flex items-center justify-center h-[400px]"><div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin rounded-full" /></div>
          ) : (
            <>
              <div className="relative bg-gray-50 h-[30vh] md:h-full flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-100 overflow-hidden">
                <img src={producto?.imagen_principal} className="w-full h-full object-cover" alt={producto?.nombre} />
              </div>

              <div className="flex-1 flex flex-col min-h-0 bg-white overflow-y-auto custom-scrollbar">
                <div className="p-5 md:p-8 space-y-5 flex flex-col min-h-full">
                   <div className="space-y-2">
                      <div className="flex items-center gap-1.5 opacity-60">
                         <div className="flex text-yellow-500">{[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= Math.round(promedioResenas) ? "fill-current" : "text-gray-200"} />)}</div>
                         <span className="text-[10px] font-bold uppercase tracking-tighter">({producto?.resenas?.length || 0})</span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black italic leading-none">{producto?.nombre}</h2>
                      <div className="flex items-center gap-2 group border-b border-gray-50 pb-2">
                        <p className="text-[9px] font-bold text-gray-400">SKU: {skuActual || producto?.sku || 'N/A'}</p>
                        {(skuActual || producto?.sku) && (
                          <button onClick={() => { navigator.clipboard.writeText(skuActual || producto?.sku); toast("Copiado", "success"); }} className="p-0.5 hover:bg-gray-100 rounded transition-colors"><Copy size={8} className="text-gray-400" /></button>
                        )}
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-black font-sans">${Number(producto?.precio_base).toLocaleString("es-CO")}</p>
                   </div>

                   {variantes.length > 0 && (
                     <div className="space-y-4">
                        {Object.entries(gruposAtributos).map(([nombreGroup, valores], idx) => (
                           <div key={nombreGroup} className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-black italic opacity-60">{nombreGroup}</label>
                              <div className="flex flex-wrap gap-1.5">
                                 {valores.map((val) => {
                                    const isSelected = atributosSeleccionados[nombreGroup] === val;
                                    return (
                                       <button key={val} onClick={() => setAtributosSeleccionados(prev => ({...prev, [nombreGroup]: val}))} className={`py-1.5 px-3 border-2 font-black text-[10px] uppercase transition-all ${isSelected ? "bg-black text-white border-black" : "bg-white text-black border-zinc-200 hover:border-black"}`}>
                                          {val.split('|')[0]}
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>
                        ))}
                     </div>
                   )}

                   <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                         <button onClick={() => setCantidad(p => Math.max(1, p-1))} className="p-1 px-2 hover:bg-white rounded transition-colors"><Minus size={14} /></button>
                         <span className="w-8 text-center text-sm font-bold">{cantidad}</span>
                         <button onClick={() => setCantidad(p => p < stockMaximo ? p + 1 : p)} className="p-1 px-2 hover:bg-white rounded transition-colors"><Plus size={14} /></button>
                      </div>
                      <span className={`text-[10px] font-bold uppercase py-1 px-2 rounded-full border ${stockMaximo > 0 ? "text-green-600 bg-green-50 border-green-100" : "text-red-500 bg-red-50 border-red-100"}`}>
                        {stockMaximo > 0 ? `${stockMaximo} disponibles` : "Agotado"}
                      </span>
                   </div>

                   {stockMaximo > 0 && (
                     <div className="p-3 bg-gradient-to-r from-red-50/80 to-orange-50/80 rounded-xl border border-red-100/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex h-2 w-2 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="h-2 w-2 bg-red-500 rounded-full"></span></span>
                          <p className="text-[10px] font-black text-red-900 uppercase tracking-tight">Sólo quedan <span className="bg-red-600 text-white px-1.5 py-0.5 rounded-sm mx-0.5">{stockMaximo}</span> ¡Pídelo ya!</p>
                        </div>
                        <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(8, Math.min(100, (stockMaximo / 10) * 100))}%` }} transition={{ duration: 1.5 }} className={`h-full rounded-full ${stockMaximo <= 3 ? "bg-red-600" : "bg-amber-400"}`} />
                        </div>
                     </div>
                   )}

                   <div className="pt-2 sticky bottom-0 bg-white pb-3 mt-auto">
                      <button disabled={stockMaximo <= 0 || Object.keys(gruposAtributos).some(n => !atributosSeleccionados[n])} onClick={handleAddToCart} className={`w-full py-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl transition-all ${stockMaximo > 0 && Object.keys(gruposAtributos).every(n => atributosSeleccionados[n]) ? "bg-black text-white hover:scale-[0.99] shadow-lg" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}>
                        Añadir <ShoppingCart size={16} />
                      </button>
                      
                      <div className="flex items-center justify-around pt-3 border-t border-gray-50 mt-3">
                        {[
                          {icon: ShieldCheck, text: "Seguro", color: "text-blue-500"}, 
                          {icon: Truck, text: "Envío", color: "text-green-500"}, 
                          {icon: RefreshCw, text: "Cambio", color: "text-orange-500"}
                        ].map((b, i) => (
                           <div key={i} className="flex items-center gap-1.5" title={b.text}>
                             <b.icon size={11} className={b.color} />
                             <span className="text-[7px] font-black uppercase tracking-widest text-gray-400">{b.text}</span>
                           </div>
                        ))}
                      </div>

                      <Link href={`/producto/${producto?.id}`} onClick={() => setQuickViewId(null)} className="block text-center text-[9px] font-bold uppercase tracking-widest text-gray-300 hover:text-black mt-3">Ver detalle completo</Link>
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
