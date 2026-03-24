import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";

export const metadata = {
    title: "Contactos | GALU SHOP",
    description: "Comunícate con GALU SHOP. Estamos listos para ayudarte.",
};

export default function ContactosPage() {
    return (
        <div className="bg-white min-h-screen" style={{ fontFamily: "Arial, sans-serif" }}>
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-20 text-black">
                <h1 className="text-2xl font-black uppercase tracking-[0.2em] italic text-center mb-4">
                    Contáctanos
                </h1>
                <p className="text-center text-gray-500 text-sm mb-16 max-w-xl mx-auto">
                    ¿Tienes alguna pregunta, queja o sugerencia? Estamos aquí para ayudarte. Puedes contactarnos por cualquiera de los siguientes canales.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-20">
                    {/* WhatsApp */}
                    <a
                        href="https://wa.me/573022461068"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col items-center gap-4 border-2 border-black p-8 hover:bg-black transition-all"
                    >
                        <MessageCircle size={36} className="text-black group-hover:text-white group-hover:scale-110 transition-all" />
                        <div className="text-center">
                            <h2 className="text-sm font-black uppercase tracking-widest mb-1 group-hover:text-white">WhatsApp</h2>
                            <p className="text-gray-600 text-sm group-hover:text-white/80">+57 302 246 1068</p>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold group-hover:text-white/60">Haz clic para chatear</p>
                        </div>
                    </a>

                    {/* Correo */}
                    <a
                        href="mailto:contacto@galushop.com"
                        className="group flex flex-col items-center gap-4 border-2 border-black p-8 hover:bg-black transition-all"
                    >
                        <Mail size={36} className="text-black group-hover:text-white group-hover:scale-110 transition-all" />
                        <div className="text-center">
                            <h2 className="text-sm font-black uppercase tracking-widest mb-1 group-hover:text-white">Correo Electrónico</h2>
                            <p className="text-gray-600 text-sm group-hover:text-white/80">contacto@galushop.com</p>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold group-hover:text-white/60">Te respondemos en 24h</p>
                        </div>
                    </a>

                    {/* Teléfono */}
                    <div className="flex flex-col items-center gap-4 border-2 border-black p-8">
                        <Phone size={36} className="text-black" />
                        <div className="text-center">
                            <h2 className="text-sm font-black uppercase tracking-widest mb-1">Teléfono</h2>
                            <p className="text-gray-600 text-sm">+57 300 000 0000</p>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Atención al cliente</p>
                        </div>
                    </div>

                    {/* Ubicación */}
                    <div className="flex flex-col items-center gap-4 border-2 border-black p-8">
                        <MapPin size={36} className="text-black" />
                        <div className="text-center">
                            <h2 className="text-sm font-black uppercase tracking-widest mb-1">Ubicación</h2>
                            <p className="text-gray-600 text-sm">Valledupar, Cesar — Colombia</p>
                        </div>
                    </div>
                </div>

                {/* Horario de Atención */}
                <div className="border-t border-gray-100 pt-12 text-center">
                    <div className="flex justify-center items-center gap-3 mb-6">
                        <Clock size={20} className="text-black" />
                        <h2 className="text-sm font-black uppercase tracking-widest">Horario de Atención</h2>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 font-medium">
                        <p><span className="font-black text-black">Lunes — Viernes:</span> 8:00 AM – 6:00 PM</p>
                        <p><span className="font-black text-black">Sábados:</span> 9:00 AM – 2:00 PM</p>
                        <p><span className="font-black text-black">Domingos y Festivos:</span> Cerrado</p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
