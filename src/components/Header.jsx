import React from 'react';
import { Settings, Camera, PieChart, BookOpen, Database } from 'lucide-react';

export default function Header({ currentView, setView }) {
  return (
    <header className="glass" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '32px', height: '32px', 
          background: 'var(--primary)', 
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Camera size={18} color="#022c22" />
        </div>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }} className="text-gradient">NutriLens</h1>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => setView('dashboard')}
          className="btn-glass"
          style={{ padding: '8px', borderRadius: '50%', color: currentView === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          <PieChart size={20} />
        </button>
        <button 
          onClick={() => setView('database')}
          className="btn-glass"
          style={{ padding: '8px', borderRadius: '50%', color: currentView === 'database' ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          <Database size={20} />
        </button>
        <button 
          onClick={() => setView('recipe')}
          className="btn-glass"
          style={{ padding: '8px', borderRadius: '50%', color: currentView === 'recipe' ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          <BookOpen size={20} />
        </button>
        <button 
          onClick={() => setView('settings')}
          className="btn-glass"
          style={{ padding: '8px', borderRadius: '50%', color: currentView === 'settings' ? 'var(--primary)' : 'var(--text-muted)' }}
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}
