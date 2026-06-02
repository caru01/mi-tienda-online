import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#FCD7DE] text-black pt-12 pb-6 border-t border-[#fbc2cc]">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
        
        {/* SECCIÓN 1: GALU SHOP & REDES */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black italic tracking-tighter">
            GALU SHOP
          </h2>
          <p className="text-gray-800 text-sm leading-relaxed">
            Tu tienda de confianza para encontrar lo último en tendencia y estilo. Calidad garantizada en cada prenda.
          </p>
          <div className="flex space-x-4 pt-2">
            <a href="#" className="text-black hover:opacity-60 transition"><Facebook size={20} /></a>
            <a href="#" className="text-black hover:opacity-60 transition"><Instagram size={20} /></a>
            <a href="#" className="text-black hover:opacity-60 transition"><Twitter size={20} /></a>
          </div>
        </div>

        {/* SECCIÓN 2: CATEGORÍAS */}
        <div>
          <h3 className="text-sm font-black mb-4 uppercase tracking-[0.2em]">Categorías</h3>
          <ul className="space-y-2 text-sm text-gray-700 font-medium">
            <li><Link href="/categoria/ropa-interior" className="hover:underline transition">Ropa Interior & Pijamas</Link></li>
            <li><Link href="/categoria/shorts" className="hover:underline transition">Shorts</Link></li>
            <li><Link href="/categoria/blusas" className="hover:underline transition">Blusas</Link></li>
            <li><Link href="/categoria/jeans" className="hover:underline transition">Jeans</Link></li>
            <li><Link href="/categoria/conjuntos" className="hover:underline transition">Conjuntos</Link></li>
          </ul>
        </div>

        {/* SECCIÓN 3: CONTÁCTANOS */}
        <div>
          <h3 className="text-sm font-black mb-4 uppercase tracking-[0.2em]">Contáctanos</h3>
          <ul className="space-y-3 text-sm text-gray-700 font-medium">
            <li className="flex items-center gap-3">
              <Phone size={16} className="text-black" />
              <span>+57 300 000 0000</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={16} className="text-black" />
              <span>contacto@galushop.com</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin size={16} className="text-black" />
              <span>Valledupar, Cesar - Colombia</span>
            </li>
          </ul>
        </div>

        {/* SECCIÓN 4: LEGAL / EXTRA */}
        <div>
          <h3 className="text-sm font-black mb-4 uppercase tracking-[0.2em]">Información</h3>
          <ul className="space-y-2 text-sm text-gray-700 font-medium">
            <li><Link href="/politica" className="hover:underline transition">Política de Privacidad</Link></li>
            <li><Link href="/terminos" className="hover:underline transition">Términos y Condiciones</Link></li>
            <li><Link href="/envios" className="hover:underline transition">Políticas de Envío</Link></li>
          </ul>
        </div>
      </div>

      {/* --- COPYRIGHT --- */}
      <div className="mt-12 pt-6 border-t border-[#fbc2cc] text-center text-black/60 text-[10px] font-bold uppercase tracking-widest">
        <p>&copy; {currentYear} GALU SHOP. Todos los derechos reservados.</p>
        <p className="mt-1">Hecho con amor para ti</p>
      </div>
    </footer>
  );
}