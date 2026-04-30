import React, { useState } from 'react';
import { Search, Plus, ChefHat, Pencil, Trash2 } from 'lucide-react';

export default function DatabaseTab({ favorites, onSaveToFav, onAddFromFav, onDeleteFav, setView }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualData, setManualData] = useState({ name: '', calories: '', protein: '', fat: '', carbs: '' });
  
  // Portion prompt state
  const [activeItem, setActiveItem] = useState(null);
  const [portion, setPortion] = useState(100);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredFavorites = favorites.filter(fav => 
    fav.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManualSave = () => {
    if (!manualData.name) return alert("Введите название");
    
    const newProduct = {
      name: manualData.name,
      calories: Math.max(0, Number(manualData.calories)),
      protein: Math.max(0, Number(manualData.protein)),
      fat: Math.max(0, Number(manualData.fat)),
      carbs: Math.max(0, Number(manualData.carbs))
    };
    
    onSaveToFav(newProduct);
    setShowManual(false);
    setManualData({ name: '', calories: '', protein: '', fat: '', carbs: '' });
    alert("Продукт добавлен в Базу!");
  };

  const handleAddToDiary = () => {
    if (activeItem) {
      const multiplier = Math.max(0, portion) / 100;
      onAddFromFav({
        name: activeItem.name,
        calories: Math.round(activeItem.calories * multiplier),
        protein: Math.round(activeItem.protein * multiplier),
        fat: Math.round(activeItem.fat * multiplier),
        carbs: Math.round(activeItem.carbs * multiplier),
        targetDate: new Date(targetDate).toISOString()
      });
      setActiveItem(null);
      setPortion(100);
      setView('dashboard');
    }
  };

  if (activeItem) {
    return (
      <div className="glass-panel animate-slide-up" style={{ margin: '20px', padding: '20px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Сколько вы съели?</h2>
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '16px' }}>
          <strong>{activeItem.name}</strong>
        </div>
        <input 
          type="number" 
          placeholder="Вес порции в граммах" 
          value={portion}
          onChange={(e) => setPortion(e.target.value)}
          style={{...inputStyle, marginBottom: '10px'}}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Записать на дату:</label>
          <input 
            type="date" 
            value={targetDate} 
            onChange={e => setTargetDate(e.target.value)} 
            style={{...inputStyle, flex: 1, padding: '8px'}} 
          />
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '12px' }}>
          В дневник запишется: <strong style={{ color: 'var(--primary)' }}>{Math.round(activeItem.calories * (portion/100))} ккал</strong>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setActiveItem(null)}>Отмена</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddToDiary}>В дневник</button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-slide-up" style={{ margin: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontSize: '1.2rem', margin: 0 }}>База продуктов</h2>
      
      <div style={{ position: 'relative' }}>
        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', top: '10px', left: '10px' }} />
        <input 
          type="text" 
          placeholder="Поиск по базе..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{...inputStyle, paddingLeft: '36px'}} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
        {filteredFavorites.length > 0 ? (
          filteredFavorites.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setActiveItem(item)}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {item.calories} ккал / 100г
                </div>
              </div>
              <button onClick={() => onDeleteFav(index)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px' }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {searchQuery ? "Ничего не найдено." : "Ваша база пуста."}
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />

      {!showManual ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-glass" onClick={() => setShowManual(true)} style={{ justifyContent: 'center' }}>
            <Pencil size={18} style={{ marginRight: '8px' }}/> Создать простой продукт
          </button>
          <button className="btn btn-primary" onClick={() => setView('builder')} style={{ justifyContent: 'center' }}>
            <ChefHat size={18} style={{ marginRight: '8px' }}/> Собрать сложный рецепт
          </button>
        </div>
      ) : (
        <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Новый продукт (на 100г)</h4>
          <input type="text" placeholder="Название продукта" style={inputStyle} value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input type="number" placeholder="Ккал" style={inputStyle} value={manualData.calories} onChange={e => setManualData({...manualData, calories: Math.max(0, e.target.value)})} />
            <input type="number" placeholder="Белки" style={inputStyle} value={manualData.protein} onChange={e => setManualData({...manualData, protein: Math.max(0, e.target.value)})} />
            <input type="number" placeholder="Жиры" style={inputStyle} value={manualData.fat} onChange={e => setManualData({...manualData, fat: Math.max(0, e.target.value)})} />
            <input type="number" placeholder="Углеводы" style={inputStyle} value={manualData.carbs} onChange={e => setManualData({...manualData, carbs: Math.max(0, e.target.value)})} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button className="btn btn-glass" style={{ flex: 1, padding: '8px' }} onClick={() => setShowManual(false)}>Отмена</button>
            <button className="btn btn-primary" style={{ flex: 1, padding: '8px' }} onClick={handleManualSave}>Сохранить в базу</button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)',
  color: 'white', outline: 'none', fontSize: '0.9rem'
};
