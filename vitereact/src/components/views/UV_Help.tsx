import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';

// Mock help articles data since API endpoints are missing
const MOCK_HELP_ARTICLES = [
  // Getting Started
  {
    id: '1',
    title: 'How to Search for Properties',
    content: 'Learn how to effectively search for scenic properties using our advanced filters. Use location filters to narrow down by country, region, and city. Apply property type filters for villas, cabins, houses, and more. Set price ranges and bedroom/bathroom requirements. Use natural features filters to find properties with mountain views, lake access, or ocean fronts.',
    category: 'getting_started',
    tags: ['search', 'filters', 'properties', 'beginners'],
    last_updated: '2024-01-15'
  },
  {
    id: '2', 
    title: 'Creating Your Account',
    content: 'Step-by-step guide to creating your NatureEstate account. Choose your user type (Buyer, Seller, or Agent), verify your email address, complete your profile with photo and preferences, and set up notification preferences.',
    category: 'getting_started',
    tags: ['account', 'registration', 'setup', 'profile'],
    last_updated: '2024-01-10'
  },
  {
    id: '3',
    title: 'Understanding Property Listings',
    content: 'Comprehensive guide to reading property listings. Learn about property details, natural features, amenities, location information, pricing, and how to interpret photos and descriptions.',
    category: 'getting_started', 
    tags: ['listings', 'properties', 'understanding', 'details'],
    last_updated: '2024-01-12'
  },
  {
    id: '4',
    title: 'Using Advanced Search Filters',
    content: 'Master the advanced search features. Filter by natural features like mountain views, lake access, forest proximity. Use outdoor amenities filters for pools, decks, hiking trails. Set specific criteria for land size, square footage, and year built.',
    category: 'getting_started',
    tags: ['advanced', 'search', 'filters', 'features'],
    last_updated: '2024-01-14'
  },

  // For Buyers
  {
    id: '5',
    title: 'How to Save and Organize Properties',
    content: 'Learn to save properties to your favorites, organize them with notes, create comparison lists, and manage your saved properties efficiently. Access your saved properties from any device.',
    category: 'buying',
    tags: ['saving', 'favorites', 'organization', 'comparison'],
    last_updated: '2024-01-13'
  },
  {
    id: '6',
    title: 'Contacting Sellers and Agents',
    content: 'Best practices for reaching out to property owners and real estate agents. Write effective inquiry messages, ask the right questions, schedule viewings, and maintain professional communication.',
    category: 'buying',
    tags: ['contact', 'communication', 'inquiries', 'agents'],
    last_updated: '2024-01-11'
  },
  {
    id: '7',
    title: 'Understanding Property Information',
    content: 'Detailed explanation of property information sections. Learn about natural features, outdoor amenities, environmental characteristics, nearby attractions, and how to evaluate scenic properties.',
    category: 'buying',
    tags: ['property', 'information', 'features', 'evaluation'],
    last_updated: '2024-01-09'
  },
  {
    id: '8',
    title: 'Using Map Features',
    content: 'Comprehensive guide to map functionality. View properties on interactive maps, use satellite and terrain views, measure distances to landmarks, explore nearby natural features, and understand property boundaries.',
    category: 'buying',
    tags: ['maps', 'location', 'satellite', 'terrain'],
    last_updated: '2024-01-08'
  },
  {
    id: '9',
    title: 'Setting Up Property Alerts',
    content: 'Create and manage property alerts for new listings. Set up email notifications for properties matching your criteria, manage alert frequency, and modify or delete alerts as needed.',
    category: 'buying',
    tags: ['alerts', 'notifications', 'email', 'automation'],
    last_updated: '2024-01-07'
  },

  // For Sellers/Agents
  {
    id: '10',
    title: 'Creating Your First Listing',
    content: 'Comprehensive guide to creating property listings. Upload high-quality photos, write compelling descriptions, highlight natural features, set competitive pricing, and optimize for search visibility.',
    category: 'selling',
    tags: ['listing', 'creation', 'photos', 'description'],
    last_updated: '2024-01-16'
  },
  {
    id: '11',
    title: 'Photography Tips for Scenic Properties',
    content: 'Professional photography tips for showcasing scenic properties. Capture natural beauty, use proper lighting, show multiple angles, highlight outdoor spaces, and create virtual tours.',
    category: 'selling',
    tags: ['photography', 'scenic', 'tips', 'virtual tours'],
    last_updated: '2024-01-05'
  },
  {
    id: '12',
    title: 'Managing Inquiries Effectively', 
    content: 'Best practices for handling buyer inquiries. Respond promptly, provide detailed information, schedule viewings efficiently, maintain professional communication, and track inquiry status.',
    category: 'selling',
    tags: ['inquiries', 'management', 'communication', 'viewings'],
    last_updated: '2024-01-04'
  },
  {
    id: '13',
    title: 'Optimizing Your Listings',
    content: 'SEO and optimization guide for property listings. Use relevant keywords, write compelling titles, optimize descriptions for search, leverage natural feature tags, and improve visibility.',
    category: 'selling',
    tags: ['optimization', 'seo', 'keywords', 'visibility'],
    last_updated: '2024-01-03'
  },
  {
    id: '14',
    title: 'Understanding Listing Analytics',
    content: 'Comprehensive guide to listing performance analytics. Track views, monitor inquiries, analyze visitor behavior, understand search rankings, and optimize based on data insights.',
    category: 'selling',
    tags: ['analytics', 'performance', 'tracking', 'insights'],
    last_updated: '2024-01-02'
  },

  // Account Management
  {
    id: '15',
    title: 'Profile Settings and Preferences',
    content: 'Manage your account profile and preferences. Update personal information, change profile photo, set location preferences, manage privacy settings, and customize your experience.',
    category: 'account_management',
    tags: ['profile', 'settings', 'preferences', 'privacy'],
    last_updated: '2024-01-01'
  },
  {
    id: '16',
    title: 'Privacy and Security Settings',
    content: 'Comprehensive guide to privacy and security. Manage data sharing preferences, control profile visibility, secure your account with strong passwords, and understand our privacy policies.',
    category: 'account_management',
    tags: ['privacy', 'security', 'password', 'data'],
    last_updated: '2023-12-30'
  },
  {
    id: '17',
    title: 'Notification Management',
    content: 'Control your notification preferences. Set up email alerts, manage push notifications, customize inquiry notifications, and choose notification frequency for different types of updates.',
    category: 'account_management',
    tags: ['notifications', 'email', 'alerts', 'preferences'],
    last_updated: '2023-12-29'
  },
  {
    id: '18',
    title: 'Account Verification Process',
    content: 'Step-by-step account verification guide. Verify your email address, complete phone verification, upload identity documents if required, and understand verification benefits.',
    category: 'account_management',
    tags: ['verification', 'email', 'phone', 'identity'],
    last_updated: '2023-12-28'
  }
];

const CATEGORIES = [
  { id: 'getting_started', name: 'Getting Started', icon: '🚀' },
  { id: 'buying', name: 'For Buyers', icon: '🏡' },
  { id: 'selling', name: 'For Sellers/Agents', icon: '📈' },
  { id: 'account_management', name: 'Account Management', icon: '⚙️' }
];

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  last_updated: string;
}

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
}

const UV_Help: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State variables based on datamap
  const [help_articles] = useState<HelpArticle[]>(MOCK_HELP_ARTICLES);
  const [search_query, setSearchQuery] = useState(searchParams.get('search') || '');
  const [active_category, setActiveCategory] = useState<string | null>(searchParams.get('category') || null);
  const [loading_articles] = useState(false);
  const [contact_form, setContactForm] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [contact_form_submitted, setContactFormSubmitted] = useState(false);
  const [recently_viewed, setRecentlyViewed] = useState<string[]>([]);

  // Access authentication state to pre-fill contact form
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Pre-fill contact form with user info if authenticated
  useEffect(() => {
    if (currentUser && contact_form.name === '' && contact_form.email === '') {
      setContactForm(prev => ({
        ...prev,
        name: currentUser.name || '',
        email: currentUser.email || ''
      }));
    }
  }, [currentUser, contact_form.name, contact_form.email]);

  // Update URL params when search or category changes
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (search_query) newParams.set('search', search_query);
    if (active_category) newParams.set('category', active_category);
    setSearchParams(newParams);
  }, [search_query, active_category, setSearchParams]);

  // Filter and search articles
  const filtered_articles = useMemo(() => {
    let articles = help_articles;

    // Filter by category
    if (active_category) {
      articles = articles.filter(article => article.category === active_category);
    }

    // Filter by search query
    if (search_query) {
      const query = search_query.toLowerCase();
      articles = articles.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query) ||
        article.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return articles;
  }, [help_articles, active_category, search_query]);

  // Get popular articles (mock logic - most recently updated)
  const popular_articles = useMemo(() => {
    return help_articles
      .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
      .slice(0, 5);
  }, [help_articles]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle category filter
  const handleCategoryClick = (categoryId: string | null) => {
    setActiveCategory(active_category === categoryId ? null : categoryId);
  };

  // Handle article click (add to recently viewed)
  const handleArticleClick = (articleId: string) => {
    setRecentlyViewed(prev => {
      const updated = [articleId, ...prev.filter(id => id !== articleId)].slice(0, 5);
      return updated;
    });
  };

  // Handle contact form submission
  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: MISSING ENDPOINT for contact support - would need POST /support/contact
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setContactFormSubmitted(true);
      setContactForm({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        subject: '',
        message: '',
        category: 'general'
      });
    } catch (error) {
      console.error('Contact form submission failed:', error);
    }
  };

  // Handle contact form input changes
  const handleContactFormChange = (field: keyof ContactForm, value: string) => {
    setContactForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get recently viewed articles
  const recently_viewed_articles = useMemo(() => {
    return recently_viewed
      .map(id => help_articles.find(article => article.id === id))
      .filter(Boolean) as HelpArticle[];
  }, [recently_viewed, help_articles]);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Help Center & Support
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Find answers to your questions and get the help you need
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={search_query}
                    onChange={handleSearchChange}
                    placeholder="Search help articles..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Category Navigation */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
                <nav className="space-y-2">
                  <button
                    onClick={() => handleCategoryClick(null)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active_category === null
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    📚 All Articles
                  </button>
                  {CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        active_category === category.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {category.icon} {category.name}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Popular Articles */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Articles</h3>
                <div className="space-y-3">
                  {popular_articles.map(article => (
                    <button
                      key={article.id}
                      onClick={() => handleArticleClick(article.id)}
                      className="block w-full text-left p-2 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {article.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {CATEGORIES.find(cat => cat.id === article.category)?.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recently Viewed */}
              {recently_viewed_articles.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Viewed</h3>
                  <div className="space-y-3">
                    {recently_viewed_articles.map(article => (
                      <button
                        key={article.id}
                        onClick={() => handleArticleClick(article.id)}
                        className="block w-full text-left p-2 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {article.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {CATEGORIES.find(cat => cat.id === article.category)?.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Search Results Summary */}
              {(search_query || active_category) && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {search_query ? `Search results for "${search_query}"` : 
                         `${CATEGORIES.find(cat => cat.id === active_category)?.name} Articles`}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {filtered_articles.length} article{filtered_articles.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                    {(search_query || active_category) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setActiveCategory(null);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Articles List */}
              {loading_articles ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="border-b border-gray-200 pb-4">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-300 rounded w-full mb-1"></div>
                        <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : filtered_articles.length > 0 ? (
                <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
                  {filtered_articles.map(article => (
                    <div key={article.id} className="p-6">
                      <button
                        onClick={() => handleArticleClick(article.id)}
                        className="block w-full text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-gray-600 mt-2 line-clamp-3">
                              {article.content}
                            </p>
                            <div className="flex items-center mt-4 space-x-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {CATEGORIES.find(cat => cat.id === article.category)?.name}
                              </span>
                              <span className="text-sm text-gray-500">
                                Updated {new Date(article.last_updated).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {article.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="ml-4">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find any articles matching your search criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory(null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    View all articles
                  </button>
                </div>
              )}

              {/* Contact Support Section */}
              <div className="bg-white rounded-lg shadow p-6 mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Support</h2>
                <p className="text-gray-600 mb-6">
                  Can't find what you're looking for? Our support team is here to help.
                </p>

                {contact_form_submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Message sent successfully!
                        </h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>We've received your message and will get back to you within 24 hours.</p>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={() => setContactFormSubmitted(false)}
                            className="text-sm font-medium text-green-800 hover:text-green-600"
                          >
                            Send another message
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleContactFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <input
                          type="text"
                          id="contact-name"
                          required
                          value={contact_form.name}
                          onChange={(e) => handleContactFormChange('name', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          id="contact-email"
                          required
                          value={contact_form.email}
                          onChange={(e) => handleContactFormChange('email', e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-category" className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        id="contact-category"
                        value={contact_form.category}
                        onChange={(e) => handleContactFormChange('category', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="technical">Technical Support</option>
                        <option value="account">Account Issues</option>
                        <option value="listing">Listing Help</option>
                        <option value="billing">Billing Questions</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="contact-subject"
                        required
                        value={contact_form.subject}
                        onChange={(e) => handleContactFormChange('subject', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700">
                        Message
                      </label>
                      <textarea
                        id="contact-message"
                        rows={6}
                        required
                        value={contact_form.message}
                        onChange={(e) => handleContactFormChange('message', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Please describe your issue or question in detail..."
                      />
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="w-full md:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Send Message
                      </button>
                    </div>
                  </form>
                )}

                {/* Support Contact Info */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Other Ways to Reach Us</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-900">Email Support</p>
                        <p className="text-sm text-gray-600">support@natureestate.com</p>
                        <p className="text-xs text-gray-500">Response within 24 hours</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-900">Phone Support</p>
                        <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
                        <p className="text-xs text-gray-500">Mon-Fri, 9 AM - 6 PM EST</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Help;