"use client";
import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Truck, Star, RefreshCw } from "lucide-react";

export default function BrandTrustSection() {
  return (
    <section className="py-20 bg-black text-white overflow-hidden border-y-4 border-black">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Item 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center space-y-4 group"
          >
            <div className="bg-white/10 p-5 rounded-full ring-1 ring-white/20 group-hover:bg-yellow-400 group-hover:text-black transition-all duration-500">
                <ShieldCheck size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] italic">Seguridad Galu</h3>
                <p className="text-gray-400 text-[9px] leading-relaxed uppercase">Protegemos tus datos y garantizamos transacciones 100% confiables en cada compra.</p>
            </div>
          </motion.div>

          {/* Item 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center text-center space-y-4 group"
          >
            <div className="bg-white/10 p-5 rounded-full ring-1 ring-white/20 group-hover:bg-yellow-400 group-hover:text-black transition-all duration-500">
                <Truck size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] italic">Envío Express</h3>
                <p className="text-gray-400 text-[9px] leading-relaxed uppercase">Tu mundo llega rápido. Entregas en 24h para Valledupar y envíos nacionales seguros.</p>
            </div>
          </motion.div>

          {/* Item 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center text-center space-y-4 group"
          >
            <div className="bg-white/10 p-5 rounded-full ring-1 ring-white/20 group-hover:bg-yellow-400 group-hover:text-black transition-all duration-500">
                <Star size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] italic">Calidad Selecta</h3>
                <p className="text-gray-400 text-[9px] leading-relaxed uppercase">Curamos cada producto para asegurar que recibas solo lo mejor de las tendencias actuales.</p>
            </div>
          </motion.div>

          {/* Item 4 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center text-center space-y-4 group"
          >
            <div className="bg-white/10 p-5 rounded-full ring-1 ring-white/20 group-hover:bg-yellow-400 group-hover:text-black transition-all duration-500">
                <RefreshCw size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] italic">Soporte Continuo</h3>
                <p className="text-gray-400 text-[9px] leading-relaxed uppercase">Estamos para ayudarte. Contacto humano y rápido para cualquier duda que tengas.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
