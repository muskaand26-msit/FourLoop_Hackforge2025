import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const handleToggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const navigateToPage = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const processMessage = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Navigation commands
    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
      navigateToPage('/emergency');
      return "I've redirected you to the emergency request page. You can create an urgent blood request here.";
    }
    
    if (lowerMessage.includes('find donor') || lowerMessage.includes('search donor')) {
      navigateToPage('/find-donors');
      return "I've taken you to the donor search page where you can find blood donors near you.";
    }
    
    if (lowerMessage.includes('donation camp') || lowerMessage.includes('camp')) {
      navigateToPage('/donation-camps');
      return "You can find information about blood donation camps here.";
    }
    
    if (lowerMessage.includes('about')) {
      navigateToPage('/about');
      return "I've opened the About Us page where you can learn more about LifeLink.";
    }
    
    if (lowerMessage.includes('how it works')) {
      navigateToPage('/how-it-works');
      return "Let me show you how LifeLink works.";
    }
    
    // FAQ responses
    if (lowerMessage.includes('blood type') && lowerMessage.includes('donate')) {
      return "Different blood types can donate to specific recipients. Here's a quick guide:\n" +
             "- O- can donate to all blood types (universal donor)\n" +
             "- O+ can donate to O+, A+, B+, AB+\n" +
             "- A- can donate to A-, A+, AB-, AB+\n" +
             "- A+ can donate to A+, AB+\n" +
             "- B- can donate to B-, B+, AB-, AB+\n" +
             "- B+ can donate to B+, AB+\n" +
             "- AB- can donate to AB-, AB+\n" +
             "- AB+ can only donate to AB+ (universal recipient)";
    }
    
    if (lowerMessage.includes('eligible') || lowerMessage.includes('can i donate')) {
      return "To be eligible for blood donation, you generally need to:\n" +
             "- Be at least 18 years old\n" +
             "- Weigh at least 50kg\n" +
             "- Be in good health\n" +
             "- Have not donated in the last 3 months\n" +
             "- Have hemoglobin levels above 12.5g/dl\n" +
             "For specific eligibility criteria, please consult with a healthcare professional.";
    }
    
    if (lowerMessage.includes('prepare') || lowerMessage.includes('before donation')) {
      return "To prepare for blood donation:\n" +
             "1. Get enough sleep\n" +
             "2. Eat a healthy meal within 3 hours of donation\n" +
             "3. Drink plenty of water\n" +
             "4. Avoid fatty foods\n" +
             "5. Bring valid ID and list of medications\n" +
             "6. Wear comfortable clothing";
    }
    
    // Default response
    return "I'm here to help you with blood donation related queries and navigation. You can ask me about:\n" +
           "- Emergency blood requests\n" +
           "- Finding donors\n" +
           "- Blood donation camps\n" +
           "- Blood type compatibility\n" +
           "- Donation eligibility\n" +
           "- How to prepare for donation";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = processMessage(userMessage.content);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Store interaction in database if user is logged in
      if (user) {
        await supabase.from('chatbot_interactions').insert([
          {
            user_id: user.id,
            message: userMessage.content,
            response: response,
          },
        ]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Failed to process message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat toggle button */}
      <button
        onClick={handleToggleChat}
        className="bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 transition"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          className={`absolute bottom-16 right-0 w-96 bg-white rounded-lg shadow-xl transition-all duration-300 ${
            isMinimized ? 'h-12' : 'h-[32rem]'
          }`}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-red-500" />
              <h3 className="font-medium">LifeLink Assistant</h3>
            </div>
            <button
              onClick={handleToggleMinimize}
              className="text-gray-500 hover:text-gray-700"
            >
              {isMinimized ? (
                <Maximize2 className="h-5 w-5" />
              ) : (
                <Minimize2 className="h-5 w-5" />
              )}
            </button>
          </div>

          {!isMinimized && (
            <>
              {/* Messages container */}
              <div className="h-[calc(32rem-8rem)] overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.role === 'user' ? 'text-red-100' : 'text-gray-500'
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !message.trim()}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
} 