"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Send, Camera, ArrowRight, Instagram, HelpCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function GaluShopper() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  React.useEffect(() => {
    const originalTitle = document.title;
    document.title = "GALU SHOPPER | Nosotros somos tus compradores personales";
    return () => { document.title = originalTitle; };
  }, []);

  const [formData, setFormData] = useState({
    nombre: "",
    whatsapp: "",
    email: "",
    direccion: "",
    producto_link: "",
    talla_color: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imagenUrl = null;

      // 1. Subir imagen si existe
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `encargos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('galu-shopper')
          .upload(filePath, file);

        if (uploadError) {
          // Si el bucket no existe o hay error, intentamos seguir o lanzamos error
          console.error("Error subiendo imagen:", uploadError);
          // Pero para que la experiencia sea fluida, intentaremos seguir
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('galu-shopper')
            .getPublicUrl(filePath);
          imagenUrl = publicUrl;
        }
      }

      // 2. Guardar en base de datos
      const { error: dbError } = await supabase
        .from('cotizaciones')
        .insert([{
          cliente_nombre: formData.nombre,
          whatsapp: formData.whatsapp,
          cliente_email: formData.email,
          direccion: formData.direccion,
          producto_link: formData.producto_link,
          talla_color: formData.talla_color,
          imagen_url: imagenUrl,
          estado: 'Cotizando'
        }]);

      if (dbError) throw dbError;

      setSuccess(true);
      toast("Solicitud enviada correctamente", "success");
    } catch (error: any) {
      console.error("Error en Galu Shopper:", error);
      toast("Hubo un problema al enviar tu solicitud. Intenta de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fcf5e5] font-sans">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-green-500 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-8"
          >
            <CheckCircle size={48} className="text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4">¡RECIBIDO!</h1>
          <p className="text-xl font-bold mb-8 max-w-lg">
            Ya tenemos tu solicitud, {formData.nombre}. Ahora estamos buscando tu producto en China/USA.
            Te escribiremos a <span className="underline">{formData.whatsapp}</span> con tu cotización final en unos minutos.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-10 py-5 font-black uppercase italic border-4 border-black shadow-[8px_8px_0px_0px_rgba(255,105,180,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            Hacer otro encargo
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf5e5] font-sans selection:bg-pink-500 selection:text-white">
      <Navbar />

      {/* HERO SECTION NEOBRUTALISTA */}
      <header className="bg-black text-white pt-20 pb-40 px-6 overflow-hidden relative border-b-8 border-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex-1"
          >
            <span className="inline-block bg-pink-500 text-black px-4 py-1 text-sm font-black uppercase mb-4 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              Nosotros somos tus compradores personales
            </span>
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none mb-6">
              GALU<br />SHOPPER
            </h1>
            <p className="text-xl md:text-2xl font-bold text-zinc-400 max-w-lg mb-8 leading-tight">
              ¿Viste algo en Shein, Temu o Amazon y lo quieres contigo? <span className="text-white">Nosotros traemos por ti</span> con cero riesgo.
            </p>
          </motion.div>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="relative"
          >
            <div className="w-64 h-64 md:w-96 md:h-96 bg-white border-8 border-[#ff4d4d] shadow-[20px_20px_0px_0px_rgba(252,215,222,1)] relative overflow-hidden rotate-3">
              <img
                src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop"
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                alt="Galu Shopper"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-pink-500 text-black p-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -rotate-6 hidden md:block">
              <span className="font-black text-xl italic uppercase tracking-tighter">¡VENDEMOS CON TU IDEA!</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* FORMULARIO NEOBRUTALISTA */}
      <main className="max-w-5xl mx-auto px-6 -mt-20 relative z-10 pb-32">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border-8 border-black p-8 md:p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]"
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <ArrowRight size={14} className="text-pink-500" /> 1. Link o Código del Producto
                </label>
                <input
                  required
                  name="producto_link"
                  value={formData.producto_link}
                  onChange={handleInputChange}
                  placeholder="Ej: vest-12345 o link de temu..."
                  className="w-full bg-[#f3f3f3] border-4 border-black p-4 font-bold text-lg outline-none focus:bg-white focus:shadow-[8px_8px_0px_0px_rgba(255,105,180,1)] transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <ArrowRight size={14} className="text-pink-500" /> 2. Talla y Color exactos
                </label>
                <textarea
                  required
                  name="talla_color"
                  value={formData.talla_color}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Ej: Talla M, Color Fucsia"
                  className="w-full bg-[#f3f3f3] border-4 border-black p-4 font-bold text-lg outline-none focus:bg-white focus:shadow-[8px_8px_0px_0px_rgba(255,105,180,1)] transition-all resize-none"
                />
              </div>

              <div className="p-6 bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black italic uppercase tracking-tighter text-xl mb-2 underline">¿Cómo funciona?</h3>
                <ul className="space-y-2 text-sm font-bold leading-tight">
                  <li>1. Tú nos dices qué quieres (usa el formulario).</li>
                  <li>2. Nosotros cotizamos el valor total (Incl. Impuestos).</li>
                  <li>3. Separas con el 50% vía Llave Bre-B.</li>
                  <li>4. Pagas el resto cuando llegue.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Camera size={14} className="text-pink-500" /> 3. Foto o Captura de Pantalla
                </label>
                <div className="relative h-48 border-4 border-dashed border-black bg-zinc-50 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {file ? (
                    <div className="flex flex-col items-center p-2 text-center">
                      <CheckCircle size={32} className="text-green-600 mb-2" />
                      <span className="font-black text-[10px] uppercase truncate max-w-[200px]">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Camera size={40} className="mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-black text-[10px] uppercase">Haz clic para subir la captura</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest">Nombre Completo</label>
                  <input
                    required
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full bg-[#f3f3f3] border-4 border-black p-4 font-extrabold outline-none focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest">WhatsApp</label>
                    <input
                      required
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                      placeholder="+57..."
                      className="w-full bg-[#f3f3f3] border-4 border-black p-4 font-extrabold outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest">Correo Electrónico</label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="tu@email.com"
                      className="w-full bg-[#f3f3f3] border-4 border-black p-4 font-extrabold outline-none focus:bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest">Dirección de Entrega</label>
                  <input
                    required
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    placeholder="Ej: Calle 123 #45-67 Barrio..."
                    className="w-full bg-[#f3f3f3] border-4 border-black p-4 font-extrabold outline-none focus:bg-white"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-black text-white p-6 md:p-8 font-black uppercase italic text-2xl tracking-tighter border-4 border-black shadow-[10px_10px_0px_0px_rgba(255,105,180,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-4"
              >
                {loading ? "PROCESANDO..." : "SOLICITAR COTIZACIÓN"}
                {!loading && <Send size={24} />}
              </button>
            </div>
          </form>
        </motion.div>

        {/* TEXTO INFORMATIVO INFERIOR */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white border-4 border-black flex items-center justify-center font-black text-xl italic rotate-3 shadow-[4px_4px_0px_0px_rgba(255,77,77,1)]">01</div>
            <h4 className="font-black uppercase tracking-widest text-sm">Cero Complicaciones</h4>
            <p className="text-xs font-bold leading-relaxed opacity-70">
              Olvídate de casilleros internacionales, tarjetas en dólares o problemas de aduana. Tú eliges, nosotros lo traemos hasta tu puerta.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white border-4 border-black flex items-center justify-center font-black text-xl italic -rotate-3 shadow-[4px_4px_0px_0px_rgba(255,255,102,1)]">02</div>
            <h4 className="font-black uppercase tracking-widest text-sm">Precios Reales</h4>
            <p className="text-xs font-bold leading-relaxed opacity-70">
              Cotizamos con el valor real del mercado e impuestos incluidos. Sin sorpresas al final. Lo que te decimos es lo que pagas.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white border-4 border-black flex items-center justify-center font-black text-xl italic rotate-6 shadow-[4px_4px_0px_0px_rgba(105,255,180,1)]">03</div>
            <h4 className="font-black uppercase tracking-widest text-sm">Garantía Galu</h4>
            <p className="text-xs font-bold leading-relaxed opacity-70">
              Tienes el respaldo de GALU SHOP. Si el producto no llega o hay algún problema de nuestra parte, tu dinero está 100% asegurado.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
