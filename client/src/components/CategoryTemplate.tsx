"use client";
import { useState } from "react";
import { ChevronDown, ArrowUpDown, Filter, X } from "lucide-react";
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
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const FilterContent = () => (
    <div className="flex flex-col h-full bg-white p-6 space-y-10">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black uppercase tracking-tight italic">Filtrar por</h2>
        <button 
          onClick={() => setIsMobileFilterOpen(false)}
          className="md:hidden p-2 hover:bg-gray-100 rounded-full"
        >
          <X size={24} />
        </button>
      </div>

      <button className="text-red-500 font-bold uppercase text-[10px] tracking-widest text-left w-fit border-b border-red-500/20 hover:border-red-500 transition-all">
        Restablecer filtros
      </button>

      {/* Filtro Color */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">Color</h3>
        <div className="space-y-4">
          {["Blanco", "Negro", "Crema", "Lila", "Verde"].map((color) => (
            <label key={color} className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-gray-100 rounded shadow-sm group-hover:border-black" />
                <span className="text-sm font-bold text-gray-700 uppercase">{color}</span>
              </div>
              <div 
                className={`w-4 h-4 rounded-full border border-gray-200 transition-transform group-hover:scale-110`} 
                style={{ 
                  backgroundColor: color === 'Blanco' ? '#fff' : 
                                  color === 'Crema' ? '#fff7ed' : 
                                  color === 'Lila' ? '#d8b4fe' : 
                                  color === 'Negro' ? '#000' :
                                  color === 'Verde' ? '#22c55e' : '#ccc'
                }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Filtro Talla */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">Talla</h3>
        <div className="grid grid-cols-3 gap-3">
          {["L", "M", "S", "XL", "ÚNICA"].map((talla) => (
            <label key={talla} className="cursor-pointer group">
              <input type="checkbox" className="hidden" />
              <div className="border-2 border-gray-100 py-2 text-center text-xs font-bold uppercase transition-all group-hover:border-black peer-checked:bg-black peer-checked:text-white">
                {talla}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6 flex flex-col gap-3">
        <button 
          onClick={() => setIsMobileFilterOpen(false)}
          className="w-full bg-black text-white font-black uppercase tracking-[0.2em] text-[11px] py-4 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800 transition-all"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Drawer Móvil (Left Sidebar) */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isMobileFilterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
        <div className={`absolute left-0 top-0 h-full w-[85%] max-w-[320px] bg-white transition-transform duration-500 ease-out shadow-2xl ${isMobileFilterOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <FilterContent />
        </div>
      </div>

      {/* Encabezado Móvil Mejorado */}
      <div className="md:hidden grid grid-cols-2 gap-px bg-gray-100 border border-gray-100 mb-8 rounded-xl overflow-hidden shadow-sm">
        <button 
          onClick={() => setIsMobileFilterOpen(true)}
          className="flex items-center justify-center gap-2 bg-white px-4 py-4 font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 active:scale-95 transition-all text-black border-r border-gray-100"
        >
          <Filter size={16} /> Filtros
        </button>
        <button className="flex items-center justify-center gap-2 bg-white px-4 py-4 font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 active:scale-95 transition-all text-black">
          Ordenar <ArrowUpDown size={16} />
        </button>
      </div>

      {/* Migas de pan (Desktop) */}
      <div className="hidden md:flex justify-between items-center mb-12 text-[10px] font-black uppercase tracking-widest">
        <nav className="text-gray-400">
          <Link href="/" className="hover:text-black transition-colors">Inicio</Link> 
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-black">{title}</span>
        </nav>
        <div className="flex items-center gap-4">
           <button className="flex items-center gap-2 border-2 border-black rounded-full px-6 py-2 hover:bg-black hover:text-white transition-all font-black">
            Ordenar por: Más vendidos <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-16">
        {/* FILTROS LATERALES DESKTOP */}
        <aside className="hidden md:block w-48 shrink-0">
          <div className="sticky top-24">
             <FilterContent />
          </div>
        </aside>

        {/* CUADRÍCULA DE PRODUCTOS */}
        <div className="flex-1">
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-10 border-b border-gray-100 pb-6 md:block hidden">
            {title}
          </h1>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-12 gap-y-12 mb-20">
            {products.map((prod) => (
              <Link href={`/producto/${prod.id}`} key={prod.id} className="group cursor-pointer">
                <div className="aspect-[3/4] overflow-hidden bg-gray-50 rounded-sm mb-6 relative border border-transparent group-hover:border-black transition-all">
                  <img 
                    src={prod.img} 
                    alt={prod.nombre} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                    <button className="bg-white p-2 rounded-full shadow-lg border border-gray-100 hover:bg-black hover:text-white transition-all">
                      <Filter size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 truncate">{prod.nombre}</h3>
                  <p className="font-black text-sm italic tracking-tight">${prod.precio.toLocaleString("es-CO")}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}