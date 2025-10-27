import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface IdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IdeasModal: React.FC<IdeasModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get a response from the AI.');
      }

      const { reply } = await response.json();
      const aiResponse: Message = { sender: 'ai', text: reply };
      setMessages(prev => [...prev, aiResponse]);

    } catch (error: any) {
      console.error(error);
      const errorResponse: Message = { sender: 'ai', text: `Sorry, I ran into an error: ${error.message}` };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[90] p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col relative border border-slate-700/50 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-6 w-6 text-sky-400" />
            <h2 className="text-xl font-semibold text-white">AI Ideas Chat</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-sky-500/20 flex items-center justify-center"><SparklesIcon className="h-5 w-5 text-sky-400"/></div>}
              <div className={`p-3 rounded-lg max-w-lg ${msg.sender === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-700/50 text-slate-200'}`}>
                <div className="prose prose-invert prose-p:my-0 prose-p:text-slate-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
           {isLoading && (
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-sky-500/20 flex items-center justify-center"><SparklesIcon className="h-5 w-5 text-sky-400 animate-pulse"/></div>
                <div className="p-3 rounded-lg bg-slate-700/50 text-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-sky-400 rounded-full animate-pulse"></div>
                        <div className="h-2 w-2 bg-sky-400 rounded-full animate-pulse delay-75"></div>
                        <div className="h-2 w-2 bg-sky-400 rounded-full animate-pulse delay-150"></div>
                    </div>
                </div>
            </div>
           )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700/50 flex-shrink-0">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask for blog ideas, product suggestions, catchy titles..."
              className="input-blueprint w-full pr-12 resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-300 hover:bg-sky-500 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent"
              disabled={!input.trim() || isLoading}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
