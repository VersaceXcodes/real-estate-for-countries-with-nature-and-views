import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types from schemas
interface CreatePropertyRequest {
  user_id: string;
  title: string;
  description?: string | null;
  property_type: 'villa' | 'cabin' | 'condominium' | 'farm' | 'land' | 'mansion' | 'house' | 'apartment' | 'commercial';
  price: number;
  currency: string;
  country: string;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  square_footage?: number | null;
  land_size?: number | null;
  land_size_unit?: 'acres' | 'hectares' | 'sqft' | 'sqm' | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  year_built?: number | null;
  natural_features?: string | null;
  outdoor_amenities?: string | null;
  indoor_amenities?: string | null;
  view_types?: string | null;
  nearby_attractions?: string | null;
  distance_to_landmarks?: string | null;
  environmental_features?: string | null;
  outdoor_activities?: string | null;
  property_condition?: 'excellent' | 'very good' | 'good' | 'fair' | 'needs work' | 'pristine' | 'restored' | null;
  special_features?: string | null;
  listing_duration_days: number;
}

interface CreatePropertyPhotoRequest {
  photo_url: string;
  caption?: string | null;
  photo_order: number;
  is_primary: boolean;
  photo_type?: 'exterior' | 'interior' | 'aerial' | 'floor_plan' | 'amenity' | null;
  file_size?: number | null;
}

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
  listing_duration_days: number;
  is_featured: boolean;
  featured_until: string | null;
  view_count: number;
  inquiry_count: number;
  favorite_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

interface PropertyPhoto {
  photo_id: string;
  property_id: string;
  photo_url: string;
  caption: string | null;
  photo_order: number;
  is_primary: boolean;
  photo_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface UploadedPhoto {
  file: File;
  preview_url: string;
  upload_progress: number;
  uploaded: boolean;
  photo_id: string | null;
  photo_order: number;
  is_primary: boolean;
  caption: string | null;
}

const UV_CreateListing: React.FC = () => {
  
  // Zustand store selectors (individual to avoid infinite loops)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  // Form data state
  const [propertyForm, setPropertyForm] = useState<CreatePropertyRequest>({
    user_id: currentUser?.user_id || '',
    title: '',
    description: null,
    property_type: 'house',
    price: 0,
    currency: 'USD',
    country: '',
    region: null,
    city: null,
    address: null,
    latitude: null,
    longitude: null,
    square_footage: null,
    land_size: null,
    land_size_unit: null,
    bedrooms: null,
    bathrooms: null,
    year_built: null,
    natural_features: null,
    outdoor_amenities: null,
    indoor_amenities: null,
    view_types: null,
    nearby_attractions: null,
    distance_to_landmarks: null,
    environmental_features: null,
    outdoor_activities: null,
    property_condition: null,
    special_features: null,
    listing_duration_days: 90
  });
  
  // Photo management
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [listingPublished, setListingPublished] = useState(false);
  
  // API functions
  const createProperty = async (data: CreatePropertyRequest): Promise<Property> => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };
  
  const uploadPropertyPhoto = async (propertyId: string, photoData: CreatePropertyPhotoRequest): Promise<PropertyPhoto> => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties/${propertyId}/photos`,
      photoData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };
  
  // Mutations
  const createPropertyMutation = useMutation<Property, Error, CreatePropertyRequest>({
    mutationFn: createProperty,
    onSuccess: (data) => {
      setCreatedPropertyId(data.property_id);
      // Move to next step after property creation
      if (uploadedPhotos.length > 0) {
        uploadPhotosMutation.mutate(data.property_id);
      } else {
        setListingPublished(true);
      }
    },
    onError: (error: any) => {
      setFormErrors({ general: error.response?.data?.message || 'Failed to create property' });
    }
  });
  
  const uploadPhotosMutation = useMutation<void, Error, string>({
    mutationFn: async (propertyId: string) => {
      for (let i = 0; i < uploadedPhotos.length; i++) {
        const photo = uploadedPhotos[i];
        try {
          // In a real app, you'd upload the file to a storage service first
          // For now, we'll simulate with a placeholder URL
          const photoUrl = `https://picsum.photos/800/600?random=${Date.now()}-${i}`;
          
          const photoData: CreatePropertyPhotoRequest = {
            photo_url: photoUrl,
            caption: photo.caption,
            photo_order: photo.photo_order,
            is_primary: photo.is_primary,
            photo_type: 'exterior',
            file_size: photo.file.size
          };
          
          await uploadPropertyPhoto(propertyId, photoData);
          
          // Update upload progress
          setUploadedPhotos(prev => prev.map(p => 
            p.photo_order === photo.photo_order 
              ? { ...p, uploaded: true, upload_progress: 100 }
              : p
          ));
        } catch (error) {
          console.error('Failed to upload photo:', error);
        }
      }
    },
    onSuccess: () => {
      setListingPublished(true);
    },
    onError: (error: any) => {
      setFormErrors({ photos: error.message || 'Failed to upload photos' });
    }
  });
  
  // Form validation
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};
    
    switch (currentStep) {
      case 1: // Basic Info
        if (!propertyForm.title.trim()) errors.title = 'Property title is required';
        if (propertyForm.title.length > 100) errors.title = 'Title must be 100 characters or less';
        if (!propertyForm.property_type) errors.property_type = 'Property type is required';
        if (!propertyForm.country.trim()) errors.country = 'Country is required';
        break;
        
      case 2: // Details
        if (propertyForm.price <= 0) errors.price = 'Price must be greater than 0';
        break;
        
      case 3: // Description
        if (propertyForm.description && propertyForm.description.length < 50) {
          errors.description = 'Description should be at least 50 characters';
        }
        break;
        
      case 4: // Photos
        if (uploadedPhotos.length < 5) {
          errors.photos = 'Minimum 5 photos required';
        }
        if (uploadedPhotos.length > 50) {
          errors.photos = 'Maximum 50 photos allowed';
        }
        break;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Navigation handlers
  const handleNextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleStepClick = (step: number) => {
    if (step <= currentStep || step === 1) {
      setCurrentStep(step);
    }
  };
  
  // Form update handler
  const updateFormField = (field: keyof CreatePropertyRequest, value: any) => {
    setPropertyForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // Photo handlers
  const handleFileSelect = useCallback((files: FileList) => {
    const newPhotos: UploadedPhoto[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const preview_url = URL.createObjectURL(file);
        newPhotos.push({
          file,
          preview_url,
          upload_progress: 0,
          uploaded: false,
          photo_id: null,
          photo_order: uploadedPhotos.length + newPhotos.length,
          is_primary: uploadedPhotos.length + newPhotos.length === 0,
          caption: null
        });
      }
    }
    
    setUploadedPhotos(prev => [...prev, ...newPhotos]);
  }, [uploadedPhotos.length]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => {
      const newPhotos = prev.filter((_, i) => i !== index);
      return newPhotos.map((photo, i) => ({
        ...photo,
        photo_order: i,
        is_primary: i === 0
      }));
    });
    
    if (primaryPhotoIndex >= uploadedPhotos.length - 1) {
      setPrimaryPhotoIndex(0);
    }
  };
  
  const setPrimaryPhoto = (index: number) => {
    setPrimaryPhotoIndex(index);
    setUploadedPhotos(prev => prev.map((photo, i) => ({
      ...photo,
      is_primary: i === index
    })));
  };
  
  const updatePhotoCaption = (index: number, caption: string) => {
    setUploadedPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, caption } : photo
    ));
  };
  
  // Final submission
  const handlePublish = () => {
    if (validateCurrentStep()) {
      createPropertyMutation.mutate(propertyForm);
    }
  };
  
  // Save as draft (using localStorage for MVP)
  const handleSaveAsDraft = () => {
    const draftData = {
      propertyForm,
      uploadedPhotos: uploadedPhotos.map(p => ({
        ...p,
        preview_url: '', // Don't persist blob URLs
        file: null // Don't persist file objects
      })),
      currentStep
    };
    localStorage.setItem('property_draft', JSON.stringify(draftData));
    
    // Show success message
    setFormErrors({ success: 'Draft saved successfully!' });
    setTimeout(() => {
      setFormErrors({});
    }, 3000);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Property Listing</h1>
                <p className="mt-2 text-gray-600">
                  Share your scenic property with potential buyers
                </p>
              </div>
              <Link 
                to="/my-listings"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to My Listings
              </Link>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => handleStepClick(step)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step <= currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    } ${step === currentStep ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}
                  >
                    {step}
                  </button>
                  {step < totalSteps && (
                    <div className={`w-16 h-1 ml-4 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Basic Info</span>
              <span>Details</span>
              <span>Description</span>
              <span>Photos</span>
              <span>Publish</span>
            </div>
          </div>

          {/* Error Messages */}
          {Object.keys(formErrors).length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              {Object.entries(formErrors).map(([field, error]) => (
                <p key={field} className="text-red-700 text-sm">
                  {field === 'success' ? (
                    <span className="text-green-700">{error}</span>
                  ) : (
                    error
                  )}
                </p>
              ))}
            </div>
          )}

          {/* Form Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Property Information</h2>
                
                {/* Property Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Property Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={propertyForm.title}
                    onChange={(e) => updateFormField('title', e.target.value)}
                    maxLength={100}
                    placeholder="e.g., Mountain View Villa with Private Lake Access"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {propertyForm.title.length}/100 characters
                  </p>
                </div>

                {/* Property Type */}
                <div>
                  <label htmlFor="property_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type *
                  </label>
                  <select
                    id="property_type"
                    value={propertyForm.property_type}
                    onChange={(e) => updateFormField('property_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="house">House</option>
                    <option value="villa">Villa</option>
                    <option value="cabin">Cabin</option>
                    <option value="condominium">Condominium</option>
                    <option value="mansion">Mansion</option>
                    <option value="farm">Farm</option>
                    <option value="land">Land</option>
                    <option value="apartment">Apartment</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      id="country"
                      value={propertyForm.country}
                      onChange={(e) => updateFormField('country', e.target.value)}
                      placeholder="e.g., Costa Rica"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                      Region/State
                    </label>
                    <input
                      type="text"
                      id="region"
                      value={propertyForm.region || ''}
                      onChange={(e) => updateFormField('region', e.target.value || null)}
                      placeholder="e.g., Guanacaste"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={propertyForm.city || ''}
                      onChange={(e) => updateFormField('city', e.target.value || null)}
                      placeholder="e.g., Tamarindo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={propertyForm.address || ''}
                      onChange={(e) => updateFormField('address', e.target.value || null)}
                      placeholder="Full street address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Property Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
                
                {/* Price */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      id="price"
                      value={propertyForm.price || ''}
                      onChange={(e) => updateFormField('price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="1000"
                      placeholder="e.g., 850000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={propertyForm.currency}
                      onChange={(e) => updateFormField('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="CAD">CAD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                {/* Specifications */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-2">
                      Bedrooms
                    </label>
                    <select
                      id="bedrooms"
                      value={propertyForm.bedrooms || ''}
                      onChange={(e) => updateFormField('bedrooms', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-2">
                      Bathrooms
                    </label>
                    <select
                      id="bathrooms"
                      value={propertyForm.bathrooms || ''}
                      onChange={(e) => updateFormField('bathrooms', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="year_built" className="block text-sm font-medium text-gray-700 mb-2">
                      Year Built
                    </label>
                    <input
                      type="number"
                      id="year_built"
                      value={propertyForm.year_built || ''}
                      onChange={(e) => updateFormField('year_built', e.target.value ? parseInt(e.target.value) : null)}
                      min="1800"
                      max={new Date().getFullYear()}
                      placeholder="e.g., 2020"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Size */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="square_footage" className="block text-sm font-medium text-gray-700 mb-2">
                      Square Footage
                    </label>
                    <input
                      type="number"
                      id="square_footage"
                      value={propertyForm.square_footage || ''}
                      onChange={(e) => updateFormField('square_footage', e.target.value ? parseFloat(e.target.value) : null)}
                      min="0"
                      placeholder="e.g., 2500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="land_size" className="block text-sm font-medium text-gray-700 mb-2">
                        Land Size
                      </label>
                      <input
                        type="number"
                        id="land_size"
                        value={propertyForm.land_size || ''}
                        onChange={(e) => updateFormField('land_size', e.target.value ? parseFloat(e.target.value) : null)}
                        min="0"
                        step="0.1"
                        placeholder="e.g., 2.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="land_size_unit" className="block text-sm font-medium text-gray-700 mb-2">
                        Unit
                      </label>
                      <select
                        id="land_size_unit"
                        value={propertyForm.land_size_unit || ''}
                        onChange={(e) => updateFormField('land_size_unit', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        <option value="acres">Acres</option>
                        <option value="hectares">Hectares</option>
                        <option value="sqft">Sq Ft</option>
                        <option value="sqm">Sq M</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Property Condition */}
                <div>
                  <label htmlFor="property_condition" className="block text-sm font-medium text-gray-700 mb-2">
                    Property Condition
                  </label>
                  <select
                    id="property_condition"
                    value={propertyForm.property_condition || ''}
                    onChange={(e) => updateFormField('property_condition', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select condition...</option>
                    <option value="pristine">Pristine</option>
                    <option value="excellent">Excellent</option>
                    <option value="very good">Very Good</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="needs work">Needs Work</option>
                    <option value="restored">Restored</option>
                  </select>
                </div>

                {/* Natural Features */}
                <div>
                  <label htmlFor="natural_features" className="block text-sm font-medium text-gray-700 mb-2">
                    Natural Features
                  </label>
                  <textarea
                    id="natural_features"
                    value={propertyForm.natural_features || ''}
                    onChange={(e) => updateFormField('natural_features', e.target.value || null)}
                    rows={3}
                    placeholder="e.g., Ocean views, mountain backdrop, private beach access, tropical gardens..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Outdoor Amenities */}
                <div>
                  <label htmlFor="outdoor_amenities" className="block text-sm font-medium text-gray-700 mb-2">
                    Outdoor Amenities
                  </label>
                  <textarea
                    id="outdoor_amenities"
                    value={propertyForm.outdoor_amenities || ''}
                    onChange={(e) => updateFormField('outdoor_amenities', e.target.value || null)}
                    rows={3}
                    placeholder="e.g., Swimming pool, outdoor kitchen, deck, hot tub, garden..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Description */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Description</h2>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Comprehensive Description
                  </label>
                  <textarea
                    id="description"
                    value={propertyForm.description || ''}
                    onChange={(e) => updateFormField('description', e.target.value || null)}
                    rows={8}
                    placeholder="Describe your property in detail, emphasizing the natural beauty, scenic views, and unique features that make it special..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {(propertyForm.description || '').length} characters (recommended: 300-1000)
                  </p>
                </div>

                {/* SEO Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for a Great Description:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Highlight natural features and scenic views first</li>
                    <li>• Mention nearby attractions and outdoor activities</li>
                    <li>• Describe the feeling and experience of the property</li>
                    <li>• Include practical details about the home</li>
                    <li>• Use descriptive language that helps buyers visualize</li>
                  </ul>
                </div>

                {/* Special Features */}
                <div>
                  <label htmlFor="special_features" className="block text-sm font-medium text-gray-700 mb-2">
                    Special Features
                  </label>
                  <textarea
                    id="special_features"
                    value={propertyForm.special_features || ''}
                    onChange={(e) => updateFormField('special_features', e.target.value || null)}
                    rows={3}
                    placeholder="Any unique or special features that set this property apart..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Photos */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Photos</h2>
                
                {/* Upload Area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <p className="text-lg font-medium text-gray-700">Drop photos here</p>
                    <p className="text-gray-500">or</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Browse Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Minimum 5 photos required. Maximum 50 photos. JPG, PNG up to 10MB each.
                  </p>
                </div>

                {/* Photo Grid */}
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {uploadedPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={photo.preview_url}
                            alt={`Property photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Primary Photo Badge */}
                        {photo.is_primary && (
                          <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-medium">
                            Primary
                          </div>
                        )}
                        
                        {/* Photo Controls */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex space-x-2">
                            {!photo.is_primary && (
                              <button
                                onClick={() => setPrimaryPhoto(index)}
                                className="p-2 bg-white rounded-full text-gray-700 hover:text-yellow-600"
                                title="Set as primary photo"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => removePhoto(index)}
                              className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600"
                              title="Remove photo"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Caption Input */}
                        <div className="mt-2">
                          <input
                            type="text"
                            value={photo.caption || ''}
                            onChange={(e) => updatePhotoCaption(index, e.target.value)}
                            placeholder="Photo caption..."
                            className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Photo Requirements */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Photo Requirements:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className={uploadedPhotos.length >= 5 ? 'text-green-600' : 'text-red-600'}>
                      • Minimum 5 photos ({uploadedPhotos.length}/5)
                    </li>
                    <li className={uploadedPhotos.length <= 50 ? 'text-green-600' : 'text-red-600'}>
                      • Maximum 50 photos ({uploadedPhotos.length}/50)
                    </li>
                    <li>• Include exterior views showcasing natural features</li>
                    <li>• Add interior photos of key rooms</li>
                    <li>• Capture unique property features and amenities</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 5: Review & Publish */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Review & Publish</h2>
                
                {/* Property Preview */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Property Preview</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{propertyForm.title}</h4>
                      <p className="text-gray-600">
                        {propertyForm.property_type} in {propertyForm.city}, {propertyForm.country}
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        {propertyForm.currency} {propertyForm.price.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {propertyForm.bedrooms && (
                        <div>
                          <span className="text-gray-500">Bedrooms:</span>
                          <span className="ml-1 font-medium">{propertyForm.bedrooms}</span>
                        </div>
                      )}
                      {propertyForm.bathrooms && (
                        <div>
                          <span className="text-gray-500">Bathrooms:</span>
                          <span className="ml-1 font-medium">{propertyForm.bathrooms}</span>
                        </div>
                      )}
                      {propertyForm.square_footage && (
                        <div>
                          <span className="text-gray-500">Sq Ft:</span>
                          <span className="ml-1 font-medium">{propertyForm.square_footage.toLocaleString()}</span>
                        </div>
                      )}
                      {propertyForm.year_built && (
                        <div>
                          <span className="text-gray-500">Built:</span>
                          <span className="ml-1 font-medium">{propertyForm.year_built}</span>
                        </div>
                      )}
                    </div>
                    
                    {propertyForm.description && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                        <p className="text-gray-600 text-sm">{propertyForm.description}</p>
                      </div>
                    )}
                    
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Photos</h5>
                      <p className="text-sm text-gray-600">{uploadedPhotos.length} photos uploaded</p>
                    </div>
                  </div>
                </div>

                {/* Publishing Options */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Publishing Options</h3>
                  
                  <div>
                    <label htmlFor="listing_duration_days" className="block text-sm font-medium text-gray-700 mb-2">
                      Listing Duration
                    </label>
                    <select
                      id="listing_duration_days"
                      value={propertyForm.listing_duration_days}
                      onChange={(e) => updateFormField('listing_duration_days', parseInt(e.target.value))}
                      className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>
                </div>

                {/* Success State */}
                {listingPublished && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Property Listed Successfully!
                        </h3>
                        <p className="mt-2 text-sm text-green-700">
                          Your property is now live and visible to potential buyers.
                        </p>
                        <div className="mt-4 flex space-x-3">
                          <Link
                            to={`/property/${createdPropertyId}`}
                            className="text-sm font-medium text-green-800 hover:text-green-700"
                          >
                            View Your Listing →
                          </Link>
                          <Link
                            to="/my-listings"
                            className="text-sm font-medium text-green-800 hover:text-green-700"
                          >
                            Manage All Listings →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSaveAsDraft}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save as Draft
              </button>
              
              <div className="flex space-x-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Previous
                  </button>
                )}
                
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={createPropertyMutation.isPending || uploadPhotosMutation.isPending || listingPublished}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createPropertyMutation.isPending || uploadPhotosMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Publishing...
                      </span>
                    ) : listingPublished ? (
                      'Published!'
                    ) : (
                      'Publish Listing'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_CreateListing;