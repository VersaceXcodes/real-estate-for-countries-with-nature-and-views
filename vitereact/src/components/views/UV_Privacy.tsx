import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/main';

// Interface definitions for privacy-related data
interface PrivacyContent {
  content: string;
  last_updated: string;
  version: string;
}

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

interface GdprRequestForm {
  request_type: string;
  email: string;
  description: string;
}

const UV_Privacy: React.FC = () => {
  // Global state access - individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Local state variables matching the datamap
  const [privacy_content, setPrivacyContent] = useState<PrivacyContent>({
    content: '',
    last_updated: '',
    version: ''
  });
  const [loading_privacy, setLoadingPrivacy] = useState<boolean>(false);
  const [cookie_preferences, setCookiePreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  });
  const [show_cookie_banner, setShowCookieBanner] = useState<boolean>(true);
  const [gdpr_request_form, setGdprRequestForm] = useState<GdprRequestForm>({
    request_type: 'access',
    email: '',
    description: ''
  });

  // Additional UI state
  const [cookie_preferences_loading, setCookiePreferencesLoading] = useState<boolean>(false);
  const [gdpr_request_loading, setGdprRequestLoading] = useState<boolean>(false);
  const [gdpr_request_success, setGdprRequestSuccess] = useState<boolean>(false);
  const [show_cookie_preferences, setShowCookiePreferences] = useState<boolean>(false);

  // Load privacy content on component mount
  useEffect(() => {
    const loadPrivacyContent = async () => {
      setLoadingPrivacy(true);
      
      try {
        // TODO: MISSING ENDPOINT - would need GET /legal/privacy
        // const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/legal/privacy`);
        // setPrivacyContent(response.data);
        

        setTimeout(() => {
          setPrivacyContent({
            content: 'privacy_policy_content',
            last_updated: new Date().toISOString().split('T')[0],
            version: '1.0'
          });
          setLoadingPrivacy(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading privacy content:', error);
        setLoadingPrivacy(false);
      }
    };

    loadPrivacyContent();
  }, []);

  // Pre-fill GDPR form with user email if authenticated
  useEffect(() => {
    if (currentUser?.email) {
      setGdprRequestForm(prev => ({
        ...prev,
        email: currentUser.email
      }));
    }
  }, [currentUser]);

  // Check for saved cookie preferences
  useEffect(() => {
    const savedPreferences = localStorage.getItem('cookie_preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setCookiePreferences(parsed);
        setShowCookieBanner(false);
      } catch (error) {
        console.error('Error parsing saved cookie preferences:', error);
      }
    }
  }, []);

  const handleAcceptCookies = async () => {
    const newPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    
    await updateCookiePreferences(newPreferences);
    setShowCookieBanner(false);
  };

  const handleRejectCookies = async () => {
    const newPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    
    await updateCookiePreferences(newPreferences);
    setShowCookieBanner(false);
  };

  const updateCookiePreferences = async (preferences: CookiePreferences) => {
    setCookiePreferencesLoading(true);
    
    try {
      // TODO: MISSING ENDPOINT - would need POST /privacy/cookies
      // const response = await axios.post(
      //   `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/privacy/cookies`,
      //   preferences
      // );
      
      localStorage.setItem('cookie_preferences', JSON.stringify(preferences));
      setCookiePreferences(preferences);
      
      setTimeout(() => {
        setCookiePreferencesLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error updating cookie preferences:', error);
      setCookiePreferencesLoading(false);
    }
  };

  const handleCookiePreferenceChange = (key: keyof CookiePreferences, value: boolean) => {
    setCookiePreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveCookiePreferences = async () => {
    await updateCookiePreferences(cookie_preferences);
    setShowCookiePreferences(false);
  };

  const handleGdprRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGdprRequestLoading(true);
    setGdprRequestSuccess(false);
    
    try {
      // TODO: MISSING ENDPOINT - would need POST /privacy/gdpr-request
      // const response = await axios.post(
      //   `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/privacy/gdpr-request',
      //   gdpr_request_form
      // );
      
      setTimeout(() => {
        setGdprRequestSuccess(true);
        setGdprRequestLoading(false);
        setGdprRequestForm(prev => ({
          ...prev,
          description: ''
        }));
      }, 1000);
    } catch (error) {
      console.error('Error submitting GDPR request:', error);
      setGdprRequestLoading(false);
    }
  };

  const handleDownloadPrivacyPolicy = async () => {
    try {
      // TODO: MISSING ENDPOINT - would need GET /legal/privacy/pdf
      // const response = await axios.get(
      //   `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/legal/privacy/pdf`,
      //   { responseType: 'blob' }
      // );
      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', 'privacy-policy.pdf');
      // document.body.appendChild(link);
      // link.click();
      // link.remove();
      
      alert('Privacy policy PDF download would be implemented with backend endpoint');
    } catch (error) {
      console.error('Error downloading privacy policy:', error);
    }
  };

  return (
    <>
      {/* Cookie Consent Banner */}
      {show_cookie_banner && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex-1">
              <p className="text-sm">
                We use cookies to enhance your experience on our platform. By continuing to browse, you agree to our use of cookies.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCookiePreferences(true)}
                className="text-blue-300 hover:text-blue-200 text-sm underline"
              >
                Customize
              </button>
              <button
                onClick={handleRejectCookies}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                disabled={cookie_preferences_loading}
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptCookies}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                disabled={cookie_preferences_loading}
              >
                {cookie_preferences_loading ? 'Saving...' : 'Accept All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Preferences Modal */}
      {show_cookie_preferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Cookie Preferences</h3>
                <button
                  onClick={() => setShowCookiePreferences(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Necessary Cookies</h4>
                      <p className="text-sm text-gray-600">Required for basic site functionality</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={cookie_preferences.necessary}
                      disabled
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Analytics Cookies</h4>
                      <p className="text-sm text-gray-600">Help us understand how visitors interact with our website</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={cookie_preferences.analytics}
                      onChange={(e) => handleCookiePreferenceChange('analytics', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Marketing Cookies</h4>
                      <p className="text-sm text-gray-600">Used to deliver personalized advertisements</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={cookie_preferences.marketing}
                      onChange={(e) => handleCookiePreferenceChange('marketing', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Preference Cookies</h4>
                      <p className="text-sm text-gray-600">Remember your settings and preferences</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={cookie_preferences.preferences}
                      onChange={(e) => handleCookiePreferenceChange('preferences', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowCookiePreferences(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCookiePreferences}
                  disabled={cookie_preferences_loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {cookie_preferences_loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            {privacy_content.last_updated && (
              <p className="text-gray-600">
                Last updated: {new Date(privacy_content.last_updated).toLocaleDateString()} • Version {privacy_content.version}
              </p>
            )}
            <div className="mt-6">
              <button
                onClick={handleDownloadPrivacyPolicy}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>

          {loading_privacy ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="p-8 space-y-8">
                {/* Information Collection */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 mb-4">
                      At NatureEstate, we collect information that you provide directly to us, information we get from your use of our services, and information from third-party sources.
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Information You Provide</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                      <li>Account registration information (name, email, phone number)</li>
                      <li>Property listing details and photos</li>
                      <li>Search preferences and saved properties</li>
                      <li>Communications and inquiries</li>
                      <li>Payment and billing information</li>
                    </ul>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Information We Collect Automatically</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Device and browser information</li>
                      <li>IP address and location data</li>
                      <li>Usage patterns and interactions with our platform</li>
                      <li>Cookie and tracking technology data</li>
                    </ul>
                  </div>
                </section>

                {/* How We Use Information */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 mb-4">
                      We use the information we collect to provide, maintain, and improve our services, including:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Creating and managing your account</li>
                      <li>Processing property listings and facilitating transactions</li>
                      <li>Providing personalized property recommendations</li>
                      <li>Communicating with you about our services</li>
                      <li>Analyzing usage to improve our platform</li>
                      <li>Preventing fraud and ensuring security</li>
                      <li>Complying with legal obligations</li>
                    </ul>
                  </div>
                </section>

                {/* Information Sharing */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Sharing and Disclosure</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 mb-4">
                      We may share your information in the following circumstances:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>With property buyers and sellers to facilitate transactions</li>
                      <li>With service providers who assist in our operations</li>
                      <li>With law enforcement when required by law</li>
                      <li>In connection with a merger, acquisition, or sale of assets</li>
                      <li>With your consent or at your direction</li>
                    </ul>
                  </div>
                </section>

                {/* Cookies and Tracking */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking Technologies</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 mb-4">
                      We use cookies and similar technologies to enhance your experience on our platform. You can manage your cookie preferences using the settings below or through your browser.
                    </p>
                    <button
                      onClick={() => setShowCookiePreferences(true)}
                      className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-md text-sm font-medium transition-colors"
                    >
                      Manage Cookie Preferences
                    </button>
                  </div>
                </section>

                {/* Data Security */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700">
                      We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure.
                    </p>
                  </div>
                </section>

                {/* Your Rights */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights and Choices</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 mb-4">
                      You have certain rights regarding your personal information, including:
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                      <li>Access to your personal data</li>
                      <li>Correction of inaccurate information</li>
                      <li>Deletion of your personal data</li>
                      <li>Restriction of processing</li>
                      <li>Data portability</li>
                      <li>Objection to processing</li>
                    </ul>
                    <p className="text-gray-700">
                      For EU residents, these rights are protected under the General Data Protection Regulation (GDPR). To exercise these rights, please use the form below or contact us directly.
                    </p>
                  </div>
                </section>

                {/* International Transfers */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">International Data Transfers</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700">
                      Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers, including standard contractual clauses approved by the European Commission.
                    </p>
                  </div>
                </section>

                {/* Contact Information */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700">
                      If you have any questions about this Privacy Policy or our data practices, please contact us at:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-md mt-4">
                      <p className="text-gray-700">
                        <strong>Email:</strong> privacy@natureestate.com<br />
                        <strong>Address:</strong> NatureEstate Privacy Office<br />
                        123 Nature Drive, Scenic City, SC 12345
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* GDPR Data Request Form */}
          <div className="mt-12 bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-blue-50 px-8 py-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit a Data Request</h2>
              <p className="text-gray-700">
                Exercise your rights under privacy regulations by submitting a data request.
              </p>
            </div>
            
            <div className="p-8">
              {gdpr_request_success && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Your data request has been submitted successfully. We will respond within 30 days.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleGdprRequestSubmit} className="space-y-6">
                <div>
                  <label htmlFor="request_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Request Type
                  </label>
                  <select
                    id="request_type"
                    value={gdpr_request_form.request_type}
                    onChange={(e) => setGdprRequestForm(prev => ({ ...prev, request_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="access">Access to my data</option>
                    <option value="correction">Correction of my data</option>
                    <option value="deletion">Deletion of my data</option>
                    <option value="portability">Data portability</option>
                    <option value="restriction">Restriction of processing</option>
                    <option value="objection">Objection to processing</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={gdpr_request_form.email}
                    onChange={(e) => setGdprRequestForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Request Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    required
                    value={gdpr_request_form.description}
                    onChange={(e) => setGdprRequestForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please describe your request in detail..."
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={gdpr_request_loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gdpr_request_loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting Request...
                      </span>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Privacy;