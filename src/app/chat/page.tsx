'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, Bot, User, Sparkles, Clock, Flame, BookOpen, Mic, MicOff, Timer, ShoppingCart, ChefHat, MessageSquare, X, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  action?: {
    type: 'timer' | 'shoppingList' | 'recipe' | 'recipeSuggestions';
    minutes?: number;
    item?: string;
    recipes?: any[];
  };
}

interface TimerState {
  minutes: number;
  seconds: number;
  running: boolean;
  visible: boolean;
}

const quickQuestions = [
  { icon: Clock, text: 'How do I boil eggs?' },
  { icon: Flame, text: 'How to cook chicken?' },
  { icon: BookOpen, text: 'How to cook rice?' },
  { icon: Sparkles, text: 'Sugar substitute?' },
  { icon: Clock, text: 'Cooking tips?' },
  { icon: Flame, text: 'Baking advice?' },
  { icon: ShoppingCart, text: 'Add milk to shopping list' },
  { icon: Timer, text: 'Set timer for 15 minutes' },
  { icon: ChefHat, text: 'I have chicken, rice, onion' },
];

export const dynamic = 'force-dynamic';

function ChatContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState<TimerState>({ minutes: 0, seconds: 0, running: false, visible: false });
  const [hasHistory, setHasHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const initialLoadDone = useRef(false);

  const { data: chatData, loading: chatLoading, refresh: refreshChat } = useCachedFetch<{ messages: any[] }>('/api/chat/history');

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
      return;
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || initialLoadDone.current) return;
    initialLoadDone.current = true;

    if (chatData && chatData.messages && chatData.messages.length > 0) {
      const historyMessages = chatData.messages
        .filter((m: any) => m.role === 'assistant' && m.content === "Hi! I'm your smart cooking assistant. I can:\n\n• Answer cooking questions\n• Suggest recipes from your pantry\n• Add items to your shopping list\n• Set cooking timers\n• Give personalized tips based on your diet\n\nWhat would you like to know?")
        .map((m: any) => ({ ...m, role: 'assistant' as const, content: "Hi! I'm your smart cooking assistant. I can:\n\n• Answer cooking questions\n• Suggest recipes from your pantry\n• Add items to your shopping list\n• Set cooking timers\n• Give personalized tips based on your diet\n\nWhat would you like to know?" }));
      const userMessages = chatData.messages.filter((m: any) => m.role === 'user');
      const assistantHistory = chatData.messages.filter((m: any) => m.role === 'assistant');
      const filteredHistory = assistantHistory.filter((m: any) =>
        m.content !== "Hi! I'm your smart cooking assistant. I can:\n\n• Answer cooking questions\n• Suggest recipes from your pantry\n• Add items to your shopping list\n• Set cooking timers\n• Give personalized tips based on your diet\n\nWhat would you like to know?"
      );
      setMessages(filteredHistory);
      setHasHistory(true);
    }
  }, [authLoading, user, chatData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (timer.running && timer.minutes > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev.seconds === 0) {
            if (prev.minutes === 1) {
              return { ...prev, running: false, minutes: 0, seconds: 0 };
            }
            return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
          }
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    } else if (timer.running && timer.minutes === 0 && timer.seconds === 0) {
      setTimer(prev => ({ ...prev, running: false }));
      alert('⏱️ Timer is done! Your food is ready!');
    }
    return () => clearInterval(interval);
  }, [timer.running]);

  const startTimer = (minutes: number) => {
    setTimer({ minutes, seconds: 0, running: true, visible: true });
  };

  const stopTimer = () => {
    setTimer(prev => ({ ...prev, running: false }));
  };

  const resetTimer = () => {
    setTimer({ minutes: 0, seconds: 0, running: false, visible: false });
  };

  // Voice recognition
  const toggleVoiceInput = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        (recognitionRef.current as any).stop();
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.message) {
        const assistantMsg: ChatMessage = {
          id: data.messageIds?.assistant,
          role: 'assistant',
          content: data.message.content,
          action: data.action,
        };

        setMessages(prev => [...prev, assistantMsg]);

        // Handle timer action
        if (data.action?.type === 'timer' && data.action.minutes) {
          startTimer(data.action.minutes);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble responding. Please try again!',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => {
      const userMessage = { role: 'user' as const, content: question };
      setMessages(prev => [...prev, userMessage]);
      setLoading(true);

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          if (data.message) {
            const assistantMsg: ChatMessage = {
              id: data.messageIds?.assistant,
              role: 'assistant',
              content: data.message.content,
              action: data.action,
            };
            setMessages(prev => [...prev, assistantMsg]);

            if (data.action?.type === 'timer' && data.action.minutes) {
              startTimer(data.action.minutes);
            }
          }
        })
        .catch(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Sorry, I\'m having trouble responding. Please try again!',
          }]);
        })
        .finally(() => setLoading(false));
    }, 100);
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/chat/history', { method: 'DELETE', credentials: 'include' });
      refreshChat();
      setMessages([]);
      setHasHistory(false);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const formatTime = (m: number, s: number) => {
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 h-screen flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-orange-500 hover:text-orange-600 text-sm mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
              <Bot className="w-8 h-8 text-orange-500" />
              Cooking Assistant
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">Smart cooking help with AI-powered responses</p>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear History</span>
              </button>
            )}
            {timer.visible && (
              <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-xl p-3 shadow-lg border border-orange-200 dark:border-orange-700">
                <Timer className="w-5 h-5 text-orange-500" />
                <span className="text-xl font-mono font-bold text-zinc-900 dark:text-white">{formatTime(timer.minutes, timer.seconds)}</span>
                {timer.running ? (
                  <button onClick={stopTimer} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">Stop</button>
                ) : (
                  <button onClick={() => setTimer(prev => ({ ...prev, running: true }))} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">Start</button>
                )}
                <button onClick={resetTimer} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id || `msg-${messages.indexOf(message)}`} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-bl-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {/* Recipe suggestions action */}
                  {message.action?.type === 'recipeSuggestions' && message.action.recipes && (
                    <div className="mt-2 space-y-2">
                      {message.action.recipes.map((recipe, i) => (
                        <div key={i} className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                          <p className="font-medium text-zinc-900 dark:text-white text-sm">{recipe.title}</p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">{recipe.matchPercentage}% match</p>
                          {recipe.missing && recipe.missing.length > 0 && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                              Missing: {recipe.missing.slice(0, 3).join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-zinc-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-700 p-4 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex gap-2">
              <button
                onClick={toggleVoiceInput}
                className={`p-3 rounded-xl transition-colors ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                }`}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={isRecording ? 'Listening...' : 'Ask about cooking, add to shopping list, or set timer...'}
                className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="mt-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 text-center">Try asking:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickQuestion(q.text)}
                  disabled={loading}
                  className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-md hover:shadow-lg hover:border-orange-500 border border-zinc-200 dark:border-zinc-700 transition-all text-left text-sm text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <q.icon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span>{q.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return <ChatContent />;
}
