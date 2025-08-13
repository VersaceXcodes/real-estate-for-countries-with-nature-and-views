import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Property } from '@/store/main';

// Types for component state
interface CountryData {
  country: string;
  property_count: number;
  representative_image: string;
}

interface HeroImage {
  image_url: string;
  property_id: string;
  caption: string;
}

interface SearchForm {
  country: string | null;
  property_type: string | null;
  price_range: string | null;
}

// API functions
const fetchFeaturedProperties = async (): Promise<Property[]> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties?is_featured=true&limit=8&sort_by=view_count&sort_order=desc`
  );
  return data.properties || [];
};

const fetchAllActiveProperties = async (): Promise<Property[]> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/properties?status=active&limit=1000`
  );
  return data.properties || [];
};

const UV_Landing: React.FC = () => {
  const navigate = useNavigate();
  
  // Individual Zustand selectors to prevent infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  const addSavedProperty = useAppStore(state => state.add_saved_property);
  const savedPropertyIds = useAppStore(state => state.saved_properties_state.saved_property_ids);

  // Local state
  const [searchForm, setSearchForm] = useState<SearchForm>({
    country: null,
    property_type: null,
    price_range: null
  });
  const [currentHeroIndex, setCurrentHeroIndex] = useState<number>(0);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [countriesData, setCountriesData] = useState<CountryData[]>([]);

  // Featured properties query with better error handling
  const {
    data: featuredProperties = [],
    isLoading: loadingFeatured,
    error: featuredError
  } = useQuery<Property[], Error>({
    queryKey: ['featured-properties'],
    queryFn: fetchFeaturedProperties,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.warn('Failed to fetch featured properties:', error);
    }
  });

  // All properties query for countries aggregation with better error handling
  const {
    data: allProperties = [],
    isLoading: loadingCountries,
    error: countriesError
  } = useQuery<Property[], Error>({
    queryKey: ['all-properties-countries'],
    queryFn: fetchAllActiveProperties,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.warn('Failed to fetch countries data:', error);
    }
  });

  // Process countries data with fallback
  useEffect(() => {
    if (allProperties.length > 0) {
      const countryMap: Record<string, CountryData> = {};
      
      allProperties.forEach(property => {
        if (!countryMap[property.country]) {
          countryMap[property.country] = {
            country: property.country,
            property_count: 0,
            representative_image: `https://picsum.photos/400/300?random=${property.country}`
          };
        }
        countryMap[property.country].property_count++;
      });

      const sortedCountries = Object.values(countryMap)
        .sort((a, b) => b.property_count - a.property_count)
        .slice(0, 8);
      
      setCountriesData(sortedCountries);
    } else if (countriesError && countriesData.length === 0) {
      // Fallback countries data when API fails
      const fallbackCountries: CountryData[] = [
        { country: 'Switzerland', property_count: 45, representative_image: 'https://picsum.photos/400/300?random=switzerland' },
        { country: 'New Zealand', property_count: 38, representative_image: 'https://picsum.photos/400/300?random=newzealand' },
        { country: 'Norway', property_count: 32, representative_image: 'https://picsum.photos/400/300?random=norway' },
        { country: 'Canada', property_count: 28, representative_image: 'https://picsum.photos/400/300?random=canada' },
        { country: 'Iceland', property_count: 24, representative_image: 'https://picsum.photos/400/300?random=iceland' },
        { country: 'Austria', property_count: 22, representative_image: 'https://picsum.photos/400/300?random=austria' },
        { country: 'Scotland', property_count: 19, representative_image: 'https://picsum.photos/400/300?random=scotland' },
        { country: 'Chile', property_count: 16, representative_image: 'https://picsum.photos/400/300?random=chile' }
      ];
      setCountriesData(fallbackCountries);
    }
  }, [allProperties, countriesError, countriesData.length]);

  // Process hero images from featured properties with fallback
  useEffect(() => {
    if (featuredProperties.length > 0) {
      const images: HeroImage[] = featuredProperties.slice(0, 5).map(property => ({
        image_url: `https://picsum.photos/1920/1080?random=${property.property_id}`,
        property_id: property.property_id,
        caption: property.title
      }));
      setHeroImages(images);
    } else if (featuredError && heroImages.length === 0) {
      // Fallback hero images when API fails
      const fallbackImages: HeroImage[] = [
        {
          image_url: 'https://picsum.photos/1920/1080?random=mountain1',
          property_id: 'fallback-1',
          caption: 'Stunning Mountain Villa with Alpine Views'
        },
        {
          image_url: 'https://picsum.photos/1920/1080?random=lake1',
          property_id: 'fallback-2',
          caption: 'Lakefront Cabin Retreat'
        },
        {
          image_url: 'https://picsum.photos/1920/1080?random=forest1',
          property_id: 'fallback-3',
          caption: 'Forest Lodge with Natural Beauty'
        },
        {
          image_url: 'https://picsum.photos/1920/1080?random=ocean1',
          property_id: 'fallback-4',
          caption: 'Oceanfront Estate with Panoramic Views'
        },
        {
          image_url: 'https://picsum.photos/1920/1080?random=valley1',
          property_id: 'fallback-5',
          caption: 'Valley Ranch with Mountain Backdrop'
        }
      ];
      setHeroImages(fallbackImages);
    }
  }, [featuredProperties, featuredError, heroImages.length]);

  // Hero carousel auto-advance
  useEffect(() => {
    if (heroImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentHeroIndex(prev => (prev + 1) % heroImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroImages.length]);

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryParams = new URLSearchParams();
    
    if (searchForm.country) queryParams.append('country', searchForm.country);
    if (searchForm.property_type) queryParams.append('property_type', searchForm.property_type);
    if (searchForm.price_range) {
      const [min, max] = searchForm.price_range.split('-');
      if (min) queryParams.append('price_min', min);
      if (max) queryParams.append('price_max', max);
    }
    
    navigate(`/search?${queryParams.toString()}`);
  };

  // Handle property favorites
  const handleFavoriteToggle = (property: Property) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (savedPropertyIds.includes(property.property_id)) {
      // TODO: Remove from favorites - would need API call
    } else {
      addSavedProperty(property.property_id, property);
    }
  };

  // Format price
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-screen overflow-hidden">
        {/* Background Carousel */}
        {heroImages.length > 0 && (
          <div className="absolute inset-0">
            {heroImages.map((image, index) => (
              <div
                key={image.property_id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentHeroIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={image.image_url}
                  alt={image.caption}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              </div>
            ))}
          </div>
        )}
        
        {/* Hero Content */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center text-white px-4 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Discover Properties with<br />
              <span className="text-green-400">Breathtaking Natural Beauty</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Find your perfect scenic retreat in the world's most beautiful locations
            </p>
            
            {/* Quick Search Form */}
            <form onSubmit={handleSearchSubmit} className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-6 shadow-xl max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Country</label>
                  <select
                    value={searchForm.country || ''}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, country: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                  >
                    <option value="">Any Country</option>
                    {countriesData.map(country => (
                      <option key={country.country} value={country.country}>
                        {country.country}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Property Type</label>
                  <select
                    value={searchForm.property_type || ''}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, property_type: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                  >
                    <option value="">Any Type</option>
                    <option value="villa">Villa</option>
                    <option value="cabin">Cabin</option>
                    <option value="house">House</option>
                    <option value="land">Land</option>
                    <option value="mansion">Mansion</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Price Range</label>
                  <select
                    value={searchForm.price_range || ''}
                    onChange={(e) => setSearchForm(prev => ({ ...prev, price_range: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                  >
                    <option value="">Any Price</option>
                    <option value="0-500000">Under $500K</option>
                    <option value="500000-1000000">$500K - $1M</option>
                    <option value="1000000-2000000">$1M - $2M</option>
                    <option value="2000000-">Above $2M</option>
                  </select>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Explore Properties
              </button>
            </form>
          </div>
        </div>
        
        {/* Carousel Indicators */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentHeroIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentHeroIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Featured Properties Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Scenic Properties</h2>
            <p className="text-xl text-gray-600">Handpicked properties with exceptional natural beauty</p>
          </div>
          
          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-300"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredError && featuredProperties.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Fallback featured properties when API fails */}
              {[
                { id: 'demo-1', title: 'Alpine Mountain Villa', country: 'Switzerland', city: 'Zermatt', price: 2500000, currency: 'USD', features: ['Mountain Views', 'Ski Access'] },
                { id: 'demo-2', title: 'Lakefront Cabin Retreat', country: 'Canada', city: 'Banff', price: 850000, currency: 'USD', features: ['Lake Views', 'Forest Setting'] },
                { id: 'demo-3', title: 'Coastal Estate', country: 'New Zealand', city: 'Queenstown', price: 1800000, currency: 'USD', features: ['Ocean Views', 'Private Beach'] },
                { id: 'demo-4', title: 'Forest Lodge', country: 'Norway', city: 'Bergen', price: 1200000, currency: 'USD', features: ['Forest Views', 'Wildlife'] },
                { id: 'demo-5', title: 'Valley Ranch', country: 'Iceland', city: 'Reykjavik', price: 950000, currency: 'USD', features: ['Valley Views', 'Hot Springs'] },
                { id: 'demo-6', title: 'Highland Castle', country: 'Scotland', city: 'Edinburgh', price: 3200000, currency: 'USD', features: ['Historic', 'Mountain Views'] },
                { id: 'demo-7', title: 'Desert Oasis', country: 'Chile', city: 'Atacama', price: 750000, currency: 'USD', features: ['Desert Views', 'Stargazing'] },
                { id: 'demo-8', title: 'Fjord House', country: 'Norway', city: 'Geiranger', price: 1400000, currency: 'USD', features: ['Fjord Views', 'Waterfall'] }
              ].map((property) => (
                <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={`https://picsum.photos/400/250?random=${property.id}`}
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => !isAuthenticated && navigate('/login')}
                      className="absolute top-3 right-3 p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                    >
                      <svg
                        className="w-5 h-5 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                      {property.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {property.city && `${property.city}, `}{property.country}
                    </p>
                    <p className="text-green-600 font-bold text-lg mb-3">
                      {formatPrice(property.price, property.currency)}
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {property.features.slice(0, 2).map((feature, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    
                    <Link
                      to="/search"
                      className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProperties.map((property) => (
                <div key={property.property_id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={`https://picsum.photos/400/250?random=${property.property_id}`}
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => handleFavoriteToggle(property)}
                      className="absolute top-3 right-3 p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                    >
                      <svg
                        className={`w-5 h-5 ${
                          savedPropertyIds.includes(property.property_id)
                            ? 'text-red-500 fill-current'
                            : 'text-gray-600'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                      {property.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {property.city && `${property.city}, `}{property.country}
                    </p>
                    <p className="text-green-600 font-bold text-lg mb-3">
                      {formatPrice(property.price, property.currency)}
                    </p>
                    
                    {property.natural_features && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(() => {
                          try {
                            return JSON.parse(property.natural_features).slice(0, 2).map((feature: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                              >
                                {feature}
                              </span>
                            ));
                          } catch {
                            return property.natural_features.split(',').slice(0, 2).map((feature: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                              >
                                {feature.trim()}
                              </span>
                            ));
                          }
                        })()}
                      </div>
                    )}
                    
                    <Link
                      to={`/property/${property.property_id}`}
                      className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-8">
            <Link
              to="/search"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              View All Properties
              <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Countries Showcase Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Explore Properties by Country</h2>
            <p className="text-xl text-gray-600">Discover scenic properties in the world's most beautiful destinations</p>
          </div>
          
          {loadingCountries && countriesData.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-lg animate-pulse">
                  <div className="h-64 bg-gray-300"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {countriesData.map((country) => (
                <Link
                  key={country.country}
                  to={`/search?country=${encodeURIComponent(country.country)}`}
                  className="relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="relative h-64">
                    <img
                      src={country.representative_image}
                      alt={country.country}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-bold text-xl mb-1">{country.country}</h3>
                      <p className="text-gray-200">
                        {country.property_count} {country.property_count === 1 ? 'Property' : 'Properties'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-16 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose NatureEstate</h2>
            <p className="text-xl text-gray-600">Your gateway to the world's most scenic properties</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Specialized Scenic Properties</h3>
              <p className="text-gray-600">Every property is carefully curated for its exceptional natural beauty and scenic views.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Expert Local Knowledge</h3>
              <p className="text-gray-600">Our local experts provide insider knowledge about natural features and outdoor activities.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Natural Features</h3>
              <p className="text-gray-600">All natural features and outdoor amenities are verified to ensure accurate property descriptions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">Start Your Search Today</h2>
              <p className="text-xl text-gray-300 mb-6">
                Discover your perfect scenic retreat among thousands of breathtaking properties worldwide.
              </p>
              <Link
                to="/search"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-gray-900 bg-green-400 hover:bg-green-300 transition-colors"
              >
                Browse Properties
                <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
            
            <div>
              <h2 className="text-4xl font-bold mb-4">List Your Scenic Property</h2>
              <p className="text-xl text-gray-300 mb-6">
                Showcase your beautiful property to buyers who appreciate natural beauty and scenic views.
              </p>
              {isAuthenticated ? (
                <Link
                  to="/create-listing"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Create Listing
                  <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Get Started
                  <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default UV_Landing;