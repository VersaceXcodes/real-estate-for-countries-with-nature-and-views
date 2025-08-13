import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Property, SearchCriteria } from '@/store/main';
import ENV_CONFIG from '@/config/env';

// Define interfaces for API responses
interface PropertySearchResponse {
  properties: Property[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface SavedSearchRequest {
  search_name: string;
  country?: string;
  property_type?: string;
  price_min?: number;
  price_max?: number;
  bedrooms_min?: number;
  bathrooms_min?: number;
  square_footage_min?: number;
  square_footage_max?: number;
  land_size_min?: number;
  land_size_max?: number;
  natural_features?: string;
  outdoor_amenities?: string;
  location_text?: string;
  alert_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  is_active: boolean;
}

interface SavedPropertyRequest {
  property_id: string;
  notes?: string;
}

interface SearchHistoryRequest {
  user_id?: string;
  session_id?: string;
  country?: string;
  property_type?: string;
  price_min?: number;
  price_max?: number;
  bedrooms_min?: number;
  bathrooms_min?: number;
  square_footage_min?: number;
  square_footage_max?: number;
  land_size_min?: number;
  land_size_max?: number;
  natural_features?: string;
  outdoor_amenities?: string;
  location_text?: string;
  sort_by?: string;
  results_count?: number;
}

const UV_SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand store selectors (individual selectors to prevent infinite loops)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const savedPropertyIds = useAppStore(state => state.saved_properties_state.saved_property_ids);
  const addSavedProperty = useAppStore(state => state.add_saved_property);
  const removeSavedProperty = useAppStore(state => state.remove_saved_property);
  const updateSearchCriteria = useAppStore(state => state.update_search_criteria);

  // Local state
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);

  // Parse URL parameters into search criteria
  const parseSearchParams = useCallback((): SearchCriteria => {
    const criteria: SearchCriteria = {};
    
    // Basic search
    if (searchParams.get('query')) criteria.query = searchParams.get('query')!;
    
    // Location filters
    if (searchParams.get('country')) criteria.country = searchParams.get('country')!;
    if (searchParams.get('region')) criteria.region = searchParams.get('region')!;
    if (searchParams.get('city')) criteria.city = searchParams.get('city')!;
    if (searchParams.get('location_text')) criteria.location_text = searchParams.get('location_text')!;
    
    // Property filters
    if (searchParams.get('property_type')) {
      criteria.property_type = searchParams.get('property_type')! as any;
    }
    if (searchParams.get('status')) {
      criteria.status = searchParams.get('status')! as any;
    }
    
    // Price filters
    if (searchParams.get('price_min')) criteria.price_min = parseInt(searchParams.get('price_min')!);
    if (searchParams.get('price_max')) criteria.price_max = parseInt(searchParams.get('price_max')!);
    
    // Size filters
    if (searchParams.get('bedrooms_min')) criteria.bedrooms_min = parseInt(searchParams.get('bedrooms_min')!);
    if (searchParams.get('bathrooms_min')) criteria.bathrooms_min = parseInt(searchParams.get('bathrooms_min')!);
    if (searchParams.get('square_footage_min')) criteria.square_footage_min = parseInt(searchParams.get('square_footage_min')!);
    if (searchParams.get('square_footage_max')) criteria.square_footage_max = parseInt(searchParams.get('square_footage_max')!);
    if (searchParams.get('land_size_min')) criteria.land_size_min = parseFloat(searchParams.get('land_size_min')!);
    if (searchParams.get('land_size_max')) criteria.land_size_max = parseFloat(searchParams.get('land_size_max')!);
    if (searchParams.get('year_built_min')) criteria.year_built_min = parseInt(searchParams.get('year_built_min')!);
    if (searchParams.get('year_built_max')) criteria.year_built_max = parseInt(searchParams.get('year_built_max')!);
    
    // Feature filters
    if (searchParams.get('natural_features')) criteria.natural_features = searchParams.get('natural_features')!;
    if (searchParams.get('outdoor_amenities')) criteria.outdoor_amenities = searchParams.get('outdoor_amenities')!;
    if (searchParams.get('is_featured')) criteria.is_featured = searchParams.get('is_featured') === 'true';
    
    // Sorting and pagination
    if (searchParams.get('sort_by')) criteria.sort_by = searchParams.get('sort_by')! as any;
    if (searchParams.get('sort_order')) criteria.sort_order = searchParams.get('sort_order')! as any;
    if (searchParams.get('limit')) criteria.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('offset')) criteria.offset = parseInt(searchParams.get('offset')!);
    
    // View preferences
    if (searchParams.get('view_type')) {
      setViewMode(searchParams.get('view_type')! as any);
    }
    
    return criteria;
  }, [searchParams]);

  const activeCriteria = parseSearchParams();

  // API call functions
  const fetchProperties = async (criteria: SearchCriteria): Promise<PropertySearchResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const { data } = await axios.get(
      `${ENV_CONFIG.API_BASE_URL}/properties?${params.toString()}`
    );
    return data;
  };

  const saveSearch = async (request: SavedSearchRequest) => {
    const { data } = await axios.post(
      `${ENV_CONFIG.API_BASE_URL}/saved-searches`,
      request,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    return data;
  };

  const saveProperty = async (request: SavedPropertyRequest) => {
    const { data } = await axios.post(
      `${ENV_CONFIG.API_BASE_URL}/saved-properties`,
      request,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    return data;
  };

  const recordSearch = async (request: SearchHistoryRequest) => {
    try {
      const { data } = await axios.post(
        `${ENV_CONFIG.API_BASE_URL}/search-history`,
        request
      );
      return data;
    } catch (error) {
      // Silently fail search history recording to not disrupt user experience
      console.warn('Failed to record search history:', error);
      return null;
    }
  };

  // React Query hooks
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['properties', activeCriteria],
    queryFn: () => fetchProperties(activeCriteria),
    enabled: true,
  });

  const saveSearchMutation = useMutation({
    mutationFn: saveSearch,
    onSuccess: () => {
      setShowSaveSearchModal(false);
      setSaveSearchName('');
    },
  });

  const savePropertyMutation = useMutation({
    mutationFn: saveProperty,
    onSuccess: (_, variables) => {
      addSavedProperty(variables.property_id);
      queryClient.invalidateQueries({ queryKey: ['saved-properties'] });
    },
  });

  const recordSearchMutation = useMutation({
    mutationFn: recordSearch,
    onError: (error) => {
      // Silently handle search history recording errors
      console.warn('Failed to record search history:', error);
    }
  });

  // Update search criteria in global store (memoized to prevent infinite loops)
  useEffect(() => {
    updateSearchCriteria(activeCriteria);
  }, [JSON.stringify(activeCriteria), updateSearchCriteria]);

  // Record search history when results change (separate effect to avoid infinite loops)
  useEffect(() => {
    if (searchResults && !recordSearchMutation.isPending) {
      // Use a stable session ID to avoid recording duplicate searches
      const sessionId = sessionStorage.getItem('search_session_id') || (() => {
        const id = 'session_' + Date.now();
        sessionStorage.setItem('search_session_id', id);
        return id;
      })();
      
      // Only record if we have meaningful search criteria
      const hasSearchCriteria = Object.keys(activeCriteria).some(key => 
        key !== 'sort_by' && key !== 'sort_order' && key !== 'limit' && key !== 'offset' && activeCriteria[key]
      );
      
      if (hasSearchCriteria) {
        recordSearchMutation.mutate({
          user_id: currentUser?.user_id,
          session_id: sessionId,
          ...activeCriteria,
          results_count: searchResults.total_count,
        });
      }
    }
  }, [searchResults?.total_count, currentUser?.user_id, JSON.stringify(activeCriteria)]);

  // Helper functions
  const updateFilters = (newFilters: Partial<SearchCriteria>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        newParams.set(key, value.toString());
      } else {
        newParams.delete(key);
      }
    });
    
    // Reset pagination when filters change
    newParams.delete('offset');
    newParams.set('page', '1');
    
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  const changePage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    newParams.set('offset', ((page - 1) * (activeCriteria.limit || 20)).toString());
    setSearchParams(newParams);
  };

  const changeViewMode = (mode: 'grid' | 'list' | 'map') => {
    setViewMode(mode);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view_type', mode);
    setSearchParams(newParams);
  };

  const handleSaveSearch = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowSaveSearchModal(true);
  };

  const confirmSaveSearch = () => {
    if (!saveSearchName.trim()) return;
    
    saveSearchMutation.mutate({
      search_name: saveSearchName,
      ...activeCriteria,
      alert_frequency: 'weekly',
      is_active: true,
    });
  };

  const toggleFavorite = (property: Property) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const isSaved = savedPropertyIds.includes(property.property_id);
    
    if (isSaved) {
      removeSavedProperty(property.property_id);
    } else {
      savePropertyMutation.mutate({
        property_id: property.property_id,
      });
    }
  };

  // Get active filter count
  const activeFilterCount = Object.keys(activeCriteria).filter(
    key => key !== 'sort_by' && key !== 'sort_order' && key !== 'limit' && key !== 'offset'
  ).length;

  const currentPage = searchResults?.page || Math.floor((activeCriteria.offset || 0) / (activeCriteria.limit || 20)) + 1;
  const totalPages = searchResults?.total_pages || Math.ceil((searchResults?.total_count || 0) / (activeCriteria.limit || 20));
  const totalResults = searchResults?.total_count || 0;
  const properties = searchResults?.properties || [];

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Search Results Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isLoading ? 'Searching...' : `${totalResults.toLocaleString()} Properties Found`}
                </h1>
                
                {/* Active Filters */}
                {activeFilterCount > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500">Active filters:</span>
                    {activeCriteria.country && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {activeCriteria.country}
                        <button
                          onClick={() => updateFilters({ country: undefined })}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {activeCriteria.property_type && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {activeCriteria.property_type}
                        <button
                          onClick={() => updateFilters({ property_type: undefined })}
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {(activeCriteria.price_min || activeCriteria.price_max) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        ${activeCriteria.price_min?.toLocaleString() || '0'} - ${activeCriteria.price_max?.toLocaleString() || '∞'}
                        <button
                          onClick={() => updateFilters({ price_min: undefined, price_max: undefined })}
                          className="ml-1 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveSearch}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save Search
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Filter Sidebar */}
            <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
                
                {/* Location Filters */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Location</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Country"
                      value={activeCriteria.country || ''}
                      onChange={(e) => updateFilters({ country: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="text"
                      placeholder="City/Area"
                      value={activeCriteria.city || ''}
                      onChange={(e) => updateFilters({ city: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                {/* Property Type */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Property Type</h4>
                  <select
                    value={activeCriteria.property_type || ''}
                    onChange={(e) => updateFilters({ property_type: (e.target.value as 'villa' | 'cabin' | 'condominium' | 'farm' | 'land' | 'mansion' | 'house' | 'apartment' | 'commercial') || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="villa">Villa</option>
                    <option value="cabin">Cabin</option>
                    <option value="condominium">Condominium</option>
                    <option value="farm">Farm</option>
                    <option value="land">Land</option>
                    <option value="mansion">Mansion</option>
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Price Range</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min Price"
                      value={activeCriteria.price_min || ''}
                      onChange={(e) => updateFilters({ price_min: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max Price"
                      value={activeCriteria.price_max || ''}
                      onChange={(e) => updateFilters({ price_max: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                {/* Bedrooms/Bathrooms */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Rooms</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={activeCriteria.bedrooms_min || ''}
                      onChange={(e) => updateFilters({ bedrooms_min: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Any Beds</option>
                      <option value="1">1+ Beds</option>
                      <option value="2">2+ Beds</option>
                      <option value="3">3+ Beds</option>
                      <option value="4">4+ Beds</option>
                    </select>
                    <select
                      value={activeCriteria.bathrooms_min || ''}
                      onChange={(e) => updateFilters({ bathrooms_min: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Any Baths</option>
                      <option value="1">1+ Baths</option>
                      <option value="2">2+ Baths</option>
                      <option value="3">3+ Baths</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Area */}
            <div className="lg:col-span-3">
              {/* View Controls */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">View:</span>
                  <div className="flex border border-gray-300 rounded-md">
                    <button
                      onClick={() => changeViewMode('grid')}
                      className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => changeViewMode('list')}
                      className={`px-3 py-1 text-sm border-l border-gray-300 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      List
                    </button>
                    <button
                      onClick={() => changeViewMode('map')}
                      className={`px-3 py-1 text-sm border-l border-gray-300 ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Map
                    </button>
                  </div>
                </div>

                <select
                  value={`${activeCriteria.sort_by || 'created_at'}_${activeCriteria.sort_order || 'desc'}`}
                  onChange={(e) => {
                    const [sort_by, sort_order] = e.target.value.split('_');
                    updateFilters({ sort_by: sort_by as any, sort_order: sort_order as any });
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="created_at_desc">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="view_count_desc">Most Popular</option>
                </select>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Searching properties...</span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-red-800 font-medium">Error loading properties</p>
                      <p className="text-red-600 text-sm mt-1">
                        {(error as any)?.response?.data?.message || error?.message || 'Please try again or adjust your search criteria.'}
                      </p>
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Refresh page
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* No Results */}
              {!isLoading && !error && properties.length === 0 && (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
                    <p className="text-gray-600 mb-4">Try adjusting your search criteria or browse our featured properties.</p>
                    <div className="space-y-2">
                      <button
                        onClick={clearAllFilters}
                        className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Clear All Filters
                      </button>
                      <Link
                        to="/"
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Browse Featured Properties
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Property Results */}
              {!isLoading && !error && properties.length > 0 && (
                <>
                  {/* Grid View */}
                  {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {properties.map((property) => (
                        <div key={property.property_id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative">
                            <img
                              src={`https://picsum.photos/400/250?random=${property.property_id}`}
                              alt={property.title}
                              className="w-full h-48 object-cover"
                            />
                            <button
                              onClick={() => toggleFavorite(property)}
                              className={`absolute top-3 right-3 p-2 rounded-full ${
                                savedPropertyIds.includes(property.property_id)
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white text-gray-600 hover:text-red-500'
                              }`}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="p-4">
                            <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">{property.title}</h3>
                            <p className="text-gray-600 text-sm mb-2">{property.city}, {property.country}</p>
                            
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl font-bold text-blue-600">
                                ${property.price.toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-500">{property.currency}</span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600 mb-3 space-x-4">
                              {property.bedrooms && (
                                <span>{property.bedrooms} beds</span>
                              )}
                              {property.bathrooms && (
                                <span>{property.bathrooms} baths</span>
                              )}
                              {property.square_footage && (
                                <span>{property.square_footage} sqft</span>
                              )}
                            </div>
                            
                             {property.natural_features && (
                               <div className="flex flex-wrap gap-1 mb-3">
                                 {(() => {
                                   try {
                                     return JSON.parse(property.natural_features || '[]').slice(0, 2).map((feature: string, index: number) => (
                                       <span key={index} className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                         {feature}
                                       </span>
                                     ));
                                   } catch {
                                     return property.natural_features.split(',').slice(0, 2).map((feature: string, index: number) => (
                                       <span key={index} className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                         {feature.trim()}
                                       </span>
                                     ));
                                   }
                                 })()}
                               </div>
                             )}                            
                            <Link
                              to={`/property/${property.property_id}`}
                              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* List View */}
                  {viewMode === 'list' && (
                    <div className="space-y-4">
                      {properties.map((property) => (
                        <div key={property.property_id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                          <div className="flex gap-6">
                            <img
                              src={`https://picsum.photos/200/150?random=${property.property_id}`}
                              alt={property.title}
                              className="w-48 h-36 object-cover rounded-lg flex-shrink-0"
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{property.title}</h3>
                                  <p className="text-gray-600 mb-2">{property.city}, {property.country}</p>
                                  
                                  <div className="flex items-center text-gray-600 mb-3 space-x-6">
                                    {property.bedrooms && <span>{property.bedrooms} beds</span>}
                                    {property.bathrooms && <span>{property.bathrooms} baths</span>}
                                    {property.square_footage && <span>{property.square_footage} sqft</span>}
                                  </div>
                                  
                                  <p className="text-gray-700 text-sm line-clamp-2">{property.description}</p>
                                </div>
                                
                                <div className="text-right flex-shrink-0">
                                  <div className="text-2xl font-bold text-blue-600 mb-2">
                                    ${property.price.toLocaleString()}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleFavorite(property)}
                                      className={`p-2 rounded-full ${
                                        savedPropertyIds.includes(property.property_id)
                                          ? 'bg-red-500 text-white'
                                          : 'bg-gray-100 text-gray-600 hover:text-red-500'
                                      }`}
                                    >
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                    <Link
                                      to={`/property/${property.property_id}`}
                                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                      View Details
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Map View Placeholder */}
                  {viewMode === 'map' && (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                      <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center mb-4">
                        <div className="text-gray-500">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-lg font-medium">Interactive Map View</p>
                          <p className="text-sm">Map integration coming soon</p>
                        </div>
                      </div>
                      <button
                        onClick={() => changeViewMode('grid')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Switch to Grid View
                      </button>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-8">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          onClick={() => changePage(currentPage - 1)}
                          disabled={currentPage <= 1}
                          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => changePage(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing page <span className="font-medium">{currentPage}</span> of{' '}
                            <span className="font-medium">{totalPages}</span>
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                              onClick={() => changePage(currentPage - 1)}
                              disabled={currentPage <= 1}
                              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                              </svg>
                            </button>
                            
                            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                              const page = i + 1;
                              return (
                                <button
                                  key={page}
                                  onClick={() => changePage(page)}
                                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                    page === currentPage
                                      ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            })}
                            
                            <button
                              onClick={() => changePage(currentPage + 1)}
                              disabled={currentPage >= totalPages}
                              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Save Search Modal */}
        {showSaveSearchModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Save This Search</h3>
              <input
                type="text"
                placeholder="Enter search name"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowSaveSearchModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveSearch}
                  disabled={!saveSearchName.trim() || saveSearchMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_SearchResults;