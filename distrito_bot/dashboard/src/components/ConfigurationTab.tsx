import React, { useState } from 'react';

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard';

export default function ConfigurationTab() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  React.useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(r => r.json())
      .then(data => {
        setSettings(data.settings)
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setMessage('')
    try {
      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setMessage('✅ Configuración guardada correctamente')
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      console.error(e)
      setMessage('❌ Error al guardar')
    }
  }

  if (loading) return <div className="animate-pulse">Cargando configuración...</div>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold">Configuración del Bot</h2>
        <button 
          onClick={handleSave}
          className="w-full md:w-auto bg-distrito-accent text-distrito-dark px-6 py-2 rounded-lg font-bold hover:shadow-[0_0_15px_rgba(255,204,0,0.4)] transition-all"
        >
          Guardar Cambios
        </button>
      </div>

      {message && (
        <div className="p-3 bg-green-900/50 text-green-300 border border-green-700 rounded-lg">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
        <div>
          <h4 className="font-bold">Modo Manual</h4>
          <p className="text-sm text-gray-400">Si está activo, el bot no responderá automáticamente a los mensajes.</p>
        </div>
        <button 
          onClick={() => setSettings({...settings, bot_mode_manual: !settings.bot_mode_manual})}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${settings.bot_mode_manual ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}
        >
          {settings.bot_mode_manual ? 'ON (Manual)' : 'OFF (Automático)'}
        </button>
      </div>

      {/* Variables de Entorno */}
      <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
        <h3 className="text-xl font-bold text-distrito-accent mb-4">Credenciales y Conexión</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">WhatsApp Token (Opcional)</label>
            <input 
              type="password" 
              placeholder="EAA..."
              value={settings.whatsapp_token || ''}
              onChange={(e) => setSettings({...settings, whatsapp_token: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">WhatsApp Phone ID</label>
            <input 
              type="text" 
              placeholder="123456789"
              value={settings.whatsapp_phone_id || ''}
              onChange={(e) => setSettings({...settings, whatsapp_phone_id: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">YCloud API Key</label>
            <input 
              type="password" 
              value={settings.ycloud_api_key || ''}
              onChange={(e) => setSettings({...settings, ycloud_api_key: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Si configuras el Token de WhatsApp directamente, no necesitas YCloud API Key.</p>
          </div>
        </div>
      </div>

      {/* Textos del Bot Principales */}
      <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
        <h3 className="text-xl font-bold text-distrito-accent mb-4">Mensajes Principales</h3>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Bienvenida</label>
          <textarea 
            value={settings.welcome_message || ''}
            onChange={(e) => setSettings({...settings, welcome_message: e.target.value})}
            className="w-full h-20 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje Fuera de Horario</label>
          <textarea 
            value={settings.off_hours_message || ''}
            onChange={(e) => setSettings({...settings, off_hours_message: e.target.value})}
            className="w-full h-20 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Cuentas Bancarias / Transferencia</label>
          <textarea 
            value={settings.payment_transfer_text || ''}
            onChange={(e) => setSettings({...settings, payment_transfer_text: e.target.value})}
            className="w-full h-32 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white font-mono text-sm"
          />
        </div>
      </div>

      {/* Textos del Flujo de Pedido */}
      <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
        <h3 className="text-xl font-bold text-distrito-accent mb-4">Textos del Flujo de Pedido</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Pedir Nombre</label>
            <input 
              value={settings.msg_ask_name || ''}
              onChange={(e) => setSettings({...settings, msg_ask_name: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Pedir Tipo de Entrega</label>
            <input 
              value={settings.msg_ask_delivery || ''}
              onChange={(e) => setSettings({...settings, msg_ask_delivery: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Pedir Dirección</label>
            <input 
              value={settings.msg_ask_address || ''}
              onChange={(e) => setSettings({...settings, msg_ask_address: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Pedir Barrio</label>
            <input 
              value={settings.msg_ask_neighborhood || ''}
              onChange={(e) => setSettings({...settings, msg_ask_neighborhood: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Pedir Medio de Pago</label>
            <input 
              value={settings.msg_ask_payment || ''}
              onChange={(e) => setSettings({...settings, msg_ask_payment: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Pedido Registrado (Esperando Confirmación del Restaurante)</label>
            <textarea 
              value={settings.msg_order_registered || ''}
              onChange={(e) => setSettings({...settings, msg_order_registered: e.target.value})}
              className="w-full h-16 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Textos del Kanban */}
      <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
        <h3 className="text-xl font-bold text-distrito-accent mb-4">Estados del Pedido (Kanban)</h3>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Pedido Aceptado (Entra a Fila / Preparación)</label>
          <textarea 
            value={settings.msg_order_accepted || ''}
            onChange={(e) => setSettings({...settings, msg_order_accepted: e.target.value})}
            className="w-full h-24 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Pedido en Camino (Domicilio)</label>
          <textarea 
            value={settings.msg_order_dispatched || ''}
            onChange={(e) => setSettings({...settings, msg_order_dispatched: e.target.value})}
            className="w-full h-20 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Pedido Listo (Recoger en Local)</label>
          <textarea 
            value={settings.msg_ready_pickup || ''}
            onChange={(e) => setSettings({...settings, msg_ready_pickup: e.target.value})}
            className="w-full h-20 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button 
          onClick={handleSave}
          className="bg-distrito-accent text-distrito-dark px-8 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all"
        >
          Guardar Cambios
        </button>
      </div>

    </div>
  )
}
