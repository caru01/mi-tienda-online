import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Save, X, MessageSquarePlus, ToggleLeft, ToggleRight } from 'lucide-react'

import { API_URL } from '../config';

const EMPTY_PRODUCT = { name: '', description: '', emoji: '🍔', price: '', category: 'Combos' }

type Category = { name: string; visible: boolean }

export default function CatalogTab() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingCat, setTogglingCat] = useState<string | null>(null)

  // Modal crear/editar
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingProduct, setEditingProduct] = useState<any>(EMPTY_PRODUCT)
  const [saving, setSaving] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const FOOD_EMOJIS = ['🍔', '🍕', '🌭', '🍟', '🌮', '🌯', '🥗', '🍗', '🥩', '🥓', '🥪', '🥙', '🥤', '🍺', '🍻', '🍹', '🍷', '☕', '🍩', '🍪', '🍰', '🧁', '🍦', '🍨', '🍧', '🥞', '🧇', '🥑', '🌶️', '🧀']

  // Modal eliminar
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)


  const fetchData = async () => {
    const [statsRes, catsRes] = await Promise.all([
      fetch(`${API_URL}/stats`),
      fetch(`${API_URL}/categories`),
    ])
    const statsJson = await statsRes.json()
    const catsJson = await catsRes.json()
    if (statsJson.status === 'ok') setProducts(statsJson.products || [])
    if (catsJson.status === 'ok') setCategories(catsJson.categories || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!editingProduct.name || !editingProduct.price) return
    setSaving(true)
    try {
      let res;
      if (modal === 'create') {
        res = await fetch(`${API_URL}/products/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingProduct, price: parseFloat(editingProduct.price), is_active: true })
        })
      } else if (modal === 'edit') {
        res = await fetch(`${API_URL}/products/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingProduct, price: parseFloat(editingProduct.price) })
        })
      }
      
      const data = await res?.json()
      if (data?.status === 'error') {
        alert("Error al guardar: " + data.message)
        return
      }

      setModal(null)
      setEditingProduct(EMPTY_PRODUCT)
      await fetchData()
    } catch (e) {
      alert("Error de red al guardar el producto.")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string, is_active: boolean) => {
    await fetch(`${API_URL}/products/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: id, is_active: !is_active })
    })
    await fetchData()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await fetch(`${API_URL}/products/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: deleteId })
      })
      setDeleteId(null)
      await fetchData()
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (p: any) => {
    setEditingProduct({ ...p, price: String(p.price) })
    setModal('edit')
  }

  // Agrupar por categoría
  const grouped: Record<string, any[]> = {}
  for (const p of products) {
    const cat = p.category || 'Combos'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  }

  const handleCategoryToggle = async (category: string, currentVisible: boolean) => {
    setTogglingCat(category)
    try {
      await fetch(`${API_URL}/categories/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, visible: !currentVisible })
      })
      await fetchData()
    } finally {
      setTogglingCat(null)
    }
  }

  if (loading) return <div className="animate-pulse text-gray-400 p-8">Cargando productos...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Menú / Carta</h2>
          <p className="text-sm text-gray-400 mt-1">{products.length} productos · {categories.length} categorías</p>
        </div>
        <button
          onClick={() => { setEditingProduct(EMPTY_PRODUCT); setModal('create') }}
          className="flex items-center gap-2 bg-distrito-accent text-black font-black px-5 py-2.5 rounded-xl hover:bg-yellow-300 transition-all shadow-lg"
        >
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* ── PANEL: Botones de Bienvenida del Bot ── */}
      <div className="glass rounded-2xl border border-distrito-accent/20 p-5">
        <div className="flex items-center gap-3 mb-3">
          <MessageSquarePlus size={20} className="text-distrito-accent" />
          <div>
            <h3 className="font-black text-white">Botones de Bienvenida del Bot</h3>
            <p className="text-xs text-gray-400">Cada categoría activa aparece automáticamente como un botón cuando el cliente escribe "Hola". Máximo 3 botones.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {categories.length === 0 ? (
            <span className="text-xs text-gray-500">Crea productos con distintas categorías para generar botones</span>
          ) : categories.map(cat => (
            <div key={cat.name} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
              cat.visible 
                ? 'bg-distrito-accent/10 border-distrito-accent/30' 
                : 'bg-white/5 border-white/10 opacity-60'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`font-black text-sm ${cat.visible ? 'text-distrito-accent' : 'text-gray-400'}`}>
                  📲 Ver {cat.name}
                </span>
                {!cat.visible && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full uppercase font-bold">Oculto</span>}
              </div>
              
              <button
                disabled={togglingCat === cat.name}
                onClick={() => handleCategoryToggle(cat.name, cat.visible)}
                className={`p-1.5 rounded-xl transition-all ${
                  togglingCat === cat.name ? 'opacity-50 cursor-wait' :
                  cat.visible ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:bg-white/10'
                }`}
              >
                {cat.visible ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          💡 Para agregar un botón nuevo, crea un producto con una categoría distinta. Ej: categoría "Bebidas" → botón "Ver Bebidas".
        </p>
      </div>

      {/* ── PRODUCTOS POR CATEGORÍA ── */}
      {Object.keys(grouped).map(cat => (
        <div key={cat} className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-b border-white/10">
            <h3 className="font-black text-sm tracking-wider uppercase text-gray-300">{cat}</h3>
            <span className="text-xs text-gray-500">{grouped[cat].length} producto{grouped[cat].length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-white/5">
            {grouped[cat].map((item: any) => (
              <div key={item.id} className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/5 ${!item.is_active ? 'opacity-50' : ''}`}>
                {/* Emoji */}
                <span className="text-2xl flex-shrink-0 w-9 text-center">{item.emoji || '🍔'}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white truncate">{item.name}</p>
                    {!item.is_active && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  <p className="text-distrito-accent font-black text-sm mt-0.5">${Number(item.price).toLocaleString()}</p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Toggle activo/inactivo */}
                  <button
                    onClick={() => handleToggle(item.id, item.is_active)}
                    title={item.is_active ? 'Desactivar' : 'Activar'}
                    className={`p-2 rounded-xl transition-all ${item.is_active ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-600 hover:bg-white/5'}`}
                  >
                    {item.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>

                  {/* Editar */}
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 rounded-xl text-blue-400 hover:bg-blue-500/10 transition-all"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>

                  {/* Eliminar */}
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {products.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-5xl mb-4">🍔</p>
          <p className="font-bold">No hay productos todavía.</p>
          <p className="text-sm">Presiona "Nuevo Producto" para comenzar.</p>
        </div>
      )}

      {/* ══════════════════════════════
          MODAL: Crear / Editar Producto
          ══════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>

            <h3 className="text-xl font-black mb-5 text-white">
              {modal === 'create' ? '➕ Nuevo Producto' : '✏️ Editar Producto'}
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1 relative">
                  <label className="block text-xs text-gray-400 mb-1">Emoji</label>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-full bg-black/40 border border-white/10 hover:bg-white/10 transition-colors rounded-xl p-3 text-center text-2xl"
                  >
                    {editingProduct.emoji}
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-white/10 rounded-xl p-3 shadow-2xl z-50 w-64">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-400 font-bold">Selecciona un emoji</span>
                        <button onClick={() => setShowEmojiPicker(false)} className="text-gray-500 hover:text-white"><X size={14}/></button>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {FOOD_EMOJIS.map(em => (
                          <button
                            key={em}
                            onClick={() => {
                              setEditingProduct({ ...editingProduct, emoji: em })
                              setShowEmojiPicker(false)
                            }}
                            className="text-xl hover:bg-white/10 rounded-lg p-1 transition-colors"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
                  <input
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                    placeholder="Ej: Combo Personal"
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Descripción corta</label>
                <input
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                  placeholder="Ej: 1 Burger + Papas + Bebida"
                  value={editingProduct.description}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Precio * (sin puntos)</label>
                  <input
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"
                    type="number"
                    placeholder="15000"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Categoría</label>
                  <div className="flex gap-2">
                    <select
                      className={`bg-black/40 border border-white/10 rounded-xl p-3 text-white appearance-none ${!categories.some(c => c.name === editingProduct.category) ? 'w-1/2' : 'w-full'}`}
                      value={categories.some(c => c.name === editingProduct.category) ? editingProduct.category : '__new__'}
                      onChange={e => {
                        if (e.target.value !== '__new__') {
                          setEditingProduct({ ...editingProduct, category: e.target.value })
                        } else {
                          setEditingProduct({ ...editingProduct, category: '' })
                        }
                      }}
                    >
                      {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      <option value="__new__">+ Crear Nueva</option>
                    </select>
                    
                    {!categories.some(c => c.name === editingProduct.category) && (
                      <input
                        className="w-1/2 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-distrito-accent outline-none"
                        placeholder="Nombre de categoría..."
                        value={editingProduct.category}
                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingProduct.name || !editingProduct.price}
                className="flex-1 py-3 rounded-xl font-black bg-distrito-accent text-black hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          MODAL: Confirmar Eliminación
          ══════════════════════════════ */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className="text-xl font-black text-white mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-gray-400 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-black bg-red-500 text-white hover:bg-red-400 transition-all disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
