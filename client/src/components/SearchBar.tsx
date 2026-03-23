"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Producto {
    id: string;
    nombre: string;
    precio_base: number;
    imagen_principal: string;
}

interface SearchBarProps {
    onClose?: () => void;
}

export default function SearchBar({ onClose }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const [resultados, setResultados] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Debounce: espera 350ms después de que el usuario deja de escribir
    const buscar = useCallback(async (texto: string) => {
        if (texto.trim().length < 2) {
            setResultados([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        setIsOpen(true);

        try {
            const { data, error } = await supabase
                .from("productos")
                .select("id, nombre, precio_base, imagen_principal")
                .eq("activo", true)
                .ilike("nombre", `%${texto}%`)
                .limit(6);

            if (!error && data) setResultados(data);
        } catch {
            setResultados([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => buscar(query), 350);
        return () => clearTimeout(timer);
    }, [query, buscar]);

    // Cerrar el panel si se hace click fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                panelRef.current &&
                !panelRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleClear = () => {
        setQuery("");
        setResultados([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const handleSelect = () => {
        setQuery("");
        setResultados([]);
        setIsOpen(false);
        onClose?.();
    };

    return (
        <div className="relative w-full max-w-4xl mx-auto">
            {/* Input de búsqueda */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="¿Qué estás buscando hoy?"
                    className="w-full bg-white border-2 border-black text-black rounded-full py-2.5 px-6 pr-16 focus:outline-none focus:ring-2 focus:ring-black/20 transition-all placeholder:text-gray-400 text-sm"
                    style={{ fontFamily: "Arial, sans-serif" }}
                    onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
                />

                {/* Icono: loading o limpiar o lupa */}
                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center">
                    {loading ? (
                        <Loader2 size={18} className="text-gray-400 animate-spin" />
                    ) : query ? (
                        <button onClick={handleClear} className="text-gray-400 hover:text-black transition-colors">
                            <X size={18} />
                        </button>
                    ) : (
                        <Search size={18} className="text-black" />
                    )}
                </div>
            </div>

            {/* Panel de resultados */}
            {isOpen && (
                <div
                    ref={panelRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-white shadow-2xl border border-gray-100 rounded-2xl z-[200] overflow-hidden"
                >
                    {resultados.length > 0 ? (
                        <>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-4 pt-4 pb-2 border-b border-gray-50">
                                Resultados para &quot;{query}&quot;
                            </p>
                            <ul>
                                {resultados.map((prod) => (
                                    <li key={prod.id}>
                                        <Link
                                            href={`/producto/${prod.id}`}
                                            onClick={handleSelect}
                                            className="flex items-center gap-4 px-4 py-3 hover:bg-[#FCD7DE]/30 transition-colors group"
                                        >
                                            <div className="w-10 h-12 bg-gray-50 rounded-sm overflow-hidden flex-shrink-0">
                                                <img
                                                    src={prod.imagen_principal}
                                                    alt={prod.nombre}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black uppercase text-black truncate group-hover:text-pink-500 transition-colors">
                                                    {prod.nombre}
                                                </p>
                                                <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                                                    ${Number(prod.precio_base).toLocaleString("es-CO")}
                                                </p>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <div className="border-t border-gray-50 px-4 py-3">
                                <Link
                                    href={`/buscar?q=${encodeURIComponent(query)}`}
                                    onClick={handleSelect}
                                    className="text-[10px] font-black uppercase tracking-widest text-black hover:text-pink-500 transition-colors"
                                >
                                    Ver todos los resultados →
                                </Link>
                            </div>
                        </>
                    ) : !loading ? (
                        <div className="px-4 py-6 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 italic">
                                No encontramos &quot;{query}&quot;
                            </p>
                            <p className="text-[9px] text-gray-300 mt-1 uppercase">
                                Intenta con otro término
                            </p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
