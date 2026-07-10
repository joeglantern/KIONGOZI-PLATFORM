"use client";

import { useState } from 'react';
import type { Metadata } from 'next';

const faqs: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: 'Account and Login',
    items: [
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the login screen, tap Forgot Password and enter your email address. You will receive a reset link within a few minutes. Check your spam folder if it does not arrive. If you no longer have access to the email you signed up with, contact us at afosi.2025@gmail.com.',
      },
      {
        q: "I can't log in — it says my credentials are incorrect.",
        a: 'Try resetting your password first. Make sure you are using the email address you signed up with, not a username or phone number. If you signed up with Google, use that same login method on the login screen.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to Profile > Settings > Delete Account. This permanently removes your account, posts, and all associated data and cannot be undone. You can also request deletion by emailing afosi.2025@gmail.com from your registered email address.',
      },
      {
        q: 'How do I change my username or profile photo?',
        a: 'Tap your profile icon, then tap Edit Profile. From there you can update your name, username, bio, avatar, and cover photo.',
      },
    ],
  },
  {
    section: 'Feed and Posts',
    items: [
      {
        q: 'Why is my For You feed empty?',
        a: 'The For You feed personalises as you use the app. When your account is new, it shows recent public posts from across the platform. Follow some users and like posts on topics you care about — the feed improves quickly after a few interactions.',
      },
      {
        q: 'How do I delete a post I made?',
        a: 'Tap the three dots (...) on any of your posts and select Delete. Deleted posts are permanently removed and cannot be recovered.',
      },
      {
        q: 'Can I make my account private?',
        a: 'Yes. Go to Profile > Settings > Privacy > Private Account. When your account is private, new followers must send a follow request that you approve before they can see your posts.',
      },
    ],
  },
  {
    section: 'Direct Messages',
    items: [
      {
        q: 'How do I start a conversation?',
        a: 'Tap the message icon in the top right of the home screen, then tap the compose button to start a new conversation. You can message anyone you follow or who follows you.',
      },
      {
        q: 'How do I delete a conversation?',
        a: 'In your messages list, swipe left on the conversation and tap Delete. This removes the conversation from your view only.',
      },
    ],
  },
  {
    section: 'AI Guide',
    items: [
      {
        q: 'What can the Kiongozi AI help me with?',
        a: "The Kiongozi AI is your civic guide. It can answer questions about Kenya's Constitution, how county and national government works, public finance, devolution, civic rights, and the green economy. Open it anytime by tapping the green Kiongozi button or by mentioning @kiongozi in any post or comment.",
      },
      {
        q: 'The AI gave me incorrect information. What should I do?',
        a: 'AI responses may occasionally be incomplete or out of date. For critical civic or legal matters, always verify with official sources such as kenyalaw.org or kenya.go.ke. You can report a bad response by tapping the flag icon on any AI message, or email us at afosi.2025@gmail.com.',
      },
    ],
  },
  {
    section: 'Safety and Reporting',
    items: [
      {
        q: 'How do I report a post or user?',
        a: 'Tap the three dots (...) on any post, comment, or profile and select Report. Choose the reason that best applies. All reports are reviewed by our moderation team within 24 hours.',
      },
      {
        q: 'How do I block someone?',
        a: "Visit the user's profile, tap the three dots in the top right corner, and select Block. Blocked users cannot see your profile, posts, or send you messages. Manage your block list in Settings > Privacy > Blocked Accounts.",
      },
      {
        q: 'How do I report a child safety concern?',
        a: 'Use the Report option on the content or profile and select Child Safety. These reports are escalated immediately. You can also email afosi.2025@gmail.com directly — we respond within 24 hours.',
      },
    ],
  },
  {
    section: 'Civic Tools',
    items: [
      {
        q: 'What is the Fund Tracker?',
        a: 'Fund Tracker lets you follow public funds and government spending in Kenya. Data is sourced from the Kenya National Treasury (treasury.go.ke) and the Controller of Budget (cob.go.ke). Kiongozi Chat is not a government platform — this information is presented for civic education purposes only.',
      },
      {
        q: 'What is Youth Voice?',
        a: 'Youth Voice is a space for Kenyan youth to submit their views on national policies and issues. Your submissions are aggregated to surface community opinions on governance matters. It is a civic participation tool, not an official government feedback channel.',
      },
    ],
  },
];

export default function SupportPage() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenItem(prev => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">

      {/* Header */}
      <header className="bg-[#1a365d] border-b-4 border-[#5CB85C]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#5CB85C] flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
              <line x1="11" y1="11" x2="11" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="11" y1="11" x2="15" y2="13.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="11" cy="11" r="1.5" fill="white"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">Kiongozi Chat</div>
            <div className="text-white/50 text-xs uppercase tracking-widest">Kenya's Civic Network</div>
          </div>
          <a href="https://kiongozi.com" className="ml-auto text-white/60 text-sm hover:text-white">kiongozi.com</a>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-[#1a365d] px-6 py-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
          How can we <span className="text-[#5CB85C]">help?</span>
        </h1>
        <p className="text-white/60 text-base max-w-md mx-auto mb-6">
          Find answers to common questions or reach our team directly.
        </p>
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2.5 text-sm text-white/80">
          Still stuck? Email us at{' '}
          <a href="mailto:afosi.2025@gmail.com" className="text-[#5CB85C] font-semibold hover:underline ml-1">
            afosi.2025@gmail.com
          </a>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-14">

        {faqs.map((section) => (
          <div key={section.section} className="mb-12">
            <h2 className="text-lg font-bold text-[#1a365d] dark:text-white mb-4 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#5CB85C] flex-shrink-0 inline-block"></span>
              {section.section}
            </h2>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {section.items.map((item, i) => {
                const key = `${section.section}-${i}`;
                const isOpen = openItem === key;
                return (
                  <div key={key} className={`${i < section.items.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                    <button
                      onClick={() => toggle(key)}
                      className={`w-full text-left px-5 py-4 flex justify-between items-center gap-3 text-sm font-semibold transition-colors
                        ${isOpen
                          ? 'bg-[#f0faf0] dark:bg-green-900/20 text-[#1a365d] dark:text-green-300'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750'
                        }`}
                    >
                      {item.q}
                      <svg
                        className={`w-5 h-5 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-[#5CB85C]' : ''}`}
                        viewBox="0 0 20 20" fill="none"
                      >
                        <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-[#f0faf0] dark:bg-green-900/10">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Contact card */}
        <div className="bg-[#1a365d] rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Still need help?</h3>
            <p className="text-white/60 text-sm max-w-xs">Our team responds to all support emails within 24 hours.</p>
          </div>
          <a
            href="mailto:afosi.2025@gmail.com"
            className="inline-flex items-center gap-2 bg-[#5CB85C] hover:opacity-90 text-white font-bold text-sm px-6 py-3 rounded-lg transition-opacity whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5"/>
              <path d="M1 5l7 5 7-5" stroke="white" strokeWidth="1.5"/>
            </svg>
            Email Support
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#102340] border-t-4 border-[#5CB85C] py-5 text-center text-xs text-white/40">
        <span>&copy; 2026 Kiongozi Platform</span>
        <span className="mx-2">·</span>
        <a href="/child-safety" className="hover:text-white/70">Child Safety</a>
        <span className="mx-2">·</span>
        <a href="/privacy-policy" className="hover:text-white/70">Privacy Policy</a>
        <span className="mx-2">·</span>
        <a href="https://kiongozi.com" className="hover:text-white/70">kiongozi.com</a>
      </footer>
    </div>
  );
}
