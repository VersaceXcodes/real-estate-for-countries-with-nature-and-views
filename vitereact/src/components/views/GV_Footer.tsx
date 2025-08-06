import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Component interfaces
interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}



const GV_Footer: React.FC = () => {
  // Newsletter form state
  const [newsletter_email, setNewsletterEmail] = useState<string>('');
  const [newsletter_subscribed, setNewsletterSubscribed] = useState<boolean>(false);
  const [newsletter_loading, setNewsletterLoading] = useState<boolean>(false);
  const [newsletter_error, setNewsletterError] = useState<string | null>(null);

  // Popular data state
  const [popular_countries, setPopularCountries] = useState<string[]>([]);
  const [popular_property_types, setPopularPropertyTypes] = useState<string[]>([]);

  // Contact information state
  const [contact_info] = useState<ContactInfo>({
    email: 'info@natureestate.com',
    phone: '+1-800-NATURE-1',
    address: 'NatureEstate HQ, Scenic Properties Division'
  });

  // Current year for copyright
  const [current_year] = useState<number>(new Date().getFullYear());

  // Load popular data on component mount
  useEffect(() => {
    loadPopularData();
    loadSystemSettings();
  }, []);

  // TODO: MISSING ENDPOINT - Load popular countries and property types
  const loadPopularData = async () => {
    try {
      // TODO: Implement when GET /analytics/popular endpoint is available
      // const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/analytics/popular`);
      // setPopularCountries(response.data.popular_countries);
      // setPopularPropertyTypes(response.data.popular_property_types);
      
      setPopularCountries(['Costa Rica', 'Mexico', 'Canada', 'Norway', 'Switzerland', 'New Zealand']);
      setPopularPropertyTypes(['Villa', 'Cabin', 'House', 'Land', 'Mansion']);
    } catch (error) {
      console.error('Failed to load popular data:', error);
      setPopularCountries(['Costa Rica', 'Mexico', 'Canada']);
      setPopularPropertyTypes(['Villa', 'Cabin', 'House']);
    }
  };

  // TODO: MISSING ENDPOINT - Load public system settings
  const loadSystemSettings = async () => {
    try {
      // TODO: Implement when GET /system-settings/public endpoint is available
      // const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/system-settings/public`);
      // Update contact_info from response.data if needed
      console.log('System settings would be loaded here');
    } catch (error) {
      console.error('Failed to load system settings:', error);
      // Use default contact info
    }
  };

  // Newsletter subscription handler
  const subscribeNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setNewsletterError(null);
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletter_email)) {
      setNewsletterError('Please enter a valid email address');
      return;
    }

    setNewsletterLoading(true);

    try {
      // TODO: MISSING ENDPOINT - Implement newsletter subscription
      // const response = await axios.post(
      //   `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/newsletter/subscribe`,
      //   { email: newsletter_email }
      // );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      console.log('Newsletter subscription would be processed here');
    } catch (error: any) {
      setNewsletterError(error.response?.data?.message || 'Failed to subscribe to newsletter');
    } finally {
      setNewsletterLoading(false);
    }
  };

  // Handle newsletter email input change
  const handleNewsletterEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewsletterEmail(e.target.value);
    // Clear error when user starts typing
    if (newsletter_error) {
      setNewsletterError(null);
    }
  };

  return (
    <>
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Company Information Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-4">
                <Link to="/" className="flex items-center">
                  <span className="text-2xl font-bold text-green-400">NatureEstate</span>
                </Link>
              </div>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Discover properties with breathtaking natural beauty and scenic views. 
                Specializing in unique homes that offer extraordinary connections to nature.
              </p>
              
              {/* Contact Information */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <a href={`mailto:${contact_info.email}`} className="hover:text-green-400 transition-colors">
                    {contact_info.email}
                  </a>
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <a href={`tel:${contact_info.phone}`} className="hover:text-green-400 transition-colors">
                    {contact_info.phone}
                  </a>
                </div>
                <div className="flex items-start text-sm text-gray-300">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>{contact_info.address}</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation - Popular Countries */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4">Popular Countries</h3>
              <ul className="space-y-2">
                {popular_countries.map((country, index) => (
                  <li key={index}>
                    <Link 
                      to={`/search?country=${encodeURIComponent(country)}`}
                      className="text-gray-300 hover:text-green-400 text-sm transition-colors"
                    >
                      {country}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Navigation - Property Types */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4">Property Types</h3>
              <ul className="space-y-2">
                {popular_property_types.map((type, index) => (
                  <li key={index}>
                    <Link 
                      to={`/search?property_type=${encodeURIComponent(type.toLowerCase())}`}
                      className="text-gray-300 hover:text-green-400 text-sm transition-colors"
                    >
                      {type}
                    </Link>
                  </li>
                ))}
              </ul>
              
              {/* Additional Quick Links */}
              <div className="mt-6">
                <h4 className="text-md font-medium mb-3">Support</h4>
                <ul className="space-y-2">
                  <li>
                    <Link 
                      to="/help"
                      className="text-gray-300 hover:text-green-400 text-sm transition-colors"
                    >
                      Help Center
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Newsletter & Social Media Section */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4">Stay Connected</h3>
              
              {/* Newsletter Signup */}
              {!newsletter_subscribed ? (
                <form onSubmit={subscribeNewsletter} className="mb-6">
                  <p className="text-gray-300 text-sm mb-3">
                    Get updates on new scenic properties and market insights.
                  </p>
                  <div className="flex flex-col space-y-2">
                    <input
                      type="email"
                      value={newsletter_email}
                      onChange={handleNewsletterEmailChange}
                      placeholder="Enter your email"
                      required
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="submit"
                      disabled={newsletter_loading}
                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {newsletter_loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Subscribing...
                        </span>
                      ) : (
                        'Subscribe'
                      )}
                    </button>
                  </div>
                  {newsletter_error && (
                    <p className="text-red-400 text-xs mt-2" role="alert">
                      {newsletter_error}
                    </p>
                  )}
                </form>
              ) : (
                <div className="mb-6 p-3 bg-green-600 bg-opacity-20 border border-green-500 rounded-md">
                  <p className="text-green-400 text-sm">
                    ✓ Successfully subscribed to newsletter!
                  </p>
                </div>
              )}

              {/* Social Media Links */}
              <div>
                <h4 className="text-md font-medium mb-3">Follow Us</h4>
                <div className="flex space-x-4">
                  <a 
                    href="https://facebook.com/natureestate" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://instagram.com/natureestate" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on Instagram"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.342-1.384S3.723 13.834 3.723 12.537c0-1.297.49-2.448 1.384-3.342S7.152 7.811 8.449 7.811c1.297 0 2.448.49 3.342 1.384s1.384 2.045 1.384 3.342c0 1.297-.49 2.448-1.384 3.342s-2.045 1.384-3.342 1.384zm7.718 0c-1.297 0-2.448-.49-3.342-1.384s-1.384-2.045-1.384-3.342c0-1.297.49-2.448 1.384-3.342s2.045-1.384 3.342-1.384c1.297 0 2.448.49 3.342 1.384s1.384 2.045 1.384 3.342c0 1.297-.49 2.448-1.384 3.342s-2.045 1.384-3.342 1.384z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://twitter.com/natureestate" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Legal and Copyright Section */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              
              {/* Legal Links */}
              <div className="flex flex-wrap justify-center md:justify-start space-x-6 text-sm">
                <Link 
                  to="/terms" 
                  className="text-gray-300 hover:text-green-400 transition-colors"
                >
                  Terms of Service
                </Link>
                <Link 
                  to="/privacy" 
                  className="text-gray-300 hover:text-green-400 transition-colors"
                >
                  Privacy Policy
                </Link>
                <a 
                  href="#" 
                  className="text-gray-300 hover:text-green-400 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Implement cookie policy modal or page
                    console.log('Cookie policy would be displayed here');
                  }}
                >
                  Cookie Policy
                </a>
              </div>

              {/* Copyright Notice */}
              <div className="text-sm text-gray-400">
                <p>&copy; {current_year} NatureEstate. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;