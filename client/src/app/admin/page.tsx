"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Tag, Plus, Save, Hash, Wifi, WifiOff, ListOrdered, Star, ExternalLink,
  Pencil, Check, X, Layers, Settings, Trash2, Search, ChevronLeft, Ticket, ShoppingBag,
  Image as ImageIcon, Menu, Activity, MapPin, TrendingUp, BarChart3, Globe, MousePointer2,
  Trash
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listaProductos, setListaProductos] = useState<any[]>([]);
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);
  const [listaAtributos, setListaAtributos] = useState<any[]>([]);
  const [listaPedidos, setListaPedidos] = useState<any[]>([]);
  const [listaResenas, setListaResenas] = useState<any[]>([]);
  const [listaConfig, setListaConfig] = useState<any[]>([]);
  const [listaBanners, setListaBanners] = useState<any[]>([]);
  const [listaVisitas, setListaVisitas] = useState<any[]>([]);
  const [filtroAnalitica, setFiltroAnalitica] = useState('7_dias');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // --- ESTADOS PARA CUPONES ---
  const [listaCupones, setListaCupones] = useState<any[]>([]);
  const [nuevoCupon, setNuevoCupon] = useState({
    codigo: "",
    tipo: "porcentaje",
    valor: "",
    uso_maximo: "",
    activo: true
  });

  // --- ESTADOS PARA EDICIÓN ---
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tempProducto, setTempProducto] = useState<any>(null);

  // --- ESTADOS PARA INVENTARIO PRO ---
  const [productoInventario, setProductoInventario] = useState<any>(null);
  const [variantesProducto, setVariantesProducto] = useState<any[]>([]);
  const [nuevaVariante, setNuevaVariante] = useState({ sku: "", stock: 0, valor_id: "" });

  // --- ESTADOS PARA MODAL ATRIBUTOS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [atributoSeleccionado, setAtributoSeleccionado] = useState<any>(null);
  const [nuevoValorAtributo, setNuevoValorAtributo] = useState("");

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "", precio_base: "", categoria_id: "", imagen_principal: "",
    descripcion: "", es_ropa: true, destacado: false, stock: 0
  });

  // --- ESTADOS PARA ATRIBUTOS VISUALES ---
  const [nuevoHexAtributo, setNuevoHexAtributo] = useState("#000000");
  const [seleccionMultipleColores, setSeleccionMultipleColores] = useState<string[]>([]);
  const [seleccionMultipleTallas, setSeleccionMultipleTallas] = useState<string[]>([]);
  const [isMatrixGenerating, setIsMatrixGenerating] = useState(false);

  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: "", slug: "", imagen: "" });
  const [imagenFileCat, setImagenFileCat] = useState<File | null>(null);
  const [imagenFileProd, setImagenFileProd] = useState<File | null>(null);
  const [nuevoAtributo, setNuevoAtributo] = useState("");

  const [nuevoBanner, setNuevoBanner] = useState({
    titulo: "", subtitulo: "", imagen_url: "", imagen_movil: "", enlace: "", activo: true, orden: 0
  });

  const cargarTodo = async () => {
    setLoading(true);
    await Promise.all([
      cargarProductos(),
      cargarCategorias(),
      cargarAtributos(),
      cargarCupones(),
      cargarPedidos(),
      cargarResenas(),
      cargarConfig(),
      cargarBanners(),
      cargarAnalitica()
    ]);
    setLoading(false);
  };

  const cargarAtributos = async () => {
    const { data } = await supabase.from('atributos').select('*, atributo_valores(*)');
    if (data) setListaAtributos(data);
  };

  const cargarProductos = async () => {
    const { data } = await supabase.from('productos').select('*, categorias(nombre)').order('created_at', { ascending: false });
    if (data) setListaProductos(data);
  };

  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });
    if (data) setListaCategorias(data);
  };

  const cargarVariantes = async (prodId: string) => {
    const { data } = await supabase
      .from('variantes_producto')
      .select('*, variante_atributos(atributo_valores(valor))')
      .eq('producto_id', prodId);
    if (data) setVariantesProducto(data);
  };

  const cargarCupones = async () => {
    const { data } = await supabase
      .from('cupones')
      .select('*, cupon_uso(pedido_id, cliente_email, fecha_uso)')
      .order('created_at', { ascending: false });
    if (data) setListaCupones(data);
  };

  // --- NUEVA FUNCIÓN: CARGAR PEDIDOS ---
  const cargarPedidos = async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, pedido_items(*)')
      .order('created_at', { ascending: false });
    if (data) setListaPedidos(data);
  };

  const cargarResenas = async () => {
    const { data } = await supabase
      .from('resenas')
      .select('*, productos(nombre)')
      .order('created_at', { ascending: false });
    if (data) setListaResenas(data);
  };

  const cargarConfig = async () => {
    const { data } = await supabase.from('configuracion').select('*').order('clave', { ascending: true });
    if (data) setListaConfig(data);
  };

  const actualizarConfig = async (clave: string, valor: string) => {
    await supabase.from('configuracion').update({ valor }).eq('clave', clave);
    cargarConfig();
  };

  const cargarBanners = async () => {
    const { data } = await supabase.from('banners').select('*').order('orden', { ascending: true });
    if (data) setListaBanners(data);
  };

  const cargarAnalitica = async (filtro = filtroAnalitica) => {
    let query = supabase.from('analitica_visitas').select('*').order('created_at', { ascending: false });

    const ahora = new Date();
    if (filtro === 'hoy') {
      const hoy = new Date(ahora.setHours(0, 0, 0, 0)).toISOString();
      query = query.gt('created_at', hoy);
    } else if (filtro === 'ayer') {
      const ayerInicio = new Date(new Date().setDate(new Date().getDate() - 1));
      ayerInicio.setHours(0,0,0,0);
      const ayerFin = new Date(ayerInicio);
      ayerFin.setHours(23,59,59,999);
      query = query.gt('created_at', ayerInicio.toISOString()).lt('created_at', ayerFin.toISOString());
    } else if (filtro === '7_dias') {
      const semana = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString();
      query = query.gt('created_at', semana);
    } // 'mes' es el default con el limit

    const { data } = await query.limit(1000);
    if (data) setListaVisitas(data);
  };

  const alternarAprobacionResena = async (id: string, actual: boolean) => {
    await supabase.from('resenas').update({ aprobada: !actual }).eq('id', id);
    cargarResenas();
  };

  const eliminarResena = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta reseña?")) {
      await supabase.from('resenas').delete().eq('id', id);
      cargarResenas();
    }
  };

  useEffect(() => {
    // Verificar sesión al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarTodo();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) cargarTodo();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) setLoginError(error.message);
    setLoginLoading(false);
  };

  // --- LÓGICA DE BANNERS ---
  const crearBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('banners').insert([nuevoBanner]);
      if (error) throw error;
      alert("Banner creado correctamente");
      setNuevoBanner({ titulo: "", subtitulo: "", imagen_url: "", imagen_movil: "", enlace: "", activo: true, orden: 0 });
      cargarBanners();
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const eliminarBanner = async (id: string) => {
    if (!confirm("¿Eliminar este banner de la base de datos?\nEsta acción no se puede deshacer.")) return;
    await supabase.from('banners').delete().eq('id', id);
    cargarBanners();
  };

  const alternarBanner = async (id: string, activo: boolean) => {
    await supabase.from('banners').update({ activo: !activo }).eq('id', id);
    cargarBanners();
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-full max-w-sm bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-3xl font-black uppercase italic text-center mb-8">GALU ADMIN</h2>
          {loginError && <p className="text-red-500 text-xs font-bold mb-4 text-center border border-red-500 p-2">{loginError}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">Email</label>
              <input
                type="email" required
                className="w-full p-3 border-2 border-black font-bold outline-none text-black"
                value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase mb-1">Contraseña</label>
              <input
                type="password" required
                className="w-full p-3 border-2 border-black font-bold outline-none text-black"
                value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
              />
            </div>
            <button
              type="submit" disabled={loginLoading}
              className="w-full bg-black text-white py-4 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all mt-4 disabled:opacity-50"
            >
              {loginLoading ? "Entrando..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- LÓGICA DE PEDIDOS ---
  const actualizarEstadoPedido = async (pedido: any, nuevoEstado: string) => {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedido.id);

    if (!error) {
      cargarPedidos();

      if (nuevoEstado === "enviado") {
        try {
          const emailLower = pedido.cliente_email.toLowerCase().trim();
          // Obtener nivel actual del cliente
          const { data: cliente } = await supabase.from('clientes').select('total_gastado').eq('email', emailLower).single();
          let nivel = "Bronce";
          if (cliente) {
            const gasto = Number(cliente.total_gastado);
            if (gasto >= 500000) nivel = "Oro";
            else if (gasto >= 200000) nivel = "Plata";
          }

          // Obtener puntos de ese pedido
          const { data: puntosReq } = await supabase.from('puntos_cliente').select('puntos').eq('pedido_id', pedido.id).eq('tipo', 'ganado').single();

          const primerNombre = pedido.cliente_nombre.split(' ')[0].toUpperCase();
          let msg = `¡Hola ${primerNombre}! GALU SHOP te informa que tu pedido *#${String(pedido.numero_pedido).padStart(4, '0')}* ya va en camino \uD83D\uDE9A.\n\n`;

          let puntosSumados = 0;
          if (puntosReq) {
            puntosSumados = puntosReq.puntos;
          } else if (pedido.total_final >= 50000) {
            // Fallback para pedidos anteriores
            let pct = 0.03;
            if (nivel === "Oro") pct = 0.08;
            else if (nivel === "Plata") pct = 0.05;
            puntosSumados = Math.floor(pedido.total_final * pct);
          }

          if (puntosSumados > 0) {
            msg += `Por cierto, con esta compra llegaste a Nivel *${nivel}* en el Club GALU y sumaste *${puntosSumados.toLocaleString("es-CO")}* puntos para tu próxima compra \uD83C\uDF89.\n`;
          }

          msg += `\n¡Gracias por elegirnos!`;

          let num = pedido.numero_whatsapp.replace(/\D/g, '');
          if (!num.startsWith("57")) num = "57" + num;

          window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
        } catch (err) {
          console.error("Error generando mensaje de envío:", err);
        }
      } else {
        alert("Estado actualizado");
      }
    }
  };

  // --- LÓGICA DE CUPONES ---
  const crearCupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('cupones').insert([{
        codigo: nuevoCupon.codigo.toUpperCase(),
        tipo: nuevoCupon.tipo,
        valor: parseFloat(nuevoCupon.valor),
        uso_maximo: nuevoCupon.uso_maximo ? parseInt(nuevoCupon.uso_maximo) : null,
        activo: nuevoCupon.activo
      }]);
      if (error) throw error;
      alert("Cupón creado");
      setNuevoCupon({ codigo: "", tipo: "porcentaje", valor: "", uso_maximo: "", activo: true });
      cargarCupones();
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  const alternarEstadoCupon = async (id: string, estadoActual: boolean) => {
    await supabase.from('cupones').update({ activo: !estadoActual }).eq('id', id);
    cargarCupones();
  };

  // --- LÓGICA DE EDICIÓN RÁPIDA ---
  const iniciarEdicion = (prod: any) => {
    setEditandoId(prod.id);
    setTempProducto({ ...prod });
  };

  const guardarEdicion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({
          nombre: tempProducto.nombre,
          precio_base: parseFloat(tempProducto.precio_base),
          destacado: tempProducto.destacado
        })
        .eq('id', id);
      if (error) throw error;
      setEditandoId(null);
      cargarProductos();
    } catch (e: any) { alert(e.message); }
  };

  // --- LÓGICA GUARDAR PRODUCTO ---
  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = nuevoProducto.imagen_principal.trim();

      // Si se seleccionó un archivo, súbelo a Supabase Storage
      if (imagenFileProd) {
        const fileExt = imagenFileProd.name.split('.').pop();
        const fileName = `prod_${Math.random().toString(36).substring(2, 9)}_${Date.now()}.${fileExt}`;
        const filePath = `items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('productos')
          .upload(filePath, imagenFileProd);

        if (uploadError) throw new Error(`Fallo subiendo imagen: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from('productos')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;
      }

      const { data: prod, error } = await supabase.from('productos').insert([{
        nombre: nuevoProducto.nombre,
        precio_base: parseFloat(nuevoProducto.precio_base),
        categoria_id: nuevoProducto.categoria_id,
        imagen_principal: finalImageUrl,
        descripcion: nuevoProducto.descripcion,
        destacado: nuevoProducto.destacado
      }]).select().single();

      if (error) throw error;
      alert("Producto maestro creado exitosamente");
      setNuevoProducto({ nombre: "", precio_base: "", categoria_id: "", imagen_principal: "", descripcion: "", es_ropa: true, destacado: false, stock: 0 });
      setImagenFileProd(null);
      
      // Limpiar el input file si existe
      const fileInput = document.getElementById("file-upload-prod") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      cargarProductos();
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  // --- LÓGICA INVENTARIO PRO ---
  const manejarCrearVariante = async () => {
    if (!nuevaVariante.valor_id || !productoInventario) return alert("Selecciona una talla o color");

    setLoading(true);
    try {
      // GENERACIÓN AUTOMÁTICA DE SKU: GL- + 5 caracteres aleatorios
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const autoSku = `GL-${randomPart}`;

      const { data: vData, error } = await supabase.from('variantes_producto').insert([{
        producto_id: productoInventario.id,
        sku: autoSku,
        stock: nuevaVariante.stock
      }]).select().single();

      if (error) throw error;

      if (vData) {
        const { error: attError } = await supabase.from('variante_atributos').insert([{
          variante_id: vData.id,
          atributo_valor_id: nuevaVariante.valor_id
        }]);

        if (attError) throw attError;

        alert("Variante agregada correctamente");
        cargarVariantes(productoInventario.id);
        setNuevaVariante({ sku: "", stock: 0, valor_id: "" });
      }
    } catch (err: any) {
      alert("Error en inventario: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminarVariante = async (varianteId: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta variante del inventario?")) return;
    try {
      const { error } = await supabase.from('variantes_producto').delete().eq('id', varianteId);
      if (error) throw error;
      alert("Variante eliminada");
      if (productoInventario) cargarVariantes(productoInventario.id);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // --- LÓGICA MODAL ATRIBUTOS ---
  const manejarGuardarValorAtributo = async () => {
    if (!nuevoValorAtributo || !atributoSeleccionado) return;
    
    // Guardar valor normal (Sin Hex)
    const valorFinal = nuevoValorAtributo.toUpperCase();

    const { error } = await supabase.from('atributo_valores').insert([{
      atributo_id: atributoSeleccionado.id,
      valor: valorFinal
    }]);
    
    if (!error) {
      setNuevoValorAtributo("");
      setNuevoHexAtributo("#000000");
      setIsModalOpen(false);
      cargarAtributos();
    }
  };

  const eliminarAtributo = async (id: string) => {
    if (!confirm("¿ESTÁS SEGURO DE ELIMINAR ESTE ATRIBUTO? SE PERDERÁN TODAS LAS COMBINACIONES EN LOS PRODUCTOS.")) return;
    const { error } = await supabase.from('atributos').delete().eq('id', id);
    if (!error) {
      cargarAtributos();
      toast("ATRIBUTO ELIMINADO", "success");
    }
  };

  const eliminarValorAtributo = async (id: string) => {
    const { error } = await supabase.from('atributo_valores').delete().eq('id', id);
    if (!error) {
      cargarAtributos();
      toast("VALOR ELIMINADO", "success");
    }
  };

  // --- NUEVA FUNCIÓN: GENERADOR DE MATRIZ DE VARIANTES ---
  const generarMatrizVariantes = async () => {
    const hayColores = seleccionMultipleColores.length > 0;
    const hayTallas = seleccionMultipleTallas.length > 0;

    if (!productoInventario || (!hayColores && !hayTallas)) {
      return alert("Selecciona al menos un color o una talla para generar la matriz");
    }

    setIsMatrixGenerating(true);
    let creadas = 0;
    
    try {
      // Determinamos las combinaciones a crear
      // Si hay ambos, hacemos producto cartesiano. Si solo hay uno, usamos solo ese.
      const coloresParaIterar = hayColores ? seleccionMultipleColores : [null];
      const tallasParaIterar = hayTallas ? seleccionMultipleTallas : [null];

      for (const colorId of coloresParaIterar) {
        for (const tallaId of tallasParaIterar) {
          // Generar SKU automático único
          const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
          const autoSku = `GL-${randomPart}`;

          // 1. Insertar Variante Maestra
          const { data: vData, error: vError } = await supabase.from('variantes_producto').insert([{
            producto_id: productoInventario.id,
            sku: autoSku,
            stock: 0 
          }]).select().single();

          if (vError) throw vError;

          if (vData) {
            // 2. Insertar Relación con Color (si aplica)
            if (colorId) {
              await supabase.from('variante_atributos').insert([{
                variante_id: vData.id,
                atributo_valor_id: colorId
              }]);
            }
            // 3. Insertar Relación con Talla (si aplica)
            if (tallaId) {
              await supabase.from('variante_atributos').insert([{
                variante_id: vData.id,
                atributo_valor_id: tallaId
              }]);
            }
            creadas++;
          }
        }
      }
      alert(`¡Éxito! Se generaron ${creadas} variantes automáticas.`);
      cargarVariantes(productoInventario.id);
      setSeleccionMultipleColores([]);
      setSeleccionMultipleTallas([]);
    } catch (err: any) {
      alert("Error generando matriz: " + err.message);
    } finally {
      setIsMatrixGenerating(false);
    }
  };

  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nuevaCategoria.nombre.trim();
    if (!nombreLimpio) return alert("El nombre es obligatorio");
    if (!nuevaCategoria.imagen.trim() && !imagenFileCat) return alert("Debes pegar una URL de imagen o subir un archivo de tu PC");

    setLoading(true);
    try {
      let finalImageUrl = nuevaCategoria.imagen.trim();

      // Si se seleccionó un archivo, súbelo a Supabase Storage
      if (imagenFileCat) {
        const fileExt = imagenFileCat.name.split('.').pop();
        const fileName = `cat_${Math.random().toString(36).substring(2, 9)}_${Date.now()}.${fileExt}`;
        const filePath = `categorias/${fileName}`;

        // Intentar subir al bucket genérico "productos" (el más usado en tiendas)
        const { error: uploadError } = await supabase.storage
          .from('productos')
          .upload(filePath, imagenFileCat);

        if (uploadError) throw new Error(`Fallo subiendo imagen: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from('productos')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;
      }

      const sessionData = await supabase.auth.getSession();
      if (!sessionData.data.session) {
        return alert("¡No estás logueado! Tu sesión expiró o las credenciales no son válidas. Por favor, inicia sesión de nuevo para poder crear categorías.");
      }

      const slug = nombreLimpio.toLowerCase().replace(/ /g, "-") + "-" + Math.floor(Math.random() * 10000);

      const { error } = await supabase.from('categorias').insert([{
        nombre: nombreLimpio,
        slug,
        imagen: finalImageUrl,
        activa: true
      }]);

      if (error) throw error;

      alert("Categoría Creada Exitosamente");
      setNuevaCategoria({ nombre: "", slug: "", imagen: "" });
      setImagenFileCat(null);
      // Limpiar el input file visualmente si es posible
      const fileInput = document.getElementById("file-upload-cat") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      cargarCategorias();
    } catch (err: any) {
      alert("Error al crear categoría: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen text-black font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-12">
        {/* CABECERA MÓVIL PARA ADMIN */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-black text-white p-4 shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-1">
              <Menu size={24} />
            </button>
            <h2 className="text-sm font-black uppercase italic tracking-tighter">GALU ADMIN</h2>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest bg-white text-black px-2 py-1 italic">
            {activeTab}
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-8">

          {/* OVERLAY MÓVIL */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-[100] md:hidden backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <aside className={`fixed md:static inset-y-0 left-0 w-72 md:w-64 bg-white md:bg-transparent z-[110] p-6 md:p-0 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} space-y-2 flex-shrink-0 border-r-2 border-black md:border-0`}>
            <div className="flex items-center justify-between md:block mb-6">
              <h2 className="text-xl font-black uppercase italic text-black">GALU ADMIN</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 border-2 border-black">
                <X size={20} />
              </button>
            </div>

            <nav className="space-y-2" onClick={() => setIsSidebarOpen(false)}>
              <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'dashboard' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><Layers size={18} /> Resumen</button>
              <button onClick={() => setActiveTab("pedidos")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'pedidos' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><ShoppingBag size={18} /> Pedidos</button>
              <button onClick={() => setActiveTab("productos")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'productos' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><Package size={18} /> Catálogo</button>
              <button onClick={() => setActiveTab("stock")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'stock' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><Hash size={18} /> Inventario PRO</button>
              <button onClick={() => setActiveTab("resenas")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'resenas' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><Star size={18} /> Reseñas{listaResenas.filter(r => !r.aprobada).length > 0 && <span className="bg-red-500 text-white rounded-full px-2 text-[8px]">{listaResenas.filter(r => !r.aprobada).length}</span>}</button>
              <button onClick={() => setActiveTab("banners")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'banners' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><ImageIcon size={18} /> Banners</button>
              <button onClick={() => setActiveTab("analitica")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'analitica' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><Activity size={18} /> Analítica en Vivo</button>
              <button onClick={() => setActiveTab("cupones")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'cupones' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><Ticket size={18} /> Cupones</button>
              <button onClick={() => setActiveTab("categorias")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'categorias' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><Tag size={18} /> Categorías</button>
              <button onClick={() => setActiveTab("atributos")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'atributos' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><Layers size={18} /> Atributos</button>
              <button onClick={() => setActiveTab("configuracion")} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase transition-all ${activeTab === 'configuracion' ? 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-100'}`}><Settings size={18} /> Configuración</button>
            </nav>

            <button onClick={() => cargarTodo()} className="w-full mt-10 flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase border border-black hover:bg-black hover:text-white transition-all">
              <Wifi size={14} /> Sincronizar Sistema
            </button>
            <button onClick={() => supabase.auth.signOut()} className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-3 text-[10px] font-black uppercase bg-red-100 text-red-600 border border-red-600 hover:bg-red-600 hover:text-white transition-all">
              Cerrar Sesión
            </button>
          </aside>

          <section className="flex-1 bg-white p-4 md:p-8 min-h-[80vh] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

            {/* PESTAÑA DASHBOARD (RESUMEN) */}
            {activeTab === "dashboard" && (
              <div className="space-y-8 animate-in fade-in">
                <h3 className="font-black uppercase text-2xl border-b-4 border-black pb-2 italic text-black">Métricas Principales</h3>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <div className="bg-white border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col justify-center min-h-[100px]">
                    <p className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-[#B0B0B0] mb-2">Ventas Brutas</p>
                    <p className="text-sm sm:text-lg md:text-2xl font-black text-black leading-tight break-all">
                      ${listaPedidos.filter(p => p.estado !== 'cancelado').reduce((acc, p) => acc + Number(p.total_final), 0).toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div className="bg-white border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col justify-center min-h-[100px] cursor-pointer hover:bg-zinc-50 transition-colors" onClick={() => setActiveTab("analitica")}>
                    <p className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-[#B0B0B0] mb-2">Visitantes Reales</p>
                    <p className="text-lg md:text-2xl font-black text-black">
                      {listaVisitas.filter(v => v.tiempo_s >= 10).length}+
                    </p>
                  </div>
                  <div className="bg-white border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col justify-center min-h-[100px]">
                    <p className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-[#B0B0B0] mb-2">Total Pedidos</p>
                    <p className="text-lg md:text-2xl font-black text-black">
                      {listaPedidos.length}
                    </p>
                  </div>
                  <div className="bg-white border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col justify-center min-h-[100px]">
                    <p className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-[#B0B0B0] mb-2">Clientes Únicos</p>
                    <p className="text-lg md:text-2xl font-black text-black">
                      {new Set(listaPedidos.map(p => p.cliente_email)).size}
                    </p>
                  </div>
                  <div className="bg-white border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col justify-center min-h-[100px]">
                    <p className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-[#B0B0B0] mb-2">Productos Activos</p>
                    <p className="text-lg md:text-2xl font-black text-black">
                      {listaProductos.filter(p => p.activo).length}
                    </p>
                  </div>
                </div>

                <div className="border-2 border-black mt-8 p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[12px] font-black uppercase tracking-widest text-[#B0B0B0]">Evolución Ventas Brutas (Últimos 7 días)</h4>
                    <ExternalLink size={16} className="text-gray-300" />
                  </div>
                  {(() => {
                    const dias = [];
                    const ventasPorDia: Record<string, number> = {};
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      const fechaStr = d.toISOString().split('T')[0];
                      dias.push(fechaStr);
                      ventasPorDia[fechaStr] = 0;
                    }

                    listaPedidos.forEach(p => {
                      if (p.estado !== 'cancelado') {
                        const fp = new Date(p.created_at).toISOString().split('T')[0];
                        if (ventasPorDia[fp] !== undefined) {
                          ventasPorDia[fp] += Number(p.total_final);
                        }
                      }
                    });

                    const maxVenta = Math.max(...Object.values(ventasPorDia), 1);

                    return (
                      <div className="flex items-end gap-3 h-40 w-full pt-4">
                        {dias.map(d => {
                          const h = (ventasPorDia[d] / maxVenta) * 100;
                          return (
                            <div key={d} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                              <div className="w-full bg-[#fde8ec] border-t border-l border-r border-[#fcaebc] hover:bg-black hover:border-black transition-all rounded-t-sm" style={{ height: `${h}%`, minHeight: '4px' }}></div>
                              <span className="text-[8px] font-black uppercase mt-2 text-gray-500">{d.slice(5)}</span>
                              <div className="absolute -top-6 bg-black text-white text-[9px] px-2 py-1 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                ${ventasPorDia[d].toLocaleString("es-CO")}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* PESTAÑA RESEÑAS */}
            {activeTab === "resenas" && (
              <div className="space-y-8 animate-in fade-in">
                <h3 className="font-black uppercase text-xl border-b-2 border-black pb-2 italic text-black">Gestión de Reseñas</h3>

                {listaResenas.length === 0 ? (
                  <p className="text-center font-bold text-gray-400 text-xs py-10 uppercase">No hay reseñas en el sistema.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listaResenas.map((r) => (
                      <div key={r.id} className={`p-4 border-2 transition-all ${r.aprobada ? 'border-gray-200 bg-white' : 'border-black bg-yellow-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[11px] font-black uppercase text-black">{r.cliente_nombre}</p>
                            <p className="text-[9px] font-bold text-gray-400">{r.productos?.nombre || 'Producto eliminado'}</p>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} className={s <= r.calificacion ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />)}
                          </div>
                        </div>
                        <p className="text-sm font-medium text-black leading-snug mb-4">"{r.comentario}"</p>
                        <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 ${r.aprobada ? 'bg-green-100 text-green-700' : 'bg-yellow-200 text-yellow-800'}`}>
                            {r.aprobada ? 'Publicada' : 'Pendiente'}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={() => alternarAprobacionResena(r.id, r.aprobada)} className={`py-1 px-3 text-[9px] font-black uppercase border-2 border-black transition-all ${r.aprobada ? 'bg-white hover:bg-gray-100' : 'bg-black text-white hover:bg-zinc-800'}`}>
                              {r.aprobada ? 'Ocultar' : 'Aprobar'}
                            </button>
                            <button onClick={() => eliminarResena(r.id)} className="p-1 px-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA CONFIGURACIÓN */}
            {activeTab === "configuracion" && (
              <div className="space-y-8 animate-in fade-in">
                <h3 className="font-black uppercase text-xl border-b-2 border-black pb-2 italic text-black">Configuración del Sistema</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                  {listaConfig.map(cfg => (
                    <div key={cfg.id} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#B0B0B0]">{cfg.clave.replace(/_/g, ' ')}</p>
                        <p className="text-xs font-bold text-black mb-4 h-8">{cfg.descripcion}</p>
                      </div>
                      <input
                        type={cfg.tipo === 'numero' ? 'number' : 'text'}
                        className="w-full border-b-2 border-black py-2 outline-none font-black text-sm text-black focus:border-[#FCD7DE] bg-gray-50 px-2"
                        defaultValue={cfg.valor}
                        onBlur={(e) => {
                          if (e.target.value !== cfg.valor) {
                            actualizarConfig(cfg.clave, e.target.value);
                            alert("Configuración actualizada");
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PESTAÑA PEDIDOS */}
            {activeTab === "pedidos" && (
              <div className="space-y-8 animate-in fade-in">
                <h3 className="font-black uppercase text-xl border-b-2 border-black pb-2 italic text-black">Gestión de Ventas</h3>
                <div className="grid grid-cols-1 gap-6">
                  {listaPedidos.map((pedido) => (
                    <div key={pedido.id} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <div className="p-4 bg-black text-white flex justify-between items-center">
                        <span className="font-black uppercase text-xs">Pedido #{String(pedido.numero_pedido).padStart(4, '0')}</span>
                        <span className="text-[10px] font-bold">{new Date(pedido.created_at).toLocaleString()}</span>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Info Cliente */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Cliente</p>
                          <p className="font-black text-sm uppercase">{pedido.cliente_nombre}</p>
                          <p className="text-xs font-bold">{pedido.numero_whatsapp}</p>
                          <p className="text-[10px] text-gray-500">{pedido.cliente_email}</p>
                        </div>
                        {/* Info Envío */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Dirección</p>
                          <p className="text-xs font-bold uppercase">{pedido.direccion}</p>
                          <p className="text-xs font-bold uppercase">{pedido.barrio} - {pedido.ciudad}</p>
                          <p className="text-[10px] font-black text-pink-500 uppercase">{pedido.metodo_pago}</p>
                        </div>
                        {/* Estado y Acciones */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Estado actual: <span className="text-black">{pedido.estado}</span></p>
                          <select
                            value={pedido.estado}
                            disabled={pedido.estado === "enviado"}
                            onChange={(e) => actualizarEstadoPedido(pedido, e.target.value)}
                            className={`w-full p-2 border-2 border-black font-black text-[10px] uppercase ${pedido.estado === "enviado" ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" : "bg-[#FCD7DE]"}`}
                          >
                            <option value="pendiente_pago">Pendiente Pago</option>
                            <option value="pagado">Pagado / Confirmado</option>
                            <option value="en_preparacion">En Preparación</option>
                            <option value="enviado">Enviado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </div>
                      </div>
                      {/* Detalles Productos */}
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <p className="text-[9px] font-black uppercase mb-2 text-gray-400">Artículos del pedido</p>
                        <div className="space-y-2">
                          {pedido.pedido_items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-xs font-bold">
                              <span>{item.cantidad}x {item.producto_nombre_snapshot} ({item.variante_detalle_snapshot})</span>
                              <span>${Number(item.subtotal).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-black mt-4 pt-2 flex justify-between font-black">
                          <span className="uppercase">Total Final</span>
                          <span className="text-lg font-black italic">${Number(pedido.total_final).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {listaPedidos.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-black">
                      <p className="font-black uppercase text-gray-400">No hay pedidos registrados aún</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA BANNERS */}
            {activeTab === "banners" && (
              <div className="space-y-12 animate-in fade-in">
                <form onSubmit={crearBanner} className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-2 gap-6">
                  <h3 className="md:col-span-2 font-black uppercase text-xl border-b-2 border-black pb-2 italic text-black">Añadir Nuevo Banner Formato PC / Móvil</h3>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-gray-500">Título Principal (Opcional)</label>
                      <input placeholder="P. ej: NUEVA COLECCIÓN" className="w-full p-3 border-2 border-black font-bold outline-none uppercase text-black" value={nuevoBanner.titulo} onChange={e => setNuevoBanner({ ...nuevoBanner, titulo: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-gray-500">Subtítulo Descriptivo (Opcional)</label>
                      <input placeholder="P. ej: Lo mejor del verano" className="w-full p-3 border-2 border-black font-bold outline-none uppercase text-black" value={nuevoBanner.subtitulo} onChange={e => setNuevoBanner({ ...nuevoBanner, subtitulo: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-gray-500">Enlace Destino (Ej. /categoria/mujer)</label>
                      <input placeholder="/categoria/mujer" className="w-full p-3 border-2 border-black font-bold outline-none text-black lower" value={nuevoBanner.enlace} onChange={e => setNuevoBanner({ ...nuevoBanner, enlace: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-gray-500">URL Imagen PC (Horizontal) *</label>
                      <input required placeholder="https://..." className="w-full p-3 border-2 border-black font-bold outline-none text-black" value={nuevoBanner.imagen_url} onChange={e => setNuevoBanner({ ...nuevoBanner, imagen_url: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-gray-500">URL Imagen Móvil (Vertical) Opcional</label>
                      <input placeholder="https://..." className="w-full p-3 border-2 border-black font-bold outline-none text-black" value={nuevoBanner.imagen_movil} onChange={e => setNuevoBanner({ ...nuevoBanner, imagen_movil: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500">Orden de Carrusel</label>
                        <input required type="number" placeholder="0" className="w-full p-3 border-2 border-black font-bold outline-none text-black" value={nuevoBanner.orden} onChange={e => setNuevoBanner({ ...nuevoBanner, orden: parseInt(e.target.value) || 0 })} />
                      </div>
                      <label className="flex items-center gap-2 p-3 border-2 border-black text-[12px] font-black uppercase cursor-pointer hover:bg-gray-100 transition-colors h-[52px]">
                        <input type="checkbox" className="w-4 h-4" checked={nuevoBanner.activo} onChange={e => setNuevoBanner({ ...nuevoBanner, activo: e.target.checked })} /> PUBLICAR AHORA
                      </label>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="md:col-span-2 w-full bg-black text-white font-black uppercase py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FCD7DE] hover:text-black transition-all border-2 border-black mt-4 disabled:opacity-50">Crear e Insertar Banner</button>
                </form>

                <div className="space-y-6">
                  <h3 className="font-black uppercase text-xl border-b-2 border-black pb-2 italic text-black">Banners Publicados en Inicio</h3>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {listaBanners.map(b => (
                      <div key={b.id} className="border-2 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative flex flex-col justify-between">
                        <div>
                          <div className="h-32 bg-gray-100 flex items-center justify-center overflow-hidden mb-4 border border-black/10 relative group">
                            <img src={b.imagen_url} alt="Banner PC" className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                            {b.imagen_movil && <div className="absolute top-2 right-2 bg-black text-white text-[8px] font-black px-2 py-1 uppercase tracking-widest">+ Móvil Integrado</div>}
                          </div>
                          <div className="mb-6 space-y-1">
                            <p className="font-black uppercase text-[12px] h-4 truncate" title={b.titulo}>{b.titulo || 'SIN TÍTULO'}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase truncate" title={b.enlace}>{b.enlace ? `Destino: ${b.enlace}` : 'Sin enlace de redirección'}</p>
                            <div className="inline-flex mt-2 px-2 py-1 bg-gray-100 border border-black text-[9px] font-black uppercase tracking-widest">
                              Posición: {b.orden}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t-2 border-black pt-4">
                          <button onClick={() => alternarBanner(b.id, b.activo)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${b.activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-[#fde8ec] text-[#d14d64] hover:bg-red-200'} border-2 border-black`}>
                            {b.activo ? 'VISIBLE ✅' : 'OCULTO ❌'}
                          </button>
                          <button onClick={() => eliminarBanner(b.id)} className="text-red-500 p-2 hover:bg-red-50 transition-colors border-2 border-transparent hover:border-red-500 rounded"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {listaBanners.length === 0 && (
                    <div className="border-2 border-dashed border-gray-300 p-12 text-center text-gray-400 font-black uppercase tracking-widest text-[10px]">
                      No hay banners personalizados creados.<br />La página de inicio mostrará los 3 banners de demostración.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA PRODUCTOS */}
            {activeTab === "productos" && (
              <div className="space-y-12 animate-in fade-in">
                <form onSubmit={guardarProducto} className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-2 gap-6">
                  <h3 className="md:col-span-2 font-black uppercase text-xl border-b-2 border-black pb-2 italic text-black">Nuevo Producto Maestro</h3>
                  <div className="space-y-4">
                    <input required placeholder="NOMBRE" className="w-full p-3 border-2 border-black font-bold outline-none uppercase text-black" value={nuevoProducto.nombre} onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} />
                    <input required type="number" placeholder="PRECIO BASE COP" className="w-full p-3 border-2 border-black font-bold outline-none text-black" value={nuevoProducto.precio_base} onChange={e => setNuevoProducto({ ...nuevoProducto, precio_base: e.target.value })} />
                    <select required className="w-full p-3 border-2 border-black font-bold bg-white outline-none text-black" value={nuevoProducto.categoria_id} onChange={e => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })}>
                      <option value="">CATEGORÍA...</option>
                      {listaCategorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-50 border-2 border-black p-4 space-y-3">
                      <p className="text-[9px] font-black uppercase text-gray-500">Imagen Principal (URL o Archivo)</p>
                      <input placeholder="PEGAR URL DE IMAGEN" className="w-full p-2 border-2 border-black font-bold outline-none text-[10px] text-black" value={nuevoProducto.imagen_principal} onChange={e => setNuevoProducto({ ...nuevoProducto, imagen_principal: e.target.value })} />
                      <div className="flex items-center gap-4 py-1">
                        <div className="flex-1 h-[1px] bg-black/10"></div>
                        <span className="font-black text-[8px] uppercase text-gray-400">Ó</span>
                        <div className="flex-1 h-[1px] bg-black/10"></div>
                      </div>
                      <input id="file-upload-prod" type="file" accept="image/*" onChange={e => setImagenFileProd(e.target.files ? e.target.files[0] : null)} className="w-full text-[9px] font-bold text-black file:mr-4 file:py-1 file:px-3 file:border-2 file:border-black file:text-[9px] file:font-black file:uppercase file:bg-white file:text-black hover:file:bg-black hover:file:text-white cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2 text-black">
                      <label className="flex-1 flex items-center gap-2 p-3 border-2 border-black text-[10px] font-black uppercase cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <input type="checkbox" checked={nuevoProducto.destacado} onChange={e => setNuevoProducto({ ...nuevoProducto, destacado: e.target.checked })} /> DESTACAR EN PORTADA
                      </label>
                    </div>


                  </div>
                  <button type="submit" disabled={loading} className="md:col-span-2 bg-black text-white font-black py-4 uppercase tracking-widest hover:bg-zinc-800">
                    {loading ? "GUARDANDO..." : "CREAR PRODUCTO BASE"}
                  </button>
                </form>

                <div className="grid grid-cols-1 gap-4">
                  {listaProductos.map(prod => (
                    <div key={prod.id} className="bg-white p-4 border-2 border-black flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-center gap-4">
                        <img src={prod.imagen_principal} className="w-12 h-12 object-cover border border-black" />
                        <div className="flex-1">
                          {editandoId === prod.id ? (
                            <div className="space-y-2">
                              <input className="border border-black p-1 text-xs w-full text-black" value={tempProducto.nombre} onChange={e => setTempProducto({ ...tempProducto, nombre: e.target.value })} />
                              <input type="number" className="border border-black p-1 text-xs w-full text-black" value={tempProducto.precio_base} onChange={e => setTempProducto({ ...tempProducto, precio_base: e.target.value })} />
                              <label className="text-[10px] font-black uppercase flex items-center gap-2 text-black">
                                <input type="checkbox" checked={tempProducto.destacado} onChange={e => setTempProducto({ ...tempProducto, destacado: e.target.checked })} /> Destacado
                              </label>
                            </div>
                          ) : (
                            <>
                              <p className="font-black text-xs uppercase text-black">{prod.nombre}</p>
                              <p className="text-[10px] font-bold text-gray-400">{prod.categorias?.nombre} | ${prod.precio_base} {prod.destacado && <span className="text-pink-500 font-black">★ DESTACADO</span>}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {editandoId === prod.id ? (
                          <>
                            <button onClick={() => guardarEdicion(prod.id)} className="text-green-600"><Check /></button>
                            <button onClick={() => setEditandoId(null)} className="text-red-600"><X /></button>
                          </>
                        ) : (
                          <button onClick={() => iniciarEdicion(prod)} className="p-2 border-2 border-black hover:bg-black hover:text-white"><Pencil size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PESTAÑA CUPONES */}
            {activeTab === "cupones" && (
              <div className="space-y-8 animate-in fade-in">
                <form onSubmit={crearCupon} className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-3 gap-4">
                  <h3 className="md:col-span-3 font-black uppercase text-xl border-b-2 border-black pb-2 italic text-black">Nuevo Cupón de Descuento</h3>
                  <input required placeholder="CÓDIGO" className="p-3 border-2 border-black font-black uppercase text-black" value={nuevoCupon.codigo} onChange={e => setNuevoCupon({ ...nuevoCupon, codigo: e.target.value })} />
                  <select className="p-3 border-2 border-black font-black text-black" value={nuevoCupon.tipo} onChange={e => setNuevoCupon({ ...nuevoCupon, tipo: e.target.value })}>
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto">Monto Fijo ($)</option>
                  </select>
                  <input required type="number" placeholder="VALOR" className="p-3 border-2 border-black font-black text-black" value={nuevoCupon.valor} onChange={e => setNuevoCupon({ ...nuevoCupon, valor: e.target.value })} />
                  <input type="number" placeholder="USOS (VACIO = ∞)" className="p-3 border-2 border-black font-black text-black" value={nuevoCupon.uso_maximo} onChange={e => setNuevoCupon({ ...nuevoCupon, uso_maximo: e.target.value })} />
                  <button type="submit" className="md:col-span-2 bg-black text-white font-black uppercase py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">Crear Cupón</button>
                </form>

                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <table className="w-full text-left text-black">
                    <thead className="bg-black text-white text-[10px] font-black uppercase italic">
                      <tr>
                        <th className="p-4">Código</th>
                        <th className="p-4">Descuento</th>
                        <th className="p-4">Usos</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-center">Historial</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold uppercase">
                      {listaCupones.map(c => (
                        <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-black">{c.codigo}</td>
                          <td className="p-4">{c.tipo === 'porcentaje' ? `${c.valor}%` : `$${c.valor}`}</td>
                          <td className="p-4">{c.usos_actuales} / {c.uso_maximo || '∞'}</td>
                          <td className="p-4">
                            <button onClick={() => alternarEstadoCupon(c.id, c.activo)} className={`px-3 py-1 border-2 border-black ${c.activo ? 'bg-green-400' : 'bg-red-400'}`}>
                              {c.activo ? 'ACTIVO' : 'INACTIVO'}
                            </button>
                          </td>
                          <td className="p-4 text-[8px] space-y-1">
                            {c.cupon_uso?.map((uso: any, i: number) => (
                              <p key={i}>Pedido: {uso.pedido_id?.slice(0, 8)}... - {uso.cliente_email}</p>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PESTAÑA ANALITICA (MODERNA Y PREMIUM) */}
            {activeTab === "analitica" && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 italic gap-4">
                   <div>
                     <h3 className="font-black uppercase text-4xl text-black leading-none">Intelligence Hub</h3>
                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mt-2">Métricas de Guerra para Crecimiento de Ventas</p>
                   </div>
                   
                   <div className="flex flex-wrap items-center gap-2">
                      <div className="flex bg-gray-100 p-1 border-2 border-black mr-4">
                         {['hoy', 'ayer', '7_dias', 'mes'].map((f) => (
                           <button 
                             key={f}
                             onClick={() => { setFiltroAnalitica(f); cargarAnalitica(f); }}
                             className={`px-3 py-1 text-[9px] font-black uppercase transition-all ${filtroAnalitica === f ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(252,215,222,1)]' : 'hover:bg-gray-200'}`}
                           >
                             {f.replace('_', ' ')}
                           </button>
                         ))}
                      </div>
                      <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 border-2 border-black text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span> Live
                      </div>
                   </div>
                </header>

                {/* KPI CARDS (PESADAS) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                     <div className="flex justify-between mb-4 relative z-10">
                        <Activity className="text-black" size={32} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase bg-black text-white px-3 py-1 italic">Quality</span>
                     </div>
                     <p className="text-[11px] font-black uppercase text-gray-400 mb-1 relative z-10">Sesiones &gt; 10 seg</p>
                     <p className="text-5xl font-black text-black italic relative z-10">{listaVisitas.filter(v => v.tiempo_s >= 10).length}</p>
                     <p className="text-[9px] font-black uppercase text-green-600 mt-3 flex items-center gap-1 bg-green-50 w-fit px-2 py-1 border border-green-200"> <TrendingUp size={12} strokeWidth={3} /> Tráfico con alta retención</p>
                     <div className="absolute -bottom-4 -right-4 text-black/5 group-hover:text-black/10 transition-colors">
                        <MousePointer2 size={120} strokeWidth={3} />
                     </div>
                   </div>

                   <div className="bg-[#FCD7DE] border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                     <div className="flex justify-between mb-4 relative z-10">
                        <ShoppingBag className="text-black" size={32} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase bg-black text-white px-3 py-1 italic">Conversion</span>
                     </div>
                     <p className="text-[11px] font-black uppercase text-gray-400 mb-1 relative z-10">Intentos de Compra</p>
                     <p className="text-5xl font-black text-black italic relative z-10">
                       {listaVisitas.filter(v => v.evento === 'add_to_cart' || v.evento === 'checkout_start').length}
                     </p>
                     <p className="text-[9px] font-black uppercase text-black/60 mt-3 border border-black/10 px-2 py-1 bg-white/30">Ratio: {listaVisitas.length > 0 ? ((listaVisitas.filter(v => v.evento === 'add_to_cart').length / listaVisitas.length) * 100).toFixed(1) : 0}%</p>
                     <div className="absolute -bottom-4 -right-4 text-black/5 group-hover:text-black/10 transition-colors">
                        <TrendingUp size={120} strokeWidth={3} />
                     </div>
                   </div>

                   <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                     <div className="flex justify-between mb-4 relative z-10">
                        <MapPin className="text-black" size={32} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase bg-zinc-100 text-black px-3 py-1 italic">Reach</span>
                     </div>
                     <p className="text-[11px] font-black uppercase text-gray-400 mb-1 relative z-10">Ciudades Activas</p>
                     <p className="text-5xl font-black text-black italic relative z-10">
                        {new Set(listaVisitas.map(v => v.ciudad).filter(Boolean)).size}
                     </p>
                     <p className="text-[9px] font-black uppercase text-gray-400 mt-3 italic tracking-widest">Presencia nacional detectada</p>
                     <div className="absolute -bottom-4 -right-4 text-black/5 group-hover:text-black/10 transition-colors">
                        <Globe size={120} strokeWidth={3} />
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* TABLA DE ÚLTIMAS VISITAS (MAS DETALLE) */}
                   <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                     <div className="p-4 border-b-4 border-black flex justify-between items-center bg-zinc-50 italic">
                        <h4 className="font-black uppercase text-xs">Radar de Tráfico en Vivo</h4>
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase bg-red-500 text-white px-2 py-0.5"> <Wifi size={10} /> Real-time</div>
                     </div>
                     <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left">
                          <thead className="text-[9px] font-black uppercase border-b-2 border-black sticky top-0 bg-white z-10">
                            <tr>
                              <th className="p-4 bg-gray-50">Localización</th>
                              <th className="p-4">Página Activa</th>
                              <th className="p-4 bg-gray-50">Permanencia</th>
                              <th className="p-4">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="text-[10px] font-bold uppercase">
                            {listaVisitas.slice(0, 20).map((v, i) => (
                              <tr key={i} className="border-b border-black/5 hover:bg-[#FCD7DE]/20 transition-colors">
                                <td className="p-4 flex flex-col bg-gray-50/50">
                                   <span className="flex items-center gap-1 text-black font-black"><MapPin size={10} /> {v.ciudad || 'Desconocida'}</span>
                                   <span className="text-[8px] text-gray-400 ml-3.5">{v.ip?.slice(0, 12)}...</span>
                                </td>
                                <td className="p-4">
                                   <div className="flex flex-col gap-0.5">
                                      <span className="text-black font-black truncate max-w-[150px]">{v.url === '/' ? 'HOME' : v.url.replace('/producto/', '')}</span>
                                      <span className="text-[8px] text-gray-400 italic">ID: {v.producto_id?.slice(0, 8) || 'Sitio Global'}</span>
                                   </div>
                                </td>
                                <td className="p-4 bg-gray-50/50 text-center">
                                   <span className={`px-2 py-1 border-2 border-black font-black ${v.tiempo_s >= 10 ? 'bg-green-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-gray-400'}`}>
                                      {v.tiempo_s}s
                                   </span>
                                </td>
                                <td className="p-4">
                                   <span className={`px-2 py-1 border-2 border-black text-[8px] font-black italic ${v.evento === 'add_to_cart' ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-zinc-100 text-gray-400'}`}>
                                      {v.evento === 'add_to_cart' ? '🔥 INTENTO COMPRA' : 'NAVEGANDO'}
                                   </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                     </div>
                   </div>

                   {/* RANKING Y EMBUDO (ESTRATÉGICO) */}
                   <div className="space-y-8">
                      {/* EMBUDO DE CONVERSIÓN (SANT COLOMBA) */}
                      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                         <h4 className="font-black uppercase text-xs italic border-b-2 border-black pb-2 mb-6">Embudo de Conversión (Sales Funnel)</h4>
                         <div className="space-y-4">
                            {[
                              { label: 'Visitas Totales', val: listaVisitas.length, color: 'bg-black text-white' },
                              { label: 'Producto Visto', val: listaVisitas.filter(v => v.producto_id).length, color: 'bg-zinc-800 text-white' },
                              { label: 'Interés Real (>10s)', val: listaVisitas.filter(v => v.tiempo_s >= 10).length, color: 'bg-zinc-600 text-white' },
                              { label: 'Intento de Compra', val: listaVisitas.filter(v => v.evento === 'add_to_cart').length, color: 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' },
                            ].map((step, idx) => {
                               const percentage = listaVisitas.length > 0 ? (step.val / listaVisitas.length) * 100 : 0;
                               return (
                                 <div key={idx} className="relative group">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest">{step.label}</span>
                                      <span className="text-[10px] font-black italic">{step.val} ({percentage.toFixed(0)}%)</span>
                                    </div>
                                    <div className="h-10 border-2 border-black bg-gray-50 relative overflow-hidden">
                                       <motion.div 
                                         initial={{ width: 0 }} 
                                         animate={{ width: `${percentage}%` }} 
                                         className={`h-full flex items-center px-4 font-black text-[12px] italic transition-all ${step.color}`}
                                       >
                                         {percentage > 15 && `${percentage.toFixed(0)}%`}
                                       </motion.div>
                                    </div>
                                 </div>
                               )
                            })}
                         </div>
                      </div>

                      {/* RANKING DE PRODUCTOS "HOT" (ORDENADO) */}
                      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                         <div className="p-4 border-b-4 border-black flex justify-between items-center bg-zinc-50 italic">
                           <h4 className="font-black uppercase text-xs">Ranking de Interés Principal</h4>
                           <TrendingUp size={16} strokeWidth={3} />
                         </div>
                         <div className="p-6 space-y-4">
                            {listaProductos
                              .map(p => ({
                                ...p,
                                vistas: listaVisitas.filter(v => v.producto_id === p.id).length,
                                intentos: listaVisitas.filter(v => v.producto_id === p.id && v.evento === 'add_to_cart').length
                              }))
                              .sort((a, b) => b.intentos - a.intentos || b.vistas - a.vistas)
                              .slice(0, 5)
                              .map((p, idx) => {
                                 const ratio = p.vistas > 0 ? (p.intentos / p.vistas) * 100 : 0;
                                 return (
                                   <div key={p.id} className="relative flex items-center gap-4 border-b border-black/5 pb-4 last:border-0 last:pb-0">
                                      <div className="text-2xl font-black text-black/10 italic">#{idx + 1}</div>
                                      <img src={p.imagen_principal} className="w-12 h-12 object-cover border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                                      <div className="flex-1">
                                         <p className="text-[10px] font-black uppercase truncate w-32 md:w-48 leading-none mb-1">{p.nombre}</p>
                                         <div className="flex gap-4">
                                            <span className="text-[8px] font-black uppercase text-gray-400 italic">{p.vistas} Vistas</span>
                                            <span className="text-[8px] font-black uppercase text-black bg-yellow-400 px-1 border border-black">{p.intentos} Intentos</span>
                                         </div>
                                      </div>
                                      <div className={`text-xl font-black italic ${ratio > 15 ? 'text-green-600' : 'text-black'}`}>
                                         {ratio.toFixed(0)}%
                                      </div>
                                   </div>
                                 )
                              })}
                         </div>
                      </div>

                      {/* CIUDADES TOP (HEATMAP ANALOG) */}
                      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                         <h4 className="font-black uppercase text-xs italic border-b-2 border-black pb-2 mb-4 flex items-center gap-2"> <MapPin size={14} /> Penetración por Ciudad</h4>
                         <div className="space-y-3">
                            {Array.from(new Set(listaVisitas.map(v => v.ciudad).filter(Boolean)))
                              .map(city => ({
                                ciudad: city,
                                count: listaVisitas.filter(v => v.ciudad === city).length
                              }))
                              .sort((a, b) => b.count - a.count)
                              .slice(0, 5)
                              .map((c, i) => (
                                <div key={i} className="space-y-1">
                                   <div className="flex justify-between text-[9px] font-black uppercase">
                                      <span>{c.ciudad}</span>
                                      <span>{c.count} Visitas</span>
                                   </div>
                                   <div className="h-3 border border-black bg-gray-50 overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${Math.min((c.count / listaVisitas.length) * 100 * 2, 100)}%` }} 
                                        className="h-full bg-black italic"
                                      />
                                   </div>
                                </div>
                              ))
                            }
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* PESTAÑA INVENTARIO PRO */}
            {activeTab === "stock" && (
              <div className="space-y-6 animate-in fade-in">
                {!productoInventario ? (
                  <div className="bg-white border-2 border-black p-10 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Search size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="font-black uppercase italic text-lg mb-4 text-black">Gestión de Existencias por Variantes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      {listaProductos.map(p => (
                        <div key={p.id} onClick={() => { setProductoInventario(p); cargarVariantes(p.id); }} className="border-2 border-black p-3 hover:bg-[#FCD7DE] cursor-pointer flex items-center gap-4 text-black">
                          <img src={p.imagen_principal} className="w-10 h-10 object-cover border border-black" />
                          <span className="font-black text-[10px] uppercase">{p.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button onClick={() => setProductoInventario(null)} className="flex items-center gap-2 text-[10px] font-black uppercase hover:underline text-black"> <ChevronLeft size={14} /> Volver</button>
                    <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <h3 className="font-black uppercase italic text-sm mb-4 border-b-2 border-black pb-2">Generador Automático de Matriz</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Selector de Colores */}
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase text-gray-500">Paso 1: Elige los Colores</p>
                           <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-2 border-dashed border-black/10">
                              {listaAtributos.find(a => a.nombre.toLowerCase().includes('color'))?.atributo_valores?.map((v: any) => (
                                <button 
                                  key={v.id} 
                                  onClick={() => setSeleccionMultipleColores(p => p.includes(v.id) ? p.filter(id => id !== v.id) : [...p, v.id])}
                                  className={`px-3 py-1.5 text-[9px] font-black uppercase border-2 transition-all ${seleccionMultipleColores.includes(v.id) ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(252,215,222,1)]' : 'bg-white border-gray-200'}`}
                                >
                                  {v.valor.split('|')[0]}
                                </button>
                              ))}
                           </div>
                        </div>

                        {/* Selector de Tallas */}
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase text-gray-500">Paso 2: Elige las Tallas</p>
                           <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-2 border-dashed border-black/10">
                              {listaAtributos.find(a => a.nombre.toLowerCase().includes('talla'))?.atributo_valores?.map((v: any) => (
                                <button 
                                  key={v.id} 
                                  onClick={() => setSeleccionMultipleTallas(p => p.includes(v.id) ? p.filter(id => id !== v.id) : [...p, v.id])}
                                  className={`px-3 py-1.5 text-[9px] font-black uppercase border-2 transition-all ${seleccionMultipleTallas.includes(v.id) ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(252,215,222,1)]' : 'bg-white border-gray-200'}`}
                                >
                                  {v.valor}
                                </button>
                              ))}
                           </div>
                        </div>

                      </div>

                      <button 
                        onClick={generarMatrizVariantes}
                        disabled={isMatrixGenerating}
                        className="w-full mt-6 bg-black text-white font-black uppercase py-4 shadow-[4px_4px_0px_0px_rgba(252,215,222,1)] hover:bg-[#FCD7DE] hover:text-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isMatrixGenerating ? "Generando..." : "Sincronizar Combinaciones y Generar Variantes"}
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-t-0 bg-yellow-50">
                       <p className="text-[9px] font-black uppercase text-black/50 italic flex items-center gap-2">
                          <Activity size={12} /> Selecciona los colores y tallas que deseas activar para este producto y el sistema creará las variantes por ti.
                       </p>
                    </div>
                    <div className="bg-white border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <table className="w-full text-[10px] font-bold text-black">
                        <thead className="bg-black text-white uppercase italic">
                          <tr><th className="p-3 text-left">Variante</th><th className="p-3">SKU</th><th className="p-3">Stock</th><th className="p-3">Acción</th></tr>
                        </thead>
                        <tbody>
                          {variantesProducto.map(v => (
                            <tr key={v.id} className="border-b border-gray-100 uppercase">
                              <td className="p-3">{v.variante_atributos?.map((va: any) => va.atributo_valores?.valor).join(' / ') || 'Base'}</td>
                              <td className="p-3 text-gray-400 text-center">{v.sku}</td>
                              <td className="p-3 text-center">
                                <input 
                                  id={`stock-${v.id}`}
                                  type="number" 
                                  defaultValue={v.stock} 
                                  className="w-20 border-2 border-black p-1 text-center font-black text-black" 
                                />
                              </td>
                              <td className="p-3 text-center flex items-center justify-center gap-3">
                                <button 
                                  title="Guardar Stock"
                                  onClick={async () => {
                                    const input = document.getElementById(`stock-${v.id}`) as HTMLInputElement;
                                    const nuevoStock = parseInt(input.value);
                                    const { error } = await supabase.from('variantes_producto').update({ stock: nuevoStock }).eq('id', v.id);
                                    if (error) alert("Error: " + error.message);
                                    else {
                                      alert("Stock actualizado ✅");
                                      cargarVariantes(productoInventario.id);
                                    }
                                  }}
                                  className="text-green-600 hover:scale-110 transition-transform flex items-center gap-1 font-black"
                                >
                                  <Check size={18} />
                                </button>
                                <button onClick={() => eliminarVariante(v.id)} className="text-red-600 hover:text-red-800 transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA ATRIBUTOS CON MODAL */}
            {activeTab === "atributos" && (
              <div className="space-y-8 animate-in fade-in">
                <div className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="font-black uppercase text-lg border-b-2 border-black mb-4 italic text-black">Gestión Atributos</h3>
                  <div className="flex gap-2">
                    <input placeholder="NOMBRE ATRIBUTO" className="flex-1 p-3 border-2 border-black font-bold outline-none uppercase text-black" value={nuevoAtributo} onChange={e => setNuevoAtributo(e.target.value)} />
                    <button onClick={async () => {
                      await supabase.from('atributos').insert([{ nombre: nuevoAtributo.toUpperCase() }]);
                      setNuevoAtributo(""); cargarAtributos();
                    }} className="bg-black text-white px-6 font-black uppercase tracking-widest">Crear</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {listaAtributos.map(attr => (
                    <div key={attr.id} className="bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative text-black">
                      <p className="font-black uppercase text-sm italic mb-4 flex justify-between items-center">
                        {attr.nombre} 
                        <button onClick={() => eliminarAtributo(attr.id)} className="text-red-500 hover:scale-110 transition-transform">
                          <Trash2 size={16} />
                        </button>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attr.atributo_valores?.map((v: any) => {
                          const name = v.valor.split('|')[0];
                          return (
                            <span key={v.id} className="group flex items-center gap-2 px-3 py-1 bg-black text-white font-black text-[9px] uppercase rounded-full border border-black hover:bg-white hover:text-black transition-all">
                               {name}
                               <button 
                                 onClick={() => eliminarValorAtributo(v.id)}
                                 className="opacity-0 group-hover:opacity-100 text-red-500 ml-1 hover:scale-125 transition-all"
                               >
                                 <X size={10} />
                               </button>
                            </span>
                          );
                        })}
                        <button onClick={() => { setAtributoSeleccionado(attr); setIsModalOpen(true); }} className="px-3 py-1 border-2 border-black border-dashed font-black text-[10px] hover:bg-black hover:text-white transition-colors">{attr.atributo_valores?.length > 0 ? '+' : 'Añadir Valores'}</button>
                      </div>
                    </div>
                  ))}
                </div>

                <AnimatePresence>
                  {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border-4 border-black p-8 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="font-black uppercase italic text-xl">Añadir a {atributoSeleccionado?.nombre}</h4>
                          <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                        </div>
                        <div className="space-y-4 mb-8">
                           <div>
                             <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Nombre del {atributoSeleccionado?.nombre}</label>
                             <input autoFocus placeholder="EJ: ROJO" className="w-full p-4 border-2 border-black font-black uppercase outline-none text-black" value={nuevoValorAtributo} onChange={e => setNuevoValorAtributo(e.target.value)} />
                           </div>

                        </div>
                        <button onClick={manejarGuardarValorAtributo} className="w-full bg-black text-white py-4 font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_rgba(252,215,222,1)] active:translate-y-1 active:shadow-none transition-all border-2 border-black">Guardar Valor</button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* PESTAÑA CATEGORÍAS */}
            {activeTab === "categorias" && (
              <div className="space-y-8 animate-in fade-in">
                <form onSubmit={crearCategoria} className="bg-white p-6 border-2 border-black space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black">
                  <h3 className="font-black uppercase italic text-xl border-b-2 border-black pb-2">Nueva Categoría Maestro</h3>
                  <input required placeholder="NOMBRE" className="w-full p-3 border-2 border-black font-bold outline-none uppercase text-black" value={nuevaCategoria.nombre} onChange={e => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })} />

                  <div className="bg-gray-50 border-2 border-black p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Selecciona la imagen (URL o Sube el Archivo)</p>
                    <input placeholder="PEGAR URL DE IMAGEN" className="w-full p-3 border-2 border-black font-bold outline-none text-black" value={nuevaCategoria.imagen} onChange={e => setNuevaCategoria({ ...nuevaCategoria, imagen: e.target.value })} />
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-black"></div>
                      <span className="font-black text-[10px] uppercase">Ó</span>
                      <div className="flex-1 h-px bg-black"></div>
                    </div>
                    <input id="file-upload-cat" type="file" accept="image/*" onChange={e => setImagenFileCat(e.target.files ? e.target.files[0] : null)} className="w-full pl-2 py-2 border-2 text-[11px] font-bold border-black outline-none text-black bg-white cursor-pointer file:mr-4 file:py-2 file:px-4 file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-black file:text-white hover:file:bg-zinc-800" />
                  </div>

                  <button disabled={loading} className="bg-black text-white w-full py-4 font-black uppercase tracking-widest disabled:opacity-50">{loading ? "GUARDANDO..." : "CREAR CATEGORÍA"}</button>
                </form>

                <div className="space-y-6">
                  <h3 className="font-black uppercase text-xl italic text-black border-b-2 border-black pb-2">Categorías Vigentes</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {listaCategorias.map(cat => (
                      <div key={cat.id} className="relative aspect-square border-2 border-black overflow-hidden group shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <img src={cat.imagen} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-black p-2 text-center uppercase font-black text-[10px] text-black">
                          {cat.nombre}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}