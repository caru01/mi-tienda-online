"use client";
import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, ChevronDown, HelpCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const { totalItems, setIsOpen } = useCart();
  
  // --- ESTADOS PARA DATOS DINÁMICOS ---
  const [categoriasConProductos, setCategoriasConProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- CARGA DE DATOS (CATEGORÍAS + PRODUCTOS) ---
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        // 1. Traemos categorías (con la nueva estructura profesional)
        const { data: cats, error: errCats } = await supabase
          .from('categorias')
          .select('id, nombre, slug') // Agregamos slug para las URLs
          .eq('activa', true) // Solo categorías activas
          .order('nombre', { ascending: true });

        // 2. Traemos productos (Usando categoria_id de la nueva estructura)
        const { data: prods, error: errProds } = await supabase
          .from('productos')
          .select('id, nombre, categoria_id, imagen_principal') // imagen_principal es el nuevo nombre
          .eq('activo', true); // Solo productos activos

        if (errCats || errProds) throw errCats || errProds;

        // 3. Cruzamos la información por ID (Lógica profesional)
        const menuData = cats.map(cat => ({
          ...cat,
          // Filtramos productos que pertenezcan a esta categoría por su ID
          productos: prods.filter(p => p.categoria_id === cat.id)
        }));

        setCategoriasConProductos(menuData);
      } catch (error) {
        console.error("Error cargando menú:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  return (
    <nav className="w-full shadow-md" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* --- NIVEL MEDIO: LOGO Y BUSCADOR --- */}
      <div className="bg-[#FCD7DE] py-5 px-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-black text-3xl font-black tracking-tighter italic whitespace-nowrap">
          GALU SHOP
        </div>

        <div className="relative w-full max-w-4xl mx-auto"> 
          <input
            type="text"
            placeholder="¿Qué estás buscando hoy?"
            className="w-full bg-white border border-transparent text-black rounded-full py-2.5 px-6 pr-12 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all placeholder:text-gray-400 text-sm"
            style={{ fontFamily: 'Arial, sans-serif' }}
          />
          <Search className="absolute right-5 top-2.5 text-gray-400" size={20} />
        </div>
        
        <div className="flex items-center justify-end gap-2 md:w-[180px]">
          <a 
            href="https://wa.me/573022461068" 
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-black hover:opacity-70 transition-colors flex flex-col items-center"
            title="Ayuda"
          >
            <HelpCircle size={28} />
            <span className="text-[8px] font-black uppercase mt-0.5">Ayuda</span>
          </a>

          <button 
            onClick={() => setIsOpen(true)} 
            className="relative p-2 text-black hover:opacity-70 transition-colors flex flex-col items-center"
          >
            <div className="relative">
              <ShoppingBag size={28} />
              <span className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold px-1.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center translate-x-1/4 -translate-y-1/4">
                {totalItems}
              </span>
            </div>
            <span className="text-[8px] font-black uppercase mt-0.5">Bolsa</span>
          </button>
        </div>
      </div>

      {/* --- NIVEL INFERIOR: MENÚ DE NAVEGACIÓN --- */}
      <div className="bg-[#FCD7DE] py-3 px-8 flex justify-center space-x-10 text-[11px] font-black tracking-[0.2em] text-black border-t border-black/5">
        <Link href="/" className="hover:text-white transition-colors uppercase">Inicio</Link>
        
        {/* MENÚ CATEGORÍA CON MEGA-DESPLEGABLE DINÁMICO */}
        <div className="relative group">
          <button className="flex items-center gap-1 hover:text-white transition-colors uppercase outline-none" style={{ fontFamily: 'Arial, sans-serif' }}>
            Categoría <ChevronDown size={14} />
          </button>
          
          {/* Contenedor Principal del Desplegable */}
          <div className="absolute left-0 mt-0 w-64 bg-white shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 border-t-2 border-black">
            <div className="flex flex-col py-2">
              {categoriasConProductos.map((cat) => (
                <div key={cat.id} className="relative group/sub">
                  {/* Item de Categoría usando el SLUG de la nueva BD */}
                  <Link 
                    href={`/categoria/${cat.slug}`} 
                    className="flex justify-between items-center px-4 py-3 text-[10px] font-bold hover:bg-[#FCD7DE] transition-colors border-b border-gray-50 uppercase text-black"
                  >
                    {cat.nombre}
                    <ChevronRight size={12} className="text-gray-400" />
                  </Link>

                  {/* SUB-DESPLEGABLE DE PRODUCTOS */}
                  <div className="absolute left-full top-0 w-72 bg-white shadow-2xl border-l border-gray-100 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all duration-200 p-4 z-[60]">
                    <h4 className="text-[9px] font-black text-gray-400 mb-4 tracking-widest uppercase border-b pb-2">
                      Productos en {cat.nombre}
                    </h4>
                    <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {cat.productos && cat.productos.length > 0 ? (
                        cat.productos.map((prod: any) => (
                          <Link 
                            key={prod.id} 
                            href={`/producto/${prod.id}`}
                            className="flex items-center gap-3 group/prod p-1 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-10 h-12 bg-gray-100 overflow-hidden rounded-sm">
                              <img src={prod.imagen_principal} className="w-full h-full object-cover" alt={prod.nombre} />
                            </div>
                            <span className="text-[10px] font-bold text-black group-hover/prod:text-pink-500 truncate uppercase">
                              {prod.nombre}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <span className="text-[9px] text-gray-400 italic">No hay productos aún</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Link href="/contactos" className="hover:text-white transition-colors uppercase">Contactos</Link>
        <Link href="/politica" className="hover:text-white transition-colors uppercase">Política</Link>
      </div>
    </nav>
  );
}