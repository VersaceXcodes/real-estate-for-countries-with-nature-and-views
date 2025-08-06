import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types from shared schemas
interface Property {
  property_id: string;
  user_id: string;
  title: string;
  description: string | null;
  property_type: 'villa' | 'cabin' | 'condominium' | 'farm' | 'land' | 'mansion' | 'house' | 'apartment' | 'commercial';
  status: 'active' | 'inactive' | 'sold' | 'pending' | 'withdrawn';
  price: number;
  currency: string;
  country: string;
  region: string | null;
  city: string | null;
  square_footage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  view_count: number;
  inquiry_count: number;
  favorite_count: number;
  created_at: string;
  updated_at: string;
}



interface PropertySearchResponse {
  properties: Property[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ListingFilters {
  status: string | null;
  property_type: string | null;
  date_range: { start: string; end: string } | null;
}

interface SortPreferences {
  sort_by: string;
  sort_order: string;
}

const UV_MyListings: React.FC = () => {
  // Individual Zustand selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [listingFilters, setListingFilters] = useState<ListingFilters>({
    status: null,
    property_type: null,
    date_range: null
  });
  
  const [sortPreferences, setSortPreferences] = useState<SortPreferences>({
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');


  const queryClient = useQueryClient();

  // Fetch user's properties
  const fetchUserProperties = async (): Promise<PropertySearchResponse> => {
    if (!currentUser?.user_id || !authToken) {
      throw new Error('User not authenticated');
    }

    const params = new URLSearchParams();
    
    // Always filter by current user
    if (currentUser.user_id) params.append('user_id', currentUser.user_id);
    
    // Apply filters
    if (listingFilters.status) params.append('status', listingFilters.status);
    if (listingFilters.property_type) params.append('property_type', listingFilters.property_type);
    
    // Apply sorting
    params.append('sort_by', sortPreferences.sort_by);
    params.append('sort_order', sortPreferences.sort_order);
    params.append('limit', '50');
    params.append('offset', '0');

    const { data } = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    return data;
  };

  const { data: propertiesData, isLoading: loadingProperties, error: propertiesError, refetch } = useQuery<PropertySearchResponse, Error>({
    queryKey: ['user-properties', currentUser?.user_id, listingFilters, sortPreferences],
    queryFn: fetchUserProperties,
    enabled: !!currentUser?.user_id && !!authToken
  });



  // Update property status mutation
  const updatePropertyStatusMutation = useMutation({
    mutationFn: async ({ propertyId, status }: { propertyId: string; status: string }) => {
      if (!authToken) throw new Error('User not authenticated');
      
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties/${propertyId}`,
        { status },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-properties'] });
    }
  });

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      if (!authToken) throw new Error('User not authenticated');
      
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties/${propertyId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-properties'] });
      setSelectedPropertyIds(prev => prev.filter(id => !prev.includes(id)));
    }
  });

  // Calculate summary statistics
  const calculateStats = () => {
    if (!propertiesData?.properties) return null;
    
    const properties = propertiesData.properties;
    const totalListings = properties.length;
    const activeListings = properties.filter(p => p.status === 'active').length;
    const pendingListings = properties.filter(p => p.status === 'pending').length;
    const soldListings = properties.filter(p => p.status === 'sold').length;
    const totalViews = properties.reduce((sum, p) => sum + p.view_count, 0);
    const totalInquiries = properties.reduce((sum, p) => sum + p.inquiry_count, 0);
    const totalFavorites = properties.reduce((sum, p) => sum + p.favorite_count, 0);

    return {
      totalListings,
      activeListings,
      pendingListings,
      soldListings,
      totalViews,
      totalInquiries,
      totalFavorites
    };
  };

  const stats = calculateStats();

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedPropertyIds.length === propertiesData?.properties?.length) {
      setSelectedPropertyIds([]);
    } else {
      setSelectedPropertyIds(propertiesData?.properties?.map(p => p.property_id) || []);
    }
  };

  const handleSelectProperty = (propertyId: string) => {
    setSelectedPropertyIds(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  // Format currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };



  // Days on market calculation
  const getDaysOnMarket = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'withdrawn': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage your property listings and track performance
                  </p>
                </div>
                <Link
                  to="/create-listing"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Add New Listing
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Listings</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalListings}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Listings</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.activeListings}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Views</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalViews.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Inquiries</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalInquiries}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Controls */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  {/* Status Filter */}
                  <select
                    value={listingFilters.status || ''}
                    onChange={(e) => setListingFilters(prev => ({ ...prev, status: e.target.value || null }))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="sold">Sold</option>
                    <option value="inactive">Inactive</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>

                  {/* Property Type Filter */}
                  <select
                    value={listingFilters.property_type || ''}
                    onChange={(e) => setListingFilters(prev => ({ ...prev, property_type: e.target.value || null }))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="villa">Villa</option>
                    <option value="cabin">Cabin</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="land">Land</option>
                    <option value="commercial">Commercial</option>
                  </select>

                  {/* Sort Options */}
                  <select
                    value={`${sortPreferences.sort_by}-${sortPreferences.sort_order}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-');
                      setSortPreferences({ sort_by: sortBy, sort_order: sortOrder });
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="created_at-desc">Newest First</option>
                    <option value="created_at-asc">Oldest First</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="view_count-desc">Most Viewed</option>
                    <option value="title-asc">Title A-Z</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  {/* View Mode Toggle */}
                  <div className="flex rounded-md shadow-sm">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                        viewMode === 'grid'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 text-sm font-medium rounded-r-md border-l-0 border ${
                        viewMode === 'list'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      List
                    </button>
                  </div>

                  {/* Bulk Actions */}
                  {selectedPropertyIds.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedPropertyIds.length} selected
                      </span>
                      <button className="text-sm text-red-600 hover:text-red-700">
                        Bulk Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bulk Selection Controls */}
              {propertiesData?.properties && propertiesData.properties.length > 0 && (
                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedPropertyIds.length === propertiesData.properties.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-600">
                    Select all listings
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loadingProperties && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading your listings...</span>
            </div>
          )}

          {/* Error State */}
          {propertiesError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <p className="text-sm">
                Error loading properties: {propertiesError.message}
              </p>
              <button 
                onClick={() => refetch()}
                className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Properties Grid/List */}
          {propertiesData?.properties && propertiesData.properties.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
            }>
              {propertiesData.properties.map((property) => (
                <div
                  key={property.property_id}
                  className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow ${
                    viewMode === 'list' ? 'p-6' : 'overflow-hidden'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    // Grid view
                    <>
                      <div className="relative">
                        <img
                          src={`https://picsum.photos/400/240?random=${property.property_id}`}
                          alt={property.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
                            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                          </span>
                        </div>
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={selectedPropertyIds.includes(property.property_id)}
                            onChange={() => handleSelectProperty(property.property_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              {property.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">
                              {property.city}, {property.country}
                            </p>
                            <p className="text-xl font-bold text-gray-900 mb-3">
                              {formatPrice(property.price, property.currency)}
                            </p>
                          </div>
                        </div>

                        {/* Property specs */}
                        <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
                          {property.bedrooms && (
                            <span>{property.bedrooms} bed</span>
                          )}
                          {property.bathrooms && (
                            <span>{property.bathrooms} bath</span>
                          )}
                          {property.square_footage && (
                            <span>{property.square_footage.toLocaleString()} sqft</span>
                          )}
                        </div>

                        {/* Performance metrics */}
                        <div className="grid grid-cols-3 gap-4 py-3 border-t border-gray-200 mb-4">
                          <div className="text-center">
                            <div className="text-lg font-medium text-gray-900">{property.view_count}</div>
                            <div className="text-xs text-gray-500">Views</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-medium text-gray-900">{property.inquiry_count}</div>
                            <div className="text-xs text-gray-500">Inquiries</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-medium text-gray-900">{getDaysOnMarket(property.created_at)}</div>
                            <div className="text-xs text-gray-500">Days</div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/property/${property.property_id}`}
                            className="flex-1 bg-blue-600 text-white text-center px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            View
                          </Link>
                          <Link
                            to={`/edit-listing/${property.property_id}`}
                            className="flex-1 bg-gray-600 text-white text-center px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                          >
                            Edit
                          </Link>
                          <select
                            value={property.status}
                            onChange={(e) => updatePropertyStatusMutation.mutate({
                              propertyId: property.property_id,
                              status: e.target.value
                            })}
                            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="sold">Sold</option>
                            <option value="inactive">Inactive</option>
                            <option value="withdrawn">Withdrawn</option>
                          </select>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this listing?')) {
                                deletePropertyMutation.mutate(property.property_id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700 px-2 py-1 text-sm"
                            disabled={deletePropertyMutation.isPending}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    // List view
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedPropertyIds.includes(property.property_id)}
                        onChange={() => handleSelectProperty(property.property_id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      
                      <img
                        src={`https://picsum.photos/120/80?random=${property.property_id}`}
                        alt={property.title}
                        className="w-20 h-16 object-cover rounded"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {property.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
                            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-500">
                          {property.city}, {property.country}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-6">
                            <span className="text-xl font-bold text-gray-900">
                              {formatPrice(property.price, property.currency)}
                            </span>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{property.view_count} views</span>
                              <span>{property.inquiry_count} inquiries</span>
                              <span>{getDaysOnMarket(property.created_at)} days</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/property/${property.property_id}`}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              View
                            </Link>
                            <Link
                              to={`/edit-listing/${property.property_id}`}
                              className="text-gray-600 hover:text-gray-700 text-sm"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this listing?')) {
                                  deletePropertyMutation.mutate(property.property_id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700 text-sm"
                              disabled={deletePropertyMutation.isPending}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : !loadingProperties && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first property listing.</p>
              <Link
                to="/create-listing"
                className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Create Your First Listing
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_MyListings;