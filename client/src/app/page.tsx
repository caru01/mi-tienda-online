import Navbar from "@/components/Navbar";
import ImageCarousel from "@/components/ImageCarousel";
import CategorySection from "@/components/CategorySection";
import ProductCarousel from "@/components/ProductCarousel"; // Importar aquí
import Footer from "@/components/Footer"; // Importar el Footer
import ParaTiSection from "@/components/ParaTiSection";

export default function Home() {
  return (
    <>
      <Navbar />
      
      {/* 1. Banner Principal con movimiento */}
      <ImageCarousel />
      
      {/* 2. Sección de Categorías (Iconos circulares) */}
      <CategorySection />
      
      {/* 3. Carrusel de Productos Novedad */}
      <ProductCarousel /> 
      
      {/* Aquí podrías añadir más secciones si lo deseas */}


      {/* SECCIÓN NUEVA */}
      <ParaTiSection />


      {/* <main className="p-8 bg-gray-50 min-h-screen"> */}
        <div className="max-w-7xl mx-auto">
          {/* Este div ya no es necesario, el ProductCarousel ya tiene su propio título */}
          {/* <h2 className="text-3xl font-bold text-center mb-10 mt-4 text-black uppercase tracking-widest">
            Descubre lo Nuevo en GALU<span className="text-blue-500">SHOP</span>
          </h2>
          <div className="text-center text-gray-500 py-20 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-lg italic">Selecciona una categoría arriba para ver nuestros productos.</p>
          </div> */}
        </div>
      {/*</main> */}
      <Footer /> {/* El Footer al final de todo */}
    </>
  );
}