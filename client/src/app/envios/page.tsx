import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Truck, MapPin, Clock, Package, AlertCircle } from "lucide-react";

export const metadata = {
    title: "Políticas de Envío | GALU SHOP",
    description: "Conoce los tiempos de entrega, costos y zonas de envío de GALU SHOP.",
};

export default function EnviosPage() {
    return (
        <div className="bg-white min-h-screen" style={{ fontFamily: "Arial, sans-serif" }}>
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-20 text-black">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Truck size={28} className="text-black" />
                    <h1 className="text-2xl font-black uppercase tracking-[0.2em] italic">
                        Políticas de Envío
                    </h1>
                </div>
                <p className="text-center text-gray-500 text-sm mb-16 max-w-xl mx-auto">
                    Hacemos envíos a todo Colombia. Conoce los tiempos y costos según tu ciudad.
                </p>

                {/* Tarjetas de zonas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {/* Valledupar */}
                    <div className="border-2 border-black p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <MapPin size={22} className="text-black flex-shrink-0" />
                            <h2 className="text-[12px] font-black uppercase tracking-widest">Valledupar</h2>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400" />
                                <p className="text-sm text-gray-600 font-medium">5 – 7 días hábiles</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package size={14} className="text-gray-400" />
                                <p className="text-sm font-black text-black">Costo: $6.000 COP</p>
                            </div>
                        </div>
                    </div>

                    {/* Resto de Colombia */}
                    <div className="border-2 border-black p-6 space-y-4 bg-[#FCD7DE]/20">
                        <div className="flex items-center gap-3">
                            <Truck size={22} className="text-black flex-shrink-0" />
                            <h2 className="text-[12px] font-black uppercase tracking-widest">Resto de Colombia</h2>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400" />
                                <p className="text-sm text-gray-600 font-medium">7 – 15 días hábiles</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package size={14} className="text-gray-400" />
                                <p className="text-sm font-black text-black">Costo: A convenir (Interrapidísimo)</p>
                            </div>
                        </div>
                    </div>

                    {/* Pasa y Recoge */}
                    <div className="border-2 border-black p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <MapPin size={22} className="text-black flex-shrink-0" />
                            <h2 className="text-[12px] font-black uppercase tracking-widest">Pasa y Recoge</h2>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400" />
                                <p className="text-sm text-gray-600 font-medium">Según disponibilidad</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package size={14} className="text-gray-400" />
                                <p className="text-sm font-black text-green-600">¡Envío GRATIS!</p>
                            </div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Solo Valledupar</p>
                        </div>
                    </div>
                </div>

                {/* Proceso de envío */}
                <div className="border-t border-gray-100 pt-12 mb-12">
                    <h2 className="text-[13px] font-black uppercase tracking-widest mb-8 italic">¿Cómo funciona el proceso?</h2>
                    <div className="space-y-6">
                        {[
                            { num: "01", title: "Realiza tu Pedido", desc: "Completa el formulario de checkout con tus datos de envío y selecciona tu método de pago." },
                            { num: "02", title: "Envía tu Comprobante", desc: "Tienes 2 horas para enviar el comprobante de pago vía WhatsApp. Sin comprobante, el pedido será cancelado." },
                            { num: "03", title: "Confirmación", desc: "Una vez verificado el pago, recibirás la confirmación de tu pedido y prepararemos tu envío." },
                            { num: "04", title: "Seguimiento", desc: "Te notificaremos por WhatsApp cuando tu pedido sea despachado, junto con el número de guía (aplica para envíos nacionales)." },
                        ].map((paso) => (
                            <div key={paso.num} className="flex gap-6 items-start">
                                <span className="text-3xl font-black text-[#FCD7DE] leading-none flex-shrink-0">{paso.num}</span>
                                <div>
                                    <h3 className="text-[11px] font-black uppercase tracking-widest mb-1">{paso.title}</h3>
                                    <p className="text-sm text-gray-600 font-medium leading-relaxed">{paso.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Nota importante */}
                <div className="bg-orange-50 border border-orange-200 p-6 flex gap-4 items-start">
                    <AlertCircle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-700 mb-2">Nota Importante</h3>
                        <p className="text-sm text-orange-600 leading-relaxed font-medium">
                            Los tiempos de entrega son estimados y pueden variar según la transportadora. GALU SHOP no se hace responsable por retrasos causados por la empresa de mensajería una vez el paquete haya sido despachado.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
