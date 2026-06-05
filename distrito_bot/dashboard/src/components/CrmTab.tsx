import { useState, useEffect } from 'react'
import { Users, Megaphone, Send, Clock, Star, Save, MessageSquareText } from 'lucide-react'

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard'

export default function CrmTab() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  
  // Modal notas
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Broadcast
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_URL}/crm/customers`)
      const data = await res.json()
      if (data.status === 'ok') {
        setCustomers(data.customers || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [])

  // Filtrado
  const filteredCustomers = customers.filter(c => {
    if (filter === 'all') return true
    if (filter === 'vip') return c.total_orders >= 5
    if (filter === 'new') return c.total_orders === 1
    if (filter === 'dormant') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return new Date(c.last_order_at) < thirtyDaysAgo
    }
    return true
  })

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return
    setSavingNotes(true)
    await fetch(`${API_URL}/crm/customers/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_phone: selectedCustomer.customer_phone, notes })
    })
    setSavingNotes(false)
    setSelectedCustomer(null)
    fetchCustomers()
  }

  const handleSendBroadcast = async () => {
    if (!messageBody || !campaignName) return
    if (!confirm(`¿Seguro que deseas enviar este mensaje a ${filteredCustomers.length} clientes en el segmento "${filter}"?`)) return
    
    setSendingBroadcast(true)
    const res = await fetch(`${API_URL}/crm/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_name: campaignName, message_body: messageBody, target_segment: filter })
    })
    const data = await res.json()
    setSendingBroadcast(false)
    
    if (data.status === 'success') {
      alert(`¡Campaña enviada a ${data.sent_count} clientes exitosamente!`)
      setShowBroadcast(false)
      setCampaignName('')
      setMessageBody('')
    } else {
      alert(`Error al enviar: ${data.message}`)
    }
  }

  if (loading) return <div className="p-8 text-gray-400 animate-pulse">Cargando base de datos de clientes...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="text-distrito-accent" /> WhatsApp CRM
          </h2>
          <p className="text-sm text-gray-400 mt-1">{customers.length} clientes registrados en total.</p>
        </div>
        <button
          onClick={() => setShowBroadcast(!showBroadcast)}
          className="flex items-center gap-2 bg-green-500 text-white font-black px-5 py-2.5 rounded-xl hover:bg-green-400 transition-all shadow-lg"
        >
          <Megaphone size={18} /> Nueva Campaña
        </button>
      </div>

      {showBroadcast && (
        <div className="glass rounded-2xl border border-green-500/30 p-6 animate-in slide-in-from-top-4">
          <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Send className="text-green-400" size={18} /> Enviar Mensaje Masivo (Broadcast)
          </h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre de la Campaña (Interno)</label>
              <input 
                value={campaignName} onChange={e => setCampaignName(e.target.value)}
                placeholder="Ej: Promo de Fin de Semana" 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white" 
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Segmento Destino</label>
              <select 
                value={filter} onChange={e => setFilter(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white appearance-none"
              >
                <option value="all">Todos los clientes ({customers.length})</option>
                <option value="vip">Clientes VIP ({customers.filter(c => c.total_orders >= 5).length})</option>
                <option value="new">Clientes Nuevos ({customers.filter(c => c.total_orders === 1).length})</option>
                <option value="dormant">Inactivos +30 días ({customers.filter(c => new Date(c.last_order_at) < new Date(Date.now() - 30*24*60*60*1000)).length})</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">Cuerpo del Mensaje (Soporta *negrita*, _cursiva_ y emojis)</label>
            <textarea 
              value={messageBody} onChange={e => setMessageBody(e.target.value)}
              placeholder="¡Hola! Te extrañamos por acá. Hoy tenemos un 20% de descuento en el Combo Parche..." 
              rows={4}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-yellow-400 max-w-lg">
              ⚠️ Cuidado: Enviar mensajes masivos consume saldo de WhatsApp API. Asegúrate de enviar mensajes relevantes para no ser reportado por spam.
            </p>
            <button
              onClick={handleSendBroadcast}
              disabled={sendingBroadcast || !messageBody || !campaignName}
              className="bg-green-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-400 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {sendingBroadcast ? 'Enviando...' : `Enviar a ${filteredCustomers.length} clientes`}
            </button>
          </div>
        </div>
      )}

      {/* Panel de Filtros Rapidos */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {[
          { id: 'all', icon: <Users size={16}/>, label: 'Todos', count: customers.length },
          { id: 'vip', icon: <Star size={16}/>, label: 'VIPs', count: customers.filter(c => c.total_orders >= 5).length },
          { id: 'new', icon: <Star size={16}/>, label: 'Nuevos', count: customers.filter(c => c.total_orders === 1).length },
          { id: 'dormant', icon: <Clock size={16}/>, label: 'Inactivos', count: customers.filter(c => new Date(c.last_order_at) < new Date(Date.now() - 30*24*60*60*1000)).length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-all ${
              filter === f.id ? 'bg-distrito-accent text-black border-distrito-accent' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
            }`}
          >
            {f.icon} {f.label} <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Tabla de Clientes */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-black">Cliente</th>
                <th className="px-6 py-4 font-black">Teléfono</th>
                <th className="px-6 py-4 font-black text-center">Pedidos</th>
                <th className="px-6 py-4 font-black">Última Compra</th>
                <th className="px-6 py-4 font-black text-center">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white flex items-center gap-2">
                      {c.customer_name || 'Sin nombre'}
                      {c.total_orders >= 5 && <span title="VIP"><Star size={14} className="text-distrito-accent fill-distrito-accent" /></span>}
                    </div>
                    <div className="text-xs text-gray-500">{c.delivery_barrio || 'Sin dirección'}</div>
                  </td>
                  <td className="px-6 py-4 text-white font-mono">{c.customer_phone}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-distrito-accent/10 text-distrito-accent font-black px-2.5 py-1 rounded-lg">
                      {c.total_orders}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs whitespace-nowrap">
                    {new Date(c.last_order_at).toLocaleDateString()} a las {new Date(c.last_order_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => { setSelectedCustomer(c); setNotes(c.notes || ''); }}
                      className={`p-2 rounded-xl transition-all ${c.notes ? 'text-distrito-accent bg-distrito-accent/10' : 'text-gray-500 hover:bg-white/10'}`}
                      title="Ver/Editar Notas"
                    >
                      <MessageSquareText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron clientes en este segmento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Notas */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <h3 className="text-xl font-black mb-1 text-white flex items-center gap-2">
              <MessageSquareText className="text-distrito-accent"/> Notas del Cliente
            </h3>
            <p className="text-sm text-gray-400 mb-5">{selectedCustomer.customer_name || selectedCustomer.customer_phone}</p>
            
            <textarea 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white resize-none mb-4"
              rows={4}
              placeholder="Anota preferencias, alergias o información importante de este cliente..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex-1 py-3 rounded-xl font-black bg-distrito-accent text-black hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {savingNotes ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
