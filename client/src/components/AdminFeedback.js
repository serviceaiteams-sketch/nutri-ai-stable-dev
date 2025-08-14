import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminFeedback() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState(null);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/feedback/admin/requests', authHeaders());
      if (data.ok) setRequests(data.requests || []);
    } finally { setLoading(false); }
  };

  const openThread = async (threadId) => {
    setSelected(threadId);
    try {
      const { data } = await axios.get(`/api/feedback/admin/thread/${threadId}`, authHeaders());
      if (data.ok) setThread(data);
    } catch (e) {
      setThread(null);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">User Feedback Requests</h1>
      {loading && <div>Loading...</div>}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className={`p-3 border rounded-lg bg-white shadow-sm ${selected===r.thread_id?'ring-2 ring-emerald-400':''}`}>
                <div className="text-sm font-medium">{r.title || 'Untitled'}</div>
                <div className="text-xs text-gray-600">By {r.user_name} ({r.user_email}) • {new Date(r.created_at).toLocaleString()}</div>
                <div className="text-xs mt-1">Priority: <span className="uppercase font-semibold">{r.priority}</span></div>
                <div className="text-xs mt-1 line-clamp-2">{r.summary}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(JSON.parse(r.tags || '[]') || []).map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{t}</span>
                  ))}
                </div>
                <div className="mt-2">
                  <button onClick={()=>openThread(r.thread_id)} className="text-emerald-700 text-xs underline">Open thread</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border rounded-lg bg-white shadow-sm min-h-[200px]">
            {!thread && <div className="text-sm text-gray-500">Select a request to view thread details.</div>}
            {thread && (
              <div>
                <div className="text-sm font-medium mb-2">Thread #{thread.thread.id} • {thread.user?.name} ({thread.user?.email})</div>
                <div className="space-y-2 max-h-[60vh] overflow-auto">
                  {thread.messages.map(m => (
                    <div key={m.id} className="text-sm">
                      <span className="text-gray-500 mr-1">[{new Date(m.created_at).toLocaleString()}]</span>
                      <span className="font-semibold mr-1">{m.sender}:</span>
                      <span>{m.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 