import React, { useState, useEffect } from 'react';
import { TrendingUp, Ruler, Clock, Bluetooth, Save, Sparkles, User, RefreshCw } from 'lucide-react';

export default function ProgressTab({ history, goals }) {
  const [measurements, setMeasurements] = useState([]);
  const [formData, setFormData] = useState({ weight: '', chest: '', waist: '', hips: '', arms: '' });
  const [scaleData, setScaleData] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [profile, setProfile] = useState({
    height: 175,
    age: 25,
    gender: 1, // 1 = male, 0 = female
    isAthlete: false,
    biaAlgorithm: 'standard',
    fatOffset: 0
  });
  
  // Yunmai Smart Scale State
  const [scaleWeight, setScaleWeight] = useState(null);
  const [scaleImpedance, setScaleImpedance] = useState(null);
  const [isStable, setIsStable] = useState(false);
  const [bodyComp, setBodyComp] = useState(null);
  const [simPacket, setSimPacket] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('nutrilens_measurements');
    if (saved) {
      try { setMeasurements(JSON.parse(saved)); } catch (e) { console.error(e); }
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

  const parseYunmaiPacket = (bytes) => {
    if (bytes.length < 10) return null;
    if (bytes[0] !== 0x0D) return null;

    const version = bytes[1];
    const length = bytes[2];
    const type = bytes[3];

    // Compute checksum (XOR of bytes 1 to length - 2)
    let calculatedChecksum = 0;
    for (let i = 1; i < length - 1; i++) {
      calculatedChecksum ^= bytes[i];
    }
    const receivedChecksum = bytes[length - 1];

    if (calculatedChecksum !== receivedChecksum) {
      console.warn("Checksum validation failed: ", { calculatedChecksum, receivedChecksum });
    }

    if (type === 0x01) {
      // Measuring packet (11 bytes)
      const rawWeight = (bytes[8] << 8) | bytes[9];
      const weight = rawWeight / 100;
      return { type: 'measuring', weight, timestamp: new Date() };
    } else if (type === 0x02) {
      // Final packet (20 bytes)
      const rawWeight = (bytes[13] << 8) | bytes[14];
      const weight = rawWeight / 100;
      const impedance = (bytes[15] << 8) | bytes[16];
      let fatPercent = 0;
      if (version >= 0x1E && length >= 19) {
        fatPercent = ((bytes[17] << 8) | bytes[18]) / 100;
      }
      return { type: 'final', weight, impedance, fatPercent, timestamp: new Date() };
    }

    return null;
  };

  const handleScaleDataReceived = (parsed) => {
    if (!parsed) return;

    if (parsed.type === 'measuring') {
      setScaleWeight(parsed.weight);
      setIsStable(false);
      setBodyComp(null);
      setFormData(prev => ({ ...prev, weight: parsed.weight.toFixed(2) }));
    } else if (parsed.type === 'final') {
      setScaleWeight(parsed.weight);
      setScaleImpedance(parsed.impedance);
      setIsStable(true);
      setFormData(prev => ({ ...prev, weight: parsed.weight.toFixed(2) }));

      // Calculate all body composition metrics using final weight and impedance
      const w = parsed.weight;
      const h = profile.height || 175;
      const age = profile.age || 25;
      const gender = profile.gender === 0 ? 0 : 1; // 1 = male, 0 = female
      const athlete = profile.isAthlete ? 1 : 0;
      const res = parsed.impedance;
      const biaAlg = profile.biaAlgorithm || 'standard';
      const fatOffset = Number(profile.fatOffset) || 0;

      // 1. BMI (ИМТ)
      const heightM = h / 100;
      const bmi = w / (heightM * heightM);

      // 2. Body Fat % (Процент Жира)
      let fatPercent = parsed.fatPercent;
      if (!fatPercent || fatPercent === 0) {
        if (biaAlg === 'standard' && res > 0) {
          const h2rCoeff = (h * h) / res;
          let ffm = 0;
          if (gender === 1) {
            ffm = -10.68 + 0.65 * h2rCoeff + 0.26 * w + 0.02 * res;
          } else {
            ffm = -9.53 + 0.69 * h2rCoeff + 0.17 * w + 0.02 * res;
          }
          if (ffm <= 0) ffm = w * 0.7;
          fatPercent = (1.0 - ffm / w) * 100.0;
        } else if (biaAlg === 'xiaomi' && res > 0) {
          let lbmCoeff = (h * 9.058 / 100.0) * (h / 100.0) + w * 0.32 + 12.226 - res * 0.0068 - age * 0.0542;
          let lbmSub = 0.8;
          if (gender === 0) {
            lbmSub = age <= 49 ? 9.25 : 7.25;
          }
          let coeff = 1.0;
          if (gender === 1 && w < 61.0) {
            coeff = 0.98;
          } else if (gender === 0 && w > 60.0) {
            coeff = 0.96 * (h > 160.0 ? 1.03 : 1.0);
          } else if (gender === 0 && w < 50.0) {
            coeff = 1.02 * (h > 160.0 ? 1.03 : 1.0);
          }
          fatPercent = (1.0 - ((lbmCoeff - lbmSub) * coeff) / w) * 100.0;
        } else {
          // Default/Yunmai fallback or fallback if no impedance
          if (res > 0) {
            let r = (res - 100.0) / 100.0;
            if (r >= 1.0) r = Math.sqrt(r);
            let fat = (w * 1.5) / (heightM * heightM) + age * 0.08;
            if (gender === 1) {
              fat -= 10.8;
            }
            fatPercent = (fat - 7.4) + r;
          } else {
            let fat = (w * 1.5) / (heightM * heightM) + age * 0.08;
            if (gender === 1) {
              fat -= 10.8;
            }
            fatPercent = fat - 7.4;
          }
        }
      }

      // Apply custom fat offset calibration
      fatPercent += fatOffset;

      if (fatPercent < 5.0) fatPercent = 5.0;
      if (fatPercent > 75.0) fatPercent = 75.0;

      // 3. Water % (Вода %)
      const waterPercent = (100.0 - fatPercent) * 0.726;

      // 4. Muscle mass % (Мышцы %)
      const musclePercent = (100.0 - fatPercent) * (athlete === 1 ? 0.70 : 0.67);

      // 5. Skeletal Muscle % (Скелетные мышцы %)
      const skeletalMusclePercent = (100.0 - fatPercent) * (athlete === 1 ? 0.60 : 0.53);

      // 6. Bone mass (Костная масса в кг)
      const hDiff = h - 170.0;
      let boneMass = 0;
      if (gender === 1) {
        boneMass = ((w * (musclePercent / 100.0) * 4.0) / 7.0 * 0.22 * 0.6) + (hDiff / 100.0);
      } else {
        boneMass = ((w * (musclePercent / 100.0) * 4.0) / 7.0 * 0.34 * 0.45) + (hDiff / 100.0);
      }
      if (boneMass < 0) boneMass = 0;

      // 7. Protein % (Белок %)
      const proteinPercent = (100.0 - fatPercent) * 0.274 - ((boneMass / w) * 100.0);

      // 8. Visceral Fat Index (Внутренний жир от 1 до 30)
      let visceralFat = 1.0;
      const boundedAge = Math.min(120, Math.max(18, age));
      if (athlete === 0) {
        let f = fatPercent;
        if (gender === 1) {
          f -= (boundedAge < 40 ? 21.0 : (boundedAge < 60 ? 22.0 : 24.0));
        } else {
          f -= (boundedAge < 40 ? 34.0 : (boundedAge < 60 ? 35.0 : 36.0));
        }
        let d = (gender === 1 ? 1.4 : 1.8);
        if (f > 0.0) d = 1.1;
        visceralFat = (f / d) + 9.5;
      } else {
        if (fatPercent > 15.0) {
          visceralFat = ((fatPercent - 15.0) / 1.1) + 12.0;
        } else {
          visceralFat = (-1.0 * (15.0 - fatPercent) / 1.4) + 12.0;
        }
        if (visceralFat > 9.0) visceralFat = 9.0;
      }
      if (visceralFat < 1.0) visceralFat = 1.0;
      if (visceralFat > 30.0) visceralFat = 30.0;

      // 9. Fat mass (Жировая масса в кг)
      const fatMass = w * (fatPercent / 100.0);

      // 10. Fat index (Индекс жира FMI)
      const fmi = fatMass / (heightM * heightM);

      // 11. Dry mass (Сухая масса LBM в кг)
      const lbm = w * ((100.0 - fatPercent) / 100.0);

      setBodyComp({
        bmi: bmi.toFixed(1),
        fat: fatPercent.toFixed(1),
        muscle: musclePercent.toFixed(1),
        skeletal: skeletalMusclePercent.toFixed(1),
        water: waterPercent.toFixed(1),
        protein: proteinPercent.toFixed(1),
        visceral: visceralFat.toFixed(1),
        bone: boneMass.toFixed(1),
        fatMass: fatMass.toFixed(1),
        fmi: fmi.toFixed(1),
        lbm: lbm.toFixed(1)
      });
    }
  };

  const handleSaveScaleWeight = () => {
    if (!scaleWeight) return;
    const newEntry = {
      weight: scaleWeight.toFixed(2),
      chest: formData.chest || '',
      waist: formData.waist || '',
      hips: formData.hips || '',
      arms: formData.arms || '',
      date: new Date().toISOString(),
      ...(bodyComp || {})
    };
    const updated = [newEntry, ...measurements];
    setMeasurements(updated);
    localStorage.setItem('nutrilens_measurements', JSON.stringify(updated));
    setScaleWeight(null);
    setScaleImpedance(null);
    setBodyComp(null);
    setScaleData('');
    alert(`Показатели сохранены в историю!`);
  };

  const handleInjectPacket = () => {
    // Parse hex input string (e.g. "0D 1F 0B 01 6A 10 DF A7 28 03 3C")
    const cleanHex = simPacket.replace(/[^0-9a-fA-F]/g, '');
    if (cleanHex.length < 10) {
      alert("Недостаточная длина шестнадцатеричной строки!");
      return;
    }
    
    const bytes = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
    }
    
    setIsConnected(true);
    setScaleData(simPacket.trim().toUpperCase());
    
    const parsed = parseYunmaiPacket(bytes);
    if (parsed) {
      handleScaleDataReceived(parsed);
    } else {
      alert("Пакет не распознан. Проверьте заголовок (0D) и тип (01 или 02).");
    }
  };

  const handleConnectScale = async () => {
    try {
      if (!navigator.bluetooth) {
        alert("Bluetooth недоступен. Браузер блокирует доступ (нужен HTTPS или localhost).");
        return;
      }
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'YUNMAI' }],
        optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb', 'weight_scale']
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
          const bytes = [];
          for (let i = 0; i < value.byteLength; i++) {
            const byteVal = value.getUint8(i);
            bytes.push(byteVal);
            hexArray.push(byteVal.toString(16).padStart(2, '0').toUpperCase());
          }
          const hexString = hexArray.join(' ');
          setScaleData(hexString);

          const parsed = parseYunmaiPacket(bytes);
          if (parsed) {
            handleScaleDataReceived(parsed);
          }
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

  // Generate 7-day history for Bar Chart (Calories)
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

  // Get weight history sorted by date ascending for Weight trend chart
  const weightHistory = [...measurements]
    .filter(m => m.weight)
    .map(m => ({
      weight: parseFloat(m.weight),
      date: new Date(m.date),
      label: new Date(m.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
    }))
    .sort((a, b) => a.date - b.date)
    .slice(-7); // Last 7 entries

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

  // Weight Trend SVG Parameters
  let weightChartSvg = null;
  if (weightHistory.length >= 2) {
    const weightValues = weightHistory.map(h => h.weight);
    const minW = Math.min(...weightValues);
    const maxW = Math.max(...weightValues);
    const paddingW = (maxW - minW) * 0.15 || 2.0;
    const minLimit = minW - paddingW;
    const maxLimit = maxW + paddingW;
    const rangeW = maxLimit - minLimit || 1;

    const svgWidth = 400;
    const svgHeight = 180;
    const padL = 40;
    const padR = 20;
    const padT = 25;
    const padB = 30;
    const chartW = svgWidth - padL - padR;
    const chartH = svgHeight - padT - padB;

    const coords = weightHistory.map((pt, i) => {
      const x = padL + (i / (weightHistory.length - 1)) * chartW;
      const y = padT + chartH - ((pt.weight - minLimit) / rangeW) * chartH;
      return { x, y, weight: pt.weight, label: pt.label };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    const fillPath = `${linePath} L ${coords[coords.length - 1].x} ${padT + chartH} L ${coords[0].x} ${padT + chartH} Z`;

    const yMin = padT + chartH - ((minW - minLimit) / rangeW) * chartH;
    const yMax = padT + chartH - ((maxW - minLimit) / rangeW) * chartH;
    const yMid = (yMin + yMax) / 2;

    weightChartSvg = (
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', marginTop: '12px' }}>
        <defs>
          <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        <line x1={padL} y1={yMin} x2={svgWidth - padR} y2={yMin} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
        <line x1={padL} y1={yMid} x2={svgWidth - padR} y2={yMid} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
        <line x1={padL} y1={yMax} x2={svgWidth - padR} y2={yMax} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />

        {/* Y Axis labels */}
        <text x={padL - 8} y={yMin + 3} fill="var(--text-muted)" fontSize={9} textAnchor="end">{minW.toFixed(1)}</text>
        <text x={padL - 8} y={yMid + 3} fill="var(--text-muted)" fontSize={9} textAnchor="end">{((minW + maxW)/2).toFixed(1)}</text>
        <text x={padL - 8} y={yMax + 3} fill="var(--text-muted)" fontSize={9} textAnchor="end">{maxW.toFixed(1)}</text>

        {/* Area fill */}
        <path d={fillPath} fill="url(#weightAreaGrad)" />

        {/* Trend line */}
        <path d={linePath} fill="none" stroke="var(--secondary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Circular markers & data labels */}
        {coords.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={6} fill="var(--secondary)" opacity={0.25} />
            <circle cx={pt.x} cy={pt.y} r={3.5} fill="white" stroke="var(--secondary)" strokeWidth={2} />
            <text x={pt.x} y={pt.y - 10} fill="white" fontSize={10} fontWeight="bold" textAnchor="middle">{pt.weight.toFixed(1)}</text>
            <text x={pt.x} y={svgHeight - 10} fill="var(--text-muted)" fontSize={9} textAnchor="middle">{pt.label}</text>
          </g>
        ))}
      </svg>
    );
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

      {/* Weight Trend Chart */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} color="var(--secondary)" /> График изменения веса (кг)
        </h3>
        {weightHistory.length < 2 ? (
          <div style={{ padding: '30px 10px', textAlignment: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
            📊 Здесь появится график при наличии 2 и более записей веса в истории.
          </div>
        ) : (
          weightChartSvg
        )}
      </div>

      {/* Scale Live Popup / Body composition Breakdown */}
      {scaleWeight && (
        <div className="glass-panel" style={{ 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bluetooth size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Весы Yunmai: {isStable ? 'Завершено' : 'Измерение...'}
              </span>
            </div>
            <div style={{ width: '8px', height: '8px', background: isStable ? 'var(--primary)' : 'var(--accent)', borderRadius: '50%', animation: isStable ? 'none' : 'pulse 1s infinite' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'center', margin: '8px 0' }}>
            <span style={{ fontSize: '3rem', fontWeight: '800', color: 'white', lineHeight: 1 }}>{scaleWeight.toFixed(2)}</span>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 600 }}>кг</span>
          </div>

          {scaleImpedance && (
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>Биоимпеданс: <strong>{scaleImpedance} Ом</strong></div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                Алгоритм BIA: <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{
                  profile.biaAlgorithm === 'standard' ? 'Standard BIA (Sun et al.)' :
                  profile.biaAlgorithm === 'xiaomi' ? 'Xiaomi Fallback' : 'Yunmai Fallback'
                }</span>
                {Number(profile.fatOffset) !== 0 && ` (Калибровка: ${Number(profile.fatOffset) > 0 ? '+' : ''}${profile.fatOffset}%)`}
              </div>
            </div>
          )}

          {bodyComp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <Sparkles size={14} color="var(--primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Состав тела:</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div style={metricItemStyle}><span>ИМТ:</span><strong>{bodyComp.bmi}</strong></div>
                <div style={metricItemStyle}><span>Жир:</span><strong style={{ color: 'var(--accent)' }}>{bodyComp.fat}%</strong></div>
                <div style={metricItemStyle}><span>Мышцы:</span><strong>{bodyComp.muscle}%</strong></div>
                <div style={metricItemStyle}><span>Скелет. мышцы:</span><strong>{bodyComp.skeletal}%</strong></div>
                <div style={metricItemStyle}><span>Вода:</span><strong>{bodyComp.water}%</strong></div>
                <div style={metricItemStyle}><span>Белок:</span><strong>{bodyComp.protein}%</strong></div>
                <div style={metricItemStyle}><span>Внутр. жир:</span><strong>{bodyComp.visceral}</strong></div>
                <div style={metricItemStyle}><span>Костная масса:</span><strong>{bodyComp.bone} кг</strong></div>
                <div style={metricItemStyle}><span>Сухая масса:</span><strong>{bodyComp.lbm} кг</strong></div>
                <div style={metricItemStyle}><span>Жировая масса:</span><strong>{bodyComp.fatMass} кг</strong></div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={handleSaveScaleWeight} className="btn btn-primary" style={{ flex: 1, padding: '10px 16px', fontSize: '0.9rem' }}>
              <Save size={16} /> Сохранить в историю
            </button>
            <button onClick={() => { setScaleWeight(null); setScaleImpedance(null); setBodyComp(null); setScaleData(''); }} className="btn btn-glass" style={{ padding: '10px 16px', fontSize: '0.9rem' }}>
              Сбросить
            </button>
          </div>
        </div>
      )}

      {/* Body Measurements Section */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Ruler size={18} /> Вручную
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
          <Bluetooth size={18} /> {isConnected ? 'Весы подключены (Слушаем...)' : 'Подключить весы Yunmai BLE'}
        </button>

        {isConnected && (
          <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '0.8rem', color: '#10b981', wordBreak: 'break-all' }}>
            <strong>Сырые данные (Hex):</strong><br/>
            {scaleData || 'Встаньте на весы... ждем данные...'}
          </div>
        )}

        {/* Developer simulation panel */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginTop: '8px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🛠️ Симулятор пакетов весов (Разработка)
          </h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="0D 1F 0B 01 6A 10..." 
              value={simPacket} 
              onChange={e => setSimPacket(e.target.value)} 
              style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }}
            />
            <button onClick={handleInjectPacket} className="btn btn-glass" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
              Инжект
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            <button 
              className="btn btn-glass" 
              style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.02)' }}
              onClick={() => setSimPacket("0D 1F 0B 01 6A 10 DF A7 28 03 3C")}
            >
              102.43 кг (Measuring)
            </button>
            <button 
              className="btn btn-glass" 
              style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.02)' }}
              onClick={() => setSimPacket("0D 1F 14 02 00 6A 10 E2 84 23 E7 1B 8E 28 00 01 A6 00 00 CB")}
            >
              102.40 кг (Final 422 Ом)
            </button>
          </div>
        </div>

        {/* Measurements History List */}
        {measurements.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <h4 style={{ margin: '10px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>История замеров</h4>
            {measurements.slice(0, 5).map((m, i) => (
              <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '12px' }}>
                    {m.weight && <span>Вес: {m.weight} кг</span>}
                    {m.waist && <span>Талия: {m.waist} см</span>}
                  </div>
                </div>
                {/* Body Composition Summary in list */}
                {m.fat && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>ИМТ: <strong>{m.bmi}</strong></span>
                    <span>•</span>
                    <span>Жир: <strong>{m.fat}%</strong></span>
                    <span>•</span>
                    <span>Мышцы: <strong>{m.muscle}%</strong></span>
                    <span>•</span>
                    <span>Вода: <strong>{m.water}%</strong></span>
                  </div>
                )}
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

const metricItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '6px 8px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.03)'
};
