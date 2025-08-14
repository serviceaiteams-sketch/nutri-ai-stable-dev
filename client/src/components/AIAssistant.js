import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaMicrophone, FaMicrophoneSlash, FaPaperPlane, 
  FaTint, FaBed, FaDumbbell, FaCalculator, FaUser, FaLightbulb, FaChartLine
} from 'react-icons/fa';

const AIAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm Ria, your personal fitness AI. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const dailyGoals = {
    nutrition: { target: 2000, current: 1450, unit: 'calories', icon: FaCalculator },
    hydration: { target: 8, current: 5, unit: 'glasses', icon: FaTint },
    sleep: { target: 8, current: 6.5, unit: 'hours', icon: FaBed },
    exercise: { target: 30, current: 15, unit: 'minutes', icon: FaDumbbell }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const history = [...messages, userMessage].map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ messages: history })
      });
      const data = await res.json();
      const aiMessage = {
        id: messages.length + 2,
        type: 'ai',
        content: data?.reply || 'Sorry, I could not generate a response right now.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (e) {
      setMessages(prev => [...prev, { id: messages.length + 2, type: 'ai', content: 'I hit an error answering that. Please try again.', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Removed local heuristic responder

  const toggleListening = () => {
    setIsListening(!isListening);
    // Simulate voice input
    if (!isListening) {
      setTimeout(() => {
        setInputMessage("How many calories should I eat today?");
        setIsListening(false);
      }, 2000);
    }
  };

  const getProgressColor = (current, target) => {
    const percentage = (current / target) * 100;
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

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

    // Bold any heading-like start-of-line token ending with ':'
    const renderInlineWithBoldHeading = (line) => {
      const trimmed = line.replace(/^\*\*|\*\*$/g, '');
      const idx = trimmed.indexOf(':');
      if (idx > -1 && idx <= 24) {
        const head = trimmed.slice(0, idx).trim();
        const rest = trimmed.slice(idx + 1).trim();
        return (
          <>
            <span className="font-semibold">{head}:</span>{rest ? ` ${rest}` : ''}
          </>
        );
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
        // If a line contains multiple ideas separated by ' - ', split them
        const parts = cleaned.split(/\s+-\s+/).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) {
          current.items.push(...parts);
        } else {
          current.items.push(cleaned);
        }
      } else {
        intro.push(line);
      }
    }

    if (sections.length === 0) {
      // Not a meal plan; render paragraphs, bolding headings like "Hydration:", "Notes:", etc.
      return (
        <div className="space-y-1">
          {lines.map((ln, i) => (
            <p key={i} className="text-sm">{renderInlineWithBoldHeading(ln)}</p>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {intro.length > 0 && (
          <div className="space-y-1">
            {intro.map((ln, i) => (
              <p key={i} className="text-sm">{renderInlineWithBoldHeading(ln)}</p>
            ))}
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
                return <li key={i}>{renderInlineWithBoldHeading(it)}</li>;
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <FaUser className="text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ria - Your AI Assistant</h1>
              <p className="text-indigo-100">Personal fitness AI at your service</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Daily Goals */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Daily Goals</h2>
            <div className="space-y-4">
              {Object.entries(dailyGoals).map(([key, goal]) => {
                const Icon = goal.icon;
                const progressColor = getProgressColor(goal.current, goal.target);
                const percentage = Math.round((goal.current / goal.target) * 100);
                
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Icon className="text-indigo-600 text-xl" />
                        <span className="font-medium text-gray-800 capitalize">{key}</span>
                      </div>
                      <span className={`font-bold ${progressColor}`}>{percentage}%</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{goal.current} / {goal.target} {goal.unit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-indigo-50 text-indigo-600 p-3 rounded-lg text-center"
                >
                  <FaLightbulb className="text-xl mx-auto mb-1" />
                  <span className="text-sm font-medium">Get Tips</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-green-50 text-green-600 p-3 rounded-lg text-center"
                >
                  <FaChartLine className="text-xl mx-auto mb-1" />
                  <span className="text-sm font-medium">Progress</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-xl p-4 h-96 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${
                          message.type === 'user'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white text-gray-800 shadow-sm'
                        }`}
                      >
                        {message.type === 'ai' ? (
                          renderMealPlanOrParagraph(message.content)
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white text-gray-800 px-4 py-2 rounded-xl shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask Ria anything about your fitness..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <motion.button
                  onClick={toggleListening}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-3 rounded-xl ${
                    isListening 
                      ? 'bg-red-500 text-white' 
                      : 'bg-indigo-500 text-white'
                  }`}
                >
                  {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
                </motion.button>
                <motion.button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-3 rounded-xl ${
                    inputMessage.trim()
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FaPaperPlane />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant; 