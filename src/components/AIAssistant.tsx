/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Task, ChatMessage } from '../types';
import { MessageSquare, X, Send, Sparkles, User, Brain, ArrowDown } from 'lucide-react';

interface AIAssistantProps {
  tasks: Task[];
}

export default function AIAssistant({ tasks }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi! I'm your DeadlineAI Assistant. Ask me how to structure your day, what to do next, or let me break down a massive task for you. How can I help you beat your deadlines today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "What should I do next?",
    "Plan my evening.",
    "Can I finish everything today?",
    "How can I improve my productivity?"
  ];

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          tasks
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'model',
        text: data.text || "I'm having trouble analyzing your schedule right now. Try again in a second!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: `msg_err_${Date.now()}`,
        role: 'model',
        text: "I couldn't reach the AI Engine. Please check your network connection or verify your API key in settings.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="w-[380px] sm:w-[420px] h-[550px] mb-4 artistic-glass shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 border border-slate-200/40 dark:border-white/10"
          id="ai-assistant-window"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-5 flex items-center justify-between text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2 bg-white/15 rounded-xl">
                <Brain className="w-5 h-5 text-indigo-100 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide font-display">DeadlineAI Copilot</h3>
                <span className="text-[10px] text-indigo-100 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  CONNECTED TO SCHEDULE
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer relative z-10"
              id="close-ai-assistant-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' 
                    : 'bg-indigo-600 text-white shadow-md'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className="flex flex-col gap-1">
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800/80 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <span className={`text-[9px] text-slate-400 dark:text-slate-500 self-start ${msg.role === 'user' ? 'self-end' : ''}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Typing Loader */}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Brain className="w-4 h-4 animate-bounce" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800/80 p-3.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-200"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-300"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions */}
          <div className="px-4 py-3 border-t border-slate-100/30 dark:border-slate-800/40 flex gap-2 overflow-x-auto whitespace-nowrap bg-white/20 dark:bg-slate-900/30 backdrop-blur-md scrollbar-none">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSendMessage(s)}
                className="text-[11px] px-3.5 py-2 bg-white/60 hover:bg-indigo-50/50 hover:text-indigo-600 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 dark:text-slate-200 dark:hover:text-indigo-400 border border-slate-200/50 dark:border-slate-800/60 rounded-full transition-all shrink-0 cursor-pointer font-semibold"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
            className="p-3 border-t border-slate-200/40 dark:border-slate-800/60 bg-white/45 dark:bg-[#070914]/40 backdrop-blur-md flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask DeadlineAI anything..."
              className="flex-1 px-4 py-2.5 bg-white/70 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-100 font-medium"
              id="ai-assistant-input"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-indigo-500/10"
              id="send-ai-assistant-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-95 text-white rounded-full shadow-2xl hover:shadow-indigo-500/30 flex items-center justify-center hover:scale-105 transition-all cursor-pointer border border-white/20 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 relative overflow-hidden"
        id="toggle-ai-assistant-btn"
      >
        <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
        {isOpen ? <X className="w-5.5 h-5.5 stroke-[2.5]" /> : <MessageSquare className="w-5.5 h-5.5 animate-pulse" />}
      </button>
    </div>
  );
}
