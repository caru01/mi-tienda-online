import Navbar from "@/components/Navbar";
import ImageCarousel from "@/components/ImageCarousel";
import CategorySection from "@/components/CategorySection";
import ProductCarousel from "@/components/ProductCarousel";
import Footer from "@/components/Footer";
import ParaTiSection from "@/components/ParaTiSection";
import Marquee from "@/components/Marquee";
import BrandTrustSection from "@/components/BrandTrustSection";

export default function Home() {
  return (
    <>
      <Navbar />
      <ImageCarousel />
      <Marquee />
      <CategorySection />
      <ProductCarousel />
      <ParaTiSection />
      <BrandTrustSection />
      <Footer />
    </>
  );
}