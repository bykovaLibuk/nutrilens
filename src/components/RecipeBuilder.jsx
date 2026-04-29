import React, { useState } from 'react';
import { Plus, Trash2, Save, ChefHat, ArrowLeft } from 'lucide-react';

export default function RecipeBuilder({ favorites, onSaveToFav, setView }) {
  const [ingredients, setIngredients] = useState([]);
  const [recipeName, setRecipeName] = useState('');
  const [finalWeightInput, setFinalWeightInput] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // Temporary state when picking a weight for a new ingredient
  const [activeItem, setActiveItem] = useState(null);
  const [activeWeight, setActiveWeight] = useState('');

  const handleAddIngredient = () => {
    if (activeItem && activeWeight > 0) {
      setIngredients([...ingredients, { ...activeItem, weight: Number(activeWeight) }]);
      setActiveItem(null);
      setActiveWeight('');
      setShowPicker(false);
    }
  };

  const handleRemoveIngredient = (index) => {
    const newArr = [...ingredients];
    newArr.splice(index, 1);
    setIngredients(newArr);
  };

  // Math
  const rawWeight = ingredients.reduce((sum, item) => sum + item.weight, 0);
  const totalCalories = ingredients.reduce((sum, item) => sum + (item.calories * item.weight / 100), 0);
  const totalProtein = ingredients.reduce((sum, item) => sum + (item.protein * item.weight / 100), 0);
  const totalFat = ingredients.reduce((sum, item) => sum + (item.fat * item.weight / 100), 0);
  const totalCarbs = ingredients.reduce((sum, item) => sum + (item.carbs * item.weight / 100), 0);

  const finalWeight = Number(finalWeightInput) || rawWeight;

  const per100g = {
    calories: finalWeight > 0 ? Math.round((totalCalories / finalWeight) * 100) : 0,
    protein: finalWeight > 0 ? Math.round((totalProtein / finalWeight) * 100) : 0,
    fat: finalWeight > 0 ? Math.round((totalFat / finalWeight) * 100) : 0,
    carbs: finalWeight > 0 ? Math.round((totalCarbs / finalWeight) * 100) : 0,
  };

  const handleSaveRecipe = () => {
    if (!recipeName.trim()) {
      alert("Введите название блюда!");
      return;
    }
    if (ingredients.length === 0) {
      alert("Добавьте хотя бы один ингредиент!");
      return;
    }

    const newDish = {
      name: recipeName.trim(),
      calories: per100g.calories,
      protein: per100g.protein,
      fat: per100g.fat,
      carbs: per100g.carbs
    };

    onSaveToFav(newDish);
    alert(`Блюдо "${newDish.name}" сохранено в базу! Теперь вы можете быстро добавлять его.`);
    setView('dashboard');
  };

  if (showPicker) {
    if (activeItem) {
      return (
        <div className="glass-panel animate-slide-up" style={{ margin: '20px', padding: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Сколько грамм добавить?</h2>
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '16px' }}>
            <strong>{activeItem.name}</strong>
          </div>
          <input 
            type="number" 
            placeholder="Вес в граммах (сырой)" 
            value={activeWeight}
            onChange={(e) => setActiveWeight(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setActiveItem(null)}>Отмена</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddIngredient}>Добавить</button>
          </div>
        </div>
      );
    }

    return (
      <div className="glass-panel animate-slide-up" style={{ margin: '20px', padding: '20px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Выберите ингредиент из базы</h2>
        {favorites.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Ваша база пуста. Сначала добавьте продукты в избранное.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {favorites.map((fav, i) => (
              <button 
                key={i} 
                className="glass" 
                style={{ textAlign: 'left', padding: '12px', border: 'none', color: 'white' }}
                onClick={() => setActiveItem(fav)}
              >
                <div style={{ fontWeight: 600 }}>{fav.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fav.calories} ккал / 100г</div>
              </button>
            ))}
          </div>
        )}
        <button className="btn btn-glass" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowPicker(false)}>
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-slide-up" style={{ margin: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ChefHat color="var(--primary)" />
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Конструктор блюд</h2>
      </div>

      <div>
        <label style={labelStyle}>Название готового блюда (например, "Куриный суп")</label>
        <input 
          type="text" 
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
          placeholder="Мой фирменный суп..."
          style={inputStyle} 
        />
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Ингредиенты</h3>
        
        {ingredients.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Вы пока ничего не добавили.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{ing.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ing.weight} г</div>
                </div>
                <button onClick={() => handleRemoveIngredient(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-glass" style={{ width: '100%', fontSize: '0.9rem', padding: '10px' }} onClick={() => setShowPicker(true)}>
          <Plus size={16} /> Добавить из базы
        </button>
      </div>

      {ingredients.length > 0 && (
        <>
          <div>
            <label style={labelStyle}>Итоговый вес блюда (после уварки/ужарки), г</label>
            <input 
              type="number" 
              value={finalWeightInput}
              onChange={(e) => setFinalWeightInput(e.target.value)}
              placeholder={`Сырой вес: ${rawWeight}г`}
              style={inputStyle} 
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Если суп выкипел или мясо ужарилось, введите реальный вес готовой кастрюли/сковородки.
            </p>
          </div>

          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--primary)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '8px', textAlign: 'center' }}>
              Итого на 100г готового блюда
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Калории:</span> <strong>{per100g.calories} ккал</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Белки: {per100g.protein}г</span>
              <span>Жиры: {per100g.fat}г</span>
              <span>Угл: {per100g.carbs}г</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setView('dashboard')}>
              Отмена
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveRecipe}>
              <Save size={18} /> Сохранить в базу
            </button>
          </div>
        </>
      )}

      {ingredients.length === 0 && (
        <button className="btn btn-glass" style={{ width: '100%' }} onClick={() => setView('dashboard')}>
          <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Назад на главную
        </button>
      )}
    </div>
  );
}

const labelStyle = { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' };
const inputStyle = {
  width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)',
  color: 'white', outline: 'none', fontSize: '1rem'
};
