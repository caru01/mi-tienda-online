"use client";
import React, { useState, useEffect } from "react";
import { ShoppingBag, ChevronDown, HelpCircle, ChevronRight, Menu, X, Star, Home, Search, Package } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import AnnouncementBar from "@/components/AnnouncementBar";

export default function Navbar() {
  const { totalItems, setIsOpen } = useCart();
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  const [categoriasConProductos, setCategoriasConProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado del menú móvil
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catExpandida, setCatExpandida] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const { data: cats, error: errCats } = await supabase
          .from('categorias')
          .select('id, nombre, slug')
          .eq('activa', true)
          .order('nombre', { ascending: true });

        const { data: prods, error: errProds } = await supabase
          .from('productos')
          .select('id, nombre, categoria_id, imagen_principal')
          .eq('activo', true);

        if (errCats || errProds) throw errCats || errProds;

        const menuData = cats.map(cat => ({
          ...cat,
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

  // Bloquea el scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const closeMobile = () => {
    setMobileOpen(false);
    setCatExpandida(null);
  };

  return (
    <nav className="w-full shadow-md relative z-50">
      {/* ── BARRA SUPERIOR DE ANUNCIOS ── */}
      <AnnouncementBar />

      {/* --- BARRA PRINCIPAL: LOGO, BUSCADOR, ICONOS --- */}
      <div className="bg-white border-b border-black/10 py-5 px-8 flex items-center justify-between gap-4 md:gap-8">

        {/* Hamburguesa (solo móvil) */}
        <button
          className="md:hidden text-black p-1 flex-shrink-0"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={28} />
        </button>

        {/* Logo */}
        <div className="text-black text-3xl font-black tracking-tighter italic whitespace-nowrap">
          GALU SHOP
        </div>

        {/* Buscador (oculto en móvil muy pequeño, visible en md+) */}
        <div className="hidden md:block flex-1">
          <SearchBar />
        </div>

        {/* Iconos derecha */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
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

      {/* Buscador en móvil (debajo del header) */}
      <div className="md:hidden bg-white border-b border-black/10 px-4 pb-4">
        <SearchBar />
      </div>

      {/* --- MENÚ DESKTOP: NAVEGACIÓN INFERIOR --- */}
      <div className="hidden md:flex bg-white border-b border-black/10 py-3 px-8 justify-center space-x-10 text-[11px] font-black tracking-[0.2em] text-black">
        <Link href="/" className="hover:bg-gray-800 hover:text-white transition-all uppercase px-3 py-1.5 rounded-md">Inicio</Link>

        {/* Mega-menú Categoría */}
        <div className="relative group">
          <button className="flex items-center gap-1 hover:bg-gray-800 hover:text-white transition-all uppercase outline-none px-3 py-1.5 rounded-md">
            Categoría <ChevronDown size={14} />
          </button>

          <div className="absolute left-0 mt-0 w-64 bg-white shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 border-t-2 border-black">
            <div className="flex flex-col py-2">
              {categoriasConProductos.map((cat) => (
                <div key={cat.id} className="relative group/sub">
                  <Link
                    href={`/categoria/${cat.slug}`}
                    className="flex justify-between items-center px-4 py-3 text-[10px] font-bold hover:bg-zinc-100 transition-colors border-b border-gray-50 uppercase text-black"
                  >
                    {cat.nombre}
                    <ChevronRight size={12} className="text-gray-400" />
                  </Link>

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
                            <span className="text-[10px] font-bold text-black group-hover/prod:underline decoration-2 underline-offset-4 truncate uppercase">
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

        <Link href="/contactos" className="hover:bg-gray-800 hover:text-white transition-all uppercase px-3 py-1.5 rounded-md">Contactos</Link>
        <Link href="/politica" className="hover:bg-gray-800 hover:text-white transition-all uppercase px-3 py-1.5 rounded-md">Política</Link>
        <Link
          href="/club"
          className="relative flex items-center gap-1.5 uppercase font-black tracking-[0.2em] transition-all group"
          style={{ color: '#c7963c' }}
        >
          <Star size={12} className="fill-current" />
          Club Galu
        </Link>

        {/* GALU SHOPPER - Personal Shopper */}
        <Link
          href="/galu-shopper"
          className="relative flex items-center gap-1.5 uppercase font-black tracking-[0.2em] transition-all group"
          style={{ color: '#ff4d4d' }}
        >
          <Package size={12} strokeWidth={3} />
          Galu Shopper
          <span className="absolute -top-3 -right-4 bg-black text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">
             ENCARGOS
          </span>
        </Link>
      </div>

      {/* --- MENÚ MÓVIL: DRAWER LATERAL --- */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
            onClick={closeMobile}
          />

          {/* Panel lateral */}
          <div className="fixed top-0 left-0 h-full w-80 max-w-[90vw] bg-white z-[100] flex flex-col shadow-2xl">
            {/* Cabecera del drawer */}
            <div className="bg-white border-b border-black/10 p-6 flex justify-between items-center">
              <span className="text-xl font-black italic tracking-tighter">GALU SHOP</span>
              <button onClick={closeMobile} className="text-black hover:rotate-90 transition-transform duration-300">
                <X size={24} />
              </button>
            </div>

            {/* Links del menú */}
            <div className="flex-1 overflow-y-auto py-4">
              <Link
                href="/"
                onClick={closeMobile}
                className="flex items-center px-6 py-4 text-[12px] font-black uppercase tracking-widest text-black hover:bg-zinc-100 transition-colors border-b border-gray-50"
              >
                Inicio
              </Link>

              {/* Categorías desplegables */}
              <div className="border-b border-gray-50">
                <button
                  onClick={() => setCatExpandida(catExpandida === "categorias" ? null : "categorias")}
                  className="w-full flex justify-between items-center px-6 py-4 text-[12px] font-black uppercase tracking-widest text-black hover:bg-zinc-100 transition-colors"
                >
                  Categorías
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 ${catExpandida === "categorias" ? "rotate-180" : ""}`}
                  />
                </button>

                {catExpandida === "categorias" && (
                  <div className="bg-gray-50 py-2">
                    {categoriasConProductos.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/categoria/${cat.slug}`}
                        onClick={closeMobile}
                        className="flex items-center px-8 py-3 text-[11px] font-bold uppercase tracking-widest text-black hover:bg-zinc-100 transition-colors"
                      >
                        <ChevronRight size={12} className="mr-2 text-gray-400" />
                        {cat.nombre}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/contactos"
                onClick={closeMobile}
                className="flex items-center px-6 py-4 text-[12px] font-black uppercase tracking-widest text-black hover:bg-zinc-100 transition-colors border-b border-gray-50"
              >
                Contactos
              </Link>
              <Link
                href="/politica"
                onClick={closeMobile}
                className="flex items-center px-6 py-4 text-[12px] font-black uppercase tracking-widest text-black hover:bg-zinc-100 transition-colors border-b border-gray-50"
              >
                Política
              </Link>
              <Link
                href="/club"
                onClick={closeMobile}
                className="flex items-center justify-between px-6 py-4 text-[12px] font-black uppercase tracking-widest border-b border-gray-50 hover:bg-amber-50 transition-colors"
                style={{ color: '#b8862e' }}
              >
                <span className="flex items-center gap-2">
                  <Star size={14} className="fill-current" />
                  Club Galu
                </span>
              </Link>
              <Link
                href="/galu-shopper"
                onClick={closeMobile}
                className="flex items-center justify-between px-6 py-4 text-[12px] font-black uppercase tracking-widest border-b border-gray-50 hover:bg-red-50 transition-colors"
                style={{ color: '#ff4d4d' }}
              >
                <span className="flex items-center gap-2">
                  <Package size={14} strokeWidth={3} />
                  Galu Shopper
                </span>
                <span className="bg-black text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                  Traemos por Ti
                </span>
              </Link>
              <Link
                href="/terminos"
                onClick={closeMobile}
                className="flex items-center px-6 py-4 text-[12px] font-black uppercase tracking-widest text-black hover:bg-zinc-100 transition-colors border-b border-gray-50"
              >
                Términos
              </Link>
              <Link
                href="/envios"
                onClick={closeMobile}
                className="flex items-center px-6 py-4 text-[12px] font-black uppercase tracking-widest text-black hover:bg-zinc-100 transition-colors"
              >
                Envíos
              </Link>
            </div>

            {/* Footer del drawer - WhatsApp */}
            <div className="p-6 border-t border-gray-100">
              <a
                href="https://wa.me/573022461068"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
              >
                <HelpCircle size={16} />
                ¿Necesitas Ayuda?
              </a>
            </div>
          </div>
        </>
      )}

      {/* --- BOTTOM APP BAR (SOLO MÓVIL Y NO EN ADMIN) --- */}
      {!isAdminPage && (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-black/10 flex justify-around items-center py-2 px-1 z-[110] shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-black hover:text-gray-500 transition-colors w-1/4">
            <Home size={22} className="stroke-[1.5]" />
            <span className="text-[8px] font-black uppercase tracking-widest leading-none mt-1">Inicio</span>
          </Link>
          <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-1 p-2 text-black hover:text-gray-500 transition-colors w-1/4">
            <Search size={22} className="stroke-[1.5]" />
            <span className="text-[8px] font-black uppercase tracking-widest leading-none mt-1">Catálogo</span>
          </button>
          <button onClick={() => setIsOpen(true)} className="flex flex-col items-center gap-1 p-2 text-black hover:text-gray-500 transition-colors relative w-1/4">
            <div className="relative">
               <ShoppingBag size={22} className="stroke-[1.5]" />
               <span className="absolute -top-1.5 -right-2 bg-black text-white text-[9px] font-bold px-1 rounded-full min-w-[16px] h-[16px] flex items-center justify-center border border-white">
                   {totalItems}
               </span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest leading-none mt-1">Bolsa</span>
          </button>
          <Link href="/club" className="flex flex-col items-center gap-1 p-2 text-[#c7963c] hover:text-amber-600 transition-colors relative w-1/4">
            <div className="relative">
               <Star size={22} className="fill-current stroke-none" />
               <span className="absolute top-0 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest leading-none mt-1">Club</span>
          </Link>
        </div>
      )}
    </nav>
  );
}