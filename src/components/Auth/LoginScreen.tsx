import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { ShieldCheck, AlertCircle } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const demoAccounts = [
    { email: 'admin@skyeye.com', role: 'Admin', color: 'text-red-400' },
    { email: 'operator@skyeye.com', role: 'Operator', color: 'text-blue-400' },
    { email: 'viewer@skyeye.com', role: 'Viewer', color: 'text-green-400' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email, password);
  };

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShieldCheck className="w-16 h-16 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-wider">SKY EYE</h1>
          <p className="text-gray-400 text-sm mt-2 font-mono tracking-widest">COMMAND CENTER</p>
          <p className="text-gray-500 text-xs mt-4">
            Remote Drone Operations Platform
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded p-3 flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm mb-3 font-semibold">Demo Accounts:</p>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => quickLogin(account.email)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-left px-4 py-3 rounded-lg transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-mono">{account.email}</p>
                      <p className={`text-xs ${account.color} font-semibold mt-0.5`}>
                        {account.role} Access
                      </p>
                    </div>
                    <span className="text-gray-400 group-hover:text-white text-xs font-mono">
                      demo
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-4 text-center">
              Password: <span className="text-gray-400 font-mono">demo</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-xs">
            &copy; 2024 Sky Eye Command Center
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Production-grade Remote Drone Operations Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
