import React, { useState, useEffect } from 'react';
import { Lock, Unlock, KeyRound, Target, User } from 'lucide-react';

export default function Settings({ apiKey, setApiKey, setView, goals, setGoals }) {
  const [tempKey, setTempKey] = useState(apiKey || '');
  
  // Goals State
  const [localGoals, setLocalGoals] = useState({ ...goals });

  // Physical Profile State
  const [profile, setProfile] = useState({
    height: 175,
    age: 25,
    gender: 1, // 1 = male, 0 = female
    isAthlete: false,
    biaAlgorithm: 'standard',
    fatOffset: 0
  });

  // Security State
  const [hasPin, setHasPin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    const savedPin = localStorage.getItem('nutrilens_pin');
    if (savedPin) {
      setHasPin(true);
      setIsUnlocked(false);
    }

    const savedProfile = localStorage.getItem('nutrilens_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile({
          height: 175,
          age: 25,
          gender: 1,
          isAthlete: false,
          biaAlgorithm: 'standard',
          fatOffset: 0,
          ...parsed
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem('nutrilens_profile', JSON.stringify(profile));
    alert("Профиль сохранен!");
  };

  const handleSaveGoals = () => {
    // Convert strings to numbers
    const updatedGoals = {
      calories: Number(localGoals.calories) || 2000,
      protein: Number(localGoals.protein) || 150,
      carbs: Number(localGoals.carbs) || 200,
      fat: Number(localGoals.fat) || 65,
    };
    setGoals(updatedGoals);
    localStorage.setItem('nutrilens_goals', JSON.stringify(updatedGoals));
    alert("Цели БЖУ сохранены!");
  };

  const handleSaveApi = () => {
    setApiKey(tempKey);
    localStorage.setItem('nutrilens_gemini_key', tempKey);
    alert("API ключ сохранен!");
    if(tempKey) setView('dashboard');
  };

  const handleUnlock = () => {
    const savedPin = localStorage.getItem('nutrilens_pin');
    if (pinInput === savedPin) {
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Неверный ПИН-код');
    }
  };

  const handleSetPin = () => {
    if (setupPin.length < 4) {
      setPinError('ПИН-код должен быть не менее 4 символов');
      return;
    }
    localStorage.setItem('nutrilens_pin', setupPin);
    setHasPin(true);
    setPinError('');
    alert("ПИН-код установлен! Теперь настройки API защищены.");
  };

  return (
    <div className="animate-slide-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* SECTION 1: MACRO GOALS (Always open) */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target color="var(--primary)" />
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Ваши цели (БЖУ)</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Настройте дневную норму под себя.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Калории</label>
            <input 
              type="number" value={localGoals.calories}
              onChange={(e) => setLocalGoals({...localGoals, calories: e.target.value})}
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Белки (г)</label>
            <input 
              type="number" value={localGoals.protein}
              onChange={(e) => setLocalGoals({...localGoals, protein: e.target.value})}
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Жиры (г)</label>
            <input 
              type="number" value={localGoals.fat}
              onChange={(e) => setLocalGoals({...localGoals, fat: e.target.value})}
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Углеводы (г)</label>
            <input 
              type="number" value={localGoals.carbs}
              onChange={(e) => setLocalGoals({...localGoals, carbs: e.target.value})}
              style={inputStyle} 
            />
          </div>
        </div>
        <button className="btn btn-glass" onClick={handleSaveGoals}>
          Сохранить БЖУ
        </button>
      </div>

      {/* SECTION 1.5: PHYSICAL PROFILE */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User color="var(--primary)" />
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Физический профиль</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Укажите параметры тела для расчета состава тела с умных весов.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Рост (см)</label>
            <input 
              type="number" value={profile.height}
              onChange={(e) => setProfile({...profile, height: Number(e.target.value) || 0})}
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Возраст (лет)</label>
            <input 
              type="number" value={profile.age}
              onChange={(e) => setProfile({...profile, age: Number(e.target.value) || 0})}
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Пол</label>
            <select 
              value={profile.gender}
              onChange={(e) => setProfile({...profile, gender: Number(e.target.value)})}
              style={inputStyle}
            >
              <option value={1}>Мужской</option>
              <option value={0}>Женский</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Режим спортсмена</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '45px' }}>
              <input 
                type="checkbox" 
                checked={profile.isAthlete}
                onChange={(e) => setProfile({...profile, isAthlete: e.target.checked})}
                style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9rem' }}>Активен</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Алгоритм BIA</label>
            <select 
              value={profile.biaAlgorithm || 'standard'}
              onChange={(e) => setProfile({...profile, biaAlgorithm: e.target.value})}
              style={inputStyle}
            >
              <option value="standard">Standard BIA (Sun et al.)</option>
              <option value="yunmai">Yunmai Fallback</option>
              <option value="xiaomi">Xiaomi Fallback</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Калибровка жира (%)</label>
            <input 
              type="number" 
              step="0.1"
              value={profile.fatOffset || 0}
              onChange={(e) => setProfile({...profile, fatOffset: Number(e.target.value) || 0})}
              style={inputStyle} 
            />
          </div>
        </div>
        <button className="btn btn-glass" onClick={handleSaveProfile}>
          Сохранить профиль
        </button>
      </div>

      {/* SECTION 2: API KEY (Protected) */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound color="var(--primary)" />
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Системные настройки</h2>
          {hasPin && (isUnlocked ? <Unlock size={16} color="var(--text-muted)"/> : <Lock size={16} color="var(--accent)"/>)}
        </div>

        {!isUnlocked ? (
          // LOCKED STATE
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Эта секция защищена ПИН-кодом.</p>
            <input 
              type="password" 
              placeholder="Введите ПИН-код"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={inputStyle}
            />
            {pinError && <div style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>{pinError}</div>}
            <button className="btn btn-primary" onClick={handleUnlock}>Разблокировать</button>
            <button 
              className="btn btn-glass" 
              style={{ marginTop: '8px', borderColor: 'rgba(244, 63, 94, 0.4)', color: 'var(--accent)' }} 
              onClick={() => {
                if (window.confirm("Вы уверены, что хотите сбросить ПИН-код? Все настройки будут сохранены, но защита отключится.")) {
                  localStorage.removeItem('nutrilens_pin');
                  setHasPin(false);
                  setIsUnlocked(true);
                  setPinInput('');
                  setPinError('');
                  alert("ПИН-код сброшен!");
                }
              }}
            >
              Сбросить ПИН-код
            </button>
          </div>
        ) : (
          // UNLOCKED STATE
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {!hasPin && (
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Рекомендуем установить ПИН-код для защиты ключа.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="password" placeholder="Новый ПИН (от 4 символов)" 
                    value={setupPin} onChange={(e) => setSetupPin(e.target.value)}
                    style={{...inputStyle, flex: 1}}
                  />
                  <button className="btn btn-glass" style={{ padding: '8px 12px' }} onClick={handleSetPin}>Установить</button>
                </div>
                {pinError && <div style={{ color: 'var(--accent)', fontSize: '0.8rem', marginTop: '4px' }}>{pinError}</div>}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.9rem', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Ключ Google Gemini API</label>
              <input 
                type="password" 
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                style={{...inputStyle, fontFamily: 'monospace'}}
              />
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'var(--primary)', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-block', marginTop: '8px' }}
              >
                Получить ключ бесплатно →
              </a>
            </div>

            <button className="btn btn-primary" onClick={handleSaveApi}>
              Сохранить ключ
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'rgba(0,0,0,0.2)',
  color: 'white',
  outline: 'none',
  fontSize: '1rem'
};
