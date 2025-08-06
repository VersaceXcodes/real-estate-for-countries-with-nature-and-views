import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on Zod schemas and OpenAPI spec
interface SavedPropertyWithDetails {
  saved_property_id: string;
  user_id: string;
  property_id: string;
  notes: string | null;
  created_at: string;
  property: {
    property_id: string;
    title: string;
    price: number;
    currency: string;
    country: string;
    region: string | null;
    city: string | null;
    property_type: string;
    status: string;
    bedrooms: number | null;
    bathrooms: number | null;
    square_footage: number | null;
    natural_features: string | null;
    outdoor_amenities: string | null;
    primary_photo?: {
      photo_url: string;
    };
  };
}

interface SavedPropertiesResponse {
  saved_properties: SavedPropertyWithDetails[];
  total_count: number;
}

interface ComparedProperty {
  property_id: string;
  title: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  natural_features: string | null;
  outdoor_amenities: string | null;
  country: string;
  region: string | null;
}

const UV_SavedProperties: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Auth state from Zustand store
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [selectedSavedIds, setSelectedSavedIds] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparedProperties, setComparedProperties] = useState<ComparedProperty[]>([]);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  // URL params state
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';
  const filterCountry = searchParams.get('filter_country') || null;
  const filterPropertyType = searchParams.get('filter_property_type') || null;
  const viewType = searchParams.get('view_type') || 'grid';

  // Update URL params
  const updateURLParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  // Fetch saved properties
  const fetchSavedProperties = async (): Promise<SavedPropertiesResponse> => {
    const params = new URLSearchParams();
    if (sortBy && sortBy !== 'created_at') params.set('sort_by', sortBy);
    if (sortOrder && sortOrder !== 'desc') params.set('sort_order', sortOrder);
    if (filterCountry) params.set('filter_country', filterCountry);
    if (filterPropertyType) params.set('filter_property_type', filterPropertyType);
    if (viewType && viewType !== 'grid') params.set('view_type', viewType);

    const { data } = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/saved-properties?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    return data;
  };

  const { data: savedPropertiesData, isLoading, error } = useQuery({
    queryKey: ['saved-properties', sortBy, sortOrder, filterCountry, filterPropertyType, viewType],
    queryFn: fetchSavedProperties,
    enabled: !!authToken
  });

  // Remove saved property mutation
  const removeSavedPropertyMutation = useMutation({
    mutationFn: async (savedPropertyId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/saved-properties/${savedPropertyId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-properties'] });
    }
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async ({ savedPropertyId, notes }: { savedPropertyId: string; notes: string }) => {
      const { data } = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/saved-properties/${savedPropertyId}`,
        { notes },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-properties'] });
      setEditingNotes(null);
      setNotesText('');
    }
  });

  // Handle bulk remove
  const handleBulkRemove = async () => {
    for (const savedId of selectedSavedIds) {
      await removeSavedPropertyMutation.mutateAsync(savedId);
    }
    setSelectedSavedIds([]);
  };

  // Handle clear all
  const handleClearAll = async () => {
    if (savedPropertiesData?.saved_properties) {
      for (const saved of savedPropertiesData.saved_properties) {
        await removeSavedPropertyMutation.mutateAsync(saved.saved_property_id);
      }
    }
    setShowConfirmClearAll(false);
    setSelectedSavedIds([]);
  };

  // Handle add to comparison
  const handleAddToComparison = (property: SavedPropertyWithDetails['property']) => {
    if (comparedProperties.length >= 3) return;
    
    const comparedProperty: ComparedProperty = {
      property_id: property.property_id,
      title: property.title,
      price: property.price,
      currency: property.currency,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      square_footage: property.square_footage,
      natural_features: property.natural_features,
      outdoor_amenities: property.outdoor_amenities,
      country: property.country,
      region: property.region
    };
    
    setComparedProperties([...comparedProperties, comparedProperty]);
  };

  // Handle remove from comparison
  const handleRemoveFromComparison = (propertyId: string) => {
    setComparedProperties(comparedProperties.filter(p => p.property_id !== propertyId));
  };

  // Handle save notes
  const handleSaveNotes = (savedPropertyId: string) => {
    updateNotesMutation.mutate({ savedPropertyId, notes: notesText });
  };

  // Format price
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Parse natural features
  const parseNaturalFeatures = (features: string | null): string[] => {
    if (!features) return [];
    try {
      return JSON.parse(features);
    } catch {
      return features.split(',').map(f => f.trim());
    }
  };

  const savedProperties = savedPropertiesData?.saved_properties || [];
  const totalCount = savedPropertiesData?.total_count || 0;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  My Saved Properties
                  {totalCount > 0 && (
                    <span className="ml-2 text-lg font-normal text-gray-500">
                      ({totalCount} {totalCount === 1 ? 'property' : 'properties'})
                    </span>
                  )}
                </h1>
                {savedProperties.length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Last updated: {formatDate(savedProperties[0]?.created_at)}
                  </p>
                )}
              </div>
              
              {savedProperties.length > 0 && (
                <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Export List
                  </button>
                  <button
                    onClick={() => setShowConfirmClearAll(true)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        {savedProperties.length > 0 && (
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Sort and Filter Controls */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Sort by */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Sort by:</label>
                    <select
                      value={`${sortBy}_${sortOrder}`}
                      onChange={(e) => {
                        const [newSortBy, newSortOrder] = e.target.value.split('_');
                        updateURLParams({ sort_by: newSortBy, sort_order: newSortOrder });
                      }}
                      className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="created_at_desc">Date saved (newest first)</option>
                      <option value="created_at_asc">Date saved (oldest first)</option>
                      <option value="price_asc">Price (low to high)</option>
                      <option value="price_desc">Price (high to low)</option>
                      <option value="title_asc">Location (A-Z)</option>
                      <option value="square_footage_desc">Size (largest first)</option>
                      <option value="square_footage_asc">Size (smallest first)</option>
                    </select>
                  </div>

                  {/* Filter by Country */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Country:</label>
                    <select
                      value={filterCountry || ''}
                      onChange={(e) => updateURLParams({ filter_country: e.target.value || null })}
                      className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Countries</option>
                      {Array.from(new Set(savedProperties.map(sp => sp.property.country))).map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Property Type */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Type:</label>
                    <select
                      value={filterPropertyType || ''}
                      onChange={(e) => updateURLParams({ filter_property_type: e.target.value || null })}
                      className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Types</option>
                      {Array.from(new Set(savedProperties.map(sp => sp.property.property_type))).map(type => (
                        <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* View Toggle and Bulk Actions */}
                <div className="flex items-center gap-4">
                  {/* Bulk Actions */}
                  {selectedSavedIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {selectedSavedIds.length} selected
                      </span>
                      <button
                        onClick={handleBulkRemove}
                        disabled={removeSavedPropertyMutation.isPending}
                        className="text-sm text-red-600 hover:text-red-500 font-medium"
                      >
                        Remove Selected
                      </button>
                      {selectedSavedIds.length <= 3 && (
                        <button
                          onClick={() => {
                            const selectedProperties = savedProperties
                              .filter(sp => selectedSavedIds.includes(sp.saved_property_id))
                              .map(sp => sp.property);
                            setComparedProperties(selectedProperties.map(p => ({
                              property_id: p.property_id,
                              title: p.title,
                              price: p.price,
                              currency: p.currency,
                              bedrooms: p.bedrooms,
                              bathrooms: p.bathrooms,
                              square_footage: p.square_footage,
                              natural_features: p.natural_features,
                              outdoor_amenities: p.outdoor_amenities,
                              country: p.country,
                              region: p.region
                            })));
                            setComparisonMode(true);
                            setSelectedSavedIds([]);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                        >
                          Compare Selected
                        </button>
                      )}
                    </div>
                  )}

                  {/* View Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => updateURLParams({ view_type: 'grid' })}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        viewType === 'grid'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => updateURLParams({ view_type: 'list' })}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        viewType === 'list'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      List
                    </button>
                    <button
                      onClick={() => {
                        setComparisonMode(true);
                        updateURLParams({ view_type: 'comparison' });
                      }}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        comparisonMode
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Compare
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading your saved properties...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading saved properties</h3>
              <p className="text-gray-600">Please try refreshing the page.</p>
            </div>
          ) : savedProperties.length === 0 ? (
            // Empty State
            <div className="text-center py-12">
              <div className="text-gray-400 mb-6">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No saved properties yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start exploring our collection of beautiful properties with scenic views and save your favorites here.
              </p>
              <div className="space-y-4">
                <Link
                  to="/search"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Start Exploring Properties
                </Link>
                <div className="text-sm text-gray-500">
                  <p>💡 Tip: Click the heart icon on any property to save it to this list</p>
                </div>
              </div>
            </div>
          ) : comparisonMode && comparedProperties.length > 0 ? (
            // Comparison View
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Property Comparison ({comparedProperties.length}/3)
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Print Comparison
                  </button>
                  <button
                    onClick={() => {
                      setComparisonMode(false);
                      setComparedProperties([]);
                      updateURLParams({ view_type: 'grid' });
                    }}
                    className="text-sm text-gray-600 hover:text-gray-500 font-medium"
                  >
                    Exit Comparison
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Property
                        </th>
                        {comparedProperties.map((property) => (
                          <th key={property.property_id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center justify-between">
                              <span className="truncate max-w-32">{property.title}</span>
                              <button
                                onClick={() => handleRemoveFromComparison(property.property_id)}
                                className="ml-2 text-gray-400 hover:text-red-500"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Price</td>
                        {comparedProperties.map((property) => (
                          <td key={property.property_id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(property.price, property.currency)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Location</td>
                        {comparedProperties.map((property) => (
                          <td key={property.property_id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {property.region ? `${property.region}, ${property.country}` : property.country}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Bedrooms</td>
                        {comparedProperties.map((property) => (
                          <td key={property.property_id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {property.bedrooms || 'N/A'}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Bathrooms</td>
                        {comparedProperties.map((property) => (
                          <td key={property.property_id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {property.bathrooms || 'N/A'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Square Footage</td>
                        {comparedProperties.map((property) => (
                          <td key={property.property_id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {property.square_footage ? `${property.square_footage.toLocaleString()} sq ft` : 'N/A'}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Natural Features</td>
                        {comparedProperties.map((property) => (
                          <td key={property.property_id} className="px-6 py-4 text-sm text-gray-900">
                            {property.natural_features ? (
                              <div className="space-y-1">
                                {parseNaturalFeatures(property.natural_features).slice(0, 3).map((feature, idx) => (
                                  <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-1">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            ) : 'N/A'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Actions</td>
                        {comparedProperties.map((property) => (
                          <td key={property.property_id} className="px-6 py-4 text-sm">
                            <Link
                              to={`/property/${property.property_id}`}
                              className="text-blue-600 hover:text-blue-500 font-medium"
                            >
                              View Details
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            // Property Cards
            <div>
              {viewType === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedProperties.map((savedProperty) => (
                    <div key={savedProperty.saved_property_id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                      {/* Selection Checkbox */}
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedSavedIds.includes(savedProperty.saved_property_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSavedIds([...selectedSavedIds, savedProperty.saved_property_id]);
                            } else {
                              setSelectedSavedIds(selectedSavedIds.filter(id => id !== savedProperty.saved_property_id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      {/* Property Image */}
                      <div className="relative h-48">
                        <img
                          src={savedProperty.property.primary_photo?.photo_url || `https://picsum.photos/400/300?random=${savedProperty.property.property_id}`}
                          alt={savedProperty.property.title}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                        <div className="absolute top-4 right-4 bg-white rounded-full px-2 py-1 text-xs font-medium text-gray-700">
                          {savedProperty.property.property_type.charAt(0).toUpperCase() + savedProperty.property.property_type.slice(1)}
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {savedProperty.property.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {savedProperty.property.region ? 
                            `${savedProperty.property.region}, ${savedProperty.property.country}` : 
                            savedProperty.property.country}
                        </p>
                        <p className="text-xl font-bold text-gray-900 mb-3">
                          {formatPrice(savedProperty.property.price, savedProperty.property.currency)}
                        </p>

                        {/* Property Specs */}
                        <div className="flex items-center text-sm text-gray-600 mb-3 space-x-4">
                          {savedProperty.property.bedrooms && (
                            <span>{savedProperty.property.bedrooms} bed</span>
                          )}
                          {savedProperty.property.bathrooms && (
                            <span>{savedProperty.property.bathrooms} bath</span>
                          )}
                          {savedProperty.property.square_footage && (
                            <span>{savedProperty.property.square_footage.toLocaleString()} sq ft</span>
                          )}
                        </div>

                        {/* Natural Features */}
                        {savedProperty.property.natural_features && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {parseNaturalFeatures(savedProperty.property.natural_features).slice(0, 3).map((feature, idx) => (
                                <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Date Saved */}
                        <p className="text-xs text-gray-500 mb-4">
                          Saved on {formatDate(savedProperty.created_at)}
                        </p>

                        {/* Notes */}
                        {editingNotes === savedProperty.saved_property_id ? (
                          <div className="mb-4">
                            <textarea
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              placeholder="Add your notes..."
                              className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              rows={2}
                            />
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => handleSaveNotes(savedProperty.saved_property_id)}
                                disabled={updateNotesMutation.isPending}
                                className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNotes(null);
                                  setNotesText('');
                                }}
                                className="text-xs text-gray-600 hover:text-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : savedProperty.notes ? (
                          <div className="mb-4">
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              {savedProperty.notes}
                            </p>
                            <button
                              onClick={() => {
                                setEditingNotes(savedProperty.saved_property_id);
                                setNotesText(savedProperty.notes || '');
                              }}
                              className="mt-1 text-xs text-blue-600 hover:text-blue-500"
                            >
                              Edit notes
                            </button>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <button
                              onClick={() => {
                                setEditingNotes(savedProperty.saved_property_id);
                                setNotesText('');
                              }}
                              className="text-xs text-gray-600 hover:text-blue-600"
                            >
                              + Add notes
                            </button>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/property/${savedProperty.property.property_id}`}
                            className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => handleAddToComparison(savedProperty.property)}
                            disabled={comparedProperties.length >= 3 || comparedProperties.some(p => p.property_id === savedProperty.property.property_id)}
                            className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Compare
                          </button>
                          <button
                            onClick={() => removeSavedPropertyMutation.mutate(savedProperty.saved_property_id)}
                            disabled={removeSavedPropertyMutation.isPending}
                            className="px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // List View
                <div className="space-y-4">
                  {savedProperties.map((savedProperty) => (
                    <div key={savedProperty.saved_property_id} className="bg-white rounded-lg shadow p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Selection and Image */}
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedSavedIds.includes(savedProperty.saved_property_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSavedIds([...selectedSavedIds, savedProperty.saved_property_id]);
                                } else {
                                  setSelectedSavedIds(selectedSavedIds.filter(id => id !== savedProperty.saved_property_id));
                                }
                              }}
                              className="absolute top-2 left-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded z-10"
                            />
                            <img
                              src={savedProperty.property.primary_photo?.photo_url || `https://picsum.photos/300/200?random=${savedProperty.property.property_id}`}
                              alt={savedProperty.property.title}
                              className="w-full lg:w-48 h-32 object-cover rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Property Info */}
                        <div className="flex-1">
                          <div className="flex flex-col lg:flex-row lg:justify-between">
                            <div className="flex-1">
                              <h3 className="text-xl font-medium text-gray-900 mb-2">
                                {savedProperty.property.title}
                              </h3>
                              <p className="text-gray-600 mb-2">
                                {savedProperty.property.region ? 
                                  `${savedProperty.property.region}, ${savedProperty.property.country}` : 
                                  savedProperty.property.country}
                              </p>
                              <p className="text-2xl font-bold text-gray-900 mb-3">
                                {formatPrice(savedProperty.property.price, savedProperty.property.currency)}
                              </p>

                              {/* Property Specs */}
                              <div className="flex items-center text-gray-600 mb-3 space-x-6">
                                {savedProperty.property.bedrooms && (
                                  <span className="flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                    </svg>
                                    {savedProperty.property.bedrooms} bed
                                  </span>
                                )}
                                {savedProperty.property.bathrooms && (
                                  <span className="flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    {savedProperty.property.bathrooms} bath
                                  </span>
                                )}
                                {savedProperty.property.square_footage && (
                                  <span className="flex items-center">
                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4m-4 0l5.657 5.657m11.314 0L16 4m4 0v4m0-4h-4m-4 0v16m-4 0h8" />
                                    </svg>
                                    {savedProperty.property.square_footage.toLocaleString()} sq ft
                                  </span>
                                )}
                              </div>

                              {/* Natural Features */}
                              {savedProperty.property.natural_features && (
                                <div className="mb-3">
                                  <div className="flex flex-wrap gap-1">
                                    {parseNaturalFeatures(savedProperty.property.natural_features).slice(0, 5).map((feature, idx) => (
                                      <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                        {feature}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <p className="text-sm text-gray-500">
                                Saved on {formatDate(savedProperty.created_at)}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 lg:mt-0 lg:ml-6 flex-shrink-0">
                              <div className="flex flex-col gap-2 w-full lg:w-32">
                                <Link
                                  to={`/property/${savedProperty.property.property_id}`}
                                  className="bg-blue-600 text-white text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  View Details
                                </Link>
                                <button
                                  onClick={() => handleAddToComparison(savedProperty.property)}
                                  disabled={comparedProperties.length >= 3 || comparedProperties.some(p => p.property_id === savedProperty.property.property_id)}
                                  className="border border-gray-300 text-gray-700 text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Compare
                                </button>
                                <button
                                  onClick={() => removeSavedPropertyMutation.mutate(savedProperty.saved_property_id)}
                                  disabled={removeSavedPropertyMutation.isPending}
                                  className="border border-red-300 text-red-700 text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Smart Recommendations */}
          {savedProperties.length > 0 && !comparisonMode && (
            <div className="mt-12">
              <h2 className="text-xl font-medium text-gray-900 mb-6">You Might Also Like</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-blue-700 mb-4">
                  Based on your saved properties, we think you'd love exploring more properties in {Array.from(new Set(savedProperties.map(sp => sp.property.country))).slice(0, 2).join(' and ')}.
                </p>
                <Link
                  to={`/search?country=${encodeURIComponent(savedProperties[0]?.property.country || '')}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Find Similar Properties
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Clear All Modal */}
        {showConfirmClearAll && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Clear All Saved Properties</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to remove all {totalCount} saved properties? This action cannot be undone.
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <button
                    onClick={handleClearAll}
                    disabled={removeSavedPropertyMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                  >
                    {removeSavedPropertyMutation.isPending ? '...' : 'Clear All'}
                  </button>
                  <button
                    onClick={() => setShowConfirmClearAll(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-24 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_SavedProperties;