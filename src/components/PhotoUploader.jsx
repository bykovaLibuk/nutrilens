import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Edit3, Check } from 'lucide-react';
import { analyzeFood } from '../services/gemini';
import { compressImage } from '../utils/image';

export default function PhotoUploader({ apiKey, onFoodAnalyzed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  
  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [portion, setPortion] = useState(1); // 1 = 100%, 0.5 = 50%
  
  
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!apiKey) {
      setError("Пожалуйста, сначала укажите API ключ в настройках");
      return;
    }

    if (!navigator.onLine) {
      setError("Нет интернета. Анализ невозможен.");
      return;
    }

    setLoading(true);
    setError(null);
    setEditMode(false);
    
    try {
      // Compress image first
      const base64 = await compressImage(file, 800);
      setPreview(base64);
      
      const result = await analyzeFood(apiKey, base64, "image/jpeg");
      
      // Instead of saving immediately, open edit mode
      setEditData(result);
      setEditMode(true);
      
    } catch (err) {
      setError("Ошибка при анализе фото: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = () => {
    const finalData = {
      ...editData,
      calories: Math.round(editData.calories * portion),
      protein: Math.round(editData.protein * portion),
      fat: Math.round(editData.fat * portion),
      carbs: Math.round(editData.carbs * portion)
    };
    onFoodAnalyzed(finalData);
    setEditMode(false);
    setPreview(null);
    setEditData(null);
    setPortion(1);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setPreview(null);
    setEditData(null);
  };

  if (preview && loading) {
    return (
      <div className="glass-panel" style={{ margin: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', width: '100%', height: '250px', borderRadius: '12px', overflow: 'hidden' }}>
          <img src={preview} alt="Food preview" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
             <Loader2 size={40} className="animate-spin" color="var(--primary)" />
             <p style={{ fontWeight: 500 }}>ИИ анализирует блюдо...</p>
          </div>
        </div>
      </div>
    );
  }

  if (editMode && editData) {
    return (
      <div className="glass-panel animate-slide-up" style={{ margin: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Edit3 color="var(--primary)" />
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Проверьте данные</h2>
        </div>
        
        <img src={preview} alt="Food" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />

        <div>
          <label style={labelStyle}>Название блюда</label>
          <input 
            type="text" value={editData.name || ''} 
            onChange={(e) => setEditData({...editData, name: e.target.value})}
            style={inputStyle} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Калории (ккал)</label>
            <input 
              type="number" value={editData.calories || 0} 
              onChange={(e) => setEditData({...editData, calories: Math.max(0, Number(e.target.value))})}
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={labelStyle}>Белки (г)</label>
            <input 
              type="number" value={editData.protein || 0} 
              onChange={(e) => setEditData({...editData, protein: Math.max(0, Number(e.target.value))})}
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={labelStyle}>Жиры (г)</label>
            <input 
              type="number" value={editData.fat || 0} 
              onChange={(e) => setEditData({...editData, fat: Math.max(0, Number(e.target.value))})}
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={labelStyle}>Углеводы (г)</label>
            <input 
              type="number" value={editData.carbs || 0} 
              onChange={(e) => setEditData({...editData, carbs: Math.max(0, Number(e.target.value))})}
              style={inputStyle} 
            />
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <label style={{...labelStyle, marginBottom: '8px'}}>Какую часть блюда вы съели?</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`btn ${portion === 0.25 ? 'btn-primary' : 'btn-glass'}`} style={{ flex: 1, padding: '8px' }} onClick={() => setPortion(0.25)}>1/4</button>
            <button className={`btn ${portion === 0.5 ? 'btn-primary' : 'btn-glass'}`} style={{ flex: 1, padding: '8px' }} onClick={() => setPortion(0.5)}>1/2</button>
            <button className={`btn ${portion === 1 ? 'btn-primary' : 'btn-glass'}`} style={{ flex: 1, padding: '8px' }} onClick={() => setPortion(1)}>Всё</button>
          </div>
          {portion !== 1 && (
            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              В дневник запишется: <strong style={{ color: 'var(--primary)' }}>{Math.round(editData.calories * portion)} ккал</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button className="btn btn-glass" style={{ flex: 1 }} onClick={handleCancelEdit}>Отмена</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit}>Сохранить</button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-slide-up" style={{ margin: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ textAlign: 'center', fontSize: '1.1rem' }}>Добавить прием пищи</h2>
      
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={cameraInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        accept="image/*" 
        ref={galleryInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button 
          className="btn btn-primary" 
          style={{ flexDirection: 'column', padding: '20px 12px', gap: '8px' }}
          onClick={() => cameraInputRef.current.click()}
        >
          <Camera size={28} />
          Камера
        </button>
        
        <button 
          className="btn btn-glass" 
          style={{ flexDirection: 'column', padding: '20px 12px', gap: '8px' }}
          onClick={() => galleryInputRef.current.click()}
        >
          <Upload size={28} />
          Галерея
        </button>
      </div>

      <button 
        className="btn btn-glass" 
        style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}
        onClick={() => {
          setEditData({ name: '', calories: 0, protein: 0, fat: 0, carbs: 0 });
          setEditMode(true);
          setError(null);
        }}
      >
        <Edit3 size={20} />
        Ввести КБЖУ вручную
      </button>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--accent)', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
          {error}
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' };
const inputStyle = {
  width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)',
  color: 'white', outline: 'none', fontSize: '0.9rem'
};
