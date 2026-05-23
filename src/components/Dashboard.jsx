import React from 'react';
import { Trash2, ChevronLeft, ChevronRight, Calendar, Star } from 'lucide-react';

const CircularProgress = ({ value, max, color, label, unit }) => {
  const radius = 30; // Уменьшено с 36 для маленьких экранов
  const circumference = 2 * Math.PI * radius;
  const safeValue = isNaN(value) ? 0 : value;
  const safeMax = isNaN(max) || max === 0 ? 1 : max;
  const percent = Math.min(safeValue / safeMax, 1);
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: '68px', height: '68px' }}>
        {/* Background circle */}
        <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
          <circle 
            cx="34" cy="34" r={radius} 
            fill="transparent" 
            stroke="rgba(255,255,255,0.1)" 
            strokeWidth="6" 
          />
          {/* Progress circle */}
          <circle 
            cx="34" cy="34" r={radius} 
            fill="transparent" 
            stroke={color} 
            strokeWidth="6" 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div style={{ 
          position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>{safeValue}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>из {max}{unit}</div>
      </div>
    </div>
  );
};

export default function Dashboard({ history, clearHistory, goals, onSaveToFav, currentDate, setCurrentDate }) {
  const totals = history.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein: acc.protein + (item.protein || 0),
    carbs: acc.carbs + (item.carbs || 0),
    fat: acc.fat + (item.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div className="animate-slide-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Date Switcher */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d.toDateString());
          }}
          className="btn-glass" style={{ padding: '8px', borderRadius: '50%' }}
        ><ChevronLeft size={20} /></button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Calendar size={18} color="var(--primary)" />
          {currentDate === new Date().toDateString() ? 'Сегодня' : new Date(currentDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </div>

        <button 
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            if (d <= new Date()) setCurrentDate(d.toDateString());
          }}
          className="btn-glass" style={{ padding: '8px', borderRadius: '50%', opacity: currentDate === new Date().toDateString() ? 0.3 : 1 }}
          disabled={currentDate === new Date().toDateString()}
        ><ChevronRight size={20} /></button>
      </div>

      {/* Main Calorie Card */}
      <div className="glass-panel" style={{ textAlign: 'center', padding: '30px 20px' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Калории за сегодня</h2>
        <div style={{ fontSize: '3.5rem', fontWeight: 700 }} className="text-gradient">
          {totals.calories}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Осталось: {Math.max(goals.calories - totals.calories, 0)} ккал
        </p>
      </div>

      {/* Macros */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        justifyContent: 'space-around', // changed from space-between for better centering
        flexWrap: 'wrap', // Allows wrapping on extremely small devices
        gap: '10px'
      }}>
        <CircularProgress value={totals.protein} max={goals.protein} color="#f43f5e" label="Белки" unit="г" />
        <CircularProgress value={totals.fat} max={goals.fat} color="#eab308" label="Жиры" unit="г" />
        <CircularProgress value={totals.carbs} max={goals.carbs} color="#3b82f6" label="Углеводы" unit="г" />
      </div>

      {/* History List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3>Съедено в этот день</h3>
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Очистить
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p style={{ color: 'var(--text-muted)' }}>Вы еще ничего не добавляли сегодня.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((item, idx) => (
              <div key={idx} className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '10px' }}>
                    {item.name || 'Неизвестное блюдо'}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {item.calories} ккал
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Б: {item.protein}г • Ж: {item.fat}г • У: {item.carbs}г
                  </div>
                  <button 
                    onClick={() => onSaveToFav(item)}
                    style={{ background: 'transparent', border: 'none', color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                  >
                    <Star size={14} /> В избранное
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
