import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import PhotoUploader from './components/PhotoUploader';
import RecipeCalculator from './components/RecipeCalculator';
import RecipeBuilder from './components/RecipeBuilder';
import DatabaseTab from './components/DatabaseTab';
import { CheckCircle2 } from 'lucide-react';

function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'settings', 'camera'
  const [apiKey, setApiKey] = useState('');
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 };
  const [goals, setGoals] = useState(DEFAULT_GOALS);

  // Load from local storage & Garbage Collection
  useEffect(() => {
    const savedKey = localStorage.getItem('nutrilens_gemini_key');
    if (savedKey) setApiKey(savedKey);

    const savedGoals = localStorage.getItem('nutrilens_goals');
    if (savedGoals) {
      try { setGoals(JSON.parse(savedGoals)); } catch (e) { console.error(e); }
    }

    const savedFavs = localStorage.getItem('nutrilens_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) { console.error(e); }
    }

    const savedHistory = localStorage.getItem('nutrilens_history');
    if (savedHistory) {
      try {
        let parsedHistory = JSON.parse(savedHistory);
        // GARBAGE COLLECTOR: Remove items older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        parsedHistory = parsedHistory.filter(item => {
          return new Date(item.timestamp) >= thirtyDaysAgo;
        });
        
        setHistory(parsedHistory);
        localStorage.setItem('nutrilens_history', JSON.stringify(parsedHistory));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  // Removed forced redirect to settings so offline features can be used

  const handleFoodAnalyzed = (result) => {
    // SECURITY: Validate that the returned data has the required numbers and is >= 0
    const sanitizedResult = {
      name: String(result.name || 'Неизвестное блюдо').substring(0, 50),
      calories: Math.max(0, Number(result.calories) || 0),
      protein: Math.max(0, Number(result.protein) || 0),
      carbs: Math.max(0, Number(result.carbs) || 0),
      fat: Math.max(0, Number(result.fat) || 0),
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [sanitizedResult, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('nutrilens_history', JSON.stringify(updatedHistory));
    
    setShowSuccess(true);
    setView('dashboard');
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddFavorite = (item) => {
    // Check if already exists
    if (!favorites.some(f => f.name === item.name)) {
      const favItem = {
        name: item.name, calories: item.calories, 
        protein: item.protein, carbs: item.carbs, fat: item.fat
      };
      const updatedFavs = [favItem, ...favorites];
      setFavorites(updatedFavs);
      localStorage.setItem('nutrilens_favorites', JSON.stringify(updatedFavs));
      alert("Добавлено в избранное!");
    }
  };

  const handleDeleteFavorite = (name) => {
    const updatedFavs = favorites.filter(f => f.name !== name);
    setFavorites(updatedFavs);
    localStorage.setItem('nutrilens_favorites', JSON.stringify(updatedFavs));
  };

  const clearHistory = () => {
    if(confirm("Вы уверены что хотите очистить историю за день?")) {
      setHistory([]);
      localStorage.removeItem('nutrilens_history');
    }
  };

  const todayHistory = history.filter(item => {
    if (!item.timestamp) return true; // fallback
    return new Date(item.timestamp).toDateString() === new Date().toDateString();
  });

  return (
    <>
      <Header currentView={view} setView={setView} />
      
      <main style={{ flex: 1, paddingBottom: '80px' }}>
        {!navigator.onLine && (
          <div style={{ margin: '10px 20px', padding: '12px', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--accent)', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
            Нет подключения к интернету. ИИ-функции недоступны.
          </div>
        )}
        
        {showSuccess && (
          <div style={{ 
            margin: '20px', padding: '16px', background: 'rgba(16, 185, 129, 0.2)', 
            border: '1px solid var(--primary)', borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '12px', color: '#34d399',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <CheckCircle2 /> Блюдо успешно добавлено!
          </div>
        )}

        {view === 'dashboard' && (
          <>
            <Dashboard 
              history={todayHistory} 
              clearHistory={clearHistory} 
              goals={goals} 
              favorites={favorites}
              onAddFromFav={handleFoodAnalyzed}
              onSaveToFav={handleAddFavorite}
              onDeleteFav={handleDeleteFavorite}
              setView={setView}
              onFoodAnalyzed={handleFoodAnalyzed}
            />
            {apiKey && (
              <PhotoUploader apiKey={apiKey} onFoodAnalyzed={handleFoodAnalyzed} />
            )}
          </>
        )}

        {view === 'builder' && (
          <RecipeBuilder 
            favorites={favorites} 
            onSaveToFav={handleAddFavorite} 
            setView={setView} 
          />
        )}

        {view === 'database' && (
          <DatabaseTab 
            favorites={favorites} 
            onSaveToFav={handleAddFavorite} 
            onAddFromFav={handleFoodAnalyzed} 
            onDeleteFav={handleDeleteFavorite} 
            setView={setView} 
          />
        )}

        {view === 'recipe' && (
          <RecipeCalculator apiKey={apiKey} onFoodAnalyzed={handleFoodAnalyzed} />
        )}
        
        {view === 'settings' && (
          <Settings 
            apiKey={apiKey} setApiKey={setApiKey} 
            setView={setView} 
            goals={goals} setGoals={setGoals} 
          />
        )}
      </main>
    </>
  );
}

export default App;
