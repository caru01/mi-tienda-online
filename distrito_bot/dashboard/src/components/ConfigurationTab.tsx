import React, { useState } from 'react';

import { API_URL } from '../config';

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
      const res = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json()
      if (data.status === 'success') {
        setMessage('✅ Configuración guardada correctamente')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('❌ Error: ' + (data.message || 'No se pudo guardar'))
      }
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

      {/* ── SWITCH PRINCIPAL: Desactivar mensajes automáticos ─────────────── */}
      <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
        settings.bot_mode_manual
          ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
          : 'bg-green-500/10 border-green-500/30'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`text-3xl transition-all ${settings.bot_mode_manual ? 'grayscale-0' : ''}`}>
              {settings.bot_mode_manual ? '🔇' : '🤖'}
            </div>
            <div>
              <h4 className={`font-black text-lg ${settings.bot_mode_manual ? 'text-orange-400' : 'text-green-400'}`}>
                {settings.bot_mode_manual ? 'Bot SILENCIADO — Modo Escucha' : 'Bot ACTIVO — Modo Automático'}
              </h4>
              <p className="text-sm text-gray-400 mt-0.5">
                {settings.bot_mode_manual
                  ? '⚠️ El bot NO enviará ningún mensaje automático. Solo escucha y registra los mensajes y números.'
                  : 'El bot responde automáticamente a los clientes con mensajes y flujo de pedido.'}
              </p>
            </div>
          </div>
          {/* Toggle switch */}
          <button
            onClick={async () => {
              const newVal = !settings.bot_mode_manual
              setSettings({ ...settings, bot_mode_manual: newVal })
              try {
                await fetch(`${API_URL}/settings`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...settings, bot_mode_manual: newVal })
                })
              } catch (e) { console.error(e) }
            }}
            className={`relative flex-shrink-0 w-16 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${
              settings.bot_mode_manual
                ? 'bg-orange-500 focus:ring-orange-500'
                : 'bg-green-500 focus:ring-green-500'
            }`}
          >
            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${
              settings.bot_mode_manual ? 'left-9' : 'left-1'
            }`} />
          </button>
        </div>

        {settings.bot_mode_manual && (
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm text-orange-300">
            <strong>📋 Modo Escucha activo:</strong> Todos los mensajes entrantes siguen siendo registrados en la base de datos. Los números de WhatsApp y sus mensajes quedan guardados. Solo se bloquea el envío de respuestas automáticas.
          </div>
        )}
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

      {/* Catálogo e Imagen */}
      <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
        <h3 className="text-xl font-bold text-distrito-accent mb-4">Imagen del Catálogo</h3>
        
        <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
          <div>
            <p className="font-bold text-white">Activar Imagen de Catálogo</p>
            <p className="text-sm text-gray-400">Si se activa, el bot enviará esta imagen junto con la lista de opciones de combos.</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, catalog_image_enabled: settings.catalog_image_enabled !== false ? false : true })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.catalog_image_enabled !== false ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.catalog_image_enabled !== false ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {settings.catalog_image_enabled !== false && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">URL de la Imagen (Debe ser un enlace público)</label>
            <input 
              type="text" 
              placeholder="https://ejemplo.com/imagen.jpg"
              value={settings.catalog_image_url || ''}
              onChange={(e) => setSettings({...settings, catalog_image_url: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white mb-2"
            />
            {settings.catalog_image_url && (
              <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden border border-white/10">
                <img src={settings.catalog_image_url} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}
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
