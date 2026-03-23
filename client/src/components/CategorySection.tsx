"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SkeletonCategoryCircle } from "@/components/SkeletonCard";

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
      <section className="py-16 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="max-w-7xl mx-auto px-2 md:px-4">
          <div className="h-3 w-56 bg-gray-100 rounded mx-auto mb-12 animate-pulse" />
          <div className="grid grid-cols-5 md:flex md:flex-wrap justify-center gap-x-2 gap-y-6 md:gap-14">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCategoryCircle key={i} />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-2 md:px-4">
        <h3 className="text-center text-xs font-black mb-12 tracking-[0.3em] text-black uppercase italic px-4">
          Explora nuestras categorías
        </h3>

        <div className="grid grid-cols-5 md:flex md:flex-wrap justify-center gap-x-2 gap-y-6 md:gap-14">
          {listaCategorias.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="group flex flex-col items-center space-y-2 md:space-y-4"
            >
              {/* Círculo de la imagen con borde Rosa al pasar el mouse */}
              <div className="w-14 h-14 md:w-32 md:h-32 rounded-full overflow-hidden border-2 md:border-4 border-white group-hover:border-[#000000] transition-all duration-500 shadow-sm bg-gray-100 mx-auto">
                <img
                  src={cat.imagen || "/assets/placeholder-cat.webp"}
                  alt={cat.nombre}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>

              {/* Nombre de la categoría */}
              <span className="text-[8px] md:text-[11px] font-black text-black group-hover:text-gray-500 uppercase tracking-widest transition-colors text-center truncate w-full px-1">
                {cat.nombre}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}