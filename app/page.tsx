import React from 'react';
import AskAI from './components/AskAI';

export default function Home() {
  return (
    <main className="min-h-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <AskAI />
    </main>
  );
}
