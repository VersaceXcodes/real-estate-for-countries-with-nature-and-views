import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types from shared schemas
interface User {
  user_id: string;
  email: string;
  name: string;
  phone: string | null;
  user_type: 'buyer' | 'seller' | 'agent' | 'admin';
  profile_photo_url: string | null;
  is_verified: boolean;
  email_verified: boolean;
  notification_preferences: string | null;
  countries_of_interest: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

interface UpdateUserRequest {
  email?: string;
  name?: string;
  phone?: string | null;
  user_type?: 'buyer' | 'seller' | 'agent' | 'admin';
  profile_photo_url?: string | null;
  notification_preferences?: string | null;
  countries_of_interest?: string | null;
}

interface NotificationSettings {
  email_notifications: boolean;
  property_alerts: boolean;
  inquiry_notifications: boolean;
  marketing_emails: boolean;
}

interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// API Functions
const fetchCurrentUser = async (authToken: string): Promise<User> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/users/me`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return data;
};

const updateUserProfile = async (
  updates: UpdateUserRequest, 
  authToken: string
): Promise<User> => {
  const { data } = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/users/me`,
    updates,
    {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return data;
};

// TODO: MISSING ENDPOINT for password change with current password verification
const changeUserPassword = async (
  passwordData: PasswordChangeRequest,
  authToken: string
): Promise<{ success: boolean; message: string }> => {
  // This endpoint doesn't match OpenAPI spec - needs proper implementation
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/auth/change-password`,
    passwordData,
    {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return data;
};

const UV_ProfileSettings: React.FC = () => {
  // Global state access with individual selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const updateUserProfileGlobal = useAppStore(state => state.update_user_profile);
  
  // Local state
  const [profileForm, setProfileForm] = useState<UpdateUserRequest>({});
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    property_alerts: true,
    inquiry_notifications: true,
    marketing_emails: false
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [profileUpdated, setProfileUpdated] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  
  const queryClient = useQueryClient();

  // Load user profile data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => fetchCurrentUser(authToken!),
    enabled: !!authToken,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (updates: UpdateUserRequest) => updateUserProfile(updates, authToken!),
    onSuccess: (updatedUser) => {
      updateUserProfileGlobal(updatedUser);
      setProfileUpdated(true);
      setTimeout(() => setProfileUpdated(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      setFormErrors({ general: errorMessage });
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: (passwordData: PasswordChangeRequest) => changeUserPassword(passwordData, authToken!),
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordUpdated(true);
      setTimeout(() => setPasswordUpdated(false), 3000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      setFormErrors({ password: errorMessage });
    }
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (userData) {
      setProfileForm({
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        user_type: userData.user_type,
        profile_photo_url: userData.profile_photo_url,
      });

      // Parse notification preferences
      if (userData.notification_preferences) {
        try {
          const parsed = JSON.parse(userData.notification_preferences);
          setNotificationSettings({
            email_notifications: parsed.email_notifications ?? true,
            property_alerts: parsed.property_alerts ?? true,
            inquiry_notifications: parsed.inquiry_notifications ?? true,
            marketing_emails: parsed.marketing_emails ?? false,
          });
        } catch (error) {
          console.warn('Failed to parse notification preferences');
        }
      }

      // Parse countries of interest
      if (userData.countries_of_interest) {
        try {
          const parsed = JSON.parse(userData.countries_of_interest);
          setSelectedCountries(parsed || []);
        } catch (error) {
          console.warn('Failed to parse countries of interest');
        }
      }
    }
  }, [userData]);

  // Form handlers
  const handleProfileChange = (field: keyof UpdateUserRequest, value: any) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    // Clear errors when user types
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNotificationChange = (setting: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    // Clear password errors when user types
    if (formErrors.password) {
      setFormErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleCountryToggle = (country: string) => {
    setSelectedCountries(prev => 
      prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const validateProfileForm = () => {
    const errors: Record<string, string> = {};
    
    if (!profileForm.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!profileForm.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileForm.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (profileForm.phone && !/^\+?[\d\s\-\(\)]+$/.test(profileForm.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = () => {
    const errors: Record<string, string> = {};
    
    if (!passwordForm.current_password) {
      errors.current_password = 'Current password is required';
    }
    
    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    if (!validateProfileForm()) return;
    
    const updates: UpdateUserRequest = {
      ...profileForm,
      notification_preferences: JSON.stringify(notificationSettings),
      countries_of_interest: JSON.stringify(selectedCountries),
    };
    
    updateProfileMutation.mutate(updates);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    changePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  // TODO: Profile photo upload - missing endpoint
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Implement actual photo upload when endpoint is available
      console.log('Photo upload selected:', file.name);
      // For now, just update the form with a placeholder URL
      handleProfileChange('profile_photo_url', `https://picsum.photos/200/200?random=${Date.now()}`);
    }
  };

  if (userLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="bg-white shadow rounded-lg p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const availableCountries = [
    'Costa Rica', 'Mexico', 'Canada', 'Norway', 'New Zealand', 'Switzerland',
    'Iceland', 'Chile', 'Austria', 'Slovenia', 'Portugal', 'Greece'
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="mt-2 text-gray-600">Manage your profile information, preferences, and security settings.</p>
          </div>

          {/* Success Messages */}
          {profileUpdated && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <p className="text-sm font-medium">Profile updated successfully!</p>
            </div>
          )}

          {passwordUpdated && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <p className="text-sm font-medium">Password changed successfully!</p>
            </div>
          )}

          {/* General Errors */}
          {formErrors.general && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p className="text-sm">{formErrors.general}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Profile Information Section */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
              </div>
              
              <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
                {/* Profile Photo */}
                <div className="flex items-center space-x-6">
                  <div className="shrink-0">
                    <img 
                      className="h-20 w-20 rounded-full object-cover bg-gray-200" 
                      src={profileForm.profile_photo_url || `https://picsum.photos/200/200?random=${currentUser?.user_id}`}
                      alt={profileForm.name || 'Profile'} 
                    />
                  </div>
                  <div>
                    <label htmlFor="photo-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Change photo
                    </label>
                    <input 
                      id="photo-upload" 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload}
                      className="sr-only" 
                    />
                    <p className="mt-1 text-xs text-gray-500">JPG, PNG up to 5MB</p>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={profileForm.name || ''}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        formErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profileForm.email || ''}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        formErrors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
                    {profileForm.email !== userData?.email && (
                      <p className="mt-1 text-sm text-orange-600">Email changes require verification</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={profileForm.phone || ''}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        formErrors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your phone number"
                    />
                    {formErrors.phone && <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="user_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Account Type
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600 capitalize">
                      {userData?.user_type}
                      {userData?.is_verified && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Countries of Interest (for buyers) */}
                {userData?.user_type === 'buyer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Countries of Interest
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {availableCountries.map((country) => (
                        <label key={country} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCountries.includes(country)}
                            onChange={() => handleCountryToggle(country)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{country}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setProfileForm({
                      email: userData?.email,
                      name: userData?.name,
                      phone: userData?.phone,
                      user_type: userData?.user_type,
                      profile_photo_url: userData?.profile_photo_url,
                    })}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel Changes
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateProfileMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive general email notifications</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('email_notifications', !notificationSettings.email_notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      notificationSettings.email_notifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Property Alerts</h3>
                    <p className="text-sm text-gray-500">Get notified about new properties matching your criteria</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('property_alerts', !notificationSettings.property_alerts)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      notificationSettings.property_alerts ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.property_alerts ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Inquiry Notifications</h3>
                    <p className="text-sm text-gray-500">Get notified about property inquiries and responses</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('inquiry_notifications', !notificationSettings.inquiry_notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      notificationSettings.inquiry_notifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.inquiry_notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Marketing Communications</h3>
                    <p className="text-sm text-gray-500">Receive promotional emails and updates</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange('marketing_emails', !notificationSettings.marketing_emails)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      notificationSettings.marketing_emails ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationSettings.marketing_emails ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                  
                  {formErrors.password && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                      <p className="text-sm">{formErrors.password}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="current_password"
                      value={passwordForm.current_password}
                      onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                      className={`w-full max-w-sm px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        formErrors.current_password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter current password"
                    />
                    {formErrors.current_password && <p className="mt-1 text-sm text-red-600">{formErrors.current_password}</p>}
                  </div>

                  <div>
                    <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="new_password"
                      value={passwordForm.new_password}
                      onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                      className={`w-full max-w-sm px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        formErrors.new_password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter new password"
                    />
                    {formErrors.new_password && <p className="mt-1 text-sm text-red-600">{formErrors.new_password}</p>}
                  </div>

                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                      className={`w-full max-w-sm px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        formErrors.confirm_password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirm new password"
                    />
                    {formErrors.confirm_password && <p className="mt-1 text-sm text-red-600">{formErrors.confirm_password}</p>}
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {changePasswordMutation.isPending ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Changing...
                        </span>
                      ) : 'Change Password'}
                    </button>
                  </div>
                </form>

                {/* Account Security Info */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Account Security</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Two-Factor Authentication</span>
                      <span className="text-sm text-orange-600">Not enabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email Verification</span>
                      <span className={`text-sm ${userData?.email_verified ? 'text-green-600' : 'text-orange-600'}`}>
                        {userData?.email_verified ? 'Verified' : 'Not verified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Login</span>
                      <span className="text-sm text-gray-500">
                        {userData?.last_login_at ? new Date(userData.last_login_at).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Data */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Privacy & Data</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Profile Visibility</h3>
                    <p className="text-sm text-gray-500">Control who can see your profile information</p>
                  </div>
                  <select className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option>Public</option>
                    <option>Private</option>
                    <option>Contacts only</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="space-y-3">
                    <button className="text-blue-600 hover:text-blue-500 text-sm font-medium">
                      Download My Data
                    </button>
                    <br />
                    <button className="text-red-600 hover:text-red-500 text-sm font-medium">
                      Delete Account
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Account deletion is permanent and cannot be undone. All your data will be removed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ProfileSettings;