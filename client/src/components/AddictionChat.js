import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function AddictionChat({ addiction, plan }) {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: 'Hi! I\'m your NutriAI Recovery Coach. Tell me about your triggers, challenges, and what\'s hardest right now so we can plan small wins today.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const systemPrompt = `You are NutriAI's Addiction Recovery Coach.
- Be empathetic, specific, and action-oriented.
- Reply as 3–5 concise points. Each point must be in the format: Heading: brief answer (1–2 sentences).
- Do NOT use bullets or symbols like -, *, •. Just write each point on a new line.
- Always include a point "Today's micro-goal:" with a simple, measurable action.
- If safety risk or severe withdrawal is mentioned, include a point "Safety note:" to contact a professional.
Context:
- Addiction: ${addiction?.name || addiction?.key || 'unknown'}
- Typical timeframe: ${addiction?.suggestedDays || 'varies'} days
- User plan: ${plan ? `active from ${plan.start_date} to ${plan.end_date}, daily reminder ${plan.daily_reminder_time || 'not set'}` : 'not started yet'}`;

  useEffect(() => {
    try { listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }, [messages]);

  const ensurePointLines = (text) => {
    const str = String(text || '').trim();
    if (!str) return '';
    const hasNewlines = /\n/.test(str);
    if (hasNewlines) return str;
    const sentences = str.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 5);
    // Fallback: generate simple labeled lines so headings can be bolded in UI
    return sentences.map((s, i) => `${i === 0 ? 'Insight' : i === sentences.length - 1 ? "Today's micro-goal" : 'Tip'}: ${s.trim()}`).join('\n');
  };

  const renderAssistant = (text) => {
    const lines = String(text || '')
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean);
    return (
      <div className="space-y-1">
        {lines.map((line, idx) => {
          const cleaned = line
            .replace(/^\s*[-*•]\s*/, '')
            .replace(/^\s*\d+[\).\s]\s*/, '');
          // Strip markdown asterisks/underscores entirely
          const withoutMd = cleaned.replace(/\*/g, '').replace(/_/g, '');
          const match = withoutMd.match(/^([^:]{1,80}):\s*(.*)$/);
          if (match) {
            const [, heading, rest] = match;
            return (
              <div key={idx}>
                <span className="font-semibold">{heading}:</span> {rest}
              </div>
            );
          }
          return <div key={idx}>{withoutMd}</div>;
        })}
      </div>
    );
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg = { id: Date.now(), role: 'user', content };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const payload = {
        systemPrompt,
        messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }))
      };
      const { data } = await axios.post('/api/ai/chat', payload);
      const raw = data?.reply?.trim?.() || 'Sorry, I could not generate a response.';
      const reply = ensurePointLines(raw);
      setMessages((m) => [...m, { id: Date.now()+1, role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { id: Date.now()+2, role: 'assistant', content: "Error: Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl border h-[28rem] flex flex-col">
      <div className="font-medium mb-2">Chat with your Recovery Coach</div>
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] text-sm rounded px-3 py-2 ${m.role === 'assistant' ? 'bg-gray-100 text-gray-800 self-start' : 'bg-emerald-600 text-white ml-auto'}`}
               style={{ alignSelf: m.role === 'assistant' ? 'flex-start' : 'flex-end' }}>
            {m.role === 'assistant' ? renderAssistant(m.content) : m.content}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          onKeyDown={(e)=>{ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type your question or today\'s challenge..."
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button onClick={()=>send()} disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">{loading ? 'Sending...' : 'Send'}</button>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Tips: Ask about cravings, triggers, travel/social plans, relapse prevention, or small wins for today.
      </div>
    </div>
  );
} 