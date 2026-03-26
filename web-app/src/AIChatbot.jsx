import React, { useState, useRef, useEffect } from 'react';
import './AIChatbot.css';

const SUGGESTIONS = [
    "My eyes feel tired, what should I do?",
    "What is a healthy blink rate?",
    "Explain my EAR ratio",
    "Recommend a therapy module"
];

function AIChatbot({ strainLevel, blinkRate, statusText, postureStatus, currentDistance }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hey there! 👋 I'm **OptiSync AI**, your personal eye health assistant. Ask me anything about screen fatigue, blink patterns, or therapy recommendations!"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const sendMessage = async (text) => {
        const userMessage = text || input.trim();
        if (!userMessage || isLoading) return;

        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:5001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    context: {
                        strain: strainLevel,
                        blinkRate: blinkRate,
                        status: statusText,
                        posture: postureStatus,
                        distance: currentDistance
                    }
                })
            });

            const data = await response.json();

            if (data.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Could not reach the backend. Make sure the server is running on port 5001.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatMessage = (text) => {
        // Basic markdown: bold, italic, and line breaks
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                className={`chatbot-fab ${isOpen ? 'active' : ''} ${strainLevel > 60 ? 'pulse-alert' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="OptiSync AI Assistant"
            >
                {isOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a8 8 0 0 1 8 8c0 3.3-2 6.2-5 7.5V22l-3-2-3 2v-4.5C6 16.2 4 13.3 4 10a8 8 0 0 1 8-8z" />
                        <circle cx="10" cy="10" r="1" fill="currentColor" />
                        <circle cx="14" cy="10" r="1" fill="currentColor" />
                    </svg>
                )}
                {!isOpen && (
                    <span className="fab-badge">AI</span>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-left">
                            <div className="chatbot-avatar">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a8 8 0 0 1 8 8c0 3.3-2 6.2-5 7.5V22l-3-2-3 2v-4.5C6 16.2 4 13.3 4 10a8 8 0 0 1 8-8z" />
                                    <circle cx="10" cy="10" r="1" fill="currentColor" />
                                    <circle cx="14" cy="10" r="1" fill="currentColor" />
                                </svg>
                            </div>
                            <div>
                                <h3>OptiSync AI</h3>
                                <span className="chatbot-status-dot">
                                    <span className="dot-live"></span>
                                    Gemini 3.1 Pro
                                </span>
                            </div>
                        </div>
                        <div className="chatbot-header-context">
                            <span className="context-pill" style={{
                                background: strainLevel > 75 ? 'rgba(255,71,87,0.2)' : strainLevel > 40 ? 'rgba(243,156,18,0.2)' : 'rgba(46,204,113,0.2)',
                                color: strainLevel > 75 ? '#ff4757' : strainLevel > 40 ? '#f39c12' : '#2ecc71',
                                borderColor: strainLevel > 75 ? 'rgba(255,71,87,0.3)' : strainLevel > 40 ? 'rgba(243,156,18,0.3)' : 'rgba(46,204,113,0.3)'
                            }}>
                                {strainLevel}% Strain
                            </span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`chat-message ${msg.role}`}>
                                {msg.role === 'assistant' && (
                                    <div className="message-avatar">🤖</div>
                                )}
                                <div
                                    className="message-bubble"
                                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                                />
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-message assistant">
                                <div className="message-avatar">🤖</div>
                                <div className="message-bubble typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions (only show if its the initial message) */}
                    {messages.length <= 1 && (
                        <div className="chatbot-suggestions">
                            {SUGGESTIONS.map((suggestion, i) => (
                                <button
                                    key={i}
                                    className="suggestion-chip"
                                    onClick={() => sendMessage(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="chatbot-input-area">
                        <input
                            ref={inputRef}
                            type="text"
                            className="chatbot-input"
                            placeholder="Ask about eye health, strain, therapy..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        <button
                            className="chatbot-send-btn"
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default AIChatbot;
