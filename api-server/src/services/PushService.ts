export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: object
): Promise<void> {
  if (!tokens.length) return;

  const messages = tokens.map(to => ({
    to,
    title,
    body,
    data: data || {},
    sound: 'default',
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error('Expo push failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('PushService error:', err);
  }
}
