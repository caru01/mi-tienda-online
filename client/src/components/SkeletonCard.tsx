// Componente de Skeleton reutilizable para distintas secciones de la tienda

/** Skeleton para una tarjeta de producto (aspect-ratio 3/4) */
export function SkeletonProductCard() {
    return (
        <div className="flex flex-col bg-white animate-pulse">
            {/* Imagen */}
            <div className="aspect-[3/4] w-full bg-gray-100 rounded-sm mb-5" />
            {/* Nombre */}
            <div className="h-3 bg-gray-100 rounded w-3/4 mx-auto mb-2" />
            {/* Precio */}
            <div className="h-5 bg-gray-100 rounded w-1/2 mx-auto mb-2" />
            {/* Línea decorativa */}
            <div className="h-[3px] w-8 bg-gray-100 rounded mx-auto mt-1" />
        </div>
    );
}

/** Skeleton para la sección de categorías (círculos) */
export function SkeletonCategoryCircle() {
    return (
        <div className="flex flex-col items-center space-y-4 animate-pulse">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-100" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
        </div>
    );
}

/** Skeleton para el banner/carrusel principal */
export function SkeletonBanner() {
    return (
        <div className="w-full h-[500px] bg-gray-100 animate-pulse" />
    );
}
