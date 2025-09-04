"use client";
import { useState } from "react";

export default function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Use 8+ characters with a mix of letters and numbers.
      </div>
    </div>
  );
}