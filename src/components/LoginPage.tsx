import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Clapperboard } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = login(email, password);
    
    if (!success) {
      setError('Invalid email or password. Please try again.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f172a' }}>
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#2D60FF' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#2D60FF' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mx-auto mb-5">
            <Clapperboard className="w-14 h-14" style={{ color: '#2D60FF' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ShootFlow</h1>
          <p className="text-gray-400">Streamline your production workflow</p>
        </div>

        {/* Login Card */}
        <div 
          className="bg-white rounded-2xl p-8"
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Submit Button - matches input field styling */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-5 py-2.5 rounded-lg text-white font-semibold text-base transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center justify-center gap-3 mt-4"
              style={{ 
                backgroundColor: '#2D60FF',
                boxShadow: '0 4px 14px 0 rgba(45, 96, 255, 0.4)'
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2025 ShootFlow. All rights reserved.
        </p>
      </div>
    </div>
  );
}
