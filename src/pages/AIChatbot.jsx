/**
 * AIChatbot Component
 * 
 * Provides an interactive chatbot interface powered by AI to assist users.
 * Features:
 * - Real-time conversation with AI
 * - Context-aware responses based on user input
 * - Integration with backend services for advanced queries
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Groq from 'groq-sdk';
import './AIChatbot.css';

const AIChatbot = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I\'m here to help you with your concerns and provide emotional support. I can discuss stress, anxiety, relationship issues, and general life challenges. However, please note that I cannot provide medical advice, crisis intervention, or replace professional mental health services. If you\'re experiencing a crisis, please contact emergency services or a crisis hotline immediately. How can I support you today?'
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);
    const [groqClient, setGroqClient] = useState(null);

    // Initialize Groq client
    useEffect(() => {
        const initializeGroq = () => {
            try {
                // You'll need to set your GROQ_API_KEY in environment variables
                const apiKey = import.meta.env.VITE_GROQ_API_KEY;
                if (!apiKey) {
                    setError('API key not configured. Please add VITE_GROQ_API_KEY to your environment variables.');
                    return;
                }
                const client = new Groq({
                    apiKey: apiKey,
                    dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
                });
                setGroqClient(client);
            } catch (error) {
                console.error('Failed to initialize Groq client:', error);
                setError('Failed to initialize AI service. Please try again later.');
            }
        };

        initializeGroq();
    }, []);

    // Scroll to bottom when new messages are added
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // System prompt with safety boundaries
    const SYSTEM_PROMPT = `You are a supportive AI assistant designed to help users with emotional support, stress management, and general life guidance. You are caring, empathetic, and non-judgmental.

STRICT BOUNDARIES - You MUST follow these rules:
1. NEVER provide medical advice, diagnoses, or treatment recommendations
2. NEVER provide crisis intervention or suicide prevention advice - instead direct to professional help
3. NEVER encourage self-harm or dangerous behaviors
4. NEVER provide advice on substance abuse or illegal activities
5. NEVER give financial, legal, or professional medical advice
6. NEVER roleplay as a licensed therapist, doctor, or medical professional

WHAT YOU CAN DO:
- Provide emotional support and active listening
- Offer stress management techniques and coping strategies
- Discuss relationship and communication issues
- Help with goal setting and motivation
- Share mindfulness and relaxation techniques
- Provide general wellness tips

CRISIS SITUATIONS:
If someone mentions suicide, self-harm, or crisis situations, immediately respond with:
"I'm concerned about what you're sharing. Please reach out to professional help immediately:
- Suicide Prevention: 1767 (SG)
- Samaritans of Singapore: 9151 1767 (WhatsApp)
- Emergency Services: 999 (SG)
- Or contact your local mental health crisis center.
I'm not equipped to handle crisis situations, but trained professionals are available 24/7."

Always be warm, supportive, and encourage seeking professional help when appropriate.`;

    const detectCrisisKeywords = (message) => {
        const crisisKeywords = [
            'suicide', 'kill myself', 'end my life', 'want to die', 'hurt myself',
            'self-harm', 'cutting', 'overdose', 'can\'t go on', 'worthless',
            'hopeless', 'no point', 'better off dead', 'end it all'
        ];
        
        const lowercaseMessage = message.toLowerCase();
        return crisisKeywords.some(keyword => lowercaseMessage.includes(keyword));
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || isLoading || !groqClient) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');
        setError('');
        setIsLoading(true);

        // Add user message to chat
        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);

        try {
            // Check for crisis keywords and respond immediately if detected
            if (detectCrisisKeywords(userMessage)) {
                const crisisResponse = {
                    role: 'assistant',
                    content: 'I\'m very concerned about what you\'re sharing. Please reach out for professional help immediately:\n\n• Suicide Prevention: 1767 (SG)\n• Samaritans of Singapore: 9151 1767 (WhatsApp)\n• Emergency Services: 999 (SG)\n• Or contact your local mental health crisis center\n\nI\'m not equipped to handle crisis situations, but trained professionals are available 24/7 to provide the support you need right now. Please don\'t hesitate to reach out to them.'
                };
                setMessages([...newMessages, crisisResponse]);
                setIsLoading(false);
                return;
            }

            // Prepare messages for API call
            const apiMessages = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...newMessages.slice(-10) // Keep last 10 messages for context
            ];

            const completion = await groqClient.chat.completions.create({
                messages: apiMessages,
                model: 'llama-3.1-8b-instant', // Using Llama 3 8B model
                temperature: 0.7,
                max_tokens: 1000,
                top_p: 1,
                stream: false
            });

            const assistantMessage = {
                role: 'assistant',
                content: completion.choices[0]?.message?.content || 'I apologize, but I didn\'t receive a proper response. Could you please try again?'
            };

            setMessages([...newMessages, assistantMessage]);
        } catch (error) {
            console.error('Error calling Groq API:', error);
            let errorMessage = 'I apologize, but I\'m having trouble responding right now. ';
            
            if (error.status === 429) {
                errorMessage += 'The service is currently busy. Please try again in a moment.';
            } else if (error.status === 401) {
                errorMessage += 'There\'s an authentication issue. Please refresh the page and try again.';
            } else if (error.status === 500) {
                errorMessage += 'The AI service is temporarily unavailable. Please try again later.';
            } else {
                errorMessage += 'Please try again or refresh the page if the problem persists.';
            }

            setMessages([...newMessages, {
                role: 'assistant',
                content: errorMessage
            }]);
            setError('Failed to get AI response. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: 'Hello! I\'m here to help you with your concerns and provide emotional support. I can discuss stress, anxiety, relationship issues, and general life challenges. However, please note that I cannot provide medical advice, crisis intervention, or replace professional mental health services. If you\'re experiencing a crisis, please contact emergency services or a crisis hotline immediately. How can I support you today?'
            }
        ]);
        setError('');
    };

    return (
        <div className="ai-chatbot-container">
            <div className="ai-chatbot-content">
                <header className="home-header">
                    <h1>AI Support Chat</h1>
                </header>

                <div className="chat-container">
                    <div className="messages-container">
                        {messages.map((message, index) => (
                            <div key={index} className={`message ${message.role}`}>
                                <div className="message-content">
                                    {message.content.split('\n').map((line, lineIndex) => (
                                        <p key={lineIndex}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message assistant">
                                <div className="message-content loading">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    AI is thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="input-container">
                        <div className="safety-notice">
                            <small>
                                <strong>Important:</strong> This AI provides general support only. 
                                In crisis situations, contact 1767 (Samaritans of Singapore) or 999 immediately.
                            </small>
                        </div>
                        <div className="input-row">
                            <button onClick={() => navigate('/home')} className="back-button">
                                ← Back to Home
                            </button>
                            <textarea
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Share what's on your mind... (Press Enter to send, Shift+Enter for new line)"
                                className="message-input"
                                disabled={isLoading || !groqClient}
                                rows="3"
                            />
                            <button 
                                onClick={sendMessage} 
                                disabled={!inputMessage.trim() || isLoading || !groqClient}
                                className="send-button"
                            >
                                {isLoading ? 'Sending...' : 'Send'}
                            </button>
                            <button onClick={clearChat} className="clear-button">
                                Clear Chat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIChatbot;
