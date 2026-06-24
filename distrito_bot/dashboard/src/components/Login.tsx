import React, { useState } from 'react';
import { Lock, LogIn, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
  API_URL: string;
}

export default function Login({ onLoginSuccess, API_URL }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.status === 'ok') {
        onLoginSuccess(data.token);
      } else {
        setError(data.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error conectando con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-distrito-accent/20 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
      
      <div className="glass w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-distrito-accent rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,204,0,0.3)]">
          <Lock className="text-black" size={32} />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight text-center">Panel Seguro</h1>
        <p className="text-gray-400 mb-8 text-center text-sm">Ingresa tus credenciales para acceder al sistema administrativo</p>
        
        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Usuario / Correo</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-distrito-accent focus:ring-1 focus:ring-distrito-accent transition-all"
              placeholder="admin@distrito.com"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-distrito-accent focus:ring-1 focus:ring-distrito-accent transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-distrito-accent text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Verificando...' : (
              <>
                <LogIn size={20} />
                <span>INICIAR SESIÓN</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
