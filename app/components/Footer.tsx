"use client";

import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-3 px-4 text-center text-xs text-gray-500">
      <div className="container mx-auto">
        <p>© {currentYear} CivicChat • Powered by OpenAI GPT</p>
      </div>
    </footer>
  );
};

export default Footer; 