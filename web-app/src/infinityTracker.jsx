import React, { useState, useEffect, useRef } from 'react';

const InfinityTracker = ({ onComplete, onCancel }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [phase, setPhase] = useState('intro'); // 'intro', 'playing', 'complete'
  const [score, setScore] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const orbRef = useRef(null);
  const orbPos = useRef({ x: 0, y: 0 });

  // Timer logic
  useEffect(() => {
    let timer;
    if (phase === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && phase === 'playing') {
      setPhase('complete');
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  // Animation Loop (Figure 8 / Lemniscate of Gerono)
  useEffect(() => {
    if (phase !== 'playing') return;

    let startTime = Date.now();
    let frameId;

    const animate = () => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      const speed = 1.0; 
      const t = elapsed * speed;

      if (containerRef.current && orbRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        const A = width * 0.35; 
        const B = height * 0.25; 
        
        const x = Math.sin(t) * A;
        const y = Math.sin(t) * Math.cos(t) * B;
        
        orbRef.current.style.transform = `translate(${x}px, ${y}px)`;
        
        const centerX = width / 2;
        const centerY = height / 2;
        orbPos.current = { x: centerX + x, y: centerY + y };
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [phase]);

  // Active Tracking Loop (Anti-Cheat mechanism)
  useEffect(() => {
    if (phase !== 'playing') return;
    
    const checkTracking = setInterval(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeMouseX = mousePos.x - rect.left;
      const relativeMouseY = mousePos.y - rect.top;

      const dx = relativeMouseX - orbPos.current.x;
      const dy = relativeMouseY - orbPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 70) { // 70px hover radius
        setIsHovering(true);
        setScore(prev => prev + 1); // 10 ticks per second
      } else {
        setIsHovering(false);
      }
    }, 100);

    return () => clearInterval(checkTracking);
  }, [phase, mousePos]);

  const maxPossibleScore = 300; // 30s * 10 ticks/sec
  const accuracy = Math.min(100, Math.max(0, Math.round((score / maxPossibleScore) * 100)));

  return (
    <div 
      ref={containerRef}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '500px',
        background: 'linear-gradient(145deg, #0f172a, #1e1b4b)',
        borderRadius: '24px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)'
    }}>
      
      {/* Navbar Container */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20
      }}>
        <button 
          onClick={onCancel}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          Abort Session
        </button>

        {phase === 'playing' && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tracking Accuracy</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: isHovering ? '#a855f7' : '#fff' }}>{accuracy}%</div>
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              background: 'rgba(0,0,0,0.5)',
              padding: '8px 20px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              color: timeLeft <= 5 ? '#ff4757' : '#a855f7',
              transition: 'color 0.3s'
            }}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>
        )}
      </div>

      {phase === 'intro' && (
        <div style={{ textAlign: 'center', zIndex: 20, maxWidth: '500px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>♾️</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(135deg, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Infinity Tracker
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            Train your orbital eye muscles by smoothly tracking the moving target. <br/><br/>
            <strong>Requirement:</strong> To ensure you are actively participating, you must track the glowing orb with your <b>MOUSE CURSOR</b> as it draws an infinity path. Tracking correctness will be strictly scored.
          </p>
          <button 
            onClick={() => { setPhase('playing'); setScore(0); }}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              color: 'white',
              border: 'none',
              padding: '16px 40px',
              borderRadius: '16px',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Start 30s Protocol
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <>
            <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.1 }}>
                <defs>
                    <linearGradient id="infGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>
                {/* Approximate visual path of the lemniscate for aesthetics */}
                <path 
                    d="M 50% 50% m -35% 0 a 17.5% 25% 0 1 1 35% 0 a 17.5% 25% 0 1 0 35% 0 a 17.5% 25% 0 1 1 -35% 0 z" 
                    fill="none" 
                    stroke="url(#infGrad)" 
                    strokeWidth="4" 
                />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>
                <div 
                    ref={orbRef}
                    style={{
                        position: 'absolute',
                        left: '-25px', // Center the 50x50 orb on its coordinate
                        top: '-25px',
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: isHovering 
                            ? 'radial-gradient(circle at 30% 30%, #a855f7, #3b82f6)' 
                            : 'radial-gradient(circle at 30% 30%, #475569, #1e293b)',
                        boxShadow: isHovering ? '0 0 40px #a855f7, 0 0 80px #3b82f6' : '0 0 10px rgba(0,0,0,0.5)',
                        transition: 'background 0.3s, box-shadow 0.3s',
                        zIndex: 10
                    }}
                />
            </div>
            {!isHovering && (
                <div style={{ position: 'absolute', bottom: '15%', color: '#ff4757', fontWeight: 'bold', fontSize: '1.2rem', opacity: timeLeft % 2 === 0 ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                    TRACK TARGET WITH CURSOR
                </div>
            )}
        </>
      )}

      {phase === 'complete' && accuracy >= 50 && (
        <div style={{ textAlign: 'center', zIndex: 20, animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem', color: '#a855f7', textShadow: '0 0 30px rgba(168,85,247,0.5)' }}>♾️</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>Protocol Complete</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '2.5rem' }}>
             Tracking Accuracy: <strong style={{ color: '#a855f7' }}>{accuracy}%</strong><br/>
             Your ocular tracking muscles have been successfully exercised.
          </p>
          <button 
            onClick={onComplete}
            style={{
              background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
              color: 'white',
              border: 'none',
              padding: '16px 40px',
              borderRadius: '16px',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(168,85,247,0.3)'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      )}

      {phase === 'complete' && accuracy < 50 && (
        <div style={{ textAlign: 'center', zIndex: 20, animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem', color: '#ff4757', textShadow: '0 0 30px rgba(255,71,87,0.5)' }}>⚠</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>Insufficient Tracking</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '2.5rem' }}>
             Tracking Accuracy: <strong style={{ color: '#ff4757' }}>{accuracy}%</strong><br/>
             You failed to maintain focus on the target. Strain levels have not been reset.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button 
                onClick={() => { setPhase('intro'); setScore(0); setTimeLeft(30); }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '16px 30px',
                  borderRadius: '16px',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Retry Protocol
              </button>
              <button 
                onClick={onCancel}
                style={{
                  background: 'linear-gradient(135deg, #ff4757, #c0392b)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 30px',
                  borderRadius: '16px',
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(255,71,87,0.3)'
                }}
              >
                Accept Partial Strain
              </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default InfinityTracker;
