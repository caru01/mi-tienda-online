"use client";
import { useState } from "react";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import Link from "next/link";

interface Product {
  id: number;
  nombre: string;
  precio: number;
  img: string;
  colores: string[];
  tallas: string[];
}

export default function CategoryTemplate({ title, products }: { title: string, products: Product[] }) {
  const [selectedColor, setSelectedColor] = useState("");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Migas de pan y Ordenar */}
      <div className="flex justify-between items-center mb-10 text-sm">
        <nav className="text-gray-500">
          Inicio &gt; <span className="text-black font-medium">{title}</span>
        </nav>
        <button className="flex items-center gap-2 border rounded-lg px-4 py-2 hover:bg-gray-50">
          Más vendidos <ArrowUpDown size={16} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-12">
        {/* FILTROS LATERALES */}
        <aside className="w-full md:w-48 space-y-10">
          <div>
            <h2 className="text-xl font-bold mb-6">Filtrar por</h2>
            
            {/* Filtro Color */}
            <div className="mb-8">
              <h3 className="font-bold mb-4">Color</h3>
              <div className="space-y-3">
                {["Blanco", "Negro", "Rosado", "Lila", "Verde"].map((color) => (
                  <label key={color} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border rounded shadow-sm group-hover:border-black" />
                      <span className="text-gray-600">{color}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full border border-gray-200 bg-${color === 'Blanco' ? 'white' : color === 'Rosado' ? 'pink-300' : color === 'Lila' ? 'purple-300' : color.toLowerCase() + '-500'}`} 
                         style={{backgroundColor: color === 'Lila' ? '#d8b4fe' : color === 'Rosado' ? '#f9a8d4' : ''}}/>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro Talla */}
            <div>
              <h3 className="font-bold mb-4">Talla</h3>
              <div className="space-y-3">
                {["L", "M", "S"].map((talla) => (
                  <label key={talla} className="flex items-center gap-3 cursor-pointer">
                    <div className="w-4 h-4 border rounded" />
                    <span className="text-gray-600 uppercase">{talla}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* CUADRÍCULA DE PRODUCTOS */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.map((prod) => (
            <Link href={`/producto/${prod.id}`} key={prod.id} className="group cursor-pointer">
              <div className="aspect-[3/4] overflow-hidden bg-gray-100 rounded-sm mb-4">
                <img 
                  src={prod.img} 
                  alt={prod.nombre} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-gray-700 font-light">{prod.nombre}</h3>
                <p className="font-bold text-lg">${prod.precio.toLocaleString("es-CO")}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}