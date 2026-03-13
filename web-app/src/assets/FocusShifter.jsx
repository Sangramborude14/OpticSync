import React, { useState, useEffect } from 'react';

const FocusShifter = ({ onComplete, onCancel }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [activeTarget, setActiveTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState('intro'); // 'intro' -> 'playing' -> 'complete'

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

  // Target switching logic
  useEffect(() => {
    let interval;
    if (phase === 'playing') {
      interval = setInterval(() => {
        setActiveTarget((prev) => {
          let next;
          do { next = Math.floor(Math.random() * 5); } while (next === prev);
          return next;
        });
      }, 2500); // Shift depth every 2.5 seconds
    }
    return () => clearInterval(interval);
  }, [phase]);

  const handleTargetClick = (index) => {
    if (index === activeTarget && phase === 'playing') {
      setScore((prev) => prev + 1);
      // Immediately pick a new target for responsiveness
      setActiveTarget((prev) => {
        let next;
        do { next = Math.floor(Math.random() * 5); } while (next === prev);
        return next;
      });
    }
  };

  const orbs = [
    { id: 0, x: '15%', y: '25%', size: 90, color: '#1abc9c' }, // Teal
    { id: 1, x: '75%', y: '20%', size: 120, color: '#9b59b6' }, // Purple
    { id: 2, x: '50%', y: '60%', size: 110, color: '#3498db' }, // Blue
    { id: 3, x: '80%', y: '65%', size: 85, color: '#e74c3c' }, // Red
    { id: 4, x: '25%', y: '70%', size: 130, color: '#f1c40f' }, // Yellow
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '500px',
      background: 'linear-gradient(145deg, #090a0f, #15161e)',
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
            border: '1px solid rgba(255,255,255,0.1)',
            color: timeLeft <= 5 ? '#ff4757' : '#1abc9c',
            transition: 'color 0.3s'
          }}>
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Intro Phase */}
      {phase === 'intro' && (
        <div style={{ textAlign: 'center', zIndex: 20, maxWidth: '500px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(135deg, #1abc9c, #3498db)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Focus Shifter
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            This exercise is designed to rapidly recalibrate your depth perception. 
            Multiple orbs will float on screen at different optical depths. <br/><br/>
            <strong>Your Task:</strong> Find and click the sharpest orb as the focal plane shifts.
          </p>
          <button 
            onClick={() => setPhase('playing')}
            style={{
              background: 'linear-gradient(135deg, #1abc9c, #2ecc71)',
              color: 'white',
              border: 'none',
              padding: '16px 40px',
              borderRadius: '16px',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(26, 188, 156, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Start 30s Protocol
          </button>
        </div>
      )}

      {/* Playing Phase */}
      {phase === 'playing' && (
        <>
          <div style={{ position: 'absolute', top: '80px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', width: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <p style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Shifts Tracked: {score}</p>
          </div>
          
          <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1 }}>
            {orbs.map((orb, index) => {
              const isActive = activeTarget === index;
              return (
                <div 
                  key={orb.id}
                  onClick={() => handleTargetClick(index)}
                  style={{
                    position: 'absolute',
                    left: orb.x,
                    top: orb.y,
                    width: `${orb.size}px`,
                    height: `${orb.size}px`,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, ${orb.color}, #000)`,
                    boxShadow: isActive ? `0 0 50px ${orb.color}` : 'none',
                    transition: 'all 0.9s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    cursor: isActive ? 'pointer' : 'default',
                    filter: isActive ? 'blur(0px)' : 'blur(12px)',
                    transform: isActive ? 'scale(1.2)' : 'scale(0.7)',
                    opacity: isActive ? 1 : 0.3,
                    zIndex: isActive ? 10 : 1
                  }}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Completion Phase */}
      {phase === 'complete' && (
        <div style={{ textAlign: 'center', zIndex: 20, animation: 'fadeIn 0.5s ease-in' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem', color: '#2ecc71', textShadow: '0 0 30px rgba(46,204,113,0.5)' }}>✓</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>Protocol Complete</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '2.5rem' }}>
             You successfully tracked <strong>{score}</strong> depth shifts.<br/> Your cognitive strain has been mathematically reset.
          </p>
          <button 
            onClick={onComplete}
            style={{
              background: 'linear-gradient(135deg, #1abc9c, #2ecc71)',
              color: 'white',
              border: 'none',
              padding: '16px 40px',
              borderRadius: '16px',
              fontSize: '1.2rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(26, 188, 156, 0.3)'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default FocusShifter;
