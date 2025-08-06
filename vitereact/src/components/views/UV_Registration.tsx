import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Type definitions based on OpenAPI spec and Zod schemas
interface RegistrationFormData {
  email: string;
  password: string;
  name: string;
  phone: string | null;
  user_type: 'buyer' | 'seller' | 'agent';
  profile_photo_url: string | null;
  notification_preferences: string | null;
  countries_of_interest: string | null;
}

interface RegistrationRequest {
  email: string;
  password: string;
  name: string;
  phone?: string | null;
  user_type: 'buyer' | 'seller' | 'agent';
  profile_photo_url?: string | null;
  notification_preferences?: string | null;
  countries_of_interest?: string | null;
}

interface RegistrationResponse {
  user: {
    user_id: string;
    email: string;
    name: string;
    phone: string | null;
    user_type: string;
    profile_photo_url: string | null;
    is_verified: boolean;
    email_verified: boolean;
    notification_preferences: string | null;
    countries_of_interest: string | null;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
  };
  token: string;
  refresh_token: string;
  expires_at: string;
}

// Country options for buyers
const COUNTRIES_OPTIONS = [
  'United States', 'Canada', 'Costa Rica', 'Mexico', 'Belize', 'Panama',
  'Guatemala', 'Nicaragua', 'Norway', 'Switzerland', 'Austria', 'New Zealand',
  'Australia', 'Chile', 'Argentina', 'Iceland', 'Denmark', 'Sweden'
];

const UV_Registration: React.FC = () => {

  
  // Zustand store selectors - individual selectors to avoid infinite loops

  const authError = useAppStore(state => state.authentication_state.error_message);
  const clearAuthError = useAppStore(state => state.clear_auth_error);

  // Form state
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormData>({
    email: '',
    password: '',
    name: '',
    phone: null,
    user_type: 'buyer',
    profile_photo_url: null,
    notification_preferences: null,
    countries_of_interest: null
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  
  // Validation states
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [emailAvailability, setEmailAvailability] = useState<'unchecked' | 'checking' | 'available' | 'taken'>('unchecked');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  
  // Legal agreements
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  
  // Success state
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Registration mutation using React Query
  const registerUserMutation = useMutation<RegistrationResponse, Error, RegistrationRequest>({
    mutationFn: async (userData: RegistrationRequest): Promise<RegistrationResponse> => {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/auth/register`,
        userData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      return data;
    },
    onSuccess: () => {
      setRegistrationSuccess(true);
      // Could update global auth state here if needed
      clearAuthError();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      setFormErrors({ general: errorMessage });
    }
  });

  // Password strength calculation
  const calculatePasswordStrength = useCallback((password: string): 'weak' | 'medium' | 'strong' => {
    if (password.length < 8) return 'weak';
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }, []);

  // Email validation
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Phone validation  
  const validatePhone = useCallback((phone: string): boolean => {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone);
  }, []);

  // Real-time validation effects
  useEffect(() => {
    if (registrationForm.password) {
      setPasswordStrength(calculatePasswordStrength(registrationForm.password));
    }
  }, [registrationForm.password, calculatePasswordStrength]);

  useEffect(() => {
    const errors: Record<string, string> = {};
    
    if (registrationForm.email && !validateEmail(registrationForm.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (registrationForm.password && registrationForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (confirmPassword && confirmPassword !== registrationForm.password) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (registrationForm.name && registrationForm.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (registrationForm.phone && !validatePhone(registrationForm.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    setFormErrors(errors);
  }, [registrationForm, confirmPassword, validateEmail, validatePhone]);

  // Handle form field changes
  const handleInputChange = (field: keyof RegistrationFormData, value: string | null) => {
    setRegistrationForm(prev => ({ ...prev, [field]: value }));
    clearAuthError();
    
    // Clear specific field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle user type change
  const handleUserTypeChange = (userType: 'buyer' | 'seller' | 'agent') => {
    handleInputChange('user_type', userType);
    
    // Reset conditional fields
    setCompanyName('');
    setSelectedCountries([]);
    handleInputChange('countries_of_interest', null);
  };

  // Handle countries selection for buyers
  const handleCountryToggle = (country: string) => {
    setSelectedCountries(prev => {
      const newSelection = prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country];
      
      // Update form data
      handleInputChange('countries_of_interest', 
        newSelection.length > 0 ? JSON.stringify(newSelection) : null
      );
      
      return newSelection;
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation checks
    if (!acceptTerms || !acceptPrivacy) {
      setFormErrors({ general: 'Please accept the Terms of Service and Privacy Policy' });
      return;
    }
    
    if (Object.keys(formErrors).length > 0) {
      setFormErrors({ general: 'Please fix the errors above before submitting' });
      return;
    }
    
    if (confirmPassword !== registrationForm.password) {
      setFormErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    // Prepare notification preferences
    const notificationPrefs = {
      email_notifications: true,
      marketing_emails: acceptMarketing
    };

    // Prepare registration data
    const registrationData: RegistrationRequest = {
      email: registrationForm.email,
      password: registrationForm.password,
      name: registrationForm.name,
      phone: registrationForm.phone || null,
      user_type: registrationForm.user_type,
      profile_photo_url: null,
      notification_preferences: JSON.stringify(notificationPrefs),
      countries_of_interest: registrationForm.countries_of_interest
    };

    registerUserMutation.mutate(registrationData);
  };

  // TODO: Email availability check endpoint missing from OpenAPI spec
  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!validateEmail(email)) return;
    
    setEmailAvailability('checking');
    
    // TODO: MISSING ENDPOINT - GET /users/check-email not found in OpenAPI spec
    // Would implement like this when endpoint exists:
    // try {
    //   const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/users/check-email?email=${encodeURIComponent(email)}`);
    //   setEmailAvailability(data.available ? 'available' : 'taken');
    // } catch (error) {
    //   setEmailAvailability('unchecked');
    // }
    

    setTimeout(() => {
      setEmailAvailability('available');
    }, 1000);
  }, [validateEmail]);

  // Debounced email availability check
  useEffect(() => {
    if (registrationForm.email && validateEmail(registrationForm.email)) {
      const timer = setTimeout(() => {
        checkEmailAvailability(registrationForm.email);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setEmailAvailability('unchecked');
    }
  }, [registrationForm.email, validateEmail, checkEmailAvailability]);

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join NatureEstate
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Discover Your Perfect Scenic Property
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {registrationSuccess ? (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Registration Successful!</h3>
                <p className="mt-2 text-sm text-gray-600">
                  We've sent a verification email to <strong>{registrationForm.email}</strong>. 
                  Please check your inbox and click the verification link to activate your account.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/login"
                    className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Sign In
                  </Link>
                  <button
                    onClick={() => setRegistrationSuccess(false)}
                    className="inline-flex justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Register Another Account
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* General Error Display */}
                {(formErrors.general || authError) && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert" aria-live="polite">
                    <p className="text-sm">{formErrors.general || authError}</p>
                  </div>
                )}

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                  
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Full Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={registrationForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        formErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                      aria-describedby={formErrors.name ? "name-error" : undefined}
                    />
                    {formErrors.name && (
                      <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={registrationForm.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          formErrors.email || emailAvailability === 'taken' ? 'border-red-300' : 
                          emailAvailability === 'available' ? 'border-green-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your email address"
                        aria-describedby={formErrors.email ? "email-error" : "email-availability"}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        {emailAvailability === 'checking' && (
                          <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {emailAvailability === 'available' && (
                          <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {emailAvailability === 'taken' && (
                          <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {formErrors.email && (
                      <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.email}</p>
                    )}
                    {emailAvailability === 'taken' && (
                      <p id="email-availability" className="mt-1 text-sm text-red-600" role="alert">This email is already registered</p>
                    )}
                    {emailAvailability === 'available' && (
                      <p id="email-availability" className="mt-1 text-sm text-green-600">Email is available</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number (Optional)
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={registrationForm.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value || null)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        formErrors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="+1 (555) 123-4567"
                      aria-describedby={formErrors.phone ? "phone-error" : undefined}
                    />
                    {formErrors.phone && (
                      <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Account Security Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Account Security</h3>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password *
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={registrationForm.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        formErrors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter a strong password"
                      aria-describedby={formErrors.password ? "password-error" : "password-strength"}
                    />
                    {formErrors.password && (
                      <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.password}</p>
                    )}
                    {registrationForm.password && (
                      <div id="password-strength" className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                                passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                                'w-full bg-green-500'
                              }`}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            passwordStrength === 'weak' ? 'text-red-600' :
                            passwordStrength === 'medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {passwordStrength === 'weak' && 'Weak'}
                            {passwordStrength === 'medium' && 'Medium'}
                            {passwordStrength === 'strong' && 'Strong'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm Password *
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirm your password"
                      aria-describedby={formErrors.confirmPassword ? "confirm-password-error" : undefined}
                    />
                    {formErrors.confirmPassword && (
                      <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert">{formErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Account Type Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Account Type</h3>
                  
                  <fieldset>
                    <legend className="sr-only">Choose your account type</legend>
                    <div className="space-y-3">
                      <label className="relative flex cursor-pointer rounded-lg border p-4 focus:outline-none">
                        <input
                          type="radio"
                          name="user_type"
                          value="buyer"
                          checked={registrationForm.user_type === 'buyer'}
                          onChange={(e) => handleUserTypeChange(e.target.value as 'buyer')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex flex-col">
                          <span className="block text-sm font-medium text-gray-900">Buyer</span>
                          <span className="block text-sm text-gray-500">I'm looking for scenic properties</span>
                        </div>
                      </label>
                      
                      <label className="relative flex cursor-pointer rounded-lg border p-4 focus:outline-none">
                        <input
                          type="radio"
                          name="user_type"
                          value="seller"
                          checked={registrationForm.user_type === 'seller'}
                          onChange={(e) => handleUserTypeChange(e.target.value as 'seller')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex flex-col">
                          <span className="block text-sm font-medium text-gray-900">Seller</span>
                          <span className="block text-sm text-gray-500">I want to list my scenic property</span>
                        </div>
                      </label>
                      
                      <label className="relative flex cursor-pointer rounded-lg border p-4 focus:outline-none">
                        <input
                          type="radio"
                          name="user_type"
                          value="agent"
                          checked={registrationForm.user_type === 'agent'}
                          onChange={(e) => handleUserTypeChange(e.target.value as 'agent')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex flex-col">
                          <span className="block text-sm font-medium text-gray-900">Agent</span>
                          <span className="block text-sm text-gray-500">I'm a real estate professional</span>
                        </div>
                      </label>
                    </div>
                  </fieldset>
                </div>

                {/* Conditional Preferences Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Preferences</h3>
                  
                  {registrationForm.user_type === 'buyer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Countries of Interest
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                        {COUNTRIES_OPTIONS.map((country) => (
                          <label key={country} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedCountries.includes(country)}
                              onChange={() => handleCountryToggle(country)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{country}</span>
                          </label>
                        ))}
                      </div>
                      {selectedCountries.length > 0 && (
                        <p className="mt-2 text-sm text-gray-600">
                          Selected: {selectedCountries.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {(registrationForm.user_type === 'seller' || registrationForm.user_type === 'agent') && (
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                        Company/Agency Name
                      </label>
                      <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder={`Enter your ${registrationForm.user_type === 'seller' ? 'company' : 'agency'} name`}
                      />
                    </div>
                  )}
                </div>

                {/* Legal Agreements Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Legal Agreements</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                        required
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        I accept the{' '}
                        <Link to="/terms" className="text-blue-600 hover:text-blue-500 underline" target="_blank">
                          Terms of Service
                        </Link>{' '}
                        *
                      </span>
                    </label>
                    
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={acceptPrivacy}
                        onChange={(e) => setAcceptPrivacy(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                        required
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        I accept the{' '}
                        <Link to="/privacy" className="text-blue-600 hover:text-blue-500 underline" target="_blank">
                          Privacy Policy
                        </Link>{' '}
                        *
                      </span>
                    </label>
                    
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={acceptMarketing}
                        onChange={(e) => setAcceptMarketing(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        I would like to receive marketing communications and property updates
                      </span>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={registerUserMutation.isPending || !acceptTerms || !acceptPrivacy}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {registerUserMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>

                {/* Sign In Link */}
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                      Sign In
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Registration;