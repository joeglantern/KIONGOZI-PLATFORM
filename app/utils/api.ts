export async function postChatMessage(text: string): Promise<void> {
  try {
    const token = (window as any)?.supabaseToken || '';
    await fetch('/api-proxy/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    });
  } catch {}
}

