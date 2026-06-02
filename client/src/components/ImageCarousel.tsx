"use client"; // Indica que este componente es interactivo en el cliente

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const images = [
  "/assets/banner-slide-1.webp", // Asegúrate de tener estas imágenes en public/assets
  "/assets/banner-slide-2.webp",
  "/assets/banner-slide-3.webp",
];

export default function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Cambia de imagen cada 5 segundos

    return () => clearInterval(interval); // Limpia el intervalo al desmontar
  }, []);

  return (
    <div className="relative w-full h-[500px] overflow-hidden">
      <AnimatePresence initial={false} custom={currentIndex}>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Banner Slide ${currentIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.5 }} // Duración de la transición entre imágenes
        />
      </AnimatePresence>
      {/* Opcional: Indicadores de slide */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full ${
              index === currentIndex ? "bg-white" : "bg-gray-400 opacity-75"
            }`}
            onClick={() => setCurrentIndex(index)}
          ></button>
        ))}
      </div>
    </div>
  );
}