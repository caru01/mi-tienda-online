import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'

interface BotSettings {
  id?: number
  is_open: boolean
  business_open_hour: number
  business_open_minute: number
  business_close_hour: number
  business_close_minute: number
  business_days: string
  kitchen_phone: string
  pickup_address: string
  welcome_message: string
  off_hours_message: string
  backup_reply_message: string
  payment_transfer_text: string
  msg_order_accepted: string
  msg_order_dispatched: string
}

export default function ConfigurationTab() {
  const [settings, setSettings] = useState<BotSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard'

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/settings`)
      const data = await res.json()
      if (data.status === 'ok') {
        setSettings(data.settings)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const data = await res.json()
      if (data.status === 'success') {
        setMessage('Configuración guardada exitosamente')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Error al guardar: ' + data.message)
      }
    } catch (e) {
      setMessage('Error de red al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return <div className="text-distrito-text p-4">Cargando configuración...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-distrito-accent">Configuración del Restaurante</h2>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-distrito-accent text-distrito-dark px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-yellow-300 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-green-900/50 text-green-300 border border-green-700 rounded-lg">
          {message}
        </div>
      )}

      {/* Operación Manual */}
      <div className="glass rounded-xl p-6 border border-white/10 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">Estado de Operación</h3>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="checkbox" 
            checked={settings.is_open}
            onChange={(e) => setSettings({...settings, is_open: e.target.checked})}
            className="w-5 h-5 accent-distrito-accent rounded"
          />
          <span className="text-gray-300">
            Mantener Restaurante Abierto (Si se desmarca, el bot siempre dirá que está cerrado sin importar la hora)
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Horarios */}
        <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white">Horario Automático</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Apertura (Hora Militar)</label>
              <input 
                type="number" min="0" max="23"
                value={settings.business_open_hour}
                onChange={(e) => setSettings({...settings, business_open_hour: parseInt(e.target.value)})}
                className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Cierre (Hora Militar)</label>
              <input 
                type="number" min="0" max="23"
                value={settings.business_close_hour}
                onChange={(e) => setSettings({...settings, business_close_hour: parseInt(e.target.value)})}
                className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-400 mb-1">Días Laborables</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: '0', label: 'Lunes' },
                { id: '1', label: 'Martes' },
                { id: '2', label: 'Miércoles' },
                { id: '3', label: 'Jueves' },
                { id: '4', label: 'Viernes' },
                { id: '5', label: 'Sábado' },
                { id: '6', label: 'Domingo' }
              ].map(day => {
                const currentDays = settings.business_days ? settings.business_days.split(',') : [];
                const isChecked = currentDays.includes(day.id);
                
                return (
                  <label key={day.id} className={`flex items-center px-3 py-2 rounded-lg cursor-pointer border transition-colors ${isChecked ? 'bg-distrito-accent/20 border-distrito-accent/50 text-distrito-accent' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isChecked}
                      onChange={(e) => {
                        let newDays = [...currentDays];
                        if (e.target.checked) {
                          newDays.push(day.id);
                        } else {
                          newDays = newDays.filter(d => d !== day.id);
                        }
                        // Sort theoretically 0-6
                        newDays.sort();
                        setSettings({...settings, business_days: newDays.join(',')});
                      }}
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* Contacto y Dirección */}
        <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white">Logística</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">WhatsApp de Cocina (Para Tickets)</label>
            <input 
              type="text" 
              value={settings.kitchen_phone}
              onChange={(e) => setSettings({...settings, kitchen_phone: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Dirección de Local (Para Recoger)</label>
            <input 
              type="text" 
              value={settings.pickup_address}
              onChange={(e) => setSettings({...settings, pickup_address: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Textos del Bot */}
      <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white">Textos del Bot</h3>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Bienvenida</label>
          <textarea 
            value={settings.welcome_message}
            onChange={(e) => setSettings({...settings, welcome_message: e.target.value})}
            className="w-full h-24 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje Fuera de Horario</label>
          <textarea 
            value={settings.off_hours_message}
            onChange={(e) => setSettings({...settings, off_hours_message: e.target.value})}
            className="w-full h-24 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Espera / Cortesía (Cuando la cocina está llena)</label>
          <textarea 
            value={settings.backup_reply_message || ''}
            onChange={(e) => setSettings({...settings, backup_reply_message: e.target.value})}
            className="w-full h-24 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Cuentas Bancarias / Transferencia</label>
          <textarea 
            value={settings.payment_transfer_text}
            onChange={(e) => setSettings({...settings, payment_transfer_text: e.target.value})}
            className="w-full h-32 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Pedido Aceptado (Pasa a preparación)</label>
          <textarea 
            value={settings.msg_order_accepted || ''}
            onChange={(e) => setSettings({...settings, msg_order_accepted: e.target.value})}
            className="w-full h-24 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Mensaje de Pedido en Camino (Despachado)</label>
          <textarea 
            value={settings.msg_order_dispatched || ''}
            onChange={(e) => setSettings({...settings, msg_order_dispatched: e.target.value})}
            className="w-full h-24 bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
          />
        </div>
      </div>
    </div>
  )
}
