import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaRobot, 
  FaTimes, 
  FaPaperPlane,
  FaMicrophone,
  FaSpinner,
  FaBrain,
  FaHeart,
  FaAppleAlt,
  FaDumbbell
} from 'react-icons/fa';
import axios from 'axios';

const AIAssistantButton = ({ isInline = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm your NutriAI assistant! 🤖 I can help you with nutrition advice, meal planning, health insights, and answer any questions about your wellness journey. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickQuestions = [
    {
      icon: FaAppleAlt,
      text: "What should I eat today?",
      color: "text-green-500"
    },
    {
      icon: FaDumbbell,
      text: "Create a workout plan",
      color: "text-blue-500"
    },
    {
      icon: FaHeart,
      text: "Check my health stats",
      color: "text-red-500"
    },
    {
      icon: FaBrain,
      text: "Nutrition tips",
      color: "text-purple-500"
    }
  ];

  const sendMessage = async (messageText = newMessage) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const history = [...messages, userMessage].map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const { data } = await axios.post('/api/ai/chat', {
        messages: history
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: data?.reply || 'Sorry, I could not generate a response right now.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { id: Date.now() + 2, type: 'ai', content: 'I ran into a problem answering that. Please try again.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed local rule-based responder in favor of backend AI

  const handleQuickQuestion = (question) => {
    sendMessage(question);
  };

  if (isInline) {
    // Inline version for desktop header
    return (
      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full shadow-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
        >
          <FaRobot className="text-lg" />
          <span className="hidden md:block font-medium">Ask AI</span>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50"
            >
              <ChatInterface
                messages={messages}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                sendMessage={sendMessage}
                isLoading={isLoading}
                quickQuestions={quickQuestions}
                handleQuickQuestion={handleQuickQuestion}
                setIsOpen={setIsOpen}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Floating version for mobile
  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full shadow-lg flex items-center justify-center z-40"
      >
        <FaRobot className="text-xl" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.3, type: "spring", damping: 30 }}
            className="fixed inset-0 bg-white z-50 flex flex-col"
          >
            <ChatInterface
              messages={messages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              sendMessage={sendMessage}
              isLoading={isLoading}
              quickQuestions={quickQuestions}
              handleQuickQuestion={handleQuickQuestion}
              setIsOpen={setIsOpen}
              isMobile={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const ChatInterface = ({ 
  messages, 
  newMessage, 
  setNewMessage, 
  sendMessage, 
  isLoading, 
  quickQuestions, 
  handleQuickQuestion, 
  setIsOpen,
  isMobile = false 
}) => {
  const renderMealPlanOrParagraph = (text) => {
    const lines = String(text || '')
      .split(/\n+/)
      .map(s => s.trim())
      .filter(Boolean);

    const isHeading = (line) => {
      const m = line.toLowerCase();
      return (
        m.startsWith('**breakfast') || m.startsWith('breakfast') ||
        m.startsWith('**lunch') || m.startsWith('lunch') ||
        m.startsWith('**dinner') || m.startsWith('dinner') ||
        m.startsWith('**snack') || m.startsWith('snack')
      );
    };

    const normalizeHeading = (line) => {
      const m = (line || '').toLowerCase();
      if (m.includes('breakfast')) return 'Breakfast';
      if (m.includes('lunch')) return 'Lunch';
      if (m.includes('dinner')) return 'Dinner';
      if (m.includes('snack')) return 'Snacks';
      return line;
    };

    // Bold any heading-like token ending with ':' near the start of the line
    const renderInlineWithBoldHeading = (line) => {
      const trimmed = line.replace(/^\*\*|\*\*$/g, '');
      const idx = trimmed.indexOf(':');
      if (idx > -1 && idx <= 24) {
        const head = trimmed.slice(0, idx).trim();
        const rest = trimmed.slice(idx + 1).trim();
        return (<><span className="font-semibold">{head}:</span>{rest ? ` ${rest}` : ''}</>);
      }
      return trimmed;
    };

    const sections = [];
    const intro = [];
    let current = null;
    for (const line of lines) {
      if (isHeading(line)) {
        current = { title: normalizeHeading(line), items: [] };
        sections.push(current);
        continue;
      }
      if (current) {
        const cleaned = line.replace(/^[-•\u2022]\s*/, '');
        const parts = cleaned.split(/\s+-\s+/).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) current.items.push(...parts); else current.items.push(cleaned);
      } else {
        intro.push(line);
      }
    }

    if (sections.length === 0) {
      return (
        <div className="space-y-1">
          {lines.map((ln, i) => (<p key={i} className="text-sm">{renderInlineWithBoldHeading(ln)}</p>))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {intro.length > 0 && (
          <div className="space-y-1">
            {intro.map((ln, i) => (<p key={i} className="text-sm">{renderInlineWithBoldHeading(ln)}</p>))}
          </div>
        )}
        {sections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <div className="font-semibold text-sm">{sec.title}</div>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {sec.items.map((it, i) => {
                const trimmed = String(it || '').trim().replace(/^\*\*|\*\*$/g, '');
                const idxColon = trimmed.indexOf(':');
                const isHeadingOnly = idxColon > -1 && idxColon <= 24 && trimmed.slice(idxColon + 1).trim().length === 0;
                if (isHeadingOnly) {
                  const head = trimmed.slice(0, idxColon).trim();
                  return (
                    <li key={i} className="list-none -ml-5 pl-0 font-semibold text-sm">
                      {head}:
                    </li>
                  );
                }
                return (<li key={i}>{renderInlineWithBoldHeading(it)}</li>);
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  };
  return (
    <>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b border-gray-200 ${isMobile ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-50'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMobile ? 'bg-white/20' : 'bg-gradient-to-r from-purple-500 to-blue-500'}`}>
            <FaRobot className={`text-sm ${isMobile ? 'text-white' : 'text-white'}`} />
          </div>
          <div>
            <h3 className={`font-semibold ${isMobile ? 'text-white' : 'text-gray-800'}`}>NutriAI Assistant</h3>
            <p className={`text-xs ${isMobile ? 'text-white/80' : 'text-gray-500'}`}>Online • Ready to help</p>
          </div>
        </div>
        <motion.button
          onClick={() => setIsOpen(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`p-2 rounded-full ${isMobile ? 'hover:bg-white/20' : 'hover:bg-gray-200'} transition-colors`}
        >
          <FaTimes className={`text-sm ${isMobile ? 'text-white' : 'text-gray-500'}`} />
        </motion.button>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isMobile ? 'max-h-screen' : 'max-h-96'}`}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs px-4 py-2 rounded-2xl ${
              message.type === 'user' 
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {message.type === 'ai' ? (
                renderMealPlanOrParagraph(message.content)
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
              <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl">
              <FaSpinner className="animate-spin" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <div className="p-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">Quick questions:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickQuestions.map((question, index) => {
              const Icon = question.icon;
              return (
                <motion.button
                  key={index}
                  onClick={() => handleQuickQuestion(question.text)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-2 p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon className={`text-sm ${question.color}`} />
                  <span className="text-gray-700 text-xs">{question.text}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything about nutrition..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isLoading}
          />
          <motion.button
            onClick={() => sendMessage()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoading || !newMessage.trim()}
            className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <FaPaperPlane className="text-sm" />
          </motion.button>
        </div>
      </div>
    </>
  );
};

export default AIAssistantButton; 