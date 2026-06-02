"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Eye, X, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export default function ParaTiSection() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, setIsOpen } = useCart();

  // --- ESTADOS PARA SELECCIÓN INTERACTIVA ---
  const [seleccionarId, setSeleccionarId] = useState<string | null>(null);
  const [tallaTemporal, setTallaTemporal] = useState<string>("");
  const [cantidadTemporal, setCantidadTemporal] = useState<number>(1);
  const [stockMaximo, setStockMaximo] = useState<number>(0);
  const [variantes, setVariantes] = useState<any[]>([]);

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
      .select('*, variante_atributos(atributo_valores(valor))')
      .eq('producto_id', productoId)
      .eq('activo', true);
    
    if (data) setVariantes(data);
  };

  useEffect(() => {
    fetchRandomProducts();
  }, []);

  // Actualizar stock cuando cambia la talla elegida
  useEffect(() => {
    if (tallaTemporal && variantes.length > 0) {
      const varianteElegida = variantes.find(v => 
        v.variante_atributos.some((va: any) => va.atributo_valores.valor === tallaTemporal)
      );
      setStockMaximo(varianteElegida?.stock || 0);
    }
  }, [tallaTemporal, variantes]);

  const handleConfirmarAdd = (prod: any) => {
    if (prod.es_ropa && !tallaTemporal) return;
    
    addToCart({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio_base,
      cantidad: cantidadTemporal,
      talla: tallaTemporal || "Única",
      imagen: prod.imagen_principal
    });
    
    setSeleccionarId(null);
    setTallaTemporal("");
    setCantidadTemporal(1);
    setIsOpen(true);
  };

  if (loading || productos.length === 0) return null;

  return (
    <section className="py-20 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4">
        
        <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-center mb-16 text-black italic">
          Seleccionado Para Ti
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-12">
          {productos.map((prod, index) => (
            <motion.div 
              key={prod.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (index % 5) * 0.1 }}
              className="group/item flex flex-col bg-white"
            >
              <div className="aspect-[3/4] overflow-hidden bg-gray-50 rounded-sm mb-5 relative">
                <img
                  src={prod.imagen_principal}
                  alt={prod.nombre}
                  className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-700"
                />
                
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-2">
                  
                  {seleccionarId === prod.id ? (
                    /* --- MENÚ DE CONFIGURACIÓN IGUAL AL CAROUSEL --- */
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-3 w-full rounded-sm shadow-2xl space-y-2 border-2 border-black">
                      <div className="flex justify-between items-center border-b pb-1 border-gray-100">
                        <span className="text-[8px] font-black uppercase text-black italic">Añadir</span>
                        <button onClick={() => setSeleccionarId(null)} className="text-black"><X size={12} /></button>
                      </div>

                      {prod.es_ropa && (
                        <select 
                          value={tallaTemporal}
                          onChange={(e) => setTallaTemporal(e.target.value)}
                          className="w-full border-2 border-black p-1 text-[10px] font-bold text-black bg-white outline-none"
                        >
                          <option value="">Talla...</option>
                          {variantes.map((v: any) => (
                            <option key={v.id} value={v.variante_atributos[0]?.atributo_valores?.valor}>
                              {v.variante_atributos[0]?.atributo_valores?.valor} {v.stock <= 0 ? '(Agotado)' : ''}
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="flex items-center justify-between border-2 border-black p-1 bg-white">
                        <button onClick={() => setCantidadTemporal(prev => Math.max(1, prev - 1))} className="p-1 text-black"><Minus size={10} /></button>
                        <span className="text-[10px] font-black text-black">{cantidadTemporal}</span>
                        <button onClick={() => setCantidadTemporal(prev => prev < (prod.es_ropa ? stockMaximo : 99) ? prev + 1 : prev)} className="p-1 text-black"><Plus size={10} /></button>
                      </div>

                      <button 
                        disabled={prod.es_ropa && (!tallaTemporal || stockMaximo <= 0)}
                        onClick={() => handleConfirmarAdd(prod)}
                        className={`w-full py-1.5 text-[8px] font-black uppercase tracking-widest transition-all border-2 border-black ${
                          (prod.es_ropa ? tallaTemporal : true) ? "bg-black text-white" : "bg-white text-gray-400 border-gray-200"
                        }`}
                      >
                        {prod.es_ropa && stockMaximo <= 0 && tallaTemporal ? "Agotado" : "Confirmar"}
                      </button>
                    </motion.div>
                  ) : (
                    /* --- BOTONES INICIALES --- */
                    <div className="flex items-end justify-center w-full h-full pb-6 gap-3">
                      <button 
                        onClick={() => {
                          setSeleccionarId(prod.id);
                          cargarVariantesProducto(prod.id);
                        }}
                        className="bg-white text-black p-3 rounded-full shadow-xl hover:bg-[#FCD7DE] transition-colors border border-gray-100"
                      >
                        <ShoppingCart size={18} />
                      </button>
                      <Link 
                        href={`/producto/${prod.id}`} 
                        className="bg-white text-black p-3 rounded-full shadow-xl hover:bg-[#FCD7DE] transition-colors border border-gray-100"
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
                <div className="w-8 h-[2px] bg-[#FCD7DE] mx-auto mt-2 transition-all group-hover/item:w-16" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}