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
      const { data } = await axios.post('/api/feedback/thread/open', {}, authHeaders());
      if (data.ok) {
        setThread(data.thread);
        setMessages(data.messages || []);
        return data.thread;
      }
    } catch (e) {
      console.error('Failed to open feedback thread', e);
      toast.error('Unable to open feedback thread. Please try again.');
    }
    return null;
  };

  useEffect(() => {
    if (open && !thread) ensureThread();
  }, [open]);

  useEffect(() => {
    if (!open || !thread) return;
    const t = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/feedback/thread/${thread.id}`, authHeaders());
        if (data.ok) setMessages(data.messages || []);
      } catch (e) {
        // non-fatal
      }
    }, 8000);
    return () => clearInterval(t);
  }, [open, thread]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

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
      const { data } = await axios.post('/api/feedback/message', { threadId: activeThread.id, content: text }, authHeaders());
      if (data.ok) {
        setMessages(prev => [...prev, data.message]);
        setInput('');
        toast.success('Feedback sent');
      } else {
        console.error('Failed to send feedback message', data);
        toast.error('Failed to send feedback');
      }
    } catch (e) {
      console.error('Failed to send feedback message', e);
      const msg = e.response?.data?.error || 'Failed to send feedback';
      toast.error(msg);
    }
    finally { setSending(false); }
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
      const payload = { threadId: activeThread.id, ...form, summary: buildSummary() };
      const { data } = await axios.post('/api/feedback/structured', payload, authHeaders());
      if (data.ok) {
        // also drop a message in the thread for visibility
        try { await axios.post('/api/feedback/message', { threadId: activeThread.id, content: `New structured request submitted:\n${payload.summary}` }, authHeaders()); } catch {}
        // reset form
        setForm({ title: '', problem: '', goal: '', impact: '', priority: 'medium', details: '', tags: [] });
        setTab('chat');
        toast.success('Request submitted');
      }
    } catch (e) {
      console.error('Failed to submit structured feedback', e);
      const msg = e.response?.data?.error || 'Failed to submit request';
      toast.error(msg);
    } finally {
      setSavingRequest(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white relative">
              {/* Close button in top-right corner */}
              <button 
                onClick={() => setOpen(false)} 
                className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110 z-10"
                title="Close chat"
              >
                <FaTimes className="text-lg text-white" />
              </button>
              
              <div className="flex items-center justify-between p-3 pr-14">
                <div className="font-semibold text-sm">Feedback & Requests</div>
              </div>
              <div className="px-3 pb-2 flex space-x-2 text-xs">
                <button onClick={() => setTab('request')} className={`px-2 py-1 rounded ${tab==='request'?'bg-white/20':''}`}>Request</button>
                <button onClick={() => setTab('chat')} className={`px-2 py-1 rounded ${tab==='chat'?'bg-white/20':''}`}>Chat</button>
              </div>
            </div>

            {tab === 'chat' && (
              <>
                <div ref={listRef} className="max-h-40 overflow-y-auto p-3 space-y-2 bg-gray-50">
                  {(messages || []).map(m => (
                    <div key={m.id} className={`text-sm ${m.sender === 'user' ? 'text-gray-800' : 'text-teal-700'}`}>
                      <span className={`inline-block px-3 py-2 rounded-xl ${m.sender === 'user' ? 'bg-white border border-gray-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                        {m.content}
                      </span>
                    </div>
                  ))}
                  {!messages?.length && (
                    <div className="text-xs text-gray-500">
                      Tell us what you want to see next: features, improvements, bugs. Your feedback helps shape the product.
                    </div>
                  )}
                </div>
                <div className="p-3 border-t bg-white flex items-center space-x-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    placeholder="Type your feedback..."
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button onClick={send} disabled={sending || !input.trim()} className="p-2 bg-emerald-500 text-white rounded-lg disabled:opacity-50">
                    {sending ? '...' : <FaPaperPlane />}
                  </button>
                </div>
              </>
            )}

            {tab === 'request' && (
              <div className="p-3 space-y-2 bg-gray-50">
                <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Feature title"
                  value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
                <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="What problem are you trying to solve?"
                  value={form.problem} onChange={e=>setForm({...form, problem:e.target.value})} />
                <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="What outcome or goal do you want?"
                  value={form.goal} onChange={e=>setForm({...form, goal:e.target.value})} />
                <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Impact if we deliver this (time saved, health benefit, etc.)"
                  value={form.impact} onChange={e=>setForm({...form, impact:e.target.value})} />
                <div className="flex items-center space-x-2 text-sm">
                  <label className="text-gray-600">Priority</label>
                  <select className="border rounded px-2 py-1" value={form.priority} onChange={e=>setForm({...form, priority:e.target.value})}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </div>
                {/* Tags section removed to save space */}
                <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} placeholder="Details (examples, screenshots, flow)"
                  value={form.details} onChange={e=>setForm({...form, details:e.target.value})} />
                <button onClick={submitStructured} disabled={savingRequest || !form.title.trim()}
                  className="w-full py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">
                  {savingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          onClick={() => setOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
        >
          <FaCommentDots className="text-xl" />
        </motion.button>
      )}
    </div>
  );
} 