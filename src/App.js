import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import './App.css';

// ── Arc Gauge (SVG) ────────────────────────────────────────────────
function ArcGauge({ value, min, max, color, size = 140 }) {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = -210 + pct * 240;
  const r = 52;
  const cx = size / 2;
  const cy = size / 2 + 10;

  const polarToXY = (deg, radius) => {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcPath = (startDeg, endDeg, r) => {
    const s = polarToXY(startDeg, r);
    const e = polarToXY(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const needle = polarToXY(angle, r - 8);

  return (
    <svg width={size} height={size * 0.8}>
      {/* track */}
      <path d={arcPath(-210 + -90 + 90, -210 + 240 - 90 + 90, r)}
        fill="none" stroke="#e2e8f0" strokeWidth={8} strokeLinecap="round"
        transform={`rotate(0, ${cx}, ${cy})`}
      />
      {/* filled arc */}
      <path d={arcPath(-120, -120 + pct * 240, r)}
        fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
      />
      {/* needle dot */}
      <circle cx={needle.x} cy={needle.y} r={4} fill={color} />
      {/* center dot */}
      <circle cx={cx} cy={cy} r={3} fill="#cbd5e1" />
    </svg>
  );
}

// ── Custom Tooltip ──────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#ffffff', border: '1px solid #e2e8f0',
        borderRadius: 6, padding: '6px 10px', fontSize: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ color: '#64748b' }}>{label}</div>
        <div style={{ color: payload[0].color, fontWeight: 600 }}>
          {payload[0].value}{unit}
        </div>
      </div>
    );
  }
  return null;
}

// ── Main App ────────────────────────────────────────────────────────
export default function App() {
  const MAX_PILLS = 30;

  const [activeTab, setActiveTab] = useState('overview');

  // Live sensor state
  const [temp, setTemp]       = useState(24.1);
  const [humid, setHumid]     = useState(52.3);
  const [light, setLight]     = useState(false);
  const [lightLux, setLightLux] = useState(120);
  const [pills]               = useState(18);
  const [cooling, setCooling] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [cameraImg]               = useState(null);

  // History data for charts
  const [tempHistory, setTempHistory]   = useState([]);
  const [humidHistory, setHumidHistory] = useState([]);

  // Alert log
  const [alertLog, setAlertLog] = useState([
    { time: '—', msg: 'System started', color: '#06b6d4' },
  ]);

  const addLog = (msg, color = '#f59e0b') => {
    const time = new Date().toLocaleTimeString();
    setAlertLog(prev => [{ time, msg, color }, ...prev].slice(0, 6));
  };

  // ── Simulate live data (replace with MQTT later) ──────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const label = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newTemp  = parseFloat((22 + Math.random() * 12).toFixed(1));
      const newHumid = parseFloat((40 + Math.random() * 40).toFixed(1));
      const newLux   = parseFloat((50 + Math.random() * 400).toFixed(1));
      const lightOn  = newLux > 300;

      setTemp(newTemp);
      setHumid(newHumid);
      setLightLux(newLux);
      setLight(lightOn);
      setLastUpdate(now);
      setConnected(true);

      setTempHistory(prev => [...prev.slice(-19), { label, value: newTemp }]);
      setHumidHistory(prev => [...prev.slice(-19), { label, value: newHumid }]);

      if (newTemp > 30)           addLog(`High temp: ${newTemp}°C — cooling activated`, '#ef4444');
      if (newHumid > 70)          addLog(`High humidity: ${newHumid}% RH`, '#f59e0b');
      if (newHumid < 30)          addLog(`Low humidity: ${newHumid}% RH`, '#f59e0b');
      if (lightOn)                addLog('Light alert: box open too long', '#f59e0b');

      // auto cooling
      setCooling(newTemp > 30);
    };

    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);

  // ── Derived status ────────────────────────────────────────────────
  const tempColor  = temp > 30 ? '#ef4444' : temp > 26 ? '#f59e0b' : '#06b6d4';
  const humidColor = humid > 70 || humid < 30 ? '#ef4444' : humid > 60 ? '#f59e0b' : '#10b981';
  const pillColor  = pills <= 5 ? 'critical' : pills <= 10 ? 'low' : 'safe';
  const pillBarColor = pills <= 5 ? '#ef4444' : pills <= 10 ? '#f59e0b' : '#06b6d4';

  const tempStatus  = temp > 30 ? 'danger' : temp > 26 ? 'warn' : 'good';
  const humidStatus = humid > 70 || humid < 30 ? 'danger' : humid > 60 ? 'warn' : 'good';

  const statusLabel = { good: 'Good', warn: 'Warning', danger: 'Alert' };

  return (
    <div className="dashboard">

      {/* ── Header ── */}
      <div className="header">
        <div className="header-left">
          <div className="header-logo">💊</div>
          <div>
            <h1>AmbientRx</h1>
            <div className="header-subtitle">Smart Medicine Storage Monitor · MQTT: 20.110.157.53</div>
          </div>
        </div>
        <div className="status-badge">
          <div className={`status-dot ${connected ? '' : 'offline'}`} />
          {connected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'charts' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          📈 Charts
        </button>
      </div>

      {/* ── Tab 1: Overview ── */}
      {activeTab === 'overview' && (
        <>
          {/* 4 stat cards */}
          <div className="grid-4">

            {/* Temperature */}
            <div className="card card-accent-cyan">
              <div className="card-title">🌡 Temperature</div>
              <div className="gauge-wrap">
                <ArcGauge value={temp} min={0} max={50} color={tempColor} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className="stat-value" style={{ color: tempColor }}>{temp}</span>
                <span className="stat-unit"> °C</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className={`stat-status status-${tempStatus}`}>
                  {tempStatus === 'good' ? '✓' : '⚠'} {statusLabel[tempStatus]}
                </span>
              </div>
            </div>

            {/* Humidity */}
            <div className="card card-accent-blue">
              <div className="card-title">💧 Humidity</div>
              <div className="gauge-wrap">
                <ArcGauge value={humid} min={0} max={100} color={humidColor} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className="stat-value" style={{ color: humidColor }}>{humid}</span>
                <span className="stat-unit"> %RH</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className={`stat-status status-${humidStatus}`}>
                  {humidStatus === 'good' ? '✓' : '⚠'} {statusLabel[humidStatus]}
                </span>
              </div>
            </div>

            {/* Pill Count */}
            <div className="card card-accent-purple">
              <div className="card-title">💊 Pill Count</div>
              <div className="pill-display">
                <div className={`pill-number ${pillColor}`}>{pills}</div>
                <div className="pill-label">of {MAX_PILLS} remaining</div>
              </div>
              <div className="pill-bar-wrap">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                  <span>0</span><span>Stock level</span><span>{MAX_PILLS}</span>
                </div>
                <div className="pill-bar-track">
                  <div className="pill-bar-fill" style={{
                    width: `${(pills / MAX_PILLS) * 100}%`,
                    background: pillBarColor
                  }} />
                </div>
              </div>
              {pills <= 5 && (
                <div className="stat-status status-danger" style={{ marginTop: 10, justifyContent: 'center' }}>
                  ⚠ Restock Required
                </div>
              )}
            </div>

            {/* Light */}
            <div className="card card-accent-yellow">
              <div className="card-title">☀ Light Sensor</div>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div className="stat-value" style={{ color: light ? '#f59e0b' : '#06b6d4', fontSize: 28 }}>
                  {lightLux} <span className="stat-unit">lux</span>
                </div>
                <div style={{ marginTop: 16 }}>
                  <span className={`stat-status ${light ? 'status-warn' : 'status-good'}`}>
                    {light ? '⚠ Alert: Box Open' : '✓ Safe'}
                  </span>
                </div>
                <div style={{
                  width: 60, height: 60,
                  borderRadius: '50%',
                  background: light ? '#fffbeb' : '#f0fdf4',
                  border: `2px solid ${light ? '#f59e0b' : '#10b981'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '16px auto 0',
                  fontSize: 24
                }}>
                  {light ? '🔆' : '🌑'}
                </div>
              </div>
            </div>
          </div>

          {/* System Alerts + Controls + Camera */}
          <div className="grid-3">

            {/* Alerts */}
            <div className="card card-accent-red">
              <div className="card-title">🚨 System Alerts</div>
              <div className="alert-row">
                <span className="alert-name">🌡 Temperature</span>
                <span className={`alert-badge ${temp > 30 ? 'badge-alert' : 'badge-ok'}`}>
                  {temp > 30 ? 'ALERT' : 'OK'}
                </span>
              </div>
              <div className="alert-row">
                <span className="alert-name">💧 Humidity</span>
                <span className={`alert-badge ${humid > 70 || humid < 30 ? 'badge-alert' : humid > 60 ? 'badge-warn' : 'badge-ok'}`}>
                  {humid > 70 || humid < 30 ? 'ALERT' : humid > 60 ? 'WARN' : 'OK'}
                </span>
              </div>
              <div className="alert-row">
                <span className="alert-name">☀ Light</span>
                <span className={`alert-badge ${light ? 'badge-warn' : 'badge-ok'}`}>
                  {light ? 'OPEN' : 'OK'}
                </span>
              </div>
              <div className="alert-row">
                <span className="alert-name">💊 Pills</span>
                <span className={`alert-badge ${pills <= 5 ? 'badge-alert' : pills <= 10 ? 'badge-warn' : 'badge-ok'}`}>
                  {pills <= 5 ? 'RESTOCK' : pills <= 10 ? 'LOW' : 'OK'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="card card-accent-green">
              <div className="card-title">🎛 Controls</div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Cooling Fan</div>
                  <div className="toggle-sub">{cooling ? 'Running' : 'Standby'}</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={cooling}
                    onChange={e => {
                      setCooling(e.target.checked);
                      addLog(`Fan manually ${e.target.checked ? 'activated' : 'deactivated'}`, '#06b6d4');
                    }} />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Humidifier</div>
                  <div className="toggle-sub">{humid < 30 ? 'Auto-active' : 'Standby'}</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={humid < 30} readOnly />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Pill Restock Alert</div>
                  <div className="toggle-sub">Notify when &lt; 5 pills</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" defaultChecked readOnly />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
            </div>

            {/* Camera */}
            <div className="card card-accent-purple">
              <div className="card-title">📷 Camera — Pill Compartment</div>
              {cameraImg ? (
                <img src={cameraImg} alt="pill compartment" className="camera-img" />
              ) : (
                <div className="camera-placeholder">
                  <div style={{ fontSize: 32 }}>📷</div>
                  <div>Awaiting capture</div>
                  <div style={{ fontSize: 11 }}>ambrx/camera/image</div>
                </div>
              )}
              <button className="capture-btn" onClick={() => addLog('Capture triggered by caregiver', '#a855f7')}>
                Trigger Capture
              </button>
            </div>
          </div>

          {/* Alert Log */}
          <div className="card card-accent-blue">
            <div className="card-title">📋 Recent Alert Log</div>
            {alertLog.map((e, i) => (
              <div className="log-entry" key={i}>
                <div className="log-dot" style={{ background: e.color }} />
                <div>
                  <div className="log-time">{e.time}</div>
                  <div className="log-msg">{e.msg}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Tab 2: Charts ── */}
      {activeTab === 'charts' && (
        <>
          <div className="grid-2">
            <div className="card card-accent-cyan">
              <div className="card-title">📈 Temperature History</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={tempHistory}>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                    <YAxis domain={[15, 45]} tick={{ fontSize: 10, fill: '#94a3b8' }} width={32} />
                    <Tooltip content={<CustomTooltip unit="°C" />} />
                    <Line type="monotone" dataKey="value" stroke="#06b6d4"
                      strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-stat-row">
                <div className="chart-stat">
                  <div className="chart-stat-label">Current</div>
                  <div className="chart-stat-value" style={{ color: tempColor }}>{temp}°C</div>
                </div>
                <div className="chart-stat">
                  <div className="chart-stat-label">Min (session)</div>
                  <div className="chart-stat-value">{tempHistory.length ? Math.min(...tempHistory.map(d => d.value)).toFixed(1) : '—'}°C</div>
                </div>
                <div className="chart-stat">
                  <div className="chart-stat-label">Max (session)</div>
                  <div className="chart-stat-value">{tempHistory.length ? Math.max(...tempHistory.map(d => d.value)).toFixed(1) : '—'}°C</div>
                </div>
                <div className="chart-stat">
                  <div className="chart-stat-label">Avg (session)</div>
                  <div className="chart-stat-value">{tempHistory.length ? (tempHistory.reduce((s, d) => s + d.value, 0) / tempHistory.length).toFixed(1) : '—'}°C</div>
                </div>
              </div>
            </div>

            <div className="card card-accent-blue">
              <div className="card-title">📈 Humidity History</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={humidHistory}>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} width={32} />
                    <Tooltip content={<CustomTooltip unit="%" />} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6"
                      strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-stat-row">
                <div className="chart-stat">
                  <div className="chart-stat-label">Current</div>
                  <div className="chart-stat-value" style={{ color: humidColor }}>{humid}%</div>
                </div>
                <div className="chart-stat">
                  <div className="chart-stat-label">Min (session)</div>
                  <div className="chart-stat-value">{humidHistory.length ? Math.min(...humidHistory.map(d => d.value)).toFixed(1) : '—'}%</div>
                </div>
                <div className="chart-stat">
                  <div className="chart-stat-label">Max (session)</div>
                  <div className="chart-stat-value">{humidHistory.length ? Math.max(...humidHistory.map(d => d.value)).toFixed(1) : '—'}%</div>
                </div>
                <div className="chart-stat">
                  <div className="chart-stat-label">Avg (session)</div>
                  <div className="chart-stat-value">{humidHistory.length ? (humidHistory.reduce((s, d) => s + d.value, 0) / humidHistory.length).toFixed(1) : '—'}%</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="last-updated">
        Last updated: {lastUpdate.toLocaleTimeString()} · AmbientRx Smart Medicine Box · ESE5160 T20
      </div>

    </div>
  );
}
