import React, { useState, useRef } from 'react';
import { FileText, ScanBarcode, Loader2, Save, Pencil } from 'lucide-react';
import { analyzeRecipeOrLabel } from '../services/gemini';
import { compressImage } from '../utils/image';

export default function RecipeCalculator({ apiKey, onFoodAnalyzed }) {
  const [mode, setMode] = useState(null); // 'text_recipe' | 'image_label'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [recipeText, setRecipeText] = useState('');
  const [result, setResult] = useState(null);
  
  // Portion tracking
  const [portionGrams, setPortionGrams] = useState(100);
  
  const fileInputRef = useRef(null);

  const handleTextSubmit = async () => {
    if (!recipeText.trim()) return;
    if (!apiKey) return setError("Укажите API ключ в настройках");
    if (!navigator.onLine) return setError("Нет интернета");

    setLoading(true);
    setError('');
    try {
      const data = await analyzeRecipeOrLabel(apiKey, 'text_recipe', recipeText);
      setResult(data);
    } catch(err) {
      setError("Ошибка анализа: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!apiKey) return setError("Укажите API ключ в настройках");
    if (!navigator.onLine) return setError("Нет интернета");

    setLoading(true);
    setError('');
    
    try {
      const base64 = await compressImage(file, 1000); // Slightly larger for text reading
      const data = await analyzeRecipeOrLabel(apiKey, 'image_label', base64, file.type);
      setResult(data);
    } catch(err) {
      setError("Ошибка распознавания: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    setResult({
      name: '',
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0
    });
  };

  const handleSave = () => {
    if (result) {
      const multiplier = Math.max(0, portionGrams) / 100;
      const finalResult = {
        name: result.name,
        calories: Math.round(result.calories * multiplier),
        protein: Math.round(result.protein * multiplier),
        fat: Math.round(result.fat * multiplier),
        carbs: Math.round(result.carbs * multiplier)
      };
      onFoodAnalyzed(finalResult);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ margin: '20px', textAlign: 'center', padding: '40px' }}>
        <Loader2 size={40} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 20px' }} />
        <p>Анализируем данные (на 100г)...</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="glass-panel animate-slide-up" style={{ margin: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '1.2rem' }}>Результат (на 100 грамм)</h2>
        
        <div>
          <label style={labelStyle}>Название (можно изменить)</label>
          <input 
            type="text" value={result.name || ''} 
            onChange={(e) => setResult({...result, name: e.target.value})}
            style={inputStyle} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label style={labelStyle}>Ккал (на 100г)</label><input type="number" value={result.calories} onChange={e => setResult({...result, calories: Math.max(0, Number(e.target.value))})} style={inputStyle} /></div>
          <div><label style={labelStyle}>Белки (на 100г)</label><input type="number" value={result.protein} onChange={e => setResult({...result, protein: Math.max(0, Number(e.target.value))})} style={inputStyle} /></div>
          <div><label style={labelStyle}>Жиры (на 100г)</label><input type="number" value={result.fat} onChange={e => setResult({...result, fat: Math.max(0, Number(e.target.value))})} style={inputStyle} /></div>
          <div><label style={labelStyle}>Углеводы (на 100г)</label><input type="number" value={result.carbs} onChange={e => setResult({...result, carbs: Math.max(0, Number(e.target.value))})} style={inputStyle} /></div>
        </div>

        {result.totalWeight && (
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ИИ оценил итоговый вес блюда в {result.totalWeight}г. 
          </div>
        )}

        <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--primary)', borderRadius: '8px', marginTop: '10px' }}>
          <label style={{...labelStyle, color: 'white', fontWeight: 500, marginBottom: '8px', fontSize: '0.9rem'}}>Размер вашей порции (г):</label>
          <input 
            type="number" 
            value={portionGrams} 
            onChange={e => setPortionGrams(Math.max(0, Number(e.target.value)))}
            style={{...inputStyle, background: 'rgba(0,0,0,0.4)', fontSize: '1.2rem', textAlign: 'center', fontWeight: 700}} 
          />
          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            В дневник запишется: <strong style={{ color: 'var(--primary)' }}>{Math.round(result.calories * (portionGrams/100))} ккал</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => {setResult(null); setMode(null);}}>Сброс</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}><Save size={18}/> Сохранить</button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-slide-up" style={{ margin: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ textAlign: 'center', fontSize: '1.1rem' }}>Умный калькулятор (на 100г)</h2>

      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => setMode('text_recipe')} style={{ padding: '16px' }}>
            <FileText size={24} /> Анализ рецепта текстом
          </button>
          <button className="btn btn-glass" onClick={() => fileInputRef.current.click()} style={{ padding: '16px' }}>
            <ScanBarcode size={24} /> Скан БЖУ с упаковки (Фото)
          </button>
          <button className="btn btn-glass" onClick={handleManualEntry} style={{ padding: '16px' }}>
            <Pencil size={24} /> Ручной ввод (БЖУ на 100г)
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      )}

      {mode === 'text_recipe' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Напишите ингредиенты и вес готового блюда. ИИ сам учтет уварку/ужарку и выдаст КБЖУ на 100 грамм продукта.
          </p>
          <textarea 
            value={recipeText}
            onChange={(e) => setRecipeText(e.target.value)}
            placeholder="Например: 500г курицы, 20г масла, 1 яйцо. Итоговый вес 450г."
            style={{...inputStyle, height: '120px', resize: 'none'}}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setMode(null)}>Назад</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleTextSubmit}>Посчитать</button>
          </div>
        </div>
      )}

      {error && <div style={{ color: 'var(--accent)', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
    </div>
  );
}

const labelStyle = { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' };
const inputStyle = {
  width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)',
  color: 'white', outline: 'none', fontSize: '0.9rem'
};
