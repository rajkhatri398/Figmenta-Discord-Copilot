"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Ensure component is mounted before accessing router
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const correctPassword = "admin123";
    console.log("🔐 Login attempt");
    
    if (password.trim() === correctPassword.trim()) {
      console.log("✅ Password matches!");
      localStorage.setItem("adminAuth", "true");
      console.log("✅ Auth stored in localStorage");
      console.log("🔄 Navigating to dashboard...");
      // Use window.location for a hard redirect
      window.location.href = "/";
      return;
    }
    
    console.log("❌ Password does not match");
    setError("Invalid password");
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold">🤖</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Discord Copilot
            </h1>
            <p className="text-slate-400 text-sm mt-2">Admin Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter password"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400">❌ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 mt-6"
            >
              {loading ? "Logging in..." : "🔐 Login"}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
            <p className="text-xs text-slate-400 text-center">
              Demo Password: <code className="text-blue-400 font-semibold">admin123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
