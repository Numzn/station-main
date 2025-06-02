import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticlesBackground from '../components/ParticlesBackground';
import { resetPassword } from '../firebase/auth';
import { FaEye, FaEyeSlash, FaUserCircle } from 'react-icons/fa';

const SignIn = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Email validation
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await signIn(formData.email, formData.password, rememberMe);
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to sign in. Please check your credentials.');
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setIsResetting(true);
      setError('');
      await resetPassword(formData.email);
      setResetSent(true);
    } catch (error) {
      setError('Failed to send password reset email');
    } finally {
      setIsResetting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    if (name === 'remember-me') {
      setRememberMe(checked);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen w-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="fixed inset-0 z-0">
        <ParticlesBackground />
        {/* Gradient overlay for enhanced background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/60 via-black/60 to-cyan-800/60 backdrop-blur-[2px]" />
      </div>
      <div className="relative max-w-md w-full space-y-8 bg-black/30 backdrop-blur-sm p-8 rounded-lg shadow-xl border border-cyan-500/30 z-10">
        <div className="flex flex-col items-center">
          <FaUserCircle className="text-cyan-400 text-6xl mb-2" />
          <h2 className="mt-2 text-center text-3xl font-extrabold text-cyan-400">
            Fuel Station Management
          </h2>
        </div>
        {error && (
          <div className="bg-red-900/40 border border-red-500/80 text-red-200 px-4 py-3 rounded-md backdrop-blur-sm animate-pulse" role="alert">
            <span className="block sm:inline font-semibold">{error}</span>
          </div>
        )}
        {resetSent && (
          <div className="bg-green-900/40 border border-green-500/80 text-green-200 px-4 py-3 rounded-md backdrop-blur-sm animate-pulse" role="alert">
            <span className="block sm:inline font-semibold">Password reset email sent! Check your inbox.</span>
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-cyan-500/30 bg-black/20 placeholder-cyan-300/50 text-cyan-100 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                autoComplete="username"
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-cyan-500/30 bg-black/20 placeholder-cyan-300/50 text-cyan-100 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm pr-10"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-2 flex items-center text-cyan-300 hover:text-cyan-100 focus:outline-none"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-cyan-500/30 rounded bg-black/20"
                checked={rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-cyan-100">
                Remember me
              </label>
            </div>

            <div className="text-sm flex gap-2 items-center">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isResetting}
                className="font-medium text-cyan-400 hover:text-cyan-300 focus:outline-none focus:underline"
              >
                {isResetting ? 'Sending...' : 'Forgot password?'}
              </button>
              <span className="text-cyan-700">|</span>
              <button
                type="button"
                className="font-medium text-cyan-400 hover:text-cyan-300 focus:outline-none focus:underline"
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-cyan-500/50 text-sm font-medium rounded-md text-cyan-100 ${
                loading ? 'bg-cyan-900/50' : 'bg-cyan-900/30 hover:bg-cyan-800/40'
              } focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black transition-all duration-200 backdrop-blur-sm`}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-cyan-200 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;