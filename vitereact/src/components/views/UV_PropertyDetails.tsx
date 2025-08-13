import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types from Zod schemas
interface Property {
  property_id: string;
  user_id: string;
  title: string;
  description: string | null;
  property_type: string;
  status: string;
  price: number;
  currency: string;
  country: string;
  region: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  square_footage: number | null;
  land_size: number | null;
  land_size_unit: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  year_built: number | null;
  natural_features: string | null;
  outdoor_amenities: string | null;
  indoor_amenities: string | null;
  view_types: string | null;
  nearby_attractions: string | null;
  distance_to_landmarks: string | null;
  environmental_features: string | null;
  outdoor_activities: string | null;
  property_condition: string | null;
  special_features: string | null;
  view_count: number;
  inquiry_count: number;
  favorite_count: number;
  created_at: string;
}

interface PropertyWithOwner extends Property {
  owner: {
    user_id: string;
    name: string;
    user_type: string;
    profile_photo_url: string | null;
    is_verified: boolean;
  };
}

interface PropertyPhoto {
  photo_id: string;
  property_id: string;
  photo_url: string;
  caption: string | null;
  photo_order: number;
  is_primary: boolean;
  photo_type: string | null;
}

interface InquiryFormData {
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  message: string;
  is_interested_in_viewing: boolean;
  wants_similar_properties: boolean;
  priority: string;
}

const UV_PropertyDetails: React.FC = () => {
  const { property_id } = useParams<{ property_id: string }>();
  const queryClient = useQueryClient();

  // Global state access - using individual selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const savedPropertyIds = useAppStore(state => state.saved_properties_state.saved_property_ids);
  const addSavedProperty = useAppStore(state => state.add_saved_property);
  const removeSavedProperty = useAppStore(state => state.remove_saved_property);

  // Local state
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [inquiryForm, setInquiryForm] = useState<InquiryFormData>({
    sender_name: '',
    sender_email: '',
    sender_phone: '',
    message: '',
    is_interested_in_viewing: false,
    wants_similar_properties: false,
    priority: 'normal'
  });
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  // Check if property is saved
  const isSaved = property_id ? savedPropertyIds.includes(property_id) : false;

  // API Functions
  const fetchPropertyDetails = async (propertyId: string): Promise<PropertyWithOwner> => {
    const { data } = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties/${propertyId}`
    );
    return data;
  };

  const fetchPropertyPhotos = async (propertyId: string): Promise<PropertyPhoto[]> => {
    const { data } = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties/${propertyId}/photos`
    );
    return data.sort((a: PropertyPhoto, b: PropertyPhoto) => a.photo_order - b.photo_order);
  };

  const trackPropertyView = useCallback(async (propertyId: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties/${propertyId}/view`,
        {
          user_id: currentUser?.user_id || null,
          session_id: sessionStorage.getItem('session_id') || `session_${Date.now()}`,
          referrer_url: document.referrer || null,
          ip_address: null,
          user_agent: navigator.userAgent,
          view_duration_seconds: null
        }
      );
    } catch (error) {
      // Silently fail view tracking to not disrupt user experience
      console.warn('Failed to track property view:', error);
    }
  }, [currentUser?.user_id]);

  const submitInquiry = async (data: any) => {
    const { data: response } = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties/${property_id}/inquiries`,
      data
    );
    return response;
  };

  const toggleSaveProperty = async (propertyId: string) => {
    if (!isAuthenticated || !authToken) {
      alert('Please log in to save properties');
      return;
    }

    if (isSaved) {
      // Find and remove - would need saved property ID, for now just remove from local state
      removeSavedProperty(propertyId);
    } else {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/saved-properties`,
        {
          property_id: propertyId,
          notes: null
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      addSavedProperty(propertyId);
    }
  };

  // React Query hooks
  const { data: propertyData, isLoading: propertyLoading, error: propertyError } = useQuery({
    queryKey: ['property', property_id],
    queryFn: () => fetchPropertyDetails(property_id!),
    enabled: !!property_id
  });

  const { data: propertyPhotos = [] } = useQuery({
    queryKey: ['property-photos', property_id],
    queryFn: () => fetchPropertyPhotos(property_id!),
    enabled: !!property_id
  });

  const inquiryMutation = useMutation({
    mutationFn: submitInquiry,
    onSuccess: () => {
      setInquirySubmitted(true);
      setInquiryForm({
        sender_name: '',
        sender_email: '',
        sender_phone: '',
        message: '',
        is_interested_in_viewing: false,
        wants_similar_properties: false,
        priority: 'normal'
      });
    }
  });

  const savePropertyMutation = useMutation({
    mutationFn: () => toggleSaveProperty(property_id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-properties'] });
    }
  });

  // Effects
  useEffect(() => {
    if (propertyData && currentUser) {
      setInquiryForm(prev => ({
        ...prev,
        sender_name: currentUser.name,
        sender_email: currentUser.email,
        sender_phone: currentUser.phone || ''
      }));
    }
  }, [propertyData, currentUser]);

  useEffect(() => {
    if (propertyPhotos.length > 0) {
      const primaryIndex = propertyPhotos.findIndex(photo => photo.is_primary);
      setCurrentPhotoIndex(primaryIndex >= 0 ? primaryIndex : 0);
    }
  }, [propertyPhotos]);

  // Track view after 3 seconds (only once per property)
  useEffect(() => {
    if (property_id) {
      const viewedKey = `viewed_${property_id}`;
      const hasViewed = sessionStorage.getItem(viewedKey);
      
      if (!hasViewed) {
        const timer = setTimeout(() => {
          trackPropertyView(property_id);
          sessionStorage.setItem(viewedKey, 'true');
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [property_id, trackPropertyView]);

  // Handle form submission
  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyData) return;

    inquiryMutation.mutate({
      recipient_user_id: propertyData.user_id,
      sender_user_id: currentUser?.user_id || null,
      sender_name: inquiryForm.sender_name,
      sender_email: inquiryForm.sender_email,
      sender_phone: inquiryForm.sender_phone || null,
      message: inquiryForm.message,
      is_interested_in_viewing: inquiryForm.is_interested_in_viewing,
      wants_similar_properties: inquiryForm.wants_similar_properties,
      priority: inquiryForm.priority
    });
  };

  // Format currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Parse JSON fields safely
  const parseJsonField = (field: string | null): string[] => {
    if (!field) return [];
    try {
      return JSON.parse(field);
    } catch {
      return field.split(',').map(item => item.trim());
    }
  };

  // Share functions
  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = propertyData?.title || 'Property';
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`);
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        break;
    }
    setShareMenuOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (propertyLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (propertyError || !propertyData) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h1>
            <p className="text-gray-600 mb-4">The property you're looking for doesn't exist or has been removed.</p>
            <Link to="/search" className="text-blue-600 hover:text-blue-500">
              Browse other properties →
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Property Header */}
        <div className="mb-8">
          {/* Breadcrumb */}
          <nav className="flex mb-4 text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/search" className="hover:text-gray-700">Properties</Link>
            <span className="mx-2">/</span>
            <span>{propertyData.country}</span>
            {propertyData.region && (
              <>
                <span className="mx-2">/</span>
                <span>{propertyData.region}</span>
              </>
            )}
            {propertyData.city && (
              <>
                <span className="mx-2">/</span>
                <span>{propertyData.city}</span>
              </>
            )}
          </nav>

          {/* Title and Status */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{propertyData.title}</h1>
              <p className="text-lg text-gray-600 mb-2">
                {propertyData.address || `${propertyData.city ? `${propertyData.city}, ` : ''}${propertyData.region ? `${propertyData.region}, ` : ''}${propertyData.country}`}
              </p>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  propertyData.status === 'active' ? 'bg-green-100 text-green-800' :
                  propertyData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  propertyData.status === 'sold' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {propertyData.status.charAt(0).toUpperCase() + propertyData.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500">Property ID: {propertyData.property_id}</span>
              </div>
            </div>
            
            {/* Price */}
            <div className="mt-4 lg:mt-0 lg:text-right">
              <div className="text-3xl font-bold text-blue-600">
                {formatPrice(propertyData.price, propertyData.currency)}
              </div>
              {propertyData.square_footage && (
                <div className="text-sm text-gray-500">
                  ${Math.round(propertyData.price / propertyData.square_footage)}/sq ft
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => savePropertyMutation.mutate()}
              disabled={!isAuthenticated || savePropertyMutation.isPending}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                isSaved 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isAuthenticated ? 'Login to save properties' : ''}
            >
              <svg className={`w-5 h-5 mr-2 ${isSaved ? 'fill-current' : ''}`} viewBox="0 0 24 24" stroke="currentColor" fill={isSaved ? 'currentColor' : 'none'}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isSaved ? 'Saved' : 'Save to Favorites'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShareMenuOpen(!shareMenuOpen)}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share Property
              </button>
              
              {shareMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button onClick={() => handleShare('facebook')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Share on Facebook
                    </button>
                    <button onClick={() => handleShare('twitter')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Share on Twitter
                    </button>
                    <button onClick={() => handleShare('email')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Share via Email
                    </button>
                    <button onClick={() => handleShare('copy')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Copy Link
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Details
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Photos and Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photo Gallery */}
            <div>
              {propertyPhotos.length > 0 ? (
                <div>
                  {/* Main Photo */}
                  <div className="relative mb-4">
                    <img
                      src={propertyPhotos[currentPhotoIndex]?.photo_url || 'https://picsum.photos/800/600?random=1'}
                      alt={propertyPhotos[currentPhotoIndex]?.caption || propertyData.title}
                      className="w-full h-96 object-cover rounded-lg"
                    />
                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
                      {currentPhotoIndex + 1} of {propertyPhotos.length} photos
                    </div>
                    <button
                      onClick={() => setGalleryOpen(true)}
                      className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm hover:bg-opacity-80 transition-opacity"
                    >
                      View All Photos
                    </button>
                    
                    {/* Navigation arrows */}
                    {propertyPhotos.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : propertyPhotos.length - 1)}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setCurrentPhotoIndex(prev => prev < propertyPhotos.length - 1 ? prev + 1 : 0)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {propertyPhotos.map((photo, index) => (
                      <button
                        key={photo.photo_id}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`flex-shrink-0 w-20 h-16 rounded border-2 overflow-hidden ${
                          index === currentPhotoIndex ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || `Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>No photos available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Key Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4">Key Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Property Type</dt>
                  <dd className="font-medium capitalize">{propertyData.property_type}</dd>
                </div>
                {propertyData.bedrooms && (
                  <div>
                    <dt className="text-sm text-gray-500">Bedrooms</dt>
                    <dd className="font-medium">{propertyData.bedrooms}</dd>
                  </div>
                )}
                {propertyData.bathrooms && (
                  <div>
                    <dt className="text-sm text-gray-500">Bathrooms</dt>
                    <dd className="font-medium">{propertyData.bathrooms}</dd>
                  </div>
                )}
                {propertyData.square_footage && (
                  <div>
                    <dt className="text-sm text-gray-500">Square Footage</dt>
                    <dd className="font-medium">{propertyData.square_footage.toLocaleString()} sq ft</dd>
                  </div>
                )}
                {propertyData.land_size && (
                  <div>
                    <dt className="text-sm text-gray-500">Land Size</dt>
                    <dd className="font-medium">{propertyData.land_size} {propertyData.land_size_unit || 'acres'}</dd>
                  </div>
                )}
                {propertyData.year_built && (
                  <div>
                    <dt className="text-sm text-gray-500">Year Built</dt>
                    <dd className="font-medium">{propertyData.year_built}</dd>
                  </div>
                )}
              </div>
            </div>

            {/* Natural Features */}
            {propertyData.natural_features && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-xl font-semibold mb-4">Natural Features & Views</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Natural Attractions</h4>
                    <div className="flex flex-wrap gap-2">
                      {parseJsonField(propertyData.natural_features).map((feature, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {propertyData.view_types && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">View Types</h4>
                      <div className="flex flex-wrap gap-2">
                        {parseJsonField(propertyData.view_types).map((view, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {view}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {propertyData.distance_to_landmarks && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Distance to Landmarks</h4>
                      <p className="text-gray-600">{propertyData.distance_to_landmarks}</p>
                    </div>
                  )}
                  
                  {propertyData.outdoor_activities && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Outdoor Activities</h4>
                      <p className="text-gray-600">{propertyData.outdoor_activities}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Property Description */}
            {propertyData.description && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-xl font-semibold mb-4">Property Description</h3>
                <div className="prose max-w-none text-gray-600">
                  {propertyData.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 last:mb-0">{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities & Features */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4">Amenities & Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {propertyData.outdoor_amenities && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Outdoor Amenities</h4>
                    <div className="space-y-2">
                      {parseJsonField(propertyData.outdoor_amenities).map((amenity, index) => (
                        <div key={index} className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-600">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {propertyData.indoor_amenities && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Indoor Amenities</h4>
                    <div className="space-y-2">
                      {parseJsonField(propertyData.indoor_amenities).map((amenity, index) => (
                        <div key={index} className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-600">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {propertyData.special_features && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Special Features</h4>
                  <p className="text-gray-600">{propertyData.special_features}</p>
                </div>
              )}
            </div>

            {/* Interactive Map Placeholder */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4">Location</h3>
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>Interactive map would be displayed here</p>
                  <p className="text-sm mt-1">
                    {propertyData.address || `${propertyData.city ? `${propertyData.city}, ` : ''}${propertyData.region ? `${propertyData.region}, ` : ''}${propertyData.country}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Contact & Inquiry */}
          <div className="space-y-6">
            {/* Property Owner/Agent Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                  {propertyData.owner.profile_photo_url ? (
                    <img
                      src={propertyData.owner.profile_photo_url}
                      alt={propertyData.owner.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="flex items-center">
                    <h4 className="font-medium text-gray-900">{propertyData.owner.name}</h4>
                    {propertyData.owner.is_verified && (
                      <svg className="w-4 h-4 text-blue-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{propertyData.owner.user_type}</p>
                </div>
              </div>

              {/* Quick Contact Actions */}
              <div className="space-y-2">
                <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call Now
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email Agent
                </button>
              </div>
            </div>

            {/* Inquiry Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Send Inquiry</h3>
              
              {inquirySubmitted ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Inquiry Sent!</h4>
                  <p className="text-gray-600">Your inquiry has been sent to the property owner. They will contact you soon.</p>
                  <button
                    onClick={() => setInquirySubmitted(false)}
                    className="mt-4 text-blue-600 hover:text-blue-500 text-sm font-medium"
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sender_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="sender_name"
                        required
                        value={inquiryForm.sender_name}
                        onChange={(e) => setInquiryForm(prev => ({ ...prev, sender_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="sender_email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="sender_email"
                        required
                        value={inquiryForm.sender_email}
                        onChange={(e) => setInquiryForm(prev => ({ ...prev, sender_email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="sender_phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="sender_phone"
                      value={inquiryForm.sender_phone}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, sender_phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={4}
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder={`I'm interested in this ${propertyData.property_type} in ${propertyData.country}. Please contact me with more information.`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="mt-1 text-sm text-gray-500">
                      {inquiryForm.message.length}/2000 characters
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={inquiryForm.is_interested_in_viewing}
                        onChange={(e) => setInquiryForm(prev => ({ ...prev, is_interested_in_viewing: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">I'm interested in viewing this property</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={inquiryForm.wants_similar_properties}
                        onChange={(e) => setInquiryForm(prev => ({ ...prev, wants_similar_properties: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Send me similar properties</span>
                    </label>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={inquiryMutation.isPending}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {inquiryMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Send Inquiry'
                    )}
                  </button>
                  
                  {inquiryMutation.error && (
                    <div className="text-red-600 text-sm">
                      Error sending inquiry. Please try again.
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Property Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Property Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Views</span>
                  <span className="font-medium">{propertyData.view_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Inquiries</span>
                  <span className="font-medium">{propertyData.inquiry_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Favorites</span>
                  <span className="font-medium">{propertyData.favorite_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Listed</span>
                  <span className="font-medium">
                    {new Date(propertyData.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Gallery Modal */}
      {galleryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="max-w-6xl max-h-full w-full h-full flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4">
              <div className="text-white">
                <h3 className="text-lg font-medium">{propertyData.title}</h3>
                <p className="text-sm text-gray-300">
                  {currentPhotoIndex + 1} of {propertyPhotos.length} photos
                </p>
              </div>
              <button
                onClick={() => setGalleryOpen(false)}
                className="text-white hover:text-gray-300 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Main Image */}
            <div className="flex-1 flex items-center justify-center relative">
              {propertyPhotos[currentPhotoIndex] && (
                <img
                  src={propertyPhotos[currentPhotoIndex].photo_url}
                  alt={propertyPhotos[currentPhotoIndex].caption || `Photo ${currentPhotoIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              )}

              {/* Navigation buttons */}
              {propertyPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : propertyPhotos.length - 1)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-opacity"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPhotoIndex(prev => prev < propertyPhotos.length - 1 ? prev + 1 : 0)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-opacity"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            <div className="p-4">
              <div className="flex space-x-2 overflow-x-auto">
                {propertyPhotos.map((photo, index) => (
                  <button
                    key={photo.photo_id}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`flex-shrink-0 w-16 h-12 rounded border-2 overflow-hidden ${
                      index === currentPhotoIndex ? 'border-white' : 'border-gray-600'
                    }`}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || `Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close share menu */}
      {shareMenuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShareMenuOpen(false)}
        />
      )}
    </>
  );
};

export default UV_PropertyDetails;