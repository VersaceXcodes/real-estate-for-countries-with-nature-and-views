import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';

const UV_Login: React.FC = () => {
  // Form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    remember_me: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Navigation hooks
  const location = useLocation();
  const navigate = useNavigate();

  // Get intended destination from location state
  const intendedDestination = (location.state as any)?.from?.pathname || '/dashboard';

  // Global store selectors - using individual selectors to prevent infinite loops
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const errorMessage = useAppStore(state => state.authentication_state.error_message);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const loginUser = useAppStore(state => state.login_user);
  const clearAuthError = useAppStore(state => state.clear_auth_error);

  // Handle successful authentication redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(intendedDestination, { replace: true });
    }
  }, [isAuthenticated, navigate, intendedDestination]);

  // Clear error when inputs change
  const handleInputChange = (field: string, value: string | boolean) => {
    setLoginForm(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear global auth error
    if (errorMessage) {
      clearAuthError();
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!loginForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!loginForm.password.trim()) {
      errors.password = 'Password is required';
    } else if (loginForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    clearAuthError();

    try {
      await loginUser(loginForm.email.trim(), loginForm.password);
      // Navigation is handled by useEffect when isAuthenticated changes
    } catch (error) {
      // Error is handled by the store and displayed via errorMessage
      console.error('Login error:', error);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back to NatureEstate
            </h1>
            <p className="text-gray-600">
              Sign in to access your personalized dashboard and discover your perfect scenic property.
            </p>
          </div>

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            {/* Global Error Message */}
            {errorMessage && (
              <div 
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">{errorMessage}</span>
                </div>
              </div>
            )}

            <div className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email address"
                  className={`appearance-none relative block w-full px-3 py-3 border ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors`}
                  aria-describedby={formErrors.email ? 'email-error' : undefined}
                  aria-invalid={!!formErrors.email}
                />
                {formErrors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={loginForm.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    className={`appearance-none relative block w-full px-3 py-3 pr-10 border ${
                      formErrors.password ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors`}
                    aria-describedby={formErrors.password ? 'password-error' : undefined}
                    aria-invalid={!!formErrors.password}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 focus:outline-none focus:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                    {formErrors.password}
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={loginForm.remember_me}
                  onChange={(e) => handleInputChange('remember_me', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me for faster sign-in
                </label>
              </div>
            </div>

            {/* Sign In Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            {/* Authentication Support Section */}
            <div className="space-y-4">
              {/* Forgot Password Link */}
              <div className="text-center">
                <Link
                  to="/reset-password"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">or</span>
                </div>
              </div>

              {/* Create Account Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  New to NatureEstate?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Create Account
                  </Link>
                </p>
              </div>

              {/* Social Media Login Options (Conditional - Future Implementation) */}
              {/* Note: Social media login is conditional on implementation per requirements */}
              <div className="space-y-3">
                <div className="text-center text-xs text-gray-500 mb-3">
                  Social login options coming soon
                </div>
                {/* Placeholder for future Google/Facebook login buttons */}
                <button
                  type="button"
                  disabled
                  className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google (Coming Soon)
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continue with Facebook (Coming Soon)
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_Login;