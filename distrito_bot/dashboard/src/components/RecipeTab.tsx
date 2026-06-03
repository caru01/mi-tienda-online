import { useState, useEffect } from 'react';
import { ChefHat, Save, Plus, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard';

export default function RecipeTab({ data }: { data: any }) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [currentIngredients, setCurrentIngredients] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form para nuevo ingrediente
  const [newItemId, setNewItemId] = useState<string>('');
  const [newQty, setNewQty] = useState<string>('1');

  useEffect(() => {
    fetch(`${API_URL}/recipes`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'ok') {
          setRecipes(res.recipes || []);
        }
      });
  }, []);

  // Update currentIngredients when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      const prodRecipes = recipes.filter(r => r.product_id === selectedProduct);
      setCurrentIngredients(prodRecipes);
    } else {
      setCurrentIngredients([]);
    }
  }, [selectedProduct, recipes]);

  const handleAddIngredient = () => {
    if (!newItemId || !newQty || parseFloat(newQty) <= 0) return;
    
    // Check if already exists
    const existingIndex = currentIngredients.findIndex(i => i.inventory_item_id === parseInt(newItemId));
    if (existingIndex >= 0) {
      const updated = [...currentIngredients];
      updated[existingIndex].quantity_required = parseFloat(newQty);
      setCurrentIngredients(updated);
    } else {
      setCurrentIngredients([
        ...currentIngredients,
        {
          product_id: selectedProduct,
          inventory_item_id: parseInt(newItemId),
          quantity_required: parseFloat(newQty)
        }
      ]);
    }
    setNewItemId('');
    setNewQty('1');
  };

  const handleRemoveIngredient = (itemId: number) => {
    setCurrentIngredients(currentIngredients.filter(i => i.inventory_item_id !== itemId));
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    
    setIsSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          ingredients: currentIngredients
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessage('✅ Receta guardada correctamente');
        // Update local recipes state
        const otherRecipes = recipes.filter(r => r.product_id !== selectedProduct);
        setRecipes([...otherRecipes, ...currentIngredients]);
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (e) {
      console.error(e);
      setMessage('❌ Error de conexión al guardar');
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Helper to get item name
  const getItemName = (id: number) => {
    const item = data.inventory?.find((i: any) => i.id === id);
    return item ? `${item.name} (${item.unit})` : `Insumo #${id}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <ChefHat className="w-8 h-8 text-distrito-accent" />
        <h2 className="text-3xl font-bold">Gestión de Recetas</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Selector de Producto */}
        <div className="md:col-span-1 space-y-4">
          <div className="glass p-6 rounded-2xl border border-white/10 shadow-xl">
            <h3 className="text-xl font-bold text-distrito-accent mb-4">1. Seleccionar Producto</h3>
            <p className="text-sm text-gray-400 mb-4">Elige un combo del catálogo para definir qué insumos gasta al venderse.</p>
            
            <select 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-distrito-accent"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">-- Selecciona un Producto --</option>
              {data.products?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.emoji || '🍔'} {p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Columna Derecha: Receta */}
        <div className="md:col-span-2">
          {selectedProduct ? (
            <div className="glass p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col h-full min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">
                  Receta: {data.products?.find((p: any) => p.id === selectedProduct)?.name}
                </h3>
                {message && <span className="text-sm font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-full">{message}</span>}
              </div>

              {/* Lista de Insumos Actuales */}
              <div className="flex-1 space-y-3 mb-6">
                {currentIngredients.length === 0 ? (
                  <div className="h-32 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl">
                    <p className="text-gray-500">Este producto no tiene insumos asignados aún.</p>
                  </div>
                ) : (
                  currentIngredients.map((ing, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/10 px-3 py-1 rounded-lg font-bold text-distrito-accent min-w-[3rem] text-center">
                          {ing.quantity_required}
                        </div>
                        <span className="font-medium">{getItemName(ing.inventory_item_id)}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveIngredient(ing.inventory_item_id)}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Agregar Nuevo Insumo */}
              <div className="bg-black/40 p-4 rounded-xl border border-white/10 mb-6">
                <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Agregar Insumo</h4>
                <div className="flex gap-3">
                  <select 
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                    value={newItemId}
                    onChange={(e) => setNewItemId(e.target.value)}
                  >
                    <option value="">-- Seleccionar Insumo --</option>
                    {data.inventory?.map((inv: any) => (
                      <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                    ))}
                  </select>
                  <div className="relative w-24">
                    <input 
                      type="number" 
                      min="0.01" step="0.01"
                      placeholder="Cant."
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleAddIngredient}
                    disabled={!newItemId || !newQty}
                    className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="flex justify-end pt-4 border-t border-white/10">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-distrito-accent text-distrito-dark px-6 py-3 rounded-xl font-bold hover:shadow-[0_0_15px_rgba(255,204,0,0.4)] transition-all disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Guardando...' : 'Guardar Receta'}
                </button>
              </div>

            </div>
          ) : (
            <div className="glass rounded-2xl border border-white/10 h-full min-h-[400px] flex items-center justify-center opacity-50">
              <div className="text-center">
                <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-xl font-bold">Selecciona un producto</p>
                <p className="text-gray-400">Para ver o editar su receta</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
