import React, { useState, useEffect } from 'react';

export default function EyeMassage({ onComplete, onCancel }) {
    const [step, setStep] = useState(1); // 1 = Temple Massage, 2 = Eyebrow Sweep
    const [timeLeft, setTimeLeft] = useState(10);
    const [isStarted, setIsStarted] = useState(false);

    useEffect(() => {
        if (!isStarted) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (step === 1) {
                        // Move to next exercise
                        setStep(2);
                        return 10;
                    } else {
                        // Finish
                        clearInterval(timer);
                        onComplete();
                        return 0;
                    }
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isStarted, step, onComplete]);

    const title = step === 1 ? "Temple Massage" : "Eyebrow Sweep";
    const description = step === 1 
        ? "Use two fingers to gently massage your temples in small circular motions to relieve tension."
        : "Use your thumbs to gently sweep outwards from the bridge of your nose along your eyebrows.";

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            
            <style>
                {`
                @keyframes orbitLeft {
                    from { transform: rotate(0deg) translateX(12px) rotate(0deg); }
                    to { transform: rotate(-360deg) translateX(12px) rotate(360deg); }
                }
                @keyframes orbitRight {
                    from { transform: rotate(0deg) translateX(12px) rotate(0deg); }
                    to { transform: rotate(360deg) translateX(12px) rotate(-360deg); }
                }

                @keyframes sweepLeft {
                    0% { transform: translate(20px, 0px); opacity: 0; }
                    10% { opacity: 1; }
                    80% { transform: translate(-50px, -20px); opacity: 1; }
                    100% { transform: translate(-60px, -20px); opacity: 0; }
                }
                
                @keyframes sweepRight {
                    0% { transform: translate(-20px, 0px); opacity: 0; }
                    10% { opacity: 1; }
                    80% { transform: translate(50px, -20px); opacity: 1; }
                    100% { transform: translate(60px, -20px); opacity: 0; }
                }

                @keyframes pulseGlow {
                    0% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.2); }
                    50% { box-shadow: 0 0 40px rgba(46, 204, 113, 0.6); }
                    100% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.2); }
                }
                `}
            </style>

            <div className="glass-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '2rem', margin: 0 }}>Step {step}/2: {title}</h2>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '20px', color: '#1abc9c', fontWeight: 'bold' }}>
                        {step === 1 ? 'Exercise 1' : 'Exercise 2'}
                    </div>
                </div>
                
                <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '1.1rem', lineHeight: '1.6' }}>
                    {description}
                </p>

                {/* Animation Canvas */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px', aspectRatio: '1/1', margin: '0 auto 40px', borderRadius: '50%', overflow: 'hidden', background: 'radial-gradient(circle, rgba(20,20,30,1) 0%, rgba(10,10,15,1) 100%)', border: '2px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    
                    {/* Abstract Face Features */}
                    <div style={{ position: 'absolute', width: '40px', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', top: '70px', left: '70px', transform: 'rotate(-10deg)' }}></div>
                    <div style={{ position: 'absolute', width: '40px', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', top: '70px', right: '70px', transform: 'rotate(10deg)' }}></div>
                    
                    <div style={{ position: 'absolute', width: '20px', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', top: '120px' }}></div> {/* Nose hint */}
                    
                    {/* Eyes */}
                    <div style={{ position: 'absolute', width: '15px', height: '4px', background: '#1abc9c', borderRadius: '5px', left: '80px', top: '90px', boxShadow: '0 0 10px #1abc9c', opacity: isStarted ? 0.4 : 1, transition: '0.5s' }}></div>
                    <div style={{ position: 'absolute', width: '15px', height: '4px', background: '#1abc9c', borderRadius: '5px', right: '80px', top: '90px', boxShadow: '0 0 10px #1abc9c', opacity: isStarted ? 0.4 : 1, transition: '0.5s' }}></div>

                    {isStarted ? (
                        <>
                            {/* Animated Fingers */}
                            <div style={{ 
                                position: 'absolute', 
                                width: '24px', height: '24px', 
                                background: '#2ecc71', borderRadius: '50%',
                                filter: 'blur(1px)',
                                left: step === 1 ? '40px' : 'calc(50% - 12px)',
                                top: step === 1 ? '85px' : '75px',
                                animation: step === 1 ? 'orbitLeft 2s linear infinite, pulseGlow 2s ease-in-out infinite' : 'sweepLeft 3s ease-out infinite, pulseGlow 2s ease-in-out infinite'
                            }}></div>
                            
                            <div style={{ 
                                position: 'absolute', 
                                width: '24px', height: '24px', 
                                background: '#2ecc71', borderRadius: '50%',
                                filter: 'blur(1px)',
                                right: step === 1 ? '40px' : 'calc(50% - 12px)',
                                top: step === 1 ? '85px' : '75px',
                                animation: step === 1 ? 'orbitRight 2s linear infinite, pulseGlow 2s ease-in-out infinite' : 'sweepRight 3s ease-out infinite, pulseGlow 2s ease-in-out infinite'
                            }}></div>
                        </>
                    ) : (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
                            <button className="btn-primary" onClick={() => setIsStarted(true)} style={{ padding: '14px 28px', borderRadius: '12px', cursor: 'pointer', background: 'linear-gradient(135deg, #1abc9c, #2ecc71)', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(26, 188, 156, 0.3)' }}>Start 20s Massage</button>
                        </div>
                    )}
                </div>

                {isStarted && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '5rem', fontWeight: '800', color: '#2ecc71', fontFamily: 'Outfit', lineHeight: '1', textShadow: '0 0 30px rgba(46, 204, 113, 0.4)' }}>
                            00:{timeLeft < 10 ? '0' + timeLeft : timeLeft}
                        </div>
                        <p style={{ color: '#1abc9c', marginTop: '10px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>Relax and breathe...</p>
                    </div>
                )}
                
                <div style={{ marginTop: '20px' }}>
                    <button className="btn-text" onClick={onCancel} style={{ fontSize: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}>Cancel Flow</button>
                </div>
            </div>
        </div>
    );
}
