import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Interfaces for API responses
interface CountryData {
  country: string;
  property_count: number;
}

interface PropertySearchResponse {
  properties: Array<{
    property_id: string;
    country: string;
    [key: string]: any;
  }>;
  total_count: number;
}

interface NotificationCountResponse {
  total_count: number;
  unread_count: number;
}

// API functions
const fetchCountriesData = async (): Promise<CountryData[]> => {
  const { data } = await axios.get<PropertySearchResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties`,
    {
      params: {
        limit: 1000, // Get more properties to extract countries
        offset: 0,
        status: 'active'
      }
    }
  );

  // Extract unique countries and count occurrences
  const countryCounts = data.properties.reduce((acc: Record<string, number>, property) => {
    const country = property.country;
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(countryCounts).map(([country, count]) => ({
    country,
    property_count: count
  }));
};

const fetchNotificationCount = async (authToken: string): Promise<number> => {
  const { data } = await axios.get<NotificationCountResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/notifications`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      params: {
        is_read: false,
        limit: 1
      }
    }
  );

  return data.unread_count || 0;
};

const GV_TopNav: React.FC = () => {
  const navigate = useNavigate();
  
  // UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [countriesDropdownOpen, setCountriesDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [quickSearchForm, setQuickSearchForm] = useState({
    country: null as string | null,
    property_type: null as string | null
  });

  // Refs for dropdown management
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const countriesDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // CRITICAL: Individual Zustand selectors to avoid infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const unreadNotificationCount = useAppStore(state => state.notification_state.unread_notifications_count);
  const logoutUser = useAppStore(state => state.logout_user);

  // React Query for countries data
  const { data: availableCountries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountriesData,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });

  // React Query for notification count (only if authenticated)
  const { data: notificationCount = 0 } = useQuery({
    queryKey: ['notificationCount', authToken],
    queryFn: () => fetchNotificationCount(authToken!),
    enabled: isAuthenticated && !!authToken,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 30000,
    retry: 1
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
      if (countriesDropdownRef.current && !countriesDropdownRef.current.contains(event.target as Node)) {
        setCountriesDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      setUserDropdownOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle quick search submission
  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const searchParams = new URLSearchParams();
    if (quickSearchForm.country) searchParams.append('country', quickSearchForm.country);
    if (quickSearchForm.property_type) searchParams.append('property_type', quickSearchForm.property_type);
    
    navigate(`/search?${searchParams.toString()}`);
    setSearchDropdownOpen(false);
  };

  // Handle country selection from dropdown
  const handleCountrySelect = (country: string) => {
    navigate(`/search?country=${encodeURIComponent(country)}`);
    setCountriesDropdownOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  return (
    <>
      <nav className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and primary navigation */}
            <div className="flex items-center">
              {/* Logo */}
              <Link to="/" className="flex-shrink-0 flex items-center">
                <img
                  className="h-8 w-auto"
                  src="https://picsum.photos/32/32?random=logo"
                  alt="NatureEstate"
                />
                <span className="ml-2 text-xl font-bold text-green-600">NatureEstate</span>
              </Link>

              {/* Desktop navigation */}
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {/* Search Properties Dropdown */}
                <div className="relative" ref={searchDropdownRef}>
                  <button
                    onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
                    className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center"
                    aria-expanded={searchDropdownOpen}
                  >
                    Search Properties
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {searchDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <div className="p-4">
                        <form onSubmit={handleQuickSearchSubmit} className="space-y-4">
                          <div>
                            <label htmlFor="quick-country" className="block text-sm font-medium text-gray-700 mb-1">
                              Country
                            </label>
                            <select
                              id="quick-country"
                              value={quickSearchForm.country || ''}
                              onChange={(e) => setQuickSearchForm(prev => ({ ...prev, country: e.target.value || null }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="">All Countries</option>
                              {availableCountries.map(country => (
                                <option key={country.country} value={country.country}>
                                  {country.country} ({country.property_count})
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label htmlFor="quick-property-type" className="block text-sm font-medium text-gray-700 mb-1">
                              Property Type
                            </label>
                            <select
                              id="quick-property-type"
                              value={quickSearchForm.property_type || ''}
                              onChange={(e) => setQuickSearchForm(prev => ({ ...prev, property_type: e.target.value || null }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="">All Types</option>
                              <option value="villa">Villa</option>
                              <option value="cabin">Cabin</option>
                              <option value="house">House</option>
                              <option value="mansion">Mansion</option>
                              <option value="land">Land</option>
                              <option value="farm">Farm</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
                          >
                            Search Properties
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>

                {/* Countries Dropdown */}
                <div className="relative" ref={countriesDropdownRef}>
                  <button
                    onClick={() => setCountriesDropdownOpen(!countriesDropdownOpen)}
                    className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center"
                    aria-expanded={countriesDropdownOpen}
                  >
                    Countries
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {countriesDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 max-h-96 overflow-y-auto">
                      <div className="py-1">
                        {availableCountries.map(country => (
                          <button
                            key={country.country}
                            onClick={() => handleCountrySelect(country.country)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <span>{country.country}</span>
                              <span className="text-gray-500 text-xs">
                                {country.property_count} properties
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side navigation */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {isAuthenticated ? (
                <>
                  {/* List Your Property - Only for Sellers/Agents */}
                  {currentUser && (currentUser.user_type === 'seller' || currentUser.user_type === 'agent') && (
                    <Link
                      to="/create-listing"
                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      List Your Property
                    </Link>
                  )}

                  {/* Notifications */}
                  <Link
                    to="/dashboard"
                    className="relative p-2 text-gray-600 hover:text-green-600 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5L15 17zM9 17H4l3.5-3.5L9 17zM12 12v.01M12 3v9" />
                    </svg>
                    {(notificationCount > 0 || unreadNotificationCount > 0) && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {Math.max(notificationCount, unreadNotificationCount)}
                      </span>
                    )}
                  </Link>

                  {/* User Account Dropdown */}
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center space-x-2 text-gray-700 hover:text-green-600 transition-colors"
                      aria-expanded={userDropdownOpen}
                    >
                      <img
                        className="h-8 w-8 rounded-full"
                        src={currentUser?.profile_photo_url || `https://picsum.photos/32/32?random=${currentUser?.user_id}`}
                        alt={currentUser?.name || 'User'}
                      />
                      <span className="text-sm font-medium">{currentUser?.name}</span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div className="py-1">
                          <Link
                            to="/dashboard"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            My Dashboard
                          </Link>
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            My Profile
                          </Link>
                          
                          {/* Buyer-specific menu items */}
                          {currentUser?.user_type === 'buyer' && (
                            <Link
                              to="/saved-properties"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              Saved Properties
                            </Link>
                          )}
                          
                          {/* Seller/Agent-specific menu items */}
                          {currentUser && (currentUser.user_type === 'seller' || currentUser.user_type === 'agent') && (
                            <>
                              <Link
                                to="/my-listings"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                My Listings
                              </Link>
                              <Link
                                to="/inquiries"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                Inquiries
                              </Link>
                            </>
                          )}
                          
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Unauthenticated state */}
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-green-600 focus:outline-none focus:text-green-600 transition-colors"
                aria-expanded={mobileMenuOpen}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <Link
                to="/search"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-green-600 hover:bg-gray-50 rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Search Properties
              </Link>
              
              {availableCountries.slice(0, 5).map(country => (
                <button
                  key={country.country}
                  onClick={() => {
                    handleCountrySelect(country.country);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-green-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  {country.country} ({country.property_count})
                </button>
              ))}

              {isAuthenticated ? (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center px-3 mb-3">
                    <img
                      className="h-10 w-10 rounded-full"
                      src={currentUser?.profile_photo_url || `https://picsum.photos/40/40?random=${currentUser?.user_id}`}
                      alt={currentUser?.name || 'User'}
                    />
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">{currentUser?.name}</div>
                      <div className="text-sm text-gray-500">{currentUser?.email}</div>
                    </div>
                  </div>
                  
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-green-600 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Dashboard
                  </Link>
                  
                  {currentUser && (currentUser.user_type === 'seller' || currentUser.user_type === 'agent') && (
                    <Link
                      to="/create-listing"
                      className="block px-3 py-2 text-base font-medium text-green-600 hover:bg-gray-50 rounded-md transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      List Your Property
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="border-t pt-4 mt-4 space-y-1">
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-green-600 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="block px-3 py-2 text-base font-medium text-green-600 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default GV_TopNav;