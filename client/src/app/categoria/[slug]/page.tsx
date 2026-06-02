"use client";
import React, { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ShoppingCart, Eye, X, Plus, Minus, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const { addToCart, setIsOpen } = useCart();

  const [productosDB, setProductosDB] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaNombre, setCategoriaNombre] = useState("");

  // Filtros
  const [tallaFiltro, setTallaFiltro] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [orden, setOrden] = useState("novedad");

  // Estados para el popup de selección rápida (Igual al carrusel)
  const [seleccionarId, setSeleccionarId] = useState<string | null>(null);
  const [tallaTemp, setTallaTemp] = useState("");
  const [cantTemp, setCantTemp] = useState(1);
  const [variantes, setVariantes] = useState<any[]>([]);
  const [stockMaximo, setStockMaximo] = useState(0);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const { data: catData } = await supabase
          .from('categorias')
          .select('id, nombre')
          .eq('slug', slug)
          .single();

        if (catData) {
          setCategoriaNombre(catData.nombre);
          const { data: prods, error } = await supabase
            .from('productos')
            .select('*')
            .eq('categoria_id', catData.id)
            .eq('activo', true);

          if (error) throw error;
          setProductosDB(prods || []);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [slug]);

  // Cargar variantes para el stock real
  const cargarVariantes = async (prodId: string) => {
    const { data } = await supabase
      .from('variantes_producto')
      .select('*, variante_atributos(atributo_valores(valor))')
      .eq('producto_id', prodId);
    if (data) setVariantes(data);
  };

  useEffect(() => {
    if (tallaTemp && variantes.length > 0) {
      const v = variantes.find(varnt => varnt.variante_atributos[0]?.atributo_valores?.valor === tallaTemp);
      setStockMaximo(v?.stock || 0);
    }
  }, [tallaTemp, variantes]);

  const handleConfirmarAdd = (prod: any) => {
    if (prod.es_ropa && !tallaTemp) return;
    addToCart({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio_base,
      cantidad: cantTemp,
      talla: tallaTemp || "Única",
      imagen: prod.imagen_principal
    });
    setSeleccionarId(null);
    setTallaTemp("");
    setCantTemp(1);
    setIsOpen(true);
  };

  const productosProcesados = useMemo(() => {
    let resultado = [...productosDB].filter((p) => {
      const coincideMin = precioMin ? p.precio_base >= parseInt(precioMin) : true;
      const coincideMax = precioMax ? p.precio_base <= parseInt(precioMax) : true;
      return coincideMin && coincideMax;
    });

    if (orden === "precio-menor") resultado.sort((a, b) => a.precio_base - b.precio_base);
    if (orden === "precio-mayor") resultado.sort((a, b) => b.precio_base - a.precio_base);
    if (orden === "novedad") resultado.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (orden === "a-z") resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return resultado;
  }, [productosDB, precioMin, precioMax, orden]);

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8 text-black">
        {/* BREADCRUMB */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b pb-4 border-gray-100">
          <nav className="text-black uppercase tracking-widest text-[11px] font-medium">
            Inicio <span className="mx-2 text-gray-300">/</span> <span className="font-black text-black">{categoriaNombre.toUpperCase()}</span>
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-black">Ordenar por:</span>
            <select 
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="bg-white border-2 border-black rounded-none px-4 py-2 text-[10px] font-black uppercase text-black outline-none transition cursor-pointer"
            >
              <option value="novedad">Novedades</option>
              <option value="precio-menor">Precio: Menor a Mayor</option>
              <option value="precio-mayor">Precio: Mayor a Menor</option>
              <option value="a-z">Nombre: A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          {/* ASIDE DE FILTROS */}
          <aside className="w-full md:w-56 space-y-12">
            <h2 className="text-sm font-black uppercase tracking-widest text-black border-b-2 border-black pb-2 italic">Filtrar por</h2>
            
            <div>
              <h3 className="text-[11px] font-black text-black uppercase tracking-widest mb-4">Precio (COP)</h3>
              <div className="flex items-center gap-2">
                <input 
                  type="number" placeholder="MIN" value={precioMin}
                  onChange={(e) => setPrecioMin(e.target.value)}
                  className="w-full border-2 border-black p-2 text-[10px] font-black outline-none focus:bg-gray-50"
                />
                <span className="text-black font-black">-</span>
                <input 
                  type="number" placeholder="MAX" value={precioMax}
                  onChange={(e) => setPrecioMax(e.target.value)}
                  className="w-full border-2 border-black p-2 text-[10px] font-black outline-none focus:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-black text-black uppercase tracking-widest mb-4">Talla</h3>
              <div className="flex flex-wrap gap-2">
                {["S", "M", "L", "XL"].map((talla) => (
                  <button
                    key={talla}
                    onClick={() => setTallaFiltro(tallaFiltro === talla ? "" : talla)}
                    className={`w-10 h-10 text-[10px] font-black border-2 flex items-center justify-center transition-all ${
                      tallaFiltro === talla ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-[#FCD7DE]'
                    }`}
                  >
                    {talla}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* GRID DE PRODUCTOS */}
          <div className="flex-1">
            {loading ? (
               <p className="text-center py-20 text-[10px] font-black uppercase tracking-widest text-black">Cargando Galu Shop...</p>
            ) : productosProcesados.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                {productosProcesados.map((prod) => (
                  <div key={prod.id} className="group flex flex-col">
                    <div className="aspect-[3/4] overflow-hidden bg-gray-50 rounded-none mb-4 relative border border-gray-100">
                      <img 
                        src={prod.imagen_principal} 
                        alt={prod.nombre} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                         {seleccionarId === prod.id ? (
                           <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-3 w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2">
                              <div className="flex justify-between border-b pb-1 border-gray-100">
                                 <span className="text-[9px] font-black uppercase text-black italic">Añadir</span>
                                 <button onClick={() => setSeleccionarId(null)} className="text-black"><X size={14}/></button>
                              </div>

                              {prod.es_ropa && (
                                <select 
                                  value={tallaTemp} 
                                  onChange={(e) => setTallaTemp(e.target.value)} 
                                  className="w-full border-2 border-black p-1 text-[10px] font-black bg-white text-black outline-none"
                                >
                                   <option value="">Talla...</option>
                                   {variantes.map((v:any) => (
                                     <option key={v.id} value={v.variante_atributos[0]?.atributo_valores?.valor}>
                                       {v.variante_atributos[0]?.atributo_valores?.valor}
                                     </option>
                                   ))}
                                </select>
                              )}

                              <div className="flex items-center justify-between border-2 border-black p-1 bg-white">
                                <button onClick={() => setCantTemp(prev => Math.max(1, prev - 1))} className="text-black p-1"><Minus size={12}/></button>
                                <span className="text-[10px] font-black text-black">{cantTemp}</span>
                                <button onClick={() => setCantTemp(prev => prev < (prod.es_ropa ? stockMaximo : 99) ? prev + 1 : prev)} className="text-black p-1"><Plus size={12}/></button>
                              </div>

                              <button 
                                onClick={() => handleConfirmarAdd(prod)} 
                                className="w-full bg-black text-white py-2 text-[9px] font-black uppercase tracking-widest hover:bg-zinc-800"
                              >
                                Confirmar
                              </button>
                           </motion.div>
                         ) : (
                           <div className="flex gap-2">
                             <button 
                                onClick={() => {setSeleccionarId(prod.id); cargarVariantes(prod.id);}} 
                                className="bg-white text-black p-3 rounded-full shadow-md hover:bg-[#FCD7DE] transition-colors border border-black"
                              >
                               <ShoppingCart size={18}/>
                             </button>
                             <Link href={`/producto/${prod.id}`} className="bg-white text-black p-3 rounded-full shadow-md hover:bg-[#FCD7DE] transition-colors border border-black">
                               <Eye size={18}/>
                             </Link>
                           </div>
                         )}
                      </div>
                    </div>

                    <div className="text-center">
                      <h3 className="text-[12px] text-black uppercase font-black tracking-tighter mb-1">{prod.nombre}</h3>
                      <p className="font-black text-base text-black">${Number(prod.precio_base).toLocaleString("es-CO")}</p>
                      <div className="w-8 h-[2px] bg-[#FCD7DE] mx-auto mt-2 transition-all group-hover:w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-black">
                <p className="text-black text-[10px] font-black uppercase tracking-widest">No hay productos en esta categoría.</p>
                <button 
                  onClick={() => {setPrecioMin(""); setPrecioMax(""); setTallaFiltro("");}}
                  className="mt-4 text-[10px] font-black uppercase underline decoration-2 underline-offset-4"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}