import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

export const metadata = {
    title: "Términos y Condiciones | GALU SHOP",
    description: "Lee los términos y condiciones de uso de GALU SHOP.",
};

const sections = [
    {
        title: "1. Aceptación de los Términos",
        content: "Al acceder y realizar compras en GALU SHOP, aceptas estar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de ellos, te pedimos que no utilices nuestros servicios.",
    },
    {
        title: "2. Precios y Pagos",
        content: "Todos los precios están expresados en Pesos Colombianos (COP) e incluyen IVA cuando aplica. Aceptamos pagos por transferencia bancaria (Nequi / Bancolombia). El pedido solo se confirmará una vez hayamos recibido el comprobante de pago. Tienes un plazo de 2 horas desde la realización del pedido para enviar el comprobante, de lo contrario el pedido será cancelado automáticamente.",
    },
    {
        title: "3. Disponibilidad de Productos",
        content: "Todos los productos están sujetos a disponibilidad de inventario. En caso de que un producto no esté disponible luego de realizado el pedido, te contactaremos de inmediato para ofrecerte una alternativa o realizar el reembolso correspondiente.",
    },
    {
        title: "4. Política de Devoluciones y Cambios",
        content: "No realizamos devoluciones en dinero. Sin embargo, puedes solicitar un cambio de artículo por otro de igual o mayor valor (pagando la diferencia). Los cambios aplican únicamente el mismo día de la compra y el producto debe estar en perfectas condiciones, sin uso y con sus etiquetas originales.",
    },
    {
        title: "5. Envíos y Entregas",
        content: "El tiempo de entrega en Valledupar es de aproximadamente 5 a 7 días hábiles. Para el resto del país, los envíos se realizan a través de Interrapidísimo con tiempos variables según la ubicación. Los costos de envío se calculan al momento del pedido según la ciudad de destino.",
    },
    {
        title: "6. Conducta del Usuario",
        content: "Al utilizar nuestros servicios, te comprometes a no realizar ninguna actividad ilegal o fraudulenta, incluyendo la realización de pedidos falsos o el suministro de información incorrecta.",
    },
    {
        title: "7. Modificaciones",
        content: "GALU SHOP se reserva el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigencia inmediatamente después de su publicación en el sitio web.",
    },
];

export default function TerminosPage() {
    return (
        <div className="bg-white min-h-screen" style={{ fontFamily: "Arial, sans-serif" }}>
            <Navbar />

            <main className="max-w-3xl mx-auto px-4 py-20 text-black">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <FileText size={28} className="text-black" />
                    <h1 className="text-2xl font-black uppercase tracking-[0.2em] italic">
                        Términos y Condiciones
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
            </main>

            <Footer />
        </div>
    );
}
