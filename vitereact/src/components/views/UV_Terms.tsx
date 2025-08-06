import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';

// Interfaces for terms content
interface TermsContent {
  content: string;
  last_updated: string;
  version: string;
}

interface TermsSection {
  id: string;
  title: string;
  content: string;
}

const UV_Terms: React.FC = () => {
  // State variables based on datamap specification
  const [terms_content, setTermsContent] = useState<TermsContent>({
    content: '',
    last_updated: '',
    version: ''
  });
  const [loading_terms, setLoadingTerms] = useState<boolean>(false);
  const [terms_accepted, setTermsAccepted] = useState<boolean>(false);
  const [show_acceptance_required, setShowAcceptanceRequired] = useState<boolean>(false);

  // Global state access - individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);


  const termsSections: TermsSection[] = [
    {
      id: 'platform-usage',
      title: '1. Platform Usage Terms',
      content: `By accessing and using NatureEstate, you agree to be bound by these Terms of Service. NatureEstate is a specialized real estate platform designed to connect buyers, sellers, and agents interested in properties with exceptional natural beauty and scenic views. You must be at least 18 years old to use our services. You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or device.`
    },
    {
      id: 'user-responsibilities',
      title: '2. User Responsibilities and Obligations',
      content: `All users must provide accurate, current, and complete information when creating accounts and listing properties. You agree not to use the platform for any unlawful purpose or in any way that could damage, disable, or impair the service. Users are prohibited from posting false, misleading, or fraudulent property information. You must respect intellectual property rights and may not copy, reproduce, or distribute content without permission. Harassment, spam, or inappropriate communication with other users is strictly prohibited.`
    },
    {
      id: 'seller-agent-terms',
      title: '3. Seller and Agent Specific Terms',
      content: `Property sellers and real estate agents have additional responsibilities when listing properties on NatureEstate. All property information must be accurate and current, including descriptions, pricing, availability status, and natural features. Photos must accurately represent the property and may not be misleading. Sellers must have legal authority to list and sell the property. Response to legitimate inquiries should be timely and professional. Commission structures and fees between agents and sellers are independent of NatureEstate's platform fees.`
    },
    {
      id: 'buyer-protections',
      title: '4. Buyer Protections and Limitations',
      content: `NatureEstate provides tools to help buyers find and evaluate properties, but we do not guarantee the accuracy of all property information. Buyers are encouraged to conduct independent due diligence, including property inspections, title searches, and verification of natural features and amenities. We facilitate communication between buyers and sellers but are not party to any real estate transactions. Buyers should work with qualified professionals for legal, financial, and inspection services. NatureEstate is not responsible for transaction disputes between parties.`
    },
    {
      id: 'intellectual-property',
      title: '5. Intellectual Property Rights',
      content: `The NatureEstate platform, including its design, functionality, trademarks, and content, is protected by intellectual property laws. Users retain ownership of their uploaded content, including property photos and descriptions, but grant NatureEstate a license to display and promote this content on the platform. Users may not reproduce, distribute, or create derivative works from NatureEstate's proprietary content without written permission. Any unauthorized use of our intellectual property may result in legal action.`
    },
    {
      id: 'privacy-data',
      title: '6. Privacy and Data Handling',
      content: `Your privacy is important to us. Our Privacy Policy, which is incorporated by reference into these Terms, explains how we collect, use, and protect your personal information. By using NatureEstate, you consent to the collection and use of your information as described in our Privacy Policy. We implement appropriate security measures to protect your data, but cannot guarantee absolute security. You have rights regarding your personal data, including access, correction, and deletion rights where applicable by law.`
    },
    {
      id: 'dispute-resolution',
      title: '7. Dispute Resolution Procedures',
      content: `In the event of disputes between users, NatureEstate encourages direct communication and resolution. For disputes involving NatureEstate directly, we prefer good faith negotiations. If informal resolution is unsuccessful, disputes will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. This arbitration clause does not apply to claims that may be brought in small claims court. Class action lawsuits are waived by using our platform.`
    },
    {
      id: 'limitation-liability',
      title: '8. Limitation of Liability',
      content: `NatureEstate's liability is limited to the maximum extent permitted by law. We provide the platform on an "as is" and "as available" basis without warranties of any kind. We are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. Our total liability for any claims arising from these terms or your use of NatureEstate shall not exceed the amount you paid us in the twelve months prior to the claim, or $100, whichever is greater.`
    },
    {
      id: 'termination-conditions',
      title: '9. Termination Conditions',
      content: `Either party may terminate the agreement at any time with or without cause. Users may delete their accounts through profile settings. NatureEstate reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or pose security risks. Upon termination, your right to access and use the platform ceases immediately. Surviving provisions include intellectual property rights, limitation of liability, and dispute resolution clauses.`
    },
    {
      id: 'modification-procedures',
      title: '10. Modification Notice Procedures',
      content: `NatureEstate reserves the right to modify these Terms of Service at any time. We will provide notice of material changes through email notifications to registered users and prominent notice on the platform. Your continued use of NatureEstate after such modifications constitutes acceptance of the updated terms. If you do not agree to the modifications, you must stop using the platform and may delete your account. We recommend reviewing these terms periodically for updates.`
    }
  ];

  // Load terms content on component mount
  useEffect(() => {
    loadTermsContent();
    
    // Check if user came from registration flow
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('accept') === 'required') {
      setShowAcceptanceRequired(true);
    }
  }, []);

  // TODO: MISSING ENDPOINT - Load terms content from backend
  const loadTermsContent = async () => {
    setLoadingTerms(true);
    
    try {
      // TODO: Replace with actual API call when endpoint exists
      // const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/legal/terms`);
      

      setTimeout(() => {
        setTermsContent({
          content: 'Terms of Service for NatureEstate Platform',
          last_updated: '2024-01-23T00:00:00Z',
          version: '1.2'
        });
        setLoadingTerms(false);
      }, 500);
    } catch (error) {
      console.error('Error loading terms content:', error);
      setLoadingTerms(false);
    }
  };

  // TODO: MISSING ENDPOINT - Accept terms
  const acceptTerms = async () => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    try {
      // TODO: Replace with actual API call when endpoint exists
      // const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/users/accept-terms`, {
      //   user_id: currentUser.user_id,
      //   terms_version: terms_content.version,
      //   accepted_at: new Date().toISOString()
      // });
      

      setTermsAccepted(true);
      setShowAcceptanceRequired(false);
      
      // Redirect to registration completion or dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error accepting terms:', error);
    }
  };

  // TODO: MISSING ENDPOINT - Download PDF version
  const downloadTerms = () => {
    // TODO: Replace with actual API call when endpoint exists
    // window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/legal/terms/pdf`, '_blank');
    

    window.print();
  };

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      {/* Skip navigation for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-gray-50 print:bg-white">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 print:border-b-2 print:border-black">
          <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 print:text-black">
                Terms of Service
              </h1>
              <p className="mt-2 text-lg text-gray-600 print:text-black">
                NatureEstate Real Estate Platform
              </p>
              
              {terms_content.last_updated && (
                <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-50 print:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 print:text-black mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-900 print:text-black">
                    Last updated: {formatDate(terms_content.last_updated)}
                  </span>
                  {terms_content.version && (
                    <span className="ml-2 text-sm text-blue-700 print:text-black">
                      (Version {terms_content.version})
                    </span>
                  )}
                </div>
              )}
              
              {/* Action buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 print:hidden">
                <button
                  onClick={downloadTerms}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
                
                <Link
                  to="/help"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Need Help?
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8" id="main-content">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Table of Contents */}
            <div className="lg:col-span-1 print:hidden">
              <div className="sticky top-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Table of Contents
                  </h2>
                  <nav className="space-y-2" aria-label="Terms of Service navigation">
                    {termsSections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 py-1 px-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {section.title}
                      </button>
                    ))}
                    <button
                      onClick={() => scrollToSection('contact-info')}
                      className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 py-1 px-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      11. Contact Information
                    </button>
                  </nav>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {loading_terms ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading terms of service...</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none">
                  {/* Terms Content */}
                  <div className="p-8 print:p-0">
                    <div className="prose prose-gray max-w-none print:prose-print">
                      {/* Introduction */}
                      <div className="mb-8 print:mb-6">
                        <p className="text-lg text-gray-700 print:text-black leading-relaxed">
                          Welcome to NatureEstate, a specialized real estate platform dedicated to properties with exceptional natural beauty and scenic views. These Terms of Service ("Terms") govern your use of our platform and services. Please read them carefully.
                        </p>
                      </div>

                      {/* Terms Sections */}
                      {termsSections.map((section) => (
                        <section key={section.id} id={section.id} className="mb-8 print:mb-6 print:break-inside-avoid">
                          <h2 className="text-2xl font-bold text-gray-900 print:text-black mb-4 print:mb-3">
                            {section.title}
                          </h2>
                          <div className="prose prose-gray print:prose-print">
                            <p className="text-gray-700 print:text-black leading-relaxed whitespace-pre-line">
                              {section.content}
                            </p>
                          </div>
                        </section>
                      ))}

                      {/* Contact Information */}
                      <section id="contact-info" className="mb-8 print:mb-6 print:break-inside-avoid">
                        <h2 className="text-2xl font-bold text-gray-900 print:text-black mb-4 print:mb-3">
                          11. Contact Information
                        </h2>
                        <div className="bg-gray-50 print:bg-gray-100 rounded-lg p-6 print:p-4">
                          <p className="text-gray-700 print:text-black mb-4">
                            If you have questions about these Terms of Service, please contact us:
                          </p>
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-600 print:text-black">
                              <strong>Email:</strong> legal@natureestate.com
                            </p>
                            <p className="text-gray-600 print:text-black">
                              <strong>Phone:</strong> +1 (555) 123-4567
                            </p>
                            <p className="text-gray-600 print:text-black">
                              <strong>Address:</strong> 123 Nature Drive, Scenic Valley, CA 94000
                            </p>
                            <p className="text-gray-600 print:text-black">
                              <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM PST
                            </p>
                          </div>
                        </div>
                      </section>

                      {/* Effective Date */}
                      <div className="border-t border-gray-200 print:border-black pt-6 print:pt-4">
                        <p className="text-sm text-gray-500 print:text-black">
                          These Terms of Service are effective as of {formatDate(terms_content.last_updated)} and supersede all previous versions.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terms Acceptance Section */}
                  {show_acceptance_required && isAuthenticated && (
                    <div className="border-t border-gray-200 bg-blue-50 print:hidden p-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Accept Terms to Continue
                        </h3>
                        <p className="text-gray-600 mb-4">
                          To complete your registration and start using NatureEstate, please accept these Terms of Service.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                          <button
                            onClick={acceptTerms}
                            disabled={terms_accepted}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {terms_accepted ? (
                              <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Terms Accepted
                              </>
                            ) : (
                              'Accept Terms & Continue'
                            )}
                          </button>
                          <Link
                            to="/register"
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                          >
                            Back to Registration
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-white border-t border-gray-200 print:hidden">
          <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <Link
                  to="/privacy"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/help"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                >
                  Help Center
                </Link>
              </div>
              <Link
                to="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to NatureEstate
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Terms;