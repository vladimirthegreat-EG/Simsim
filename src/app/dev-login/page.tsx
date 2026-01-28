"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DevLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Loading...");

  const loginAsFacilitator = () => {
    document.cookie = "facilitator_id=test-facilitator-001; path=/; max-age=604800";
    setStatus("Logged in as Facilitator! Redirecting...");
    setTimeout(() => router.push("/admin"), 500);
  };

  const loginAsTeam = () => {
    document.cookie = "session_token=test-team-token-001; path=/; max-age=604800";
    setStatus("Logged in as Team! Redirecting...");
    setTimeout(() => router.push("/game/test-game-001"), 500);
  };

  const clearCookies = () => {
    document.cookie = "facilitator_id=; path=/; max-age=0";
    document.cookie = "session_token=; path=/; max-age=0";
    setStatus("Cookies cleared!");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">Dev Login</h1>
        <p className="text-slate-400 mb-8">Quick access for development testing</p>

        <div className="space-y-4">
          <button
            onClick={loginAsFacilitator}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Login as Facilitator (Admin)
          </button>

          <button
            onClick={loginAsTeam}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Login as Team Player
          </button>

          <hr className="border-slate-700 my-6" />

          <button
            onClick={clearCookies}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Clear All Cookies
          </button>
        </div>

        <div className="mt-8 p-4 bg-slate-900 rounded-lg">
          <p className="text-sm text-slate-400 font-mono">{status}</p>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          <p className="font-semibold text-slate-400 mb-2">Test Credentials:</p>
          <p>Facilitator ID: test-facilitator-001</p>
          <p>Team Session: test-team-token-001</p>
          <p>Game Join Code: TEST01</p>
        </div>
      </div>
    </div>
  );
}
