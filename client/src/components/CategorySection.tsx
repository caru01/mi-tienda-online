"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CategorySection() {
  // Estado para almacenar las categorías de la base de datos
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Función para obtener los datos de Supabase
  const obtenerCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('activa', true) // Solo traemos las categorías marcadas como activas
        .order('nombre', { ascending: true });

      if (error) throw error;
      if (data) setListaCategorias(data);
    } catch (error) {
      console.error("Error cargando categorías:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerCategorias();
  }, []);

  if (cargando) {
    return (
      <div className="py-10 text-center text-[10px] font-black uppercase tracking-widest">
        Cargando categorías...
      </div>
    );
  }

  return (
    <section className="py-16 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-center text-xs font-black mb-12 tracking-[0.3em] text-black uppercase italic">
          Explora nuestras categorías
        </h3>
        
        <div className="flex flex-wrap justify-center gap-8 md:gap-14">
          {listaCategorias.map((cat) => (
            <Link 
              key={cat.id} 
              // Usamos la columna 'slug' de la nueva base de datos para rutas profesionales
              href={`/categoria/${cat.slug}`}
              className="group flex flex-col items-center space-y-4"
            >
              {/* Círculo de la imagen con borde Rosa al pasar el mouse */}
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white group-hover:border-[#FCD7DE] transition-all duration-500 shadow-sm bg-gray-100">
                <img 
                  // Mapeamos 'imagen' que es el nombre de la columna en tu nueva estructura SQL
                  src={cat.imagen || "/assets/placeholder-cat.webp"} 
                  alt={cat.nombre} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              
              {/* Nombre de la categoría en Arial Negro */}
              <span className="text-[11px] font-black text-black group-hover:text-gray-500 uppercase tracking-widest transition-colors">
                {cat.nombre}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}