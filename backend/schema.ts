import { z } from 'zod';

// ==================== USERS ====================

export const userSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  password_hash: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  user_type: z.string(),
  profile_photo_url: z.string().nullable(),
  is_verified: z.boolean(),
  email_verified: z.boolean(),
  email_verification_token: z.string().nullable(),
  password_reset_token: z.string().nullable(),
  password_reset_expires: z.string().nullable(),
  notification_preferences: z.string().nullable(),
  countries_of_interest: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  last_login_at: z.string().nullable()
});

export const createUserInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  phone: z.string().max(50).nullable(),
  user_type: z.enum(['buyer', 'seller', 'agent', 'admin']),
  profile_photo_url: z.string().url().nullable(),
  notification_preferences: z.string().nullable(),
  countries_of_interest: z.string().nullable()
});

export const updateUserInputSchema = z.object({
  user_id: z.string(),
  email: z.string().email().max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).nullable().optional(),
  user_type: z.enum(['buyer', 'seller', 'agent', 'admin']).optional(),
  profile_photo_url: z.string().url().nullable().optional(),
  notification_preferences: z.string().nullable().optional(),
  countries_of_interest: z.string().nullable().optional()
});

export const searchUsersInputSchema = z.object({
  query: z.string().optional(),
  user_type: z.enum(['buyer', 'seller', 'agent', 'admin']).optional(),
  is_verified: z.coerce.boolean().optional(),
  email_verified: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().default(10),
  offset: z.coerce.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'email', 'created_at', 'last_login_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ==================== PROPERTIES ====================

export const propertySchema = z.object({
  property_id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  property_type: z.string(),
  status: z.string(),
  price: z.number(),
  currency: z.string(),
  country: z.string(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  square_footage: z.number().nullable(),
  land_size: z.number().nullable(),
  land_size_unit: z.string().nullable(),
  bedrooms: z.number().int().nullable(),
  bathrooms: z.number().int().nullable(),
  year_built: z.number().int().nullable(),
  natural_features: z.string().nullable(),
  outdoor_amenities: z.string().nullable(),
  indoor_amenities: z.string().nullable(),
  view_types: z.string().nullable(),
  nearby_attractions: z.string().nullable(),
  distance_to_landmarks: z.string().nullable(),
  environmental_features: z.string().nullable(),
  outdoor_activities: z.string().nullable(),
  property_condition: z.string().nullable(),
  special_features: z.string().nullable(),
  listing_duration_days: z.number().int(),
  is_featured: z.boolean(),
  featured_until: z.string().nullable(),
  view_count: z.number().int(),
  inquiry_count: z.number().int(),
  favorite_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
  expires_at: z.string().nullable()
});

export const createPropertyInputSchema = z.object({
  user_id: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).nullable(),
  property_type: z.enum(['villa', 'cabin', 'condominium', 'farm', 'land', 'mansion', 'house', 'apartment', 'commercial']),
  price: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  country: z.string().min(1).max(100),
  region: z.string().max(100).nullable(),
  city: z.string().max(100).nullable(),
  address: z.string().max(500).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  square_footage: z.number().positive().nullable(),
  land_size: z.number().positive().nullable(),
  land_size_unit: z.enum(['acres', 'hectares', 'sqft', 'sqm']).nullable(),
  bedrooms: z.number().int().nonnegative().nullable(),
  bathrooms: z.number().int().nonnegative().nullable(),
  year_built: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  natural_features: z.string().nullable(),
  outdoor_amenities: z.string().nullable(),
  indoor_amenities: z.string().nullable(),
  view_types: z.string().nullable(),
  nearby_attractions: z.string().nullable(),
  distance_to_landmarks: z.string().nullable(),
  environmental_features: z.string().nullable(),
  outdoor_activities: z.string().nullable(),
  property_condition: z.enum(['excellent', 'very good', 'good', 'fair', 'needs work', 'pristine', 'restored']).nullable(),
  special_features: z.string().nullable(),
  listing_duration_days: z.number().int().positive().default(90)
});

export const updatePropertyInputSchema = z.object({
  property_id: z.string(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  property_type: z.enum(['villa', 'cabin', 'condominium', 'farm', 'land', 'mansion', 'house', 'apartment', 'commercial']).optional(),
  status: z.enum(['active', 'inactive', 'sold', 'pending', 'withdrawn']).optional(),
  price: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  country: z.string().min(1).max(100).optional(),
  region: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  square_footage: z.number().positive().nullable().optional(),
  land_size: z.number().positive().nullable().optional(),
  land_size_unit: z.enum(['acres', 'hectares', 'sqft', 'sqm']).nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().int().nonnegative().nullable().optional(),
  year_built: z.number().int().min(1800).max(new Date().getFullYear()).nullable().optional(),
  property_condition: z.enum(['excellent', 'very good', 'good', 'fair', 'needs work', 'pristine', 'restored']).nullable().optional(),
  is_featured: z.boolean().optional(),
  featured_until: z.string().nullable().optional()
});

export const searchPropertiesInputSchema = z.object({
  query: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  property_type: z.enum(['villa', 'cabin', 'condominium', 'farm', 'land', 'mansion', 'house', 'apartment', 'commercial']).optional(),
  status: z.enum(['active', 'inactive', 'sold', 'pending', 'withdrawn']).default('active'),
  price_min: z.coerce.number().nonnegative().optional(),
  price_max: z.coerce.number().positive().optional(),
  bedrooms_min: z.coerce.number().int().nonnegative().optional(),
  bathrooms_min: z.coerce.number().int().nonnegative().optional(),
  square_footage_min: z.coerce.number().positive().optional(),
  square_footage_max: z.coerce.number().positive().optional(),
  land_size_min: z.coerce.number().positive().optional(),
  land_size_max: z.coerce.number().positive().optional(),
  year_built_min: z.coerce.number().int().optional(),
  year_built_max: z.coerce.number().int().optional(),
  natural_features: z.string().optional(),
  outdoor_amenities: z.string().optional(),
  location_text: z.string().optional(),
  is_featured: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  sort_by: z.enum(['price', 'created_at', 'view_count', 'title', 'square_footage']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ==================== PROPERTY PHOTOS ====================

export const propertyPhotoSchema = z.object({
  photo_id: z.string(),
  property_id: z.string(),
  photo_url: z.string(),
  caption: z.string().nullable(),
  photo_order: z.number().int(),
  is_primary: z.boolean(),
  photo_type: z.string().nullable(),
  file_size: z.number().int().nullable(),
  created_at: z.string()
});

export const createPropertyPhotoInputSchema = z.object({
  property_id: z.string(),
  photo_url: z.string().url(),
  caption: z.string().max(500).nullable(),
  photo_order: z.number().int().nonnegative().default(0),
  is_primary: z.boolean().default(false),
  photo_type: z.enum(['exterior', 'interior', 'aerial', 'floor_plan', 'amenity']).nullable(),
  file_size: z.number().int().positive().nullable()
});

export const updatePropertyPhotoInputSchema = z.object({
  photo_id: z.string(),
  caption: z.string().max(500).nullable().optional(),
  photo_order: z.number().int().nonnegative().optional(),
  is_primary: z.boolean().optional(),
  photo_type: z.enum(['exterior', 'interior', 'aerial', 'floor_plan', 'amenity']).nullable().optional()
});

// ==================== PROPERTY INQUIRIES ====================

export const propertyInquirySchema = z.object({
  inquiry_id: z.string(),
  property_id: z.string(),
  sender_user_id: z.string().nullable(),
  recipient_user_id: z.string(),
  sender_name: z.string(),
  sender_email: z.string(),
  sender_phone: z.string().nullable(),
  message: z.string(),
  status: z.string(),
  is_interested_in_viewing: z.boolean(),
  wants_similar_properties: z.boolean(),
  response_message: z.string().nullable(),
  responded_at: z.string().nullable(),
  priority: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createPropertyInquiryInputSchema = z.object({
  property_id: z.string(),
  sender_user_id: z.string().nullable(),
  recipient_user_id: z.string(),
  sender_name: z.string().min(1).max(255),
  sender_email: z.string().email(),
  sender_phone: z.string().max(50).nullable(),
  message: z.string().min(1).max(2000),
  is_interested_in_viewing: z.boolean().default(false),
  wants_similar_properties: z.boolean().default(false),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
});

export const updatePropertyInquiryInputSchema = z.object({
  inquiry_id: z.string(),
  status: z.enum(['unread', 'read', 'responded', 'archived']).optional(),
  response_message: z.string().max(2000).nullable().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional()
});

export const searchPropertyInquiriesInputSchema = z.object({
  property_id: z.string().optional(),
  recipient_user_id: z.string().optional(),
  sender_user_id: z.string().optional(),
  status: z.enum(['unread', 'read', 'responded', 'archived']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  is_interested_in_viewing: z.coerce.boolean().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().int().positive().default(10),
  offset: z.coerce.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'priority', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ==================== SAVED PROPERTIES ====================

export const savedPropertySchema = z.object({
  saved_property_id: z.string(),
  user_id: z.string(),
  property_id: z.string(),
  notes: z.string().nullable(),
  created_at: z.string()
});

export const createSavedPropertyInputSchema = z.object({
  user_id: z.string(),
  property_id: z.string(),
  notes: z.string().max(1000).nullable()
});

export const updateSavedPropertyInputSchema = z.object({
  saved_property_id: z.string(),
  notes: z.string().max(1000).nullable().optional()
});

// ==================== SAVED SEARCHES ====================

export const savedSearchSchema = z.object({
  saved_search_id: z.string(),
  user_id: z.string(),
  search_name: z.string(),
  country: z.string().nullable(),
  property_type: z.string().nullable(),
  price_min: z.number().nullable(),
  price_max: z.number().nullable(),
  bedrooms_min: z.number().int().nullable(),
  bathrooms_min: z.number().int().nullable(),
  square_footage_min: z.number().nullable(),
  square_footage_max: z.number().nullable(),
  land_size_min: z.number().nullable(),
  land_size_max: z.number().nullable(),
  natural_features: z.string().nullable(),
  outdoor_amenities: z.string().nullable(),
  location_text: z.string().nullable(),
  alert_frequency: z.string(),
  is_active: z.boolean(),
  last_alert_sent: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createSavedSearchInputSchema = z.object({
  user_id: z.string(),
  search_name: z.string().min(1).max(255),
  country: z.string().max(100).nullable(),
  property_type: z.enum(['villa', 'cabin', 'condominium', 'farm', 'land', 'mansion', 'house', 'apartment', 'commercial']).nullable(),
  price_min: z.number().nonnegative().nullable(),
  price_max: z.number().positive().nullable(),
  bedrooms_min: z.number().int().nonnegative().nullable(),
  bathrooms_min: z.number().int().nonnegative().nullable(),
  square_footage_min: z.number().positive().nullable(),
  square_footage_max: z.number().positive().nullable(),
  land_size_min: z.number().positive().nullable(),
  land_size_max: z.number().positive().nullable(),
  natural_features: z.string().nullable(),
  outdoor_amenities: z.string().nullable(),
  location_text: z.string().max(500).nullable(),
  alert_frequency: z.enum(['daily', 'weekly', 'monthly', 'never']).default('weekly'),
  is_active: z.boolean().default(true)
});

export const updateSavedSearchInputSchema = z.object({
  saved_search_id: z.string(),
  search_name: z.string().min(1).max(255).optional(),
  country: z.string().max(100).nullable().optional(),
  property_type: z.enum(['villa', 'cabin', 'condominium', 'farm', 'land', 'mansion', 'house', 'apartment', 'commercial']).nullable().optional(),
  price_min: z.number().nonnegative().nullable().optional(),
  price_max: z.number().positive().nullable().optional(),
  bedrooms_min: z.number().int().nonnegative().nullable().optional(),
  bathrooms_min: z.number().int().nonnegative().nullable().optional(),
  square_footage_min: z.number().positive().nullable().optional(),
  square_footage_max: z.number().positive().nullable().optional(),
  land_size_min: z.number().positive().nullable().optional(),
  land_size_max: z.number().positive().nullable().optional(),
  natural_features: z.string().nullable().optional(),
  outdoor_amenities: z.string().nullable().optional(),
  location_text: z.string().max(500).nullable().optional(),
  alert_frequency: z.enum(['daily', 'weekly', 'monthly', 'never']).optional(),
  is_active: z.boolean().optional()
});

// ==================== SEARCH HISTORY ====================

export const searchHistorySchema = z.object({
  search_history_id: z.string(),
  user_id: z.string().nullable(),
  session_id: z.string().nullable(),
  country: z.string().nullable(),
  property_type: z.string().nullable(),
  price_min: z.number().nullable(),
  price_max: z.number().nullable(),
  bedrooms_min: z.number().int().nullable(),
  bathrooms_min: z.number().int().nullable(),
  square_footage_min: z.number().nullable(),
  square_footage_max: z.number().nullable(),
  land_size_min: z.number().nullable(),
  land_size_max: z.number().nullable(),
  natural_features: z.string().nullable(),
  outdoor_amenities: z.string().nullable(),
  location_text: z.string().nullable(),
  sort_by: z.string().nullable(),
  results_count: z.number().int().nullable(),
  created_at: z.string()
});

export const createSearchHistoryInputSchema = z.object({
  user_id: z.string().nullable().optional(),
  session_id: z.string().nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  property_type: z.enum(['villa', 'cabin', 'condominium', 'farm', 'land', 'mansion', 'house', 'apartment', 'commercial']).nullable().optional(),
  price_min: z.coerce.number().nonnegative().nullable().optional(),
  price_max: z.coerce.number().positive().nullable().optional(),
  bedrooms_min: z.coerce.number().int().nonnegative().nullable().optional(),
  bathrooms_min: z.coerce.number().int().nonnegative().nullable().optional(),
  square_footage_min: z.coerce.number().positive().nullable().optional(),
  square_footage_max: z.coerce.number().positive().nullable().optional(),
  land_size_min: z.coerce.number().positive().nullable().optional(),
  land_size_max: z.coerce.number().positive().nullable().optional(),
  natural_features: z.string().nullable().optional(),
  outdoor_amenities: z.string().nullable().optional(),
  location_text: z.string().max(500).nullable().optional(),
  sort_by: z.string().max(50).nullable().optional(),
  results_count: z.coerce.number().int().nonnegative().nullable().optional()
});

// ==================== NOTIFICATIONS ====================

export const notificationSchema = z.object({
  notification_id: z.string(),
  user_id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  related_property_id: z.string().nullable(),
  related_inquiry_id: z.string().nullable(),
  is_read: z.boolean(),
  is_email_sent: z.boolean(),
  email_sent_at: z.string().nullable(),
  action_url: z.string().nullable(),
  priority: z.string(),
  expires_at: z.string().nullable(),
  created_at: z.string()
});

export const createNotificationInputSchema = z.object({
  user_id: z.string(),
  type: z.enum(['inquiry', 'saved_search', 'property_update', 'system', 'marketing']),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  related_property_id: z.string().nullable(),
  related_inquiry_id: z.string().nullable(),
  action_url: z.string().url().nullable(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  expires_at: z.string().nullable()
});

export const updateNotificationInputSchema = z.object({
  notification_id: z.string(),
  is_read: z.boolean().optional(),
  is_email_sent: z.boolean().optional(),
  email_sent_at: z.string().nullable().optional()
});

export const searchNotificationsInputSchema = z.object({
  user_id: z.string().optional(),
  type: z.enum(['inquiry', 'saved_search', 'property_update', 'system', 'marketing']).optional(),
  is_read: z.coerce.boolean().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().int().positive().default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'priority', 'type']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ==================== PROPERTY VIEWS ====================

export const propertyViewSchema = z.object({
  view_id: z.string(),
  property_id: z.string(),
  user_id: z.string().nullable(),
  session_id: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  referrer_url: z.string().nullable(),
  view_duration_seconds: z.number().int().nullable(),
  created_at: z.string()
});

export const createPropertyViewInputSchema = z.object({
  property_id: z.string(),
  user_id: z.string().nullable(),
  session_id: z.string().nullable(),
  ip_address: z.string().max(45).nullable(),
  user_agent: z.string().max(500).nullable(),
  referrer_url: z.string().url().nullable(),
  view_duration_seconds: z.number().int().positive().nullable()
});

// ==================== USER SESSIONS ====================

export const userSessionSchema = z.object({
  session_id: z.string(),
  user_id: z.string(),
  jwt_token: z.string(),
  refresh_token: z.string().nullable(),
  device_info: z.string().nullable(),
  ip_address: z.string().nullable(),
  is_active: z.boolean(),
  expires_at: z.string(),
  created_at: z.string(),
  last_activity_at: z.string()
});

export const createUserSessionInputSchema = z.object({
  user_id: z.string(),
  jwt_token: z.string(),
  refresh_token: z.string().nullable(),
  device_info: z.string().max(500).nullable(),
  ip_address: z.string().max(45).nullable(),
  expires_at: z.string()
});

export const updateUserSessionInputSchema = z.object({
  session_id: z.string(),
  jwt_token: z.string().optional(),
  refresh_token: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  expires_at: z.string().optional()
});

// ==================== PROPERTY ANALYTICS ====================

export const propertyAnalyticsSchema = z.object({
  analytics_id: z.string(),
  property_id: z.string(),
  date: z.string(),
  views_count: z.number().int(),
  inquiries_count: z.number().int(),
  favorites_count: z.number().int(),
  shares_count: z.number().int(),
  search_impressions: z.number().int(),
  created_at: z.string()
});

export const createPropertyAnalyticsInputSchema = z.object({
  property_id: z.string(),
  date: z.string(),
  views_count: z.number().int().nonnegative().default(0),
  inquiries_count: z.number().int().nonnegative().default(0),
  favorites_count: z.number().int().nonnegative().default(0),
  shares_count: z.number().int().nonnegative().default(0),
  search_impressions: z.number().int().nonnegative().default(0)
});

export const searchPropertyAnalyticsInputSchema = z.object({
  property_id: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().int().positive().default(30),
  offset: z.coerce.number().int().nonnegative().default(0),
  sort_by: z.enum(['date', 'views_count', 'inquiries_count', 'favorites_count']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ==================== INQUIRY RESPONSES ====================

export const inquiryResponseSchema = z.object({
  response_id: z.string(),
  inquiry_id: z.string(),
  sender_user_id: z.string(),
  message: z.string(),
  attachments: z.string().nullable(),
  is_read: z.boolean(),
  created_at: z.string()
});

export const createInquiryResponseInputSchema = z.object({
  inquiry_id: z.string(),
  sender_user_id: z.string(),
  message: z.string().min(1).max(2000),
  attachments: z.string().nullable()
});

export const updateInquiryResponseInputSchema = z.object({
  response_id: z.string(),
  is_read: z.boolean().optional()
});

// ==================== SYSTEM SETTINGS ====================

export const systemSettingSchema = z.object({
  setting_id: z.string(),
  setting_key: z.string(),
  setting_value: z.string(),
  setting_description: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createSystemSettingInputSchema = z.object({
  setting_key: z.string().min(1).max(255),
  setting_value: z.string().min(1).max(1000),
  setting_description: z.string().max(500).nullable(),
  is_public: z.boolean().default(false)
});

export const updateSystemSettingInputSchema = z.object({
  setting_id: z.string(),
  setting_value: z.string().min(1).max(1000).optional(),
  setting_description: z.string().max(500).nullable().optional(),
  is_public: z.boolean().optional()
});

export const searchSystemSettingsInputSchema = z.object({
  query: z.string().optional(),
  is_public: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  sort_by: z.enum(['setting_key', 'created_at', 'updated_at']).default('setting_key'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

// ==================== INFERRED TYPES ====================

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersInputSchema>;

export type Property = z.infer<typeof propertySchema>;
export type CreatePropertyInput = z.infer<typeof createPropertyInputSchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertyInputSchema>;
export type SearchPropertiesInput = z.infer<typeof searchPropertiesInputSchema>;

export type PropertyPhoto = z.infer<typeof propertyPhotoSchema>;
export type CreatePropertyPhotoInput = z.infer<typeof createPropertyPhotoInputSchema>;
export type UpdatePropertyPhotoInput = z.infer<typeof updatePropertyPhotoInputSchema>;

export type PropertyInquiry = z.infer<typeof propertyInquirySchema>;
export type CreatePropertyInquiryInput = z.infer<typeof createPropertyInquiryInputSchema>;
export type UpdatePropertyInquiryInput = z.infer<typeof updatePropertyInquiryInputSchema>;
export type SearchPropertyInquiriesInput = z.infer<typeof searchPropertyInquiriesInputSchema>;

export type SavedProperty = z.infer<typeof savedPropertySchema>;
export type CreateSavedPropertyInput = z.infer<typeof createSavedPropertyInputSchema>;
export type UpdateSavedPropertyInput = z.infer<typeof updateSavedPropertyInputSchema>;

export type SavedSearch = z.infer<typeof savedSearchSchema>;
export type CreateSavedSearchInput = z.infer<typeof createSavedSearchInputSchema>;
export type UpdateSavedSearchInput = z.infer<typeof updateSavedSearchInputSchema>;

export type SearchHistory = z.infer<typeof searchHistorySchema>;
export type CreateSearchHistoryInput = z.infer<typeof createSearchHistoryInputSchema>;

export type Notification = z.infer<typeof notificationSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationInputSchema>;
export type SearchNotificationsInput = z.infer<typeof searchNotificationsInputSchema>;

export type PropertyView = z.infer<typeof propertyViewSchema>;
export type CreatePropertyViewInput = z.infer<typeof createPropertyViewInputSchema>;

export type UserSession = z.infer<typeof userSessionSchema>;
export type CreateUserSessionInput = z.infer<typeof createUserSessionInputSchema>;
export type UpdateUserSessionInput = z.infer<typeof updateUserSessionInputSchema>;

export type PropertyAnalytics = z.infer<typeof propertyAnalyticsSchema>;
export type CreatePropertyAnalyticsInput = z.infer<typeof createPropertyAnalyticsInputSchema>;
export type SearchPropertyAnalyticsInput = z.infer<typeof searchPropertyAnalyticsInputSchema>;

export type InquiryResponse = z.infer<typeof inquiryResponseSchema>;
export type CreateInquiryResponseInput = z.infer<typeof createInquiryResponseInputSchema>;
export type UpdateInquiryResponseInput = z.infer<typeof updateInquiryResponseInputSchema>;

export type SystemSetting = z.infer<typeof systemSettingSchema>;
export type CreateSystemSettingInput = z.infer<typeof createSystemSettingInputSchema>;
export type UpdateSystemSettingInput = z.infer<typeof updateSystemSettingInputSchema>;
export type SearchSystemSettingsInput = z.infer<typeof searchSystemSettingsInputSchema>;