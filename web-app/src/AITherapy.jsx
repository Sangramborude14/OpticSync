import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = import.meta.env.PROD ? "" : "http://localhost:5001";

function AITherapy() {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);



    const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analyze-daily`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                setAnalysis(data.analysis);
            }
        } catch (_err) {
            setError("Failed to reach backend. Ensure server is running on port 5001.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-therapy-container" style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '1rem' }}>AI Daily Analysis & Therapy</h2>
            <p style={{ color: 'var(--text-muted)' }}>
                OptiSync AI can analyze your daily eye strain data and recommend the most effective therapy modules to prevent strain and recover cognitive focus.
            </p>
            <button 
                className="btn-primary" 
                onClick={fetchAnalysis} 
                disabled={loading}
                style={{ 
                    marginTop: '20px', 
                    marginBottom: '30px',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    background: loading ? '#555' : 'linear-gradient(135deg, #1abc9c, #2ecc71)',
                    color: '#fff',
                }}
            >
                {loading ? 'Analyzing...' : 'Generate AI Routine'}
            </button>

            {error && <div style={{ color: '#ff4757', marginBottom: '20px', background: 'rgba(255,71,87,0.1)', padding: '15px', borderRadius: '8px' }}>{error}</div>}

            {analysis && (
                <div className="glass-card" style={{ padding: '30px', marginTop: '20px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '15px' }}>
                    <div style={{ lineHeight: '1.8', fontSize: '1.05rem', color: '#fff' }}>
                        <ReactMarkdown 
                            components={{
                                h1: ({node, ...props}) => <h1 style={{fontSize: '1.5rem', marginBottom: '0.8rem'}} {...props} />,
                                h2: ({node, ...props}) => <h2 style={{fontSize: '1.3rem', marginBottom: '0.8rem', marginTop: '1rem'}} {...props} />,
                                h3: ({node, ...props}) => <h3 style={{fontSize: '1.1rem', marginBottom: '0.6rem', marginTop: '1rem'}} {...props} />,
                                p: ({node, ...props}) => <p style={{marginBottom: '0.8rem'}} {...props} />,
                                ul: ({node, ...props}) => <ul style={{marginLeft: '20px', marginBottom: '1rem'}} {...props} />,
                                ol: ({node, ...props}) => <ol style={{marginLeft: '20px', listStyleType: 'decimal', marginBottom: '1rem'}} {...props} />,
                                li: ({node, ...props}) => <li style={{marginBottom: '0.4rem'}} {...props} />,
                                strong: ({node, ...props}) => <strong style={{color: '#1abc9c'}} {...props} />
                            }}
                        >
                            {analysis}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AITherapy;
