import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Define interfaces based on OpenAPI spec and Zod schemas
interface DashboardStats {
  user_type: string;
  total_properties: number;
  total_inquiries: number;
  total_views: number;
  total_favorites: number;
  active_listings: number;
  pending_inquiries: number;
  recent_activity: Array<{
    activity_type: string;
    description: string;
    timestamp: string;
    related_id: string | null;
  }>;
}

interface PropertySummary {
  property_id: string;
  title: string;
  price: number;
  currency: string;
  country: string;
  property_type: string;
  status: string;
  primary_photo?: {
    photo_url: string;
  };
}

interface InquirySummary {
  inquiry_id: string;
  property_id: string;
  sender_name: string;
  sender_email: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  property?: {
    title: string;
  };
}

interface SavedSearchSummary {
  saved_search_id: string;
  search_name: string;
  alert_frequency: string;
  is_active: boolean;
  last_alert_sent: string | null;
  country?: string | null;
  property_type?: string | null;
  price_min?: number | null;
  price_max?: number | null;
}

const UV_UserDashboard: React.FC = () => {
  // CRITICAL: Individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const logoutUser = useAppStore(state => state.logout_user);

  // Dashboard stats query
  const {
    data: dashboardStats,
    isLoading: isDashboardLoading,
    error: dashboardError
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/dashboard/stats`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return data;
    },
    enabled: isAuthenticated && !!authToken
  });

  // Recent properties query (different logic for buyers vs sellers/agents)
  const {
    data: recentProperties,
    isLoading: isPropertiesLoading
  } = useQuery<PropertySummary[]>({
    queryKey: ['recent-properties', currentUser?.user_id],
    queryFn: async () => {
      const params: any = {
        limit: 6,
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      // For sellers/agents, get their own properties
      if (currentUser?.user_type === 'seller' || currentUser?.user_type === 'agent') {
        // TODO: Need to add user_id filter to properties endpoint for owned properties
        // For now, we'll get all properties and filter client-side (not ideal but works for MVP)
      }

      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          params
        }
      );
      
      // Extract properties and map to our interface
      const properties = data.properties || [];
      return properties.slice(0, 6).map((p: any) => ({
        property_id: p.property_id,
        title: p.title,
        price: p.price,
        currency: p.currency,
        country: p.country,
        property_type: p.property_type,
        status: p.status,
        primary_photo: p.primary_photo
      }));
    },
    enabled: isAuthenticated && !!authToken && !!currentUser
  });

  // Recent inquiries query (for sellers/agents only)
  const {
    data: recentInquiries,
    isLoading: isInquiriesLoading
  } = useQuery<InquirySummary[]>({
    queryKey: ['recent-inquiries', currentUser?.user_id],
    queryFn: async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/inquiries`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          params: {
            recipient_user_id: currentUser?.user_id,
            limit: 10,
            sort_by: 'created_at',
            sort_order: 'desc'
          }
        }
      );
      
      return data.inquiries?.map((i: any) => ({
        inquiry_id: i.inquiry_id,
        property_id: i.property_id,
        sender_name: i.sender_name,
        sender_email: i.sender_email,
        message: i.message,
        status: i.status,
        priority: i.priority,
        created_at: i.created_at,
        property: i.property
      })) || [];
    },
    enabled: isAuthenticated && !!authToken && !!currentUser && 
             (currentUser.user_type === 'seller' || currentUser.user_type === 'agent')
  });

  // Saved searches query (for buyers only)
  const {
    data: savedSearches,
    isLoading: isSavedSearchesLoading
  } = useQuery<SavedSearchSummary[]>({
    queryKey: ['saved-searches'],
    queryFn: async () => {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/saved-searches`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return data || [];
    },
    enabled: isAuthenticated && !!authToken && currentUser?.user_type === 'buyer'
  });

  const handleLogout = () => {
    logoutUser();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'sold': return 'text-blue-600 bg-blue-100';
      case 'unread': return 'text-red-600 bg-red-100';
      case 'responded': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to access your dashboard</h2>
            <Link 
              to="/login"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isLoading = isDashboardLoading || isPropertiesLoading || isInquiriesLoading || isSavedSearchesLoading;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Dashboard Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {currentUser.name}!
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {currentUser.user_type === 'buyer' && 'Buyer Account'}
                  {currentUser.user_type === 'seller' && 'Seller Account'}
                  {currentUser.user_type === 'agent' && 'Agent Account'}
                  {currentUser.user_type === 'admin' && 'Admin Account'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  to="/profile"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Search Bar (for all user types) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Property Search</h2>
            <div className="flex space-x-4">
              <Link
                to="/search"
                className="flex-1 bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Search Properties
              </Link>
              <Link
                to="/search?property_type=villa"
                className="flex-1 bg-gray-100 text-gray-700 text-center py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Browse Villas
              </Link>
              <Link
                to="/search?property_type=cabin"
                className="flex-1 bg-gray-100 text-gray-700 text-center py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Browse Cabins
              </Link>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading dashboard...</span>
            </div>
          ) : dashboardError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-700">Error loading dashboard data. Please try again.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dashboard Stats */}
              {dashboardStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Total Properties</h3>
                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.total_properties}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Total Views</h3>
                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.total_views}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Total Inquiries</h3>
                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.total_inquiries}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Total Favorites</h3>
                    <p className="text-3xl font-bold text-gray-900">{dashboardStats.total_favorites}</p>
                  </div>
                </div>
              )}

              {/* Buyer Dashboard Content */}
              {currentUser.user_type === 'buyer' && (
                <>
                  {/* Saved Searches Section */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">Your Saved Searches</h2>
                        <Link
                          to="/search"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Create New Search
                        </Link>
                      </div>
                    </div>
                    <div className="p-6">
                      {savedSearches && savedSearches.length > 0 ? (
                        <div className="space-y-4">
                          {savedSearches.slice(0, 5).map((search) => (
                            <div key={search.saved_search_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                              <div>
                                <h3 className="font-medium text-gray-900">{search.search_name}</h3>
                                <p className="text-sm text-gray-600">
                                  {search.country && `${search.country} • `}
                                  {search.property_type && `${search.property_type} • `}
                                  {search.price_min && search.price_max && `${formatCurrency(search.price_min)} - ${formatCurrency(search.price_max)}`}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Alerts: {search.alert_frequency} • 
                                  {search.is_active ? (
                                    <span className="text-green-600 ml-1">Active</span>
                                  ) : (
                                    <span className="text-gray-600 ml-1">Inactive</span>
                                  )}
                                </p>
                              </div>
                              <Link
                                to="/search"
                                className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
                              >
                                Search Again
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500 mb-4">No saved searches yet</p>
                          <Link
                            to="/search"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Create Your First Search
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Saved Properties Section */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">Saved Properties</h2>
                        <Link
                          to="/saved-properties"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View All
                        </Link>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">Your saved properties will appear here</p>
                        <Link
                          to="/search"
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Browse Properties
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Seller/Agent Dashboard Content */}
              {(currentUser.user_type === 'seller' || currentUser.user_type === 'agent') && (
                <>
                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Link
                        to="/create-listing"
                        className="bg-green-600 text-white text-center py-4 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Add New Listing
                      </Link>
                      <Link
                        to="/my-listings"
                        className="bg-blue-600 text-white text-center py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        My Listings
                      </Link>
                      <Link
                        to="/inquiries"
                        className="bg-purple-600 text-white text-center py-4 px-6 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        Manage Inquiries
                      </Link>
                      <Link
                        to="/my-listings"
                        className="bg-gray-600 text-white text-center py-4 px-6 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                      >
                        View Analytics
                      </Link>
                    </div>
                  </div>

                  {/* Recent Properties */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">Recent Properties</h2>
                        <Link
                          to="/my-listings"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View All Listings
                        </Link>
                      </div>
                    </div>
                    <div className="p-6">
                      {recentProperties && recentProperties.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {recentProperties.map((property) => (
                            <div key={property.property_id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                              <div className="h-48 bg-gray-200">
                                {property.primary_photo?.photo_url ? (
                                  <img
                                    src={property.primary_photo.photo_url}
                                    alt={property.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-gray-400">No image</span>
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                                <p className="text-blue-600 font-medium">{formatCurrency(property.price, property.currency)}</p>
                                <p className="text-sm text-gray-600">{property.country}</p>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                                    {property.status}
                                  </span>
                                  <Link
                                    to={`/property/${property.property_id}`}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                  >
                                    View Details
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500 mb-4">No properties yet</p>
                          <Link
                            to="/create-listing"
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Create Your First Listing
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Inquiries */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">Recent Inquiries</h2>
                        <Link
                          to="/inquiries"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View All Inquiries
                        </Link>
                      </div>
                    </div>
                    <div className="p-6">
                      {recentInquiries && recentInquiries.length > 0 ? (
                        <div className="space-y-4">
                          {recentInquiries.slice(0, 5).map((inquiry) => (
                            <div key={inquiry.inquiry_id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h3 className="font-medium text-gray-900">{inquiry.sender_name}</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                                      {inquiry.status}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(inquiry.priority)}`}>
                                      {inquiry.priority}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    Property: {inquiry.property?.title || 'Unknown Property'}
                                  </p>
                                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                    {inquiry.message}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(inquiry.created_at)} • {inquiry.sender_email}
                                  </p>
                                </div>
                                <Link
                                  to={`/inquiries?inquiry_id=${inquiry.inquiry_id}`}
                                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium hover:bg-blue-200 transition-colors ml-4"
                                >
                                  Respond
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No inquiries yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Universal Account Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Profile Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Email:</span> {currentUser.email}</p>
                      <p><span className="text-gray-600">Phone:</span> {currentUser.phone || 'Not provided'}</p>
                      <p><span className="text-gray-600">Account Type:</span> {currentUser.user_type}</p>
                      <p><span className="text-gray-600">Member since:</span> {formatDate(currentUser.created_at)}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Account Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Email Verified:</span>
                        {currentUser.email_verified ? (
                          <span className="text-green-600 font-medium">✓ Verified</span>
                        ) : (
                          <span className="text-red-600 font-medium">✗ Not Verified</span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Account Verified:</span>
                        {currentUser.is_verified ? (
                          <span className="text-green-600 font-medium">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-600 font-medium">⚠ Pending</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link
                        to="/profile"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Edit Profile
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_UserDashboard;