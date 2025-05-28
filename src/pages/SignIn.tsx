import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticlesBackground from '../components/ParticlesBackground';
import { resetPassword } from '../firebase/auth';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <ParticlesBackground />
      <div className="max-w-md w-full space-y-8 bg-black/30 backdrop-blur-sm p-8 rounded-lg shadow-xl border border-cyan-500/30" style={{ zIndex: 1 }}>
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-cyan-400">
            Fuel Station Management
          </h2>
        </div>
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-md backdrop-blur-sm" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {resetSent && (
          <div className="bg-green-900/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-md backdrop-blur-sm" role="alert">
            <span className="block sm:inline">Password reset email sent! Check your inbox.</span>
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
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-cyan-500/30 bg-black/20 placeholder-cyan-300/50 text-cyan-100 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
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

            <div className="text-sm">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isResetting}
                className="font-medium text-cyan-400 hover:text-cyan-300 focus:outline-none focus:underline"
              >
                {isResetting ? 'Sending...' : 'Forgot password?'}
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
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;