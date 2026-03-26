import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

function HistoryLog() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ peak: 0, peakTime: '--:--', avg: 0 });
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [aiReport, setAiReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState('');

  const generateAIReport = async () => {
    setIsGenerating(true);
    setReportError('');
    try {
      const response = await fetch('http://localhost:5001/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats })
      });
      const resData = await response.json();
      if (resData.error) {
        setReportError(resData.error);
      } else {
        setAiReport(resData.report);
      }
    } catch (err) {
      setReportError('Failed to connect to the backend API.');
    } finally {
      setIsGenerating(false);
    }
  };

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
                  <stop offset="5%" stopColor="#ff4757" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1abc9c" stopOpacity={0.1} />
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

        {/* AI Ergonomic Health Report Section */}
        <div style={{ marginTop: '2.5rem', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle gradient orb for premium feel */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(142, 68, 173, 0.4) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
            <h3 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem', margin: 0 }}>
              <span style={{ fontSize: '1.6rem' }}>✨</span> AI Health Insights
            </h3>
            <button 
              className="btn-primary" 
              onClick={generateAIReport}
              disabled={isGenerating || data.length === 0}
              style={{
                background: 'linear-gradient(135deg, #8e44ad, #9b59b6)',
                border: 'none',
                padding: '10px 20px',
                color: '#fff',
                borderRadius: '8px',
                cursor: (isGenerating || data.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (isGenerating || data.length === 0) ? 0.6 : 1,
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(142, 68, 173, 0.3)'
              }}
            >
              {isGenerating ? 'Analyzing Data...' : 'Generate with Gemini'}
            </button>
          </div>
          
          {reportError && (
            <div style={{ padding: '15px', background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255, 71, 87, 0.2)', position: 'relative', zIndex: 1 }}>
              ⚠️ {reportError}
            </div>
          )}

          {aiReport && !reportError && (
            <div className="ai-report-content" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.8', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', position: 'relative', zIndex: 1 }}>
              {aiReport.split('\n').map((line, idx) => {
                if (line.trim().startsWith('**')) {
                  const parts = line.split('**');
                  return (
                    <p key={idx} style={{ marginBottom: line.trim() === '' ? '0' : '15px' }}>
                      <strong style={{ color: '#a29bfe', fontSize: '1.1rem', marginRight: '6px' }}>{parts[1]}</strong>
                      {parts.slice(2).join('')}
                    </p>
                  );
                }
                return line.trim() ? <p key={idx} style={{ marginBottom: '15px' }}>{line}</p> : null;
              })}
            </div>
          )}
          
          {!aiReport && !reportError && !isGenerating && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem 0', fontStyle: 'italic', position: 'relative', zIndex: 1 }}>
              Click to generate a personalized health report powered by Google Gemini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryLog;
