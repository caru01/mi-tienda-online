"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "warning";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback((message: string, type: ToastType = "success") => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-eliminar después de 4 segundos
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const dismiss = (id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const icons: Record<ToastType, React.ReactNode> = {
        success: <CheckCircle size={18} className="text-green-500 flex-shrink-0" />,
        error: <XCircle size={18} className="text-red-500 flex-shrink-0" />,
        warning: <AlertCircle size={18} className="text-orange-500 flex-shrink-0" />,
    };

    const borders: Record<ToastType, string> = {
        success: "border-l-4 border-green-400",
        error: "border-l-4 border-red-400",
        warning: "border-l-4 border-orange-400",
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}

            {/* Contenedor de toasts — esquina inferior derecha */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className={`pointer-events-auto flex items-start gap-3 bg-white shadow-2xl rounded-xl p-4 pr-3 ${borders[t.type]}`}
                            style={{ fontFamily: "Arial, sans-serif" }}
                        >
                            {icons[t.type]}
                            <p className="text-[12px] font-bold text-black leading-snug flex-1">{t.message}</p>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="text-gray-300 hover:text-black transition-colors flex-shrink-0 mt-0.5"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

// Hook para usar toasts desde cualquier componente
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast debe usarse dentro de ToastProvider");
    return context;
};
