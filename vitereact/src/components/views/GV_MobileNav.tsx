import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on API responses
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

// Fetch countries data from properties endpoint
const fetchCountriesData = async (): Promise<CountryData[]> => {
  const { data } = await axios.get<PropertySearchResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties?limit=1000&offset=0`
  );
  
  // Extract unique countries and count properties per country
  const countryCounts = data.properties.reduce((acc: Record<string, number>, property) => {
    const country = property.country;
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(countryCounts).map(([country, count]) => ({
    country,
    property_count: count
  })).sort((a, b) => b.property_count - a.property_count); // Sort by property count desc
};

const GV_MobileNav: React.FC = () => {
  // Local state variables
  const [mobile_menu_open, setMobileMenuOpen] = useState(false);
  const [search_section_expanded, setSearchSectionExpanded] = useState(false);
  const [countries_section_expanded, setCountriesSectionExpanded] = useState(false);

  // Global state access - using individual selectors to prevent infinite loops
  const is_authenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const current_user = useAppStore(state => state.authentication_state.current_user);
  const logout_user = useAppStore(state => state.logout_user);

  // Countries data fetching
  const { data: available_countries = [], isLoading: countries_loading } = useQuery<CountryData[], Error>({
    queryKey: ['countries-mobile-nav'],
    queryFn: fetchCountriesData,
    enabled: mobile_menu_open, // Only fetch when menu is open
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Toggle functions
  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
    // Close expanded sections when closing menu
    if (mobile_menu_open) {
      setSearchSectionExpanded(false);
      setCountriesSectionExpanded(false);
    }
  };

  const toggleSearchSection = () => {
    setSearchSectionExpanded(prev => !prev);
  };

  const toggleCountriesSection = () => {
    setCountriesSectionExpanded(prev => !prev);
  };

  const handleLogout = async () => {
    try {
      await logout_user();
      setMobileMenuOpen(false); // Close menu after logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false); // Close menu when navigating
  };

  // Close menu when clicking outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMobileMenuOpen(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobile_menu_open) {
        setMobileMenuOpen(false);
      }
    };

    if (mobile_menu_open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [mobile_menu_open]);

  return (
    <>
      {/* Hamburger Menu Button - Only visible on mobile/tablet */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="p-3 rounded-md bg-white shadow-lg border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
          aria-label="Toggle mobile navigation menu"
          aria-expanded={mobile_menu_open}
        >
          <div className="w-6 h-6 flex flex-col justify-center space-y-1">
            <span className={`block h-0.5 w-6 bg-gray-700 transition-transform duration-300 ${mobile_menu_open ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`block h-0.5 w-6 bg-gray-700 transition-opacity duration-300 ${mobile_menu_open ? 'opacity-0' : ''}`}></span>
            <span className={`block h-0.5 w-6 bg-gray-700 transition-transform duration-300 ${mobile_menu_open ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </div>
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      {mobile_menu_open && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={handleOverlayClick}
          aria-hidden="true"
        >
          {/* Mobile Navigation Panel */}
          <div className={`fixed inset-y-0 left-0 w-80 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${mobile_menu_open ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <Link 
                  to="/" 
                  onClick={handleLinkClick}
                  className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  NatureEstate
                </Link>
                <button
                  onClick={toggleMobileMenu}
                  className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  aria-label="Close mobile navigation menu"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* User Profile Section (if authenticated) */}
              {is_authenticated && current_user && (
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {current_user.profile_photo_url ? (
                        <img 
                          src={current_user.profile_photo_url} 
                          alt={current_user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        current_user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{current_user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{current_user.email}</p>
                      <p className="text-xs text-blue-600 font-medium capitalize">{current_user.user_type}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                <nav className="px-6 py-4 space-y-2">
                  {/* Search Properties Section */}
                  <div>
                    <button
                      onClick={toggleSearchSection}
                      className="w-full flex items-center justify-between p-3 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ minHeight: '44px' }}
                      aria-expanded={search_section_expanded}
                    >
                      <span className="font-medium">Search Properties</span>
                      <svg 
                        className={`w-5 h-5 transition-transform duration-200 ${search_section_expanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {search_section_expanded && (
                      <div className="ml-4 mt-2 space-y-2">
                        <Link
                          to="/search"
                          onClick={handleLinkClick}
                          className="block p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          style={{ minHeight: '44px' }}
                        >
                          All Properties
                        </Link>
                        <Link
                          to="/search?property_type=villa"
                          onClick={handleLinkClick}
                          className="block p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          style={{ minHeight: '44px' }}
                        >
                          Villas
                        </Link>
                        <Link
                          to="/search?property_type=cabin"
                          onClick={handleLinkClick}
                          className="block p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          style={{ minHeight: '44px' }}
                        >
                          Cabins
                        </Link>
                        <Link
                          to="/search?property_type=house"
                          onClick={handleLinkClick}
                          className="block p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          style={{ minHeight: '44px' }}
                        >
                          Houses
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Countries Section */}
                  <div>
                    <button
                      onClick={toggleCountriesSection}
                      className="w-full flex items-center justify-between p-3 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ minHeight: '44px' }}
                      aria-expanded={countries_section_expanded}
                    >
                      <span className="font-medium">Countries</span>
                      <svg 
                        className={`w-5 h-5 transition-transform duration-200 ${countries_section_expanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {countries_section_expanded && (
                      <div className="ml-4 mt-2 space-y-2">
                        {countries_loading ? (
                          <div className="p-2 text-sm text-gray-500">Loading countries...</div>
                        ) : (
                          available_countries.slice(0, 10).map((country) => (
                            <Link
                              key={country.country}
                              to={`/search?country=${encodeURIComponent(country.country)}`}
                              onClick={handleLinkClick}
                              className="block p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              style={{ minHeight: '44px' }}
                            >
                              <div className="flex items-center justify-between">
                                <span>{country.country}</span>
                                <span className="text-xs text-gray-400">({country.property_count})</span>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Authenticated User Links */}
                  {is_authenticated && (
                    <>
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <Link
                          to="/dashboard"
                          onClick={handleLinkClick}
                          className="block p-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors font-medium"
                          style={{ minHeight: '44px' }}
                        >
                          Dashboard
                        </Link>
                        
                        {/* User Type Specific Links */}
                        {current_user?.user_type === 'buyer' && (
                          <Link
                            to="/saved-properties"
                            onClick={handleLinkClick}
                            className="block p-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            style={{ minHeight: '44px' }}
                          >
                            Saved Properties
                          </Link>
                        )}
                        
                        {(current_user?.user_type === 'seller' || current_user?.user_type === 'agent') && (
                          <>
                            <Link
                              to="/create-listing"
                              onClick={handleLinkClick}
                              className="block p-3 text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium"
                              style={{ minHeight: '44px' }}
                            >
                              List Property
                            </Link>
                            <Link
                              to="/my-listings"
                              onClick={handleLinkClick}
                              className="block p-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                              style={{ minHeight: '44px' }}
                            >
                              My Listings
                            </Link>
                            <Link
                              to="/inquiries"
                              onClick={handleLinkClick}
                              className="block p-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                              style={{ minHeight: '44px' }}
                            >
                              Inquiries
                            </Link>
                          </>
                        )}
                        
                        <Link
                          to="/profile"
                          onClick={handleLinkClick}
                          className="block p-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          style={{ minHeight: '44px' }}
                        >
                          Profile Settings
                        </Link>
                      </div>
                    </>
                  )}

                  {/* Help Link */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <Link
                      to="/help"
                      onClick={handleLinkClick}
                      className="block p-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      style={{ minHeight: '44px' }}
                    >
                      Help & Support
                    </Link>
                  </div>
                </nav>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200 p-6">
                {is_authenticated ? (
                  <button
                    onClick={handleLogout}
                    className="w-full p-3 text-red-600 hover:bg-red-50 rounded-md transition-colors font-medium text-center"
                    style={{ minHeight: '44px' }}
                  >
                    Sign Out
                  </button>
                ) : (
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      onClick={handleLinkClick}
                      className="block w-full p-3 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium text-center"
                      style={{ minHeight: '44px' }}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      onClick={handleLinkClick}
                      className="block w-full p-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors font-medium text-center"
                      style={{ minHeight: '44px' }}
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GV_MobileNav;