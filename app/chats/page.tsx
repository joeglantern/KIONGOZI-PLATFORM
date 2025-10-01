"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AskAI from '../components/AskAI';
import { supabase, getSupabase, getSupabaseAsync } from '../utils/supabaseClient';

interface Conversation { id: string; title: string; created_at: string; updated_at: string; }

export default function ChatsPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const url = `/api-proxy/chat/conversations${q ? `?q=${encodeURIComponent(q)}` : ''}`;
    let currentToken = (typeof window !== 'undefined') ? (window as any).supabaseToken || '' : '';
    try {
      if (!currentToken) {
        const s = supabase || getSupabase();
        const { data } = await s.auth.getSession();
        currentToken = data.session?.access_token || '';
      }
    } catch {
      try {
        const s = await getSupabaseAsync();
        const { data } = await s.auth.getSession();
        currentToken = data.session?.access_token || '';
      } catch {}
    }
    setToken(currentToken);
    const res = await fetch(url, { headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {} });
    const json = await res.json();
    setItems(json.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const content = (
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-6 min-h-[calc(100vh-130px)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
              <Image src="/images/ai-head-icon.svg" alt="Kiongozi AI" width={32} height={32} className="w-full h-full" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Chats</h1>
          </div>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">Back to chat</Link>
      </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm mb-4">
          <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search conversations..."
              className="flex-1 rounded-md px-3 py-2 bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none"
        />
            <button onClick={load} className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Search</button>
          </div>
      </div>

      {loading ? (
          <div className="text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
          <div className="text-gray-600">No conversations yet.</div>
      ) : (
          <ul className="space-y-3">
          {items.map((c) => (
              <li key={c.id} className="group bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-0 overflow-hidden hover:shadow-md transition-shadow">
                <Link href={c.slug ? `/chats/${c.slug}` : `/chats/${c.id}`} className="flex items-center justify-between w-full p-3 sm:p-4">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate max-w-[60vw] sm:max-w-[40vw] group-hover:underline">{c.title || 'Untitled conversation'}</div>
                    <div className="text-xs text-gray-500">Updated {new Date(c.updated_at).toLocaleString()}</div>
              </div>
                </Link>
                <div className="flex gap-2 px-3 pb-3">
                <button
                  onClick={async () => {
                    const res = await fetch(`/api-proxy/chat/conversations/${c.id}`, {
                      method: 'DELETE',
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    if (res.ok) setItems((prev) => prev.filter((x) => x.id !== c.id));
                  }}
                    className="px-3 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      </div>
  );

  return <AskAI overrideContent={content} hideInput disableInitialLoader />;
}
