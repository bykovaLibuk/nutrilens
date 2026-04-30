import React, { useState, useEffect } from 'react';
import { TrendingUp, Ruler, ChevronRight, Save, Clock, Bluetooth } from 'lucide-react';

export default function ProgressTab({ history, goals }) {
  const [measurements, setMeasurements] = useState([]);
  const [formData, setFormData] = useState({ weight: '', chest: '', waist: '', hips: '', arms: '' });
  const [scaleData, setScaleData] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nutrilens_measurements');
    if (saved) {
      try { setMeasurements(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleSave = () => {
    if (!formData.weight && !formData.chest && !formData.waist && !formData.hips && !formData.arms) {
      return alert('Введите хотя бы один параметр!');
    }
    
    const newEntry = { ...formData, date: new Date().toISOString() };
    const updated = [newEntry, ...measurements];
    setMeasurements(updated);
    localStorage.setItem('nutrilens_measurements', JSON.stringify(updated));
    setFormData({ weight: '', chest: '', waist: '', hips: '', arms: '' });
  };

  const handleConnectScale = async () => {
    try {
      if (!navigator.bluetooth) {
        alert("Bluetooth недоступен. Браузер блокирует доступ (нужен HTTPS или localhost).");
        return;
      }
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'YUNMAI' }],
        optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb', 'weight_scale'] // Yunmai specific
      });

      const server = await device.gatt.connect();
      setIsConnected(true);
      
      try {
        const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('0000ffe4-0000-1000-8000-00805f9b34fb');
        
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
          const value = event.target.value;
          let hexArray = [];
          for (let i = 0; i < value.byteLength; i++) {
            hexArray.push(value.getUint8(i).toString(16).padStart(2, '0').toUpperCase());
          }
          const hexString = hexArray.join(' ');
          setScaleData(hexString);
        });
        
        alert(`✅ Подключено! Встаньте на весы. Смотрите поток данных в реальном времени.`);
      } catch (innerErr) {
        alert(`Сопряжено, но чтение данных не удалось: ${innerErr.message}`);
      }
      
    } catch (err) {
      console.error(err);
      if (err.name !== 'NotFoundError') {
        alert("Ошибка подключения: " + err.message);
      }
    }
  };

  // Generate 7-day history for Bar Chart
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toDateString());
  }

  const chartData = last7Days.map(dateStr => {
    const dayHistory = history.filter(item => {
      if (!item.timestamp) return false;
      return new Date(item.timestamp).toDateString() === dateStr;
    });
    const cals = dayHistory.reduce((sum, item) => sum + (item.calories || 0), 0);
    const dayName = new Date(dateStr).toLocaleDateString('ru-RU', { weekday: 'short' });
    return { date: dateStr, dayName, cals };
  });

  const maxCals = Math.max(goals.calories * 1.2, ...chartData.map(d => d.cals));

  // Reminder Logic
  let reminderText = null;
  let isOverdue = false;
  if (measurements.length > 0) {
    const lastDate = new Date(measurements[0].date);
    const daysPassed = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
    if (daysPassed >= 14) {
      reminderText = "Пора сделать новые замеры!";
      isOverdue = true;
    } else {
      reminderText = `Следующий замер через ${14 - daysPassed} дн.`;
    }
  }

  return (
    <div className="animate-slide-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 7-Day Macro Chart */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} /> Калории (7 дней)
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {chartData.map((data, i) => {
            const heightPct = Math.min((data.cals / maxCals) * 100, 100);
            const isOver = data.cals > goals.calories;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ 
                  width: '100%', 
                  height: `${heightPct}%`, 
                  background: isOver ? '#f43f5e' : 'var(--primary)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: '4px',
                  transition: 'height 0.5s ease-out'
                }} />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                  {data.dayName}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '2px' }} /> В норме
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', background: '#f43f5e', borderRadius: '2px' }} /> Перебор
          </div>
        </div>
      </div>

      {/* Body Measurements Section */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Ruler size={18} /> Замеры тела
          </h3>
          {reminderText && (
            <div style={{ 
              fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', 
              background: isOverdue ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255,255,255,0.05)',
              color: isOverdue ? '#f43f5e' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <Clock size={12} /> {reminderText}
            </div>
          )}
        </div>

        {/* Input Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <input type="number" placeholder="Вес (кг)" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} style={inputStyle} />
          <input type="number" placeholder="Талия (см)" value={formData.waist} onChange={e => setFormData({...formData, waist: e.target.value})} style={inputStyle} />
          <input type="number" placeholder="Грудь (см)" value={formData.chest} onChange={e => setFormData({...formData, chest: e.target.value})} style={inputStyle} />
          <input type="number" placeholder="Бедра (см)" value={formData.hips} onChange={e => setFormData({...formData, hips: e.target.value})} style={inputStyle} />
          <input type="number" placeholder="Руки/Бицепс" value={formData.arms} onChange={e => setFormData({...formData, arms: e.target.value})} style={inputStyle} />
          
          <button onClick={handleSave} className="btn btn-primary" style={{ padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
            <Save size={16} /> Записать
          </button>
        </div>

        <button 
          onClick={handleConnectScale} 
          className="btn btn-glass" 
          style={{ width: '100%', marginBottom: isConnected ? '8px' : '16px', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: isConnected ? '#10b981' : '#3b82f6', border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}` }}
        >
          <Bluetooth size={18} /> {isConnected ? 'Весы подключены (Слушаем эфир...)' : 'Подключить смарт-весы Yunmai (Бета)'}
        </button>

        {isConnected && (
          <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '0.8rem', color: '#10b981', wordBreak: 'break-all' }}>
            <strong>Сырые данные (Hex):</strong><br/>
            {scaleData || 'Встаньте на весы... ждем данные...'}
          </div>
        )}

        {/* Measurements History List */}
        {measurements.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: '10px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>История замеров</h4>
            {measurements.slice(0, 5).map((m, i) => (
              <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '12px' }}>
                  {m.weight && <span>Вес: {m.weight}</span>}
                  {m.waist && <span>Т: {m.waist}</span>}
                  {m.hips && <span>Б: {m.hips}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px', borderRadius: '8px',
  border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)',
  color: 'white', outline: 'none', fontSize: '0.9rem'
};
