import React, { useState, useEffect } from 'react';

const CornerTaps = ({ onComplete, onCancel }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [phase, setPhase] = useState('intro'); // 'intro', 'playing', 'complete'
  const [activeCorner, setActiveCorner] = useState(0); // 0: TL, 1: TR, 2: BL, 3: BR
  const [isHoveringTarget, setIsHoveringTarget] = useState(false);

  // Timer logic - only counts down when physically hovering the active target
  useEffect(() => {
    let timer;
    if (phase === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        if (isHoveringTarget) {
          setTimeLeft((prev) => prev - 1);
        }
      }, 1000);
    } else if (timeLeft === 0 && phase === 'playing') {
      setPhase('complete');
    }
    return () => clearInterval(timer);
  }, [phase, isHoveringTarget, timeLeft]);

  // Target switching logic
  useEffect(() => {
    let interval;
    if (phase === 'playing' && isHoveringTarget) {
      // Only switch if they actually triggered it by hovering!
      interval = setInterval(() => {
        setActiveCorner((prev) => {
          let next;
          do { next = Math.floor(Math.random() * 4); } while (next === prev);
          setIsHoveringTarget(false); // Force them to move to the new one
          return next;
        });
      }, 2500); // Switch corner every 2.5 seconds when active
    }
    return () => clearInterval(interval);
  }, [phase, isHoveringTarget]);

  const corners = [
    { id: 0, top: '5%', left: '5%', label: 'Top Left' },
    { id: 1, top: '5%', right: '5%', label: 'Top Right' },
    { id: 2, bottom: '5%', left: '5%', label: 'Bottom Left' },
    { id: 3, bottom: '5%', right: '5%', label: 'Bottom Right' }
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '600px',
      background: 'linear-gradient(145deg, #111827, #0f172a)',
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
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            background: 'rgba(0,0,0,0.5)',
            padding: '8px 20px',
            borderRadius: '20px',
            border: `1px solid ${isHoveringTarget ? '#2ecc71' : 'rgba(255,255,255,0.1)'}`,
            color: isHoveringTarget ? '#2ecc71' : (timeLeft <= 5 ? '#ff4757' : '#fff'),
            transition: 'all 0.3s',
            boxShadow: isHoveringTarget ? '0 0 20px rgba(46,204,113,0.3)' : 'none'
          }}>
            {isHoveringTarget ? '▶ RESUMED' : '⏸ PAUSED'} • 00:{timeLeft.toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {phase === 'intro' && (
        <div style={{ textAlign: 'center', zIndex: 20, maxWidth: '550px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎯</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(135deg, #f39c12, #e74c3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Corner Taps
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            A peripheral vision & stretching game to exercise your eye muscles. <br/><br/>
            Wait for a corner ball to light up. Look directly at it and move your cursor over it! 
            The 30-sec timer <strong>only counts down while your cursor is resting directly on the active target.</strong>
          </p>
          <button 
            onClick={() => { setPhase('playing'); }}
            style={{
              background: 'linear-gradient(135deg, #f39c12, #e74c3c)',
              color: 'white',
              border: 'none',
              padding: '16px 40px',
              borderRadius: '16px',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(231, 76, 60, 0.3)',
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
          <div style={{ position: 'absolute', color: 'rgba(255,255,255,0.3)', textAlign: 'center', pointerEvents: 'none', zIndex: 1, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '1.2rem' }}>
            {isHoveringTarget ? (
                <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>Hold to stretch eye muscles...</span>
            ) : (
                <span style={{ color: '#ff4757', fontWeight: 'bold' }}>Hover cursor over the highlighted corner ball</span>
            )}
          </div>

          {corners.map((corner, index) => {
            const isActive = activeCorner === index;
            const isTargeted = isActive && isHoveringTarget;

            return (
              <div 
                key={corner.id}
                onMouseEnter={() => { if(isActive) setIsHoveringTarget(true); }}
                onMouseLeave={() => { if(isActive) setIsHoveringTarget(false); }}
                style={{
                  position: 'absolute',
                  top: corner.top,
                  bottom: corner.bottom,
                  left: corner.left,
                  right: corner.right,
                  width: '90px', // Larger hit area
                  height: '90px',
                  borderRadius: '50%',
                  background: isActive 
                        ? (isTargeted ? 'radial-gradient(circle at 30% 30%, #2ecc71, #27ae60)' : 'radial-gradient(circle at 30% 30%, #f39c12, #e67e22)')
                        : 'radial-gradient(circle at 30% 30%, #3e4c59, #1f2937)',
                  boxShadow: isActive 
                        ? (isTargeted ? '0 0 60px #2ecc71' : '0 0 30px #f39c12')
                        : 'inset 0 0 20px rgba(0,0,0,0.5)',
                  transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isActive ? 'scale(1.2)' : 'scale(1)',
                  opacity: isActive ? 1 : 0.4,
                  zIndex: 10,
                  cursor: isActive ? 'pointer' : 'default'
                }}
              >
                  {isActive && (
                      <div style={{ 
                          width: '25px', height: '25px', borderRadius: '50%', 
                          background: 'white', opacity: 0.8, boxShadow: '0 0 10px white' 
                      }} />
                  )}
              </div>
            );
          })}
        </>
      )}

      {phase === 'complete' && (
        <div style={{ textAlign: 'center', zIndex: 20, animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem', color: '#f39c12', textShadow: '0 0 30px rgba(243,156,18,0.5)' }}>🎯</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>Protocol Complete</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '2.5rem' }}>
             Eye mobility fully restored.<br/> You successfully stretched your peripheral ocular muscles.
          </p>
          <button 
            onClick={onComplete}
            style={{
              background: 'linear-gradient(135deg, #f39c12, #e74c3c)',
              color: 'white',
              border: 'none',
              padding: '16px 40px',
              borderRadius: '16px',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(243,156,18,0.3)'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      )}

    </div>
  );
};

export default CornerTaps;
