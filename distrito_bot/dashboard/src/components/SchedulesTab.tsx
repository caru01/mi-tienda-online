import React from 'react';
import { Clock, Power } from 'lucide-react';

const API_URL = import.meta.env.PROD ? '/distrito/api/dashboard' : 'http://localhost:8000/api/dashboard';

export default function SchedulesTab() {
  const [formData, setFormData] = React.useState<any>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(r => r.json())
      .then(data => {
        setFormData(data.settings);
        setLoading(false);
      });
  }, []);


  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      alert('Horarios actualizados exitosamente');
    } catch (e) {
      console.error(e);
      alert('Error guardando horarios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDayToggle = (dayIndex: string) => {
    const days = formData.business_days ? formData.business_days.split(',') : [];
    if (days.includes(dayIndex)) {
      setFormData({...formData, business_days: days.filter((d: string) => d !== dayIndex).join(',')});
    } else {
      setFormData({...formData, business_days: [...days, dayIndex].sort().join(',')});
    }
  };

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  if (loading || !formData) return <div className="animate-pulse text-white">Cargando horarios...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-distrito-accent" />
        <h2 className="text-3xl font-bold">Horarios de Atención</h2>
      </div>

      <div className="glass rounded-2xl p-6 border border-white/10 space-y-8">
        
        {/* Switch Principal */}
        <div className="flex items-center justify-between p-6 bg-black/40 rounded-xl border border-white/5 shadow-lg">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Power className={formData.is_open ? "text-green-500" : "text-red-500"} size={24} />
              Estado del Restaurante
            </h3>
            <p className="text-gray-400 mt-1">Apaga esto si quieres cerrar el restaurante manualmente (sin importar el horario automático).</p>
          </div>
          <button 
            onClick={() => setFormData({...formData, is_open: !formData.is_open})}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-distrito-accent focus:ring-offset-2 focus:ring-offset-black ${formData.is_open ? 'bg-distrito-accent' : 'bg-gray-600'}`}
          >
            <span className={`${formData.is_open ? 'translate-x-7' : 'translate-x-1'} inline-block h-6 w-6 transform rounded-full bg-black transition-transform`} />
          </button>
        </div>

        {/* Configuración de Horario */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-distrito-accent">Horario Automático</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Hora de Apertura</label>
                <div className="flex gap-2">
                  <input type="number" min="0" max="23" className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                    value={formData.business_open_hour} onChange={e => setFormData({...formData, business_open_hour: parseInt(e.target.value)})} />
                  <span className="self-center">:</span>
                  <input type="number" min="0" max="59" className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                    value={formData.business_open_minute} onChange={e => setFormData({...formData, business_open_minute: parseInt(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Hora de Cierre</label>
                <div className="flex gap-2">
                  <input type="number" min="0" max="23" className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                    value={formData.business_close_hour} onChange={e => setFormData({...formData, business_close_hour: parseInt(e.target.value)})} />
                  <span className="self-center">:</span>
                  <input type="number" min="0" max="59" className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                    value={formData.business_close_minute} onChange={e => setFormData({...formData, business_close_minute: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">Días de Atención</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day, i) => {
                  const idx = i.toString();
                  const isSelected = formData.business_days && formData.business_days.split(',').includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleDayToggle(idx)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                        isSelected 
                          ? 'bg-distrito-accent text-distrito-dark shadow-[0_0_10px_rgba(255,204,0,0.3)]' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/10">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-distrito-accent text-distrito-dark px-8 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar Horarios'}
          </button>
        </div>
      </div>
    </div>
  );
}
