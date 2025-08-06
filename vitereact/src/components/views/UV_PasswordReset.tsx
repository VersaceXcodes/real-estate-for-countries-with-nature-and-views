import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// Types for API requests and responses
interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

interface SuccessResponse {
  success: boolean;
  message: string;
}

// Password strength validation
const validatePasswordStrength = (password: string): string | null => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/(?=.*\d)/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
};

// Email validation
const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return 'Email is required';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

// API functions
const requestPasswordReset = async (data: ForgotPasswordRequest): Promise<SuccessResponse> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/auth/forgot-password`,
    data,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
};

const completePasswordReset = async (data: ResetPasswordRequest): Promise<SuccessResponse> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/auth/reset-password`,
    data,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
};

const UV_PasswordReset: React.FC = () => {
  // URL parameter handling
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // State variables
  const [reset_email, setResetEmail] = useState('');
  const [reset_requested, setResetRequested] = useState(false);
  const [new_password_form, setNewPasswordForm] = useState({
    password: '',
    confirm_password: ''
  });
  const [password_updated, setPasswordUpdated] = useState(false);
  const [form_errors, setFormErrors] = useState<Record<string, string>>({});

  // Clear errors when inputs change
  const clearError = (field: string) => {
    if (form_errors[field]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Mutation for password reset request
  const resetRequestMutation = useMutation<SuccessResponse, Error, ForgotPasswordRequest>({
    mutationFn: requestPasswordReset,
    onSuccess: () => {
      setResetRequested(true);
      setFormErrors({});
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send reset email';
      setFormErrors({ email: errorMessage });
    }
  });

  // Mutation for password reset completion
  const resetCompleteMutation = useMutation<SuccessResponse, Error, ResetPasswordRequest>({
    mutationFn: completePasswordReset,
    onSuccess: () => {
      setPasswordUpdated(true);
      setFormErrors({});
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset password';
      setFormErrors({ token: errorMessage });
    }
  });

  // Handle email reset form submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const emailError = validateEmail(reset_email);
    if (emailError) {
      setFormErrors({ email: emailError });
      return;
    }

    setFormErrors({});
    resetRequestMutation.mutate({ email: reset_email });
  };

  // Handle new password form submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Record<string, string> = {};

    // Validate password strength
    const passwordError = validatePasswordStrength(new_password_form.password);
    if (passwordError) {
      errors.password = passwordError;
    }

    // Validate password confirmation
    if (new_password_form.password !== new_password_form.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!token) {
      setFormErrors({ token: 'Invalid reset token' });
      return;
    }

    setFormErrors({});
    resetCompleteMutation.mutate({ 
      token, 
      password: new_password_form.password 
    });
  };

  // Handle input changes for new password form
  const handlePasswordChange = (field: 'password' | 'confirm_password', value: string) => {
    setNewPasswordForm(prev => ({ ...prev, [field]: value }));
    clearError(field);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Reset Your Password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {token ? 'Enter your new password below' : 'Enter your email to receive reset instructions'}
            </p>
          </div>

          {/* Success state for password updated */}
          {password_updated && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Password Reset Successful
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Your password has been successfully reset. You can now sign in with your new password.</p>
                  </div>
                  <div className="mt-4">
                    <Link
                      to="/login"
                      className="text-sm font-medium text-green-800 hover:text-green-700"
                    >
                      Go to Sign In →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email reset request form */}
          {!token && !reset_requested && !password_updated && (
            <form className="mt-8 space-y-6" onSubmit={handleEmailSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={reset_email}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    clearError('email');
                  }}
                  placeholder="Enter your email address"
                  className={`relative block w-full px-3 py-2 border ${
                    form_errors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  aria-describedby={form_errors.email ? 'email-error' : undefined}
                />
                {form_errors.email && (
                  <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                    {form_errors.email}
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={resetRequestMutation.isPending}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetRequestMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Reset Link...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  Remember your password? Sign In
                </Link>
              </div>
            </form>
          )}

          {/* Reset email sent confirmation */}
          {!token && reset_requested && !password_updated && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Reset Email Sent
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      We've sent a password reset link to <strong>{reset_email}</strong>.
                      Please check your email and click the link to reset your password.
                    </p>
                    <p className="mt-2">
                      Don't see the email? Check your spam folder. The link will expire in 24 hours.
                    </p>
                  </div>
                  <div className="mt-4 flex space-x-4">
                    <button
                      onClick={() => {
                        setResetRequested(false);
                        setResetEmail('');
                        setFormErrors({});
                      }}
                      className="text-sm font-medium text-blue-800 hover:text-blue-700"
                    >
                      Didn't receive email? Try again
                    </button>
                    <Link
                      to="/login"
                      className="text-sm font-medium text-blue-800 hover:text-blue-700"
                    >
                      Back to Sign In
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New password creation form */}
          {token && !password_updated && (
            <form className="mt-8 space-y-6" onSubmit={handlePasswordSubmit}>
              {form_errors.token && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  <p className="text-sm">{form_errors.token}</p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={new_password_form.password}
                  onChange={(e) => handlePasswordChange('password', e.target.value)}
                  placeholder="Enter new password"
                  className={`relative block w-full px-3 py-2 border ${
                    form_errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  aria-describedby={form_errors.password ? 'password-error' : 'password-requirements'}
                />
                {form_errors.password && (
                  <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">
                    {form_errors.password}
                  </p>
                )}
                <div id="password-requirements" className="mt-2 text-xs text-gray-500">
                  Password must be at least 8 characters and contain uppercase, lowercase, and numbers
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={new_password_form.confirm_password}
                  onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                  placeholder="Confirm new password"
                  className={`relative block w-full px-3 py-2 border ${
                    form_errors.confirm_password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  aria-describedby={form_errors.confirm_password ? 'confirm-password-error' : undefined}
                />
                {form_errors.confirm_password && (
                  <p id="confirm-password-error" className="mt-2 text-sm text-red-600" role="alert">
                    {form_errors.confirm_password}
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={resetCompleteMutation.isPending}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetCompleteMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating Password...
                    </span>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_PasswordReset;