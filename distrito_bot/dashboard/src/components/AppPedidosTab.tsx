import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Settings, Plus, Edit2, Trash2 } from 'lucide-react';

export default function AppPedidosTab() {
  const [settings, setSettings] = useState<any>({ whatsapp_number: '', nequi_number: '', bancolombia_number: '' });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Modal for products
  const [showModal, setShowModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resSettings = await fetch(`${API_URL}/pedidos/settings`);
      const jsonSettings = await resSettings.json();
      if (jsonSettings.status === 'ok' && jsonSettings.settings) {
        setSettings(jsonSettings.settings);
      }

      const resProducts = await fetch(`${API_URL}/pedidos/products`);
      const jsonProducts = await resProducts.json();
      if (jsonProducts.status === 'ok') {
        setProducts(jsonProducts.products);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/pedidos/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessage('✅ Configuración guardada correctamente');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Error al guardar');
      }
    } catch (e) {
      setMessage('❌ Error de conexión');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/pedidos/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProduct)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowModal(false);
        fetchData();
      } else {
        alert('Error al guardar el producto');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      const res = await fetch(`${API_URL}/pedidos/products/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchData();
      }
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const toggleProductActive = async (product: any) => {
    try {
      await fetch(`${API_URL}/pedidos/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, is_active: !product.is_active })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="animate-pulse">Cargando datos de la App de Pedidos...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">App de Pedidos Web</h2>
      </div>

      {message && (
        <div className="p-3 bg-green-900/50 text-green-300 border border-green-700 rounded-lg">
          {message}
        </div>
      )}

      {/* Settings Section */}
      <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="text-distrito-accent" />
          <h3 className="text-xl font-bold text-distrito-accent">Configuración General</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">WhatsApp para recibir pedidos</label>
            <input 
              type="text" 
              value={settings.whatsapp_number || ''}
              onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
              placeholder="Ej: 573000000000"
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Número de Nequi</label>
            <input 
              type="text" 
              value={settings.nequi_number || ''}
              onChange={(e) => setSettings({...settings, nequi_number: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Número Bancolombia / Bre-B</label>
            <input 
              type="text" 
              value={settings.bancolombia_number || ''}
              onChange={(e) => setSettings({...settings, bancolombia_number: e.target.value})}
              className="w-full bg-distrito-dark/50 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button 
            onClick={handleSaveSettings}
            className="bg-distrito-accent text-distrito-dark px-6 py-2 rounded-lg font-bold hover:shadow-[0_0_15px_rgba(255,204,0,0.4)] transition-all"
          >
            Guardar Configuración
          </button>
        </div>
      </div>

      {/* Products Section */}
      <div className="glass rounded-xl p-6 border border-white/10 shadow-xl space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-distrito-accent">Catálogo de la App</h3>
          <button 
            onClick={() => {
              setCurrentProduct({ title: '', description: '', price: 0, category: 'Hamburguesas', image: '', is_active: true });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-distrito-accent/20 text-distrito-accent hover:bg-distrito-accent/30 px-4 py-2 rounded-lg transition-colors font-bold"
          >
            <Plus size={18} /> Nuevo Producto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="p-3">Imagen</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3">
                    {p.image ? (
                      <img src={p.image} alt={p.title} className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-500">Sin img</div>
                    )}
                  </td>
                  <td className="p-3 font-bold">{p.title}</td>
                  <td className="p-3 text-sm text-gray-300">{p.category}</td>
                  <td className="p-3 text-distrito-accent font-mono">${Number(p.price).toLocaleString()}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleProductActive(p)}
                      className={`px-3 py-1 text-xs rounded-full font-bold ${
                        p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => { setCurrentProduct(p); setShowModal(true); }}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/40 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-gray-500">No hay productos registrados en la App.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar/Editar Producto */}
      {showModal && currentProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-distrito-dark border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <h3 className="text-2xl font-bold mb-4">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre del producto</label>
                <input 
                  type="text" required
                  value={currentProduct.title}
                  onChange={e => setCurrentProduct({...currentProduct, title: e.target.value})}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                <textarea 
                  value={currentProduct.description || ''}
                  onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Precio ($)</label>
                  <input 
                    type="number" required min="0"
                    value={currentProduct.price}
                    onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})}
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Categoría</label>
                  <input 
                    type="text" required
                    value={currentProduct.category}
                    onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})}
                    placeholder="Ej: Hamburguesas"
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">URL de la Imagen</label>
                <input 
                  type="text" 
                  value={currentProduct.image || ''}
                  onChange={e => setCurrentProduct({...currentProduct, image: e.target.value})}
                  placeholder="https://..."
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" id="isActive"
                  checked={currentProduct.is_active}
                  onChange={e => setCurrentProduct({...currentProduct, is_active: e.target.checked})}
                  className="w-4 h-4 rounded bg-black/30 border-white/10 text-distrito-accent focus:ring-distrito-accent"
                />
                <label htmlFor="isActive" className="text-sm text-gray-300">Producto Activo (Visible en la app)</label>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-distrito-accent text-distrito-dark px-6 py-2 rounded-lg font-bold hover:shadow-[0_0_15px_rgba(255,204,0,0.4)] transition-all"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
