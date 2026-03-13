import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

function HistoryLog() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ peak: 0, peakTime: '--:--', avg: 0 });
  const [dbStatus, setDbStatus] = useState('Checking...');

  useEffect(() => {
    // Check Health
    fetch('http://localhost:5001/api/health')
      .then(res => res.json())
      .then(res => setDbStatus(res.mongodb))
      .catch(() => setDbStatus('Offline'));

    fetch('http://localhost:5001/api/strain/today')
      .then(res => res.json())
      .then(fetchedData => {
        if (!Array.isArray(fetchedData)) return;
        setData(fetchedData);
        if (fetchedData.length > 0) {
          let maxStrain = 0;
          let maxTime = '--:--';
          let sumStrain = 0;
          
          fetchedData.forEach(d => {
            if (d.strain > maxStrain) {
              maxStrain = d.strain;
              maxTime = d.time;
            }
            sumStrain += d.strain;
          });
          
          setStats({
            peak: maxStrain,
            peakTime: maxTime,
            avg: Math.round(sumStrain / fetchedData.length)
          });
        }
      })
      .catch(err => console.error('Failed to fetch history:', err));
  }, []);

  return (
    <div className="history-log-container">
      <h2 style={{ marginBottom: '1rem' }}>Cognitive History Log</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Review your daily eye strain and fatigue patterns.
      </p>

      <div className="glass-card premium-history-card" style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>📈</span> Today's Strain Report
        </h3>
        
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorStrain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4757" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#1abc9c" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" />
              <YAxis stroke="rgba(255,255,255,0.4)" />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(20,20,20,0.9)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px',
                  color: '#fff'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="strain" 
                stroke="#1abc9c" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorStrain)" 
                activeDot={{ r: 8, fill: '#ff4757', stroke: '#fff', strokeWidth: 2 }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="history-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem' }}>
          <div className="stat-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '8px' }}>Peak Strain</p>
            <h4 style={{ color: '#ff4757', fontSize: '1.8rem', fontWeight: 700 }}>{stats.peak}%</h4>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '4px' }}>at {stats.peakTime}</p>
          </div>
          <div className="stat-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '8px' }}>Average Strain</p>
            <h4 style={{ color: '#f39c12', fontSize: '1.8rem', fontWeight: 700 }}>{stats.avg}%</h4>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '4px' }}>{stats.avg > 60 ? 'High' : stats.avg > 30 ? 'Moderate' : 'Healthy'}</p>
          </div>
          <div className="stat-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '8px' }}>Tracking Engine</p>
            <h4 style={{ color: dbStatus === 'Connected' ? '#2ecc71' : '#ff4757', fontSize: '1.8rem', fontWeight: 700 }}>{dbStatus === 'Connected' ? 'Active' : dbStatus}</h4>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '4px' }}>{dbStatus === 'Connected' ? 'MongoDB Synced' : 'Check Server'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryLog;
