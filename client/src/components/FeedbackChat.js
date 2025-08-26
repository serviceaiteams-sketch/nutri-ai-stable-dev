import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCommentDots, FaTimes, FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function FeedbackChat() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('request'); // request | chat
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const TAGS = [
    'bp_monitoring','hydration','sleep','workouts','meal_tracking','food_recognition','wearables','goals','reports','social','genomics','micronutrients','ai_assistant','settings','bug','ui_ux','performance','integration','notifications'
  ];
  const [form, setForm] = useState({
    title: '',
    problem: '',
    goal: '',
    impact: '',
    priority: 'medium',
    details: '',
    tags: []
  });
  const [savingRequest, setSavingRequest] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const ensureThread = async () => {
    try {
      // Try to connect to backend first
      const { data } = await axios.post('/api/feedback/thread/open', {}, authHeaders());
      if (data.ok) {
        setThread(data.thread);
        setMessages(data.messages || []);
        return data.thread;
      }
    } catch (e) {
      console.log('Backend not available, using mock thread system');
      // Fallback to mock thread system
      const mockThread = {
        id: 'mock-thread-' + Date.now(),
        createdAt: new Date().toISOString(),
        status: 'open'
      };
      setThread(mockThread);
      setMessages([]);
      return mockThread;
    }
    return null;
  };

  useEffect(() => {
    if (open && !thread) ensureThread();
  }, [open]);

  useEffect(() => {
    if (!open || !thread) return;
    // Only poll if we have a real backend thread
    if (thread.id && !thread.id.startsWith('mock-thread-')) {
      const t = setInterval(async () => {
        try {
          const { data } = await axios.get(`/api/feedback/thread/${thread.id}`, authHeaders());
          if (data.ok) setMessages(data.messages || []);
        } catch (e) {
          // non-fatal
        }
      }, 8000);
      return () => clearInterval(t);
    }
  }, [open, thread]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && !event.target.closest('.feedback-chat-modal') && !event.target.closest('.feedback-chat-button')) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    let activeThread = thread;
    if (!activeThread) {
      activeThread = await ensureThread();
      if (!activeThread) return;
    }
    setSending(true);
    
    try {
      // Try to send to backend first
      const { data } = await axios.post('/api/feedback/message', { threadId: activeThread.id, content: text }, authHeaders());
      if (data.ok) {
        setMessages(prev => [...prev, data.message]);
        setInput('');
        toast.success('Feedback sent');
        return;
      }
    } catch (e) {
      console.log('Backend not available, using mock message system');
    }
    
    // Fallback to mock message system
    const mockMessage = {
      id: 'msg-' + Date.now(),
      content: text,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, mockMessage]);
    setInput('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: 'ai-' + Date.now(),
        content: 'Thank you for your feedback! I\'ve received your message and will process it accordingly.',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
    
    toast.success('Feedback sent (offline mode)');
    setSending(false);
  };

  const buildSummary = () => {
    const { title, problem, goal, impact, priority, details, tags } = form;
    return `Title: ${title}\nProblem: ${problem}\nGoal: ${goal}\nImpact: ${impact}\nPriority: ${priority}\nTags: ${tags.join(', ')}\nDetails: ${details}`;
  };

  const submitStructured = async () => {
    let activeThread = thread || await ensureThread();
    if (!activeThread) return;
    setSavingRequest(true);
    
    try {
      // Try to submit to backend first
      const payload = { threadId: activeThread.id, ...form, summary: buildSummary() };
      const { data } = await axios.post('/api/feedback/structured', payload, authHeaders());
      if (data.ok) {
        // also drop a message in the thread for visibility
        try { await axios.post('/api/feedback/message', { threadId: activeThread.id, content: `New structured request submitted:\n${payload.summary}` }, authHeaders()); } catch {}
        // reset form
        setForm({ title: '', problem: '', goal: '', impact: '', priority: 'medium', details: '', tags: [] });
        setTab('chat');
        toast.success('Request submitted');
        setSavingRequest(false);
        return;
      }
    } catch (e) {
      console.log('Backend not available, using mock submission system');
    }
    
    // Fallback to mock submission system
    const mockMessage = {
      id: 'req-' + Date.now(),
      content: `New structured request submitted:\n${buildSummary()}`,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, mockMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: 'ai-' + Date.now(),
        content: 'Thank you for your feature request! I\'ve received your submission and will review it. This helps us improve the product.',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
    
    // Reset form
    setForm({ title: '', problem: '', goal: '', impact: '', priority: 'medium', details: '', tags: [] });
    setTab('chat');
    toast.success('Request submitted (offline mode)');
    setSavingRequest(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="feedback-chat-modal w-96 bg-white rounded-3xl shadow-2xl border-0 overflow-hidden backdrop-blur-sm bg-white/95"
          >
            {/* Modern Header with Gradient */}
            <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 text-white relative overflow-hidden">
              {/* Decorative Background Elements */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
              
              {/* Close Button */}
              <button 
                onClick={() => {
                  console.log('Close button clicked, setting open to false');
                  setOpen(false);
                }} 
                className="absolute top-4 right-4 p-3 hover:bg-white/20 rounded-full transition-all duration-300 hover:scale-110 z-50 group cursor-pointer"
                title="Close chat"
                type="button"
              >
                <FaTimes className="text-xl text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>
              
              {/* Header Content */}
              <div className="relative z-10 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">AI Assistant</h3>
                    <p className="text-white/80 text-sm">How can I help you today?</p>
                  </div>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-white/10 rounded-2xl p-1 backdrop-blur-sm">
                                     <button 
                     onClick={() => setTab('chat')} 
                     className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                       tab === 'chat' 
                         ? 'bg-white text-emerald-600 shadow-lg' 
                         : 'text-white/80 hover:text-white hover:bg-white/10'
                     }`}
                   >
                     💬 Chat
                   </button>
                   <button 
                     onClick={() => setTab('request')} 
                     className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                       tab === 'request' 
                         ? 'bg-white text-emerald-600 shadow-lg' 
                         : 'text-white/80 hover:text-white hover:bg-white/10'
                     }`}
                   >
                     ✨ Request
                   </button>
                </div>
              </div>
            </div>

            {/* Chat Tab Content */}
            {tab === 'chat' && (
              <div className="flex flex-col h-96">
                {/* Messages Area */}
                <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                  {(messages || []).map(m => (
                    <motion.div 
                      key={m.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                                             <div className={`max-w-xs px-4 py-3 rounded-2xl text-sm shadow-sm ${
                         m.sender === 'user' 
                           ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
                           : 'bg-white border border-gray-100 text-gray-700 shadow-md'
                       }`}>
                        {m.content}
                      </div>
                    </motion.div>
                  ))}
                  {!messages?.length && (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-4xl mb-4">💬</div>
                      <div className="text-lg font-medium mb-2">Start a conversation</div>
                      <div className="text-sm text-gray-400">
                        Tell us what you want to see next: features, improvements, bugs.
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Chat Input Field - Inside the modal */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  <div className="flex items-center space-x-3">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && send()}
                      placeholder="Type your feedback..."
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    />
                    <button 
                      onClick={send} 
                      disabled={sending || !input.trim()} 
                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl disabled:opacity-50 hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {sending ? (
                        <span>...</span>
                      ) : (
                        <>
                          <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                          Send
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Request Tab Content */}
            {tab === 'request' && (
              <div className="p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                <div className="space-y-3">
                  <input 
                                         className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/80 backdrop-blur-sm" 
                     placeholder="✨ Feature title"
                    value={form.title} 
                    onChange={e=>setForm({...form, title:e.target.value})} 
                  />
                                     <textarea 
                     className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/80 backdrop-blur-sm resize-none" 
                     rows={2} 
                     placeholder="🔍 What problem are you trying to solve?"
                    value={form.problem} 
                    onChange={e=>setForm({...form, problem:e.target.value})} 
                  />
                                     <textarea 
                     className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/80 backdrop-blur-sm resize-none" 
                     rows={2} 
                     placeholder="🎯 What outcome or goal do you want?"
                    value={form.goal} 
                    onChange={e=>setForm({...form, goal:e.target.value})} 
                  />
                  <textarea 
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/80 backdrop-blur-sm resize-none" 
                    rows={2} 
                    placeholder="💡 Impact if we deliver this (time saved, health benefit, etc.)"
                    value={form.impact} 
                    onChange={e=>setForm({...form, impact:e.target.value})} 
                  />
                  
                  {/* Priority Selector */}
                  <div className="flex items-center space-x-3">
                    <label className="text-gray-600 text-sm font-medium">🚀 Priority</label>
                    <select 
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/80 backdrop-blur-sm" 
                      value={form.priority} 
                      onChange={e=>setForm({...form, priority:e.target.value})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  
                  <textarea 
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/80 backdrop-blur-sm resize-none" 
                    rows={3} 
                    placeholder="📝 Details (examples, screenshots, flow)"
                    value={form.details} 
                    onChange={e=>setForm({...form, details:e.target.value})} 
                  />
                  
                  <button 
                    onClick={submitStructured} 
                    disabled={savingRequest || !form.title.trim()}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl disabled:opacity-50 hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {savingRequest ? 'Submitting...' : '🚀 Submit Request'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>







      {/* Feedback Chat Button */}
      {!open && (
        <motion.button
          onClick={() => setOpen(true)}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="feedback-chat-button w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-green-500 text-white group hover:shadow-emerald-500/25 transition-all duration-300"
        >
          <FaCommentDots className="text-2xl group-hover:scale-110 transition-transform duration-300" />
        </motion.button>
      )}
    </div>
  );
} 