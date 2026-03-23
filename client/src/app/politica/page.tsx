import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldCheck } from "lucide-react";

export const metadata = {
    title: "Política de Privacidad | GALU SHOP",
    description: "Conoce cómo GALU SHOP maneja y protege tu información personal.",
};

const sections = [
    {
        title: "1. Información que Recopilamos",
        content: "Recopilamos la información que nos proporcionas directamente al realizar un pedido, incluyendo tu nombre completo, número de cédula, dirección de correo electrónico, número de teléfono y dirección de entrega. Esta información es necesaria únicamente para procesar y entregar tu pedido.",
    },
    {
        title: "2. Uso de la Información",
        content: "La información recopilada se utiliza exclusivamente para: (a) procesar y entregar tus pedidos, (b) comunicarnos contigo a través de WhatsApp para confirmar tu compra, (c) resolver cualquier inconveniente relacionado con tu pedido. No compartimos tu información con terceros con fines comerciales.",
    },
    {
        title: "3. Protección de Datos",
        content: "Implementamos medidas de seguridad técnicas y organizativas para proteger tu información contra acceso no autorizado, alteración, divulgación o destrucción. Tus datos se transmiten a través de conexiones seguras (HTTPS).",
    },
    {
        title: "4. Cookies",
        content: "Nuestra tienda utiliza cookies técnicas esenciales para el funcionamiento del carrito de compras. No utilizamos cookies de rastreo publicitario ni compartimos datos de navegación con redes publicitarias.",
    },
    {
        title: "5. Tus Derechos",
        content: "De acuerdo con la Ley 1581 de 2012 de Colombia (Habeas Data), tienes derecho a conocer, actualizar, rectificar y suprimir tu información personal. Para ejercer estos derechos, contáctanos a través de contacto@galushop.com.",
    },
    {
        title: "6. Actualizaciones de esta Política",
        content: "Nos reservamos el derecho de modificar esta política en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización correspondiente.",
    },
];

export default function PoliticaPage() {
    return (
        <div className="bg-white min-h-screen" style={{ fontFamily: "Arial, sans-serif" }}>
            <Navbar />

            <main className="max-w-3xl mx-auto px-4 py-20 text-black">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <ShieldCheck size={28} className="text-black" />
                    <h1 className="text-2xl font-black uppercase tracking-[0.2em] italic">
                        Política de Privacidad
                    </h1>
                </div>
                <p className="text-center text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-12">
                    Última actualización: Febrero 2025
                </p>

                <div className="space-y-10">
                    {sections.map((s, i) => (
                        <div key={i} className="border-b border-gray-50 pb-10">
                            <h2 className="text-[12px] font-black uppercase tracking-widest text-black mb-4 italic">
                                {s.title}
                            </h2>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                {s.content}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-6 bg-[#FCD7DE]/30 border border-[#FCD7DE] text-center">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-black">
                        ¿Tienes preguntas sobre nuestra política?
                    </p>
                    <a
                        href="mailto:contacto@galushop.com"
                        className="text-[11px] font-black uppercase underline decoration-2 underline-offset-4 text-black hover:text-gray-500 transition-colors"
                    >
                        contacto@galushop.com
                    </a>
                </div>
            </main>

            <Footer />
        </div>
    );
}
