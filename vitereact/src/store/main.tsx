import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// Configure axios defaults
axios.defaults.timeout = 30000; // 30 seconds
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for better error handling
axios.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching issues
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please check your connection and try again.';
    } else if (error.code === 'ERR_NETWORK') {
      error.message = 'Network error. Please check your internet connection.';
    } else if (!error.response) {
      error.message = 'Unable to connect to server. Please try again later.';
    }
    return Promise.reject(error);
  }
);

// Types based on API schemas
export interface User {
  user_id: string;
  email: string;
  name: string;
  phone: string | null;
  user_type: 'buyer' | 'seller' | 'agent' | 'admin';
  profile_photo_url: string | null;
  is_verified: boolean;
  email_verified: boolean;
  notification_preferences: string | null;
  countries_of_interest: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface Property {
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
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  square_footage: number | null;
  land_size: number | null;
  land_size_unit: 'acres' | 'hectares' | 'sqft' | 'sqm' | null;
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
  property_condition: 'excellent' | 'very good' | 'good' | 'fair' | 'needs work' | 'pristine' | 'restored' | null;
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

export interface SearchCriteria {
  query?: string;
  country?: string;
  region?: string;
  city?: string;
  property_type?: 'villa' | 'cabin' | 'condominium' | 'farm' | 'land' | 'mansion' | 'house' | 'apartment' | 'commercial';
  status?: 'active' | 'inactive' | 'sold' | 'pending' | 'withdrawn';
  price_min?: number;
  price_max?: number;
  bedrooms_min?: number;
  bathrooms_min?: number;
  square_footage_min?: number;
  square_footage_max?: number;
  land_size_min?: number;
  land_size_max?: number;
  year_built_min?: number;
  year_built_max?: number;
  natural_features?: string;
  outdoor_amenities?: string;
  location_text?: string;
  is_featured?: boolean;
  sort_by?: 'price' | 'created_at' | 'view_count' | 'title' | 'square_footage';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResults {
  properties: Property[];
  total_count: number;
  current_page: number;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  type: 'inquiry' | 'saved_search' | 'property_update' | 'system' | 'marketing';
  title: string;
  message: string;
  related_property_id: string | null;
  related_inquiry_id: string | null;
  is_read: boolean;
  is_email_sent: boolean;
  email_sent_at: string | null;
  action_url: string | null;
  priority: 'low' | 'normal' | 'high';
  expires_at: string | null;
  created_at: string;
}

// State interfaces
export interface AuthenticationState {
  current_user: User | null;
  auth_token: string | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
  };
  error_message: string | null;
}

export interface SearchState {
  current_search_criteria: SearchCriteria | null;
  search_results: SearchResults | null;
  is_loading: boolean;
}

export interface SavedPropertiesState {
  saved_property_ids: string[];
  saved_properties: Property[];
  last_updated: string | null;
}

export interface NotificationState {
  unread_inquiry_count: number;
  unread_notifications_count: number;
  recent_notifications: Notification[];
}

// Main store interface
export interface AppState {
  // Global state variables
  authentication_state: AuthenticationState;
  search_state: SearchState;
  saved_properties_state: SavedPropertiesState;
  notification_state: NotificationState;

  // Authentication actions
  login_user: (email: string, password: string) => Promise<void>;
  logout_user: () => Promise<void>;
  register_user: (email: string, password: string, name: string, user_type: 'buyer' | 'seller' | 'agent') => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;
  update_user_profile: (userData: Partial<User>) => void;

  // Search actions  
  update_search_criteria: (criteria: SearchCriteria) => void;
  clear_search_results: () => void;
  set_search_loading: (loading: boolean) => void;
  set_search_results: (results: SearchResults) => void;

  // Saved properties actions
  add_saved_property: (property_id: string, property?: Property) => void;
  remove_saved_property: (property_id: string) => void;
  sync_saved_properties: (properties: Property[]) => void;

  // Notification actions
  update_notification_counts: (inquiry_count: number, notifications_count: number) => void;
  add_notification: (notification: Notification) => void;
  mark_notifications_read: (notification_ids: string[]) => void;
  set_recent_notifications: (notifications: Notification[]) => void;
}

// Create the store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      authentication_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },

      search_state: {
        current_search_criteria: null,
        search_results: null,
        is_loading: false,
      },

      saved_properties_state: {
        saved_property_ids: [],
        saved_properties: [],
        last_updated: null,
      },

      notification_state: {
        unread_inquiry_count: 0,
        unread_notifications_count: 0,
        recent_notifications: [],
      },

      // Authentication actions
      login_user: async (email: string, password: string) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/auth/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, token } = response.data;

          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },

      logout_user: async () => {
        const { authentication_state } = get();
        
        if (authentication_state.auth_token) {
          try {
            await axios.post(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/auth/logout`,
              {},
              { headers: { Authorization: `Bearer ${authentication_state.auth_token}` } }
            );
          } catch (error) {
            // Continue with logout even if API call fails
            console.warn('Logout API call failed:', error);
          }
        }

        set(() => ({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
          // Clear user-specific data on logout
          saved_properties_state: {
            saved_property_ids: [],
            saved_properties: [],
            last_updated: null,
          },
          notification_state: {
            unread_inquiry_count: 0,
            unread_notifications_count: 0,
            recent_notifications: [],
          },
        }));
      },

      register_user: async (email: string, password: string, name: string, user_type: 'buyer' | 'seller' | 'agent') => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/auth/register`,
            { email, password, name, user_type },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, token } = response.data;

          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
          
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },

      initialize_auth: async () => {
        const { authentication_state } = get();
        const token = authentication_state.auth_token;
        
        if (!token) {
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
          return;
        }

        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/users/me`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const user = response.data;
          
          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch {
          // Token is invalid, clear auth state
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        }
      },

      clear_auth_error: () => {
        set(() => ({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
        }));
      },

      update_user_profile: (userData: Partial<User>) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            current_user: state.authentication_state.current_user 
              ? { ...state.authentication_state.current_user, ...userData }
              : null,
          },
        }));
      },

      // Search actions
      update_search_criteria: (criteria: SearchCriteria) => {
        set((state) => ({
          search_state: {
            ...state.search_state,
            current_search_criteria: criteria,
          },
        }));
      },

      clear_search_results: () => {
        set((state) => ({
          search_state: {
            ...state.search_state,
            search_results: null,
            is_loading: false,
          },
        }));
      },

      set_search_loading: (loading: boolean) => {
        set((state) => ({
          search_state: {
            ...state.search_state,
            is_loading: loading,
          },
        }));
      },

      set_search_results: (results: SearchResults) => {
        set((state) => ({
          search_state: {
            ...state.search_state,
            search_results: results,
            is_loading: false,
          },
        }));
      },

      // Saved properties actions
      add_saved_property: (property_id: string, property?: Property) => {
        set((state) => {
          const existing_ids = state.saved_properties_state.saved_property_ids;
          if (existing_ids.includes(property_id)) {
            return state; // Already saved
          }

          return {
            saved_properties_state: {
              ...state.saved_properties_state,
              saved_property_ids: [...existing_ids, property_id],
              saved_properties: property 
                ? [...state.saved_properties_state.saved_properties, property]
                : state.saved_properties_state.saved_properties,
              last_updated: new Date().toISOString(),
            },
          };
        });
      },

      remove_saved_property: (property_id: string) => {
        set((state) => ({
          saved_properties_state: {
            ...state.saved_properties_state,
            saved_property_ids: state.saved_properties_state.saved_property_ids.filter(id => id !== property_id),
            saved_properties: state.saved_properties_state.saved_properties.filter(p => p.property_id !== property_id),
            last_updated: new Date().toISOString(),
          },
        }));
      },

      sync_saved_properties: (properties: Property[]) => {
        set((state) => ({
          saved_properties_state: {
            ...state.saved_properties_state,
            saved_properties: properties,
            saved_property_ids: properties.map(p => p.property_id),
            last_updated: new Date().toISOString(),
          },
        }));
      },

      // Notification actions
      update_notification_counts: (inquiry_count: number, notifications_count: number) => {
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            unread_inquiry_count: inquiry_count,
            unread_notifications_count: notifications_count,
          },
        }));
      },

      add_notification: (notification: Notification) => {
        set((state) => {
          const recent_notifications = [notification, ...state.notification_state.recent_notifications].slice(0, 10); // Keep only 10 most recent
          
          return {
            notification_state: {
              ...state.notification_state,
              recent_notifications,
              unread_notifications_count: state.notification_state.unread_notifications_count + (notification.is_read ? 0 : 1),
            },
          };
        });
      },

      mark_notifications_read: (notification_ids: string[]) => {
        set((state) => {
          const updated_notifications = state.notification_state.recent_notifications.map(notification =>
            notification_ids.includes(notification.notification_id)
              ? { ...notification, is_read: true }
              : notification
          );

          const newly_read_count = notification_ids.filter(id =>
            state.notification_state.recent_notifications.find(n => n.notification_id === id && !n.is_read)
          ).length;

          return {
            notification_state: {
              ...state.notification_state,
              recent_notifications: updated_notifications,
              unread_notifications_count: Math.max(0, state.notification_state.unread_notifications_count - newly_read_count),
            },
          };
        });
      },

      set_recent_notifications: (notifications: Notification[]) => {
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            recent_notifications: notifications,
          },
        }));
      },
    }),
    {
      name: 'natureestate-storage',
      partialize: (state) => ({
        authentication_state: {
          current_user: state.authentication_state.current_user,
          auth_token: state.authentication_state.auth_token,
          authentication_status: {
            is_authenticated: state.authentication_state.authentication_status.is_authenticated,
            is_loading: false, // Never persist loading state
          },
          error_message: null, // Never persist errors
        },
        search_state: {
          current_search_criteria: state.search_state.current_search_criteria,
          search_results: null, // Don't persist search results
          is_loading: false, // Never persist loading state
        },
        saved_properties_state: {
          saved_property_ids: state.saved_properties_state.saved_property_ids,
          saved_properties: state.saved_properties_state.saved_properties,
          last_updated: state.saved_properties_state.last_updated,
        },
        notification_state: {
          unread_inquiry_count: 0, // Don't persist counts, reload on app start
          unread_notifications_count: 0, // Don't persist counts, reload on app start
          recent_notifications: [], // Don't persist notifications, reload on app start
        },
      }),
    }
  )
);