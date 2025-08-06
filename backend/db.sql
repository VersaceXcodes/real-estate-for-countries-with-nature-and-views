-- Create all tables
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    user_type TEXT NOT NULL,
    profile_photo_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TEXT,
    notification_preferences TEXT,
    countries_of_interest TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS properties (
    property_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    title TEXT NOT NULL,
    description TEXT,
    property_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    country TEXT NOT NULL,
    region TEXT,
    city TEXT,
    address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    square_footage NUMERIC,
    land_size NUMERIC,
    land_size_unit TEXT DEFAULT 'acres',
    bedrooms INTEGER,
    bathrooms INTEGER,
    year_built INTEGER,
    natural_features TEXT,
    outdoor_amenities TEXT,
    indoor_amenities TEXT,
    view_types TEXT,
    nearby_attractions TEXT,
    distance_to_landmarks TEXT,
    environmental_features TEXT,
    outdoor_activities TEXT,
    property_condition TEXT,
    special_features TEXT,
    listing_duration_days INTEGER NOT NULL DEFAULT 90,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    featured_until TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    inquiry_count INTEGER NOT NULL DEFAULT 0,
    favorite_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS property_photos (
    photo_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id),
    photo_url TEXT NOT NULL,
    caption TEXT,
    photo_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    photo_type TEXT,
    file_size INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS property_inquiries (
    inquiry_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id),
    sender_user_id TEXT REFERENCES users(user_id),
    recipient_user_id TEXT NOT NULL REFERENCES users(user_id),
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    is_interested_in_viewing BOOLEAN NOT NULL DEFAULT false,
    wants_similar_properties BOOLEAN NOT NULL DEFAULT false,
    response_message TEXT,
    responded_at TEXT,
    priority TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_properties (
    saved_property_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    property_id TEXT NOT NULL REFERENCES properties(property_id),
    notes TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_searches (
    saved_search_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    search_name TEXT NOT NULL,
    country TEXT,
    property_type TEXT,
    price_min NUMERIC,
    price_max NUMERIC,
    bedrooms_min INTEGER,
    bathrooms_min INTEGER,
    square_footage_min NUMERIC,
    square_footage_max NUMERIC,
    land_size_min NUMERIC,
    land_size_max NUMERIC,
    natural_features TEXT,
    outdoor_amenities TEXT,
    location_text TEXT,
    alert_frequency TEXT NOT NULL DEFAULT 'weekly',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_alert_sent TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_history (
    search_history_id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(user_id),
    session_id TEXT,
    country TEXT,
    property_type TEXT,
    price_min NUMERIC,
    price_max NUMERIC,
    bedrooms_min INTEGER,
    bathrooms_min INTEGER,
    square_footage_min NUMERIC,
    square_footage_max NUMERIC,
    land_size_min NUMERIC,
    land_size_max NUMERIC,
    natural_features TEXT,
    outdoor_amenities TEXT,
    location_text TEXT,
    sort_by TEXT,
    results_count INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_property_id TEXT REFERENCES properties(property_id),
    related_inquiry_id TEXT REFERENCES property_inquiries(inquiry_id),
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_email_sent BOOLEAN NOT NULL DEFAULT false,
    email_sent_at TEXT,
    action_url TEXT,
    priority TEXT NOT NULL DEFAULT 'normal',
    expires_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS property_views (
    view_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id),
    user_id TEXT REFERENCES users(user_id),
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer_url TEXT,
    view_duration_seconds INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    jwt_token TEXT NOT NULL,
    refresh_token TEXT,
    device_info TEXT,
    ip_address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_activity_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS property_analytics (
    analytics_id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(property_id),
    date TEXT NOT NULL,
    views_count INTEGER NOT NULL DEFAULT 0,
    inquiries_count INTEGER NOT NULL DEFAULT 0,
    favorites_count INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,
    search_impressions INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inquiry_responses (
    response_id TEXT PRIMARY KEY,
    inquiry_id TEXT NOT NULL REFERENCES property_inquiries(inquiry_id),
    sender_user_id TEXT NOT NULL REFERENCES users(user_id),
    message TEXT NOT NULL,
    attachments TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
    setting_id TEXT PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Seed data for users
INSERT INTO users (user_id, email, password_hash, name, phone, user_type, profile_photo_url, is_verified, email_verified, email_verification_token, password_reset_token, password_reset_expires, notification_preferences, countries_of_interest, created_at, updated_at, last_login_at) VALUES
('user_001', 'john.doe@example.com', 'password123', 'John Doe', '+1-555-0101', 'buyer', 'https://picsum.photos/200/200?random=1', true, true, null, null, null, '{"email": true, "sms": false, "push": true}', '["USA", "Canada"]', '2024-01-15T10:30:00Z', '2024-01-15T10:30:00Z', '2024-01-15T09:30:00Z'),
('user_002', 'jane.smith@example.com', 'password123', 'Jane Smith', '+1-555-0102', 'seller', 'https://picsum.photos/200/200?random=2', true, true, null, null, null, '{"email": true, "sms": true, "push": true}', '["Mexico", "Costa Rica"]', '2024-01-16T11:15:00Z', '2024-01-16T11:15:00Z', '2024-01-16T08:45:00Z'),
('user_003', 'mike.johnson@example.com', 'user123', 'Mike Johnson', '+1-555-0103', 'agent', 'https://picsum.photos/200/200?random=3', true, true, null, null, null, '{"email": true, "sms": false, "push": false}', '["Belize", "Panama"]', '2024-01-17T09:20:00Z', '2024-01-17T09:20:00Z', '2024-01-17T07:10:00Z'),
('user_004', 'sarah.wilson@example.com', 'admin123', 'Sarah Wilson', '+1-555-0104', 'buyer', 'https://picsum.photos/200/200?random=4', false, true, 'verify_token_004', null, null, '{"email": true, "sms": true, "push": true}', '["Nicaragua", "Honduras"]', '2024-01-18T14:45:00Z', '2024-01-18T14:45:00Z', null),
('user_005', 'david.brown@example.com', 'password123', 'David Brown', '+1-555-0105', 'seller', 'https://picsum.photos/200/200?random=5', true, true, null, null, null, '{"email": false, "sms": true, "push": true}', '["Guatemala", "El Salvador"]', '2024-01-19T16:30:00Z', '2024-01-19T16:30:00Z', '2024-01-19T15:20:00Z'),
('user_006', 'emma.davis@example.com', 'user123', 'Emma Davis', '+1-555-0106', 'buyer', 'https://picsum.photos/200/200?random=6', true, false, 'verify_token_006', null, null, '{"email": true, "sms": false, "push": true}', '["Mexico"]', '2024-01-20T12:00:00Z', '2024-01-20T12:00:00Z', '2024-01-20T11:30:00Z'),
('user_007', 'robert.taylor@example.com', 'password123', 'Robert Taylor', '+1-555-0107', 'agent', null, true, true, null, null, null, '{"email": true, "sms": true, "push": false}', '["Costa Rica", "Panama"]', '2024-01-21T13:15:00Z', '2024-01-21T13:15:00Z', '2024-01-21T12:45:00Z'),
('user_008', 'lisa.anderson@example.com', 'admin123', 'Lisa Anderson', '+1-555-0108', 'buyer', 'https://picsum.photos/200/200?random=8', true, true, null, 'reset_token_008', '2024-01-22T18:00:00Z', '{"email": true, "sms": false, "push": true}', '["Belize"]', '2024-01-22T10:30:00Z', '2024-01-22T10:30:00Z', '2024-01-22T09:15:00Z');

-- Seed data for properties
INSERT INTO properties (property_id, user_id, title, description, property_type, status, price, currency, country, region, city, address, latitude, longitude, square_footage, land_size, land_size_unit, bedrooms, bathrooms, year_built, natural_features, outdoor_amenities, indoor_amenities, view_types, nearby_attractions, distance_to_landmarks, environmental_features, outdoor_activities, property_condition, special_features, listing_duration_days, is_featured, featured_until, view_count, inquiry_count, favorite_count, created_at, updated_at, expires_at) VALUES
('prop_001', 'user_002', 'Ocean View Villa in Costa Rica', 'Stunning 4-bedroom villa with panoramic ocean views, private pool, and lush tropical gardens. Perfect for vacation rental or permanent residence.', 'villa', 'active', 850000, 'USD', 'Costa Rica', 'Guanacaste', 'Tamarindo', '123 Playa Grande Road', 10.2994, -85.8397, 3500, 2.5, 'acres', 4, 3, 2018, '["Ocean Front", "Tropical Gardens", "Natural Spring"]', '["Private Pool", "Tennis Court", "BBQ Area", "Outdoor Kitchen"]', '["Gourmet Kitchen", "Walk-in Closets", "Home Theater", "Wine Cellar"]', '["Ocean View", "Mountain View", "Garden View"]', '["Tamarindo Beach", "Manuel Antonio National Park"]', '{"beach": "0.1 miles", "airport": "45 minutes"}', '["Protected Wildlife Area", "Sustainable Design"]', '["Surfing", "Fishing", "Hiking", "Horseback Riding"]', 'excellent', '["Smart Home Technology", "Solar Panels", "Private Beach Access"]', 120, true, '2024-03-15T00:00:00Z', 245, 18, 12, '2024-01-15T12:00:00Z', '2024-01-15T12:00:00Z', '2024-05-15T12:00:00Z'),
('prop_002', 'user_005', 'Mountain Retreat in Belize', 'Secluded 3-bedroom cabin nestled in the Maya Mountains with breathtaking valley views and abundant wildlife.', 'cabin', 'active', 425000, 'USD', 'Belize', 'Cayo', 'San Ignacio', '456 Mountain Ridge Trail', 17.1561, -89.0714, 2200, 5.0, 'acres', 3, 2, 2020, '["Rainforest", "Mountain Views", "Wildlife Corridor"]', '["Hiking Trails", "Fire Pit", "Observation Deck"]', '["Stone Fireplace", "Hardwood Floors", "Vaulted Ceilings"]', '["Mountain View", "Valley View", "Forest View"]', '["Caracol Ruins", "Blue Hole National Park"]', '{"ruins": "30 minutes", "town": "15 minutes"}', '["Carbon Neutral", "Rainwater Harvesting"]', '["Hiking", "Bird Watching", "Cave Exploration"]', 'very good', '["Off-Grid Solar System", "Natural Building Materials"]', 90, false, null, 156, 9, 7, '2024-01-16T09:30:00Z', '2024-01-16T09:30:00Z', '2024-04-16T09:30:00Z'),
('prop_003', 'user_002', 'Beachfront Condo in Mexico', 'Modern 2-bedroom oceanfront condominium in exclusive resort community with world-class amenities.', 'condominium', 'active', 320000, 'USD', 'Mexico', 'Quintana Roo', 'Playa del Carmen', '789 Riviera Maya Boulevard', 20.6296, -87.0739, 1800, 0.0, 'acres', 2, 2, 2021, '["Beachfront", "Coral Reef"]', '["Beach Club", "Infinity Pool", "Spa", "Golf Course"]', '["Marble Countertops", "Premium Appliances", "Floor-to-Ceiling Windows"]', '["Ocean View", "Pool View"]', '["Xcaret Park", "Cenote Dos Ojos", "Tulum Ruins"]', '{"beach": "0 miles", "airport": "20 minutes"}', '["Marine Protected Area"]', '["Snorkeling", "Diving", "Golf", "Spa Treatments"]', 'excellent', '["Resort Amenities", "Rental Program", "Concierge Services"]', 90, true, '2024-02-28T00:00:00Z', 389, 25, 19, '2024-01-17T15:45:00Z', '2024-01-17T15:45:00Z', '2024-04-17T15:45:00Z'),
('prop_004', 'user_007', 'Coffee Farm in Guatemala', 'Working organic coffee plantation with colonial hacienda, processing facilities, and 50 acres of premium arabica coffee.', 'farm', 'active', 1200000, 'USD', 'Guatemala', 'Antigua', 'Antigua Guatemala', '321 Finca El Mirador', 14.5586, -90.7340, 4500, 50.0, 'acres', 6, 4, 1920, '["Volcanic Soil", "Cloud Forest", "Natural Springs"]', '["Processing Facility", "Worker Housing", "Equipment Barn"]', '["Colonial Architecture", "Tile Floors", "Beam Ceilings"]', '["Volcano View", "Coffee Plantation View"]', '["Antigua Guatemala", "Volcano Acatenango"]', '{"town": "5 miles", "volcano": "10 miles"}', '["Organic Certification", "Bird Habitat"]', '["Coffee Tourism", "Hiking", "Cultural Tours"]', 'good', '["Income Generating", "Historical Building", "Established Business"]', 180, true, '2024-04-30T00:00:00Z', 98, 6, 4, '2024-01-18T11:20:00Z', '2024-01-18T11:20:00Z', '2024-07-17T11:20:00Z'),
('prop_005', 'user_005', 'Island Paradise in Panama', 'Private 15-acre island with pristine beaches, coconut palms, and development potential in the Caribbean archipelago.', 'land', 'active', 2500000, 'USD', 'Panama', 'Bocas del Toro', 'Isla Colon', 'Cayo Privado Las Perlas', 9.3405, -82.2587, 0, 15.0, 'acres', 0, 0, null, '["Private Island", "Pristine Beaches", "Coral Reef", "Coconut Grove"]', '["Natural Harbor", "Beach Access", "Potential Helipad Site"]', '[]', '["360 Ocean View", "Sunrise View", "Sunset View"]', '["Bocas Town", "Red Frog Beach", "Bastimentos National Park"]', '{"mainland": "2 miles", "airport": "30 minutes by boat"}', '["Marine Sanctuary", "Untouched Ecosystem"]', '["Diving", "Fishing", "Kayaking", "Sailing"]', 'pristine', '["Development Rights", "Private Dock Potential", "Helicopter Access"]', 365, true, '2024-06-30T00:00:00Z', 567, 34, 28, '2024-01-19T14:00:00Z', '2024-01-19T14:00:00Z', '2025-01-19T14:00:00Z'),
('prop_006', 'user_002', 'Colonial Mansion in Nicaragua', 'Restored 19th-century colonial mansion in Granada historic district with courtyard, fountain, and rooftop terrace.', 'mansion', 'active', 675000, 'USD', 'Nicaragua', 'Granada', 'Granada', '654 Calle La Calzada', 11.9344, -85.9560, 5200, 0.3, 'acres', 8, 6, 1890, '["Historic Architecture", "Courtyard Garden"]', '["Rooftop Terrace", "Fountain", "Carriage House"]', '["Original Tile Work", "High Ceilings", "Antique Details"]', '["Courtyard View", "Street View", "Volcano View"]', '["Lake Nicaragua", "Masaya Volcano", "Colonial Churches"]', '{"lake": "1 mile", "volcano": "15 miles"}', '["Historic Preservation Zone"]', '["Cultural Tours", "Volcano Tours", "Lake Activities"]', 'restored', '["Historic Significance", "Investment Potential", "Cultural Heritage"]', 120, false, null, 178, 11, 8, '2024-01-20T16:30:00Z', '2024-01-20T16:30:00Z', '2024-05-20T16:30:00Z');

-- Seed data for property_photos
INSERT INTO property_photos (photo_id, property_id, photo_url, caption, photo_order, is_primary, photo_type, file_size, created_at) VALUES
('photo_001', 'prop_001', 'https://picsum.photos/800/600?random=101', 'Ocean view from main terrace', 1, true, 'exterior', 1250000, '2024-01-15T12:30:00Z'),
('photo_002', 'prop_001', 'https://picsum.photos/800/600?random=102', 'Living room with panoramic windows', 2, false, 'interior', 980000, '2024-01-15T12:31:00Z'),
('photo_003', 'prop_001', 'https://picsum.photos/800/600?random=103', 'Master bedroom suite', 3, false, 'interior', 875000, '2024-01-15T12:32:00Z'),
('photo_004', 'prop_001', 'https://picsum.photos/800/600?random=104', 'Private pool and gardens', 4, false, 'exterior', 1100000, '2024-01-15T12:33:00Z'),
('photo_005', 'prop_002', 'https://picsum.photos/800/600?random=201', 'Mountain cabin exterior', 1, true, 'exterior', 945000, '2024-01-16T10:00:00Z'),
('photo_006', 'prop_002', 'https://picsum.photos/800/600?random=202', 'Cozy living area with fireplace', 2, false, 'interior', 820000, '2024-01-16T10:01:00Z'),
('photo_007', 'prop_002', 'https://picsum.photos/800/600?random=203', 'Valley view from deck', 3, false, 'exterior', 1050000, '2024-01-16T10:02:00Z'),
('photo_008', 'prop_003', 'https://picsum.photos/800/600?random=301', 'Beachfront balcony view', 1, true, 'exterior', 1180000, '2024-01-17T16:00:00Z'),
('photo_009', 'prop_003', 'https://picsum.photos/800/600?random=302', 'Modern kitchen with ocean view', 2, false, 'interior', 890000, '2024-01-17T16:01:00Z'),
('photo_010', 'prop_004', 'https://picsum.photos/800/600?random=401', 'Colonial hacienda main house', 1, true, 'exterior', 1320000, '2024-01-18T11:45:00Z'),
('photo_011', 'prop_004', 'https://picsum.photos/800/600?random=402', 'Coffee plantation aerial view', 2, false, 'aerial', 1450000, '2024-01-18T11:46:00Z'),
('photo_012', 'prop_005', 'https://picsum.photos/800/600?random=501', 'Private island aerial view', 1, true, 'aerial', 1680000, '2024-01-19T14:30:00Z'),
('photo_013', 'prop_005', 'https://picsum.photos/800/600?random=502', 'Pristine beach and coconut palms', 2, false, 'exterior', 1290000, '2024-01-19T14:31:00Z'),
('photo_014', 'prop_006', 'https://picsum.photos/800/600?random=601', 'Colonial mansion facade', 1, true, 'exterior', 1150000, '2024-01-20T17:00:00Z'),
('photo_015', 'prop_006', 'https://picsum.photos/800/600?random=602', 'Interior courtyard with fountain', 2, false, 'interior', 980000, '2024-01-20T17:01:00Z');

-- Seed data for property_inquiries
INSERT INTO property_inquiries (inquiry_id, property_id, sender_user_id, recipient_user_id, sender_name, sender_email, sender_phone, message, status, is_interested_in_viewing, wants_similar_properties, response_message, responded_at, priority, created_at, updated_at) VALUES
('inq_001', 'prop_001', 'user_001', 'user_002', 'John Doe', 'john.doe@example.com', '+1-555-0101', 'I am very interested in this beautiful ocean view villa. Could we schedule a viewing next week? I am particularly interested in the investment potential for vacation rentals.', 'read', true, true, 'Thank you for your interest! I would be happy to arrange a viewing. Let me check my schedule and get back to you.', '2024-01-16T10:30:00Z', 'high', '2024-01-16T09:15:00Z', '2024-01-16T10:30:00Z'),
('inq_002', 'prop_003', 'user_004', 'user_002', 'Sarah Wilson', 'sarah.wilson@example.com', '+1-555-0104', 'This beachfront condo looks perfect for our retirement plans. What are the HOA fees and resort amenities included?', 'responded', false, false, 'The HOA fees are $450/month and include all resort amenities, security, and maintenance. I can send you a detailed breakdown.', '2024-01-18T14:20:00Z', 'normal', '2024-01-18T13:45:00Z', '2024-01-18T14:20:00Z'),
('inq_003', 'prop_005', 'user_006', 'user_005', 'Emma Davis', 'emma.davis@example.com', '+1-555-0106', 'I represent a group of investors interested in unique development opportunities. Can you provide more details about development restrictions and permits for this island?', 'unread', false, true, null, null, 'high', '2024-01-21T11:30:00Z', '2024-01-21T11:30:00Z'),
('inq_004', 'prop_002', 'user_008', 'user_005', 'Lisa Anderson', 'lisa.anderson@example.com', '+1-555-0108', 'We love the mountain retreat concept. Is the property accessible year-round, and what are the utility situations?', 'read', true, false, null, null, 'normal', '2024-01-22T15:45:00Z', '2024-01-22T15:45:00Z'),
('inq_005', 'prop_004', 'user_001', 'user_007', 'John Doe', 'john.doe@example.com', '+1-555-0101', 'The coffee farm looks like an amazing opportunity. Can you provide financial records and production data for the last 3 years?', 'unread', false, false, null, null, 'normal', '2024-01-23T10:20:00Z', '2024-01-23T10:20:00Z');

-- Seed data for saved_properties
INSERT INTO saved_properties (saved_property_id, user_id, property_id, notes, created_at) VALUES
('saved_001', 'user_001', 'prop_001', 'Love the ocean view and investment potential. Need to check financing options.', '2024-01-16T08:30:00Z'),
('saved_002', 'user_001', 'prop_004', 'Interesting business opportunity. Research coffee market trends.', '2024-01-18T12:15:00Z'),
('saved_003', 'user_004', 'prop_003', 'Perfect for retirement. Check HOA details and resale values.', '2024-01-18T13:00:00Z'),
('saved_004', 'user_006', 'prop_005', 'Unique investment opportunity. Need to research development laws in Panama.', '2024-01-21T10:45:00Z'),
('saved_005', 'user_008', 'prop_002', 'Great for weekend getaway. Check accessibility during rainy season.', '2024-01-22T14:30:00Z'),
('saved_006', 'user_001', 'prop_006', 'Beautiful historic property. Consider for cultural tourism business.', '2024-01-21T16:20:00Z');

-- Seed data for saved_searches
INSERT INTO saved_searches (saved_search_id, user_id, search_name, country, property_type, price_min, price_max, bedrooms_min, bathrooms_min, square_footage_min, square_footage_max, land_size_min, land_size_max, natural_features, outdoor_amenities, location_text, alert_frequency, is_active, last_alert_sent, created_at, updated_at) VALUES
('search_001', 'user_001', 'Ocean View Properties', 'Costa Rica', 'villa', 500000, 1000000, 3, 2, 2500, 5000, 1.0, 5.0, '["Ocean Front", "Beach Access"]', '["Private Pool"]', 'Guanacaste Province', 'weekly', true, '2024-01-20T09:00:00Z', '2024-01-16T10:00:00Z', '2024-01-20T09:00:00Z'),
('search_002', 'user_004', 'Retirement Properties', 'Mexico', 'condominium', 200000, 500000, 2, 2, 1500, 3000, null, null, '["Beachfront"]', '["Beach Club", "Golf Course"]', 'Riviera Maya', 'daily', true, '2024-01-22T08:00:00Z', '2024-01-18T14:30:00Z', '2024-01-22T08:00:00Z'),
('search_003', 'user_006', 'Investment Islands', 'Panama', 'land', 1000000, 5000000, null, null, null, null, 5.0, 50.0, '["Private Island", "Beachfront"]', '["Natural Harbor"]', 'Caribbean Coast', 'monthly', true, null, '2024-01-21T11:00:00Z', '2024-01-21T11:00:00Z'),
('search_004', 'user_008', 'Mountain Retreats', 'Belize', 'cabin', 300000, 600000, 2, 1, 1500, 3000, 2.0, 10.0, '["Mountain Views", "Rainforest"]', '["Hiking Trails"]', 'Cayo District', 'weekly', true, null, '2024-01-22T16:00:00Z', '2024-01-22T16:00:00Z');

-- Seed data for search_history
INSERT INTO search_history (search_history_id, user_id, session_id, country, property_type, price_min, price_max, bedrooms_min, bathrooms_min, square_footage_min, square_footage_max, land_size_min, land_size_max, natural_features, outdoor_amenities, location_text, sort_by, results_count, created_at) VALUES
('hist_001', 'user_001', 'session_101', 'Costa Rica', 'villa', 400000, 1200000, 3, 2, null, null, 1.0, null, '["Ocean Front"]', null, 'Pacific Coast', 'price_asc', 12, '2024-01-16T09:00:00Z'),
('hist_002', 'user_004', 'session_102', 'Mexico', 'condominium', 250000, 400000, 2, 2, null, null, null, null, '["Beachfront"]', '["Pool"]', 'Playa del Carmen', 'newest', 8, '2024-01-18T13:30:00Z'),
('hist_003', null, 'session_103', 'Belize', null, null, 800000, null, null, null, null, 3.0, null, '["Mountain Views"]', null, 'Cayo', 'price_desc', 15, '2024-01-19T11:15:00Z'),
('hist_004', 'user_006', 'session_104', 'Panama', 'land', 1000000, null, null, null, null, null, 10.0, null, '["Island", "Beachfront"]', null, 'Bocas del Toro', 'featured', 3, '2024-01-21T10:30:00Z'),
('hist_005', 'user_008', 'session_105', 'Guatemala', 'farm', 500000, 1500000, null, null, null, null, 20.0, null, '["Volcanic Soil"]', null, 'Antigua region', 'price_asc', 6, '2024-01-22T15:20:00Z');

-- Seed data for notifications
INSERT INTO notifications (notification_id, user_id, type, title, message, related_property_id, related_inquiry_id, is_read, is_email_sent, email_sent_at, action_url, priority, expires_at, created_at) VALUES
('notif_001', 'user_002', 'inquiry', 'New Property Inquiry', 'You have received a new inquiry for your Ocean View Villa in Costa Rica from John Doe.', 'prop_001', 'inq_001', true, true, '2024-01-16T09:20:00Z', '/inquiries/inq_001', 'high', null, '2024-01-16T09:15:00Z'),
('notif_002', 'user_001', 'saved_search', 'New Properties Match Your Search', '3 new properties match your saved search "Ocean View Properties" in Costa Rica.', null, null, false, false, null, '/search/saved_001', 'normal', '2024-02-20T09:00:00Z', '2024-01-20T09:00:00Z'),
('notif_003', 'user_002', 'inquiry', 'Property Inquiry Response', 'You have received a response to your inquiry about the Beachfront Condo in Mexico.', 'prop_003', 'inq_002', false, true, '2024-01-18T14:25:00Z', '/inquiries/inq_002', 'normal', null, '2024-01-18T14:20:00Z'),
('notif_004', 'user_005', 'inquiry', 'High Priority Inquiry', 'You have received a high priority inquiry from investors about your Private Island in Panama.', 'prop_005', 'inq_003', false, false, null, '/inquiries/inq_003', 'high', null, '2024-01-21T11:30:00Z'),
('notif_005', 'user_004', 'saved_search', 'Daily Search Alert', '2 new retirement properties in Mexico match your criteria.', null, null, true, true, '2024-01-22T08:05:00Z', '/search/saved_002', 'normal', '2024-02-22T08:00:00Z', '2024-01-22T08:00:00Z');

-- Seed data for property_views
INSERT INTO property_views (view_id, property_id, user_id, session_id, ip_address, user_agent, referrer_url, view_duration_seconds, created_at) VALUES
('view_001', 'prop_001', 'user_001', 'session_101', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'https://google.com', 245, '2024-01-16T09:00:00Z'),
('view_002', 'prop_001', 'user_004', 'session_102', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'https://facebook.com', 180, '2024-01-16T14:30:00Z'),
('view_003', 'prop_003', 'user_004', 'session_102', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '/properties', 320, '2024-01-18T13:30:00Z'),
('view_004', 'prop_005', 'user_006', 'session_104', '192.168.1.103', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15', '/search', 420, '2024-01-21T10:30:00Z'),
('view_005', 'prop_002', 'user_008', 'session_105', '192.168.1.104', 'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0', '/properties', 290, '2024-01-22T15:20:00Z'),
('view_006', 'prop_001', null, 'session_106', '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'https://instagram.com', 95, '2024-01-23T10:15:00Z');

-- Seed data for user_sessions
INSERT INTO user_sessions (session_id, user_id, jwt_token, refresh_token, device_info, ip_address, is_active, expires_at, created_at, last_activity_at) VALUES
('session_101', 'user_001', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8wMDEifQ.token', 'refresh_token_001', 'Windows 10, Chrome 120', '192.168.1.100', true, '2024-02-15T09:00:00Z', '2024-01-16T09:00:00Z', '2024-01-23T11:30:00Z'),
('session_102', 'user_004', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8wMDQifQ.token', 'refresh_token_004', 'macOS 12, Safari 16', '192.168.1.101', true, '2024-02-18T13:30:00Z', '2024-01-18T13:30:00Z', '2024-01-23T09:45:00Z'),
('session_103', 'user_006', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8wMDYifQ.token', 'refresh_token_006', 'iOS 15, Mobile Safari', '192.168.1.102', false, '2024-02-20T12:00:00Z', '2024-01-20T12:00:00Z', '2024-01-20T18:30:00Z'),
('session_104', 'user_006', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8wMDYifQ.new_token', 'refresh_token_006_new', 'iOS 15, Mobile Safari', '192.168.1.103', true, '2024-02-21T10:30:00Z', '2024-01-21T10:30:00Z', '2024-01-23T14:20:00Z'),
('session_105', 'user_008', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8wMDgifQ.token', 'refresh_token_008', 'Android 11, Firefox Mobile', '192.168.1.104', true, '2024-02-22T15:20:00Z', '2024-01-22T15:20:00Z', '2024-01-23T12:10:00Z');

-- Seed data for property_analytics
INSERT INTO property_analytics (analytics_id, property_id, date, views_count, inquiries_count, favorites_count, shares_count, search_impressions, created_at) VALUES
('analytics_001', 'prop_001', '2024-01-16', 15, 1, 2, 3, 45, '2024-01-17T00:00:00Z'),
('analytics_002', 'prop_001', '2024-01-17', 22, 0, 1, 5, 67, '2024-01-18T00:00:00Z'),
('analytics_003', 'prop_001', '2024-01-18', 18, 0, 0, 2, 52, '2024-01-19T00:00:00Z'),
('analytics_004', 'prop_003', '2024-01-18', 28, 1, 1, 8, 89, '2024-01-19T00:00:00Z'),
('analytics_005', 'prop_003', '2024-01-19', 35, 0, 2, 12, 105, '2024-01-20T00:00:00Z'),
('analytics_006', 'prop_005', '2024-01-21', 42, 1, 3, 15, 78, '2024-01-22T00:00:00Z'),
('analytics_007', 'prop_002', '2024-01-22', 19, 1, 1, 4, 34, '2024-01-23T00:00:00Z'),
('analytics_008', 'prop_004', '2024-01-18', 8, 0, 1, 1, 23, '2024-01-19T00:00:00Z'),
('analytics_009', 'prop_004', '2024-01-23', 12, 1, 0, 2, 31, '2024-01-24T00:00:00Z'),
('analytics_010', 'prop_006', '2024-01-20', 25, 0, 1, 6, 56, '2024-01-21T00:00:00Z');

-- Seed data for inquiry_responses
INSERT INTO inquiry_responses (response_id, inquiry_id, sender_user_id, message, attachments, is_read, created_at) VALUES
('resp_001', 'inq_001', 'user_002', 'Thank you for your interest! I would be happy to arrange a viewing. Let me check my schedule and get back to you within 24 hours. The property has excellent rental potential with 85% occupancy rates in the area.', null, true, '2024-01-16T10:30:00Z'),
('resp_002', 'inq_001', 'user_001', 'That sounds great! I am flexible with timing. Also, could you provide information about property management companies in the area for vacation rentals?', null, true, '2024-01-16T15:45:00Z'),
('resp_003', 'inq_002', 'user_002', 'The HOA fees are $450/month and include all resort amenities, 24/7 security, maintenance, landscaping, and access to the beach club, spa, and golf course. I can send you a detailed breakdown and the resort amenity list.', '["hoa_breakdown.pdf", "amenity_list.pdf"]', false, '2024-01-18T14:20:00Z'),
('resp_004', 'inq_002', 'user_004', 'Perfect! Please send those documents. Also, are there any upcoming special assessments or major renovations planned?', null, false, '2024-01-18T16:30:00Z');

-- Seed data for system_settings
INSERT INTO system_settings (setting_id, setting_key, setting_value, setting_description, is_public, created_at, updated_at) VALUES
('setting_001', 'site_name', 'Caribbean Real Estate Hub', 'The display name of the website', true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('setting_002', 'max_property_photos', '20', 'Maximum number of photos per property listing', false, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('setting_003', 'featured_listing_price', '99.99', 'Monthly price for featured listings in USD', false, '2024-01-01T00:00:00Z', '2024-01-15T00:00:00Z'),
('setting_004', 'default_listing_duration', '90', 'Default listing duration in days', false, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('setting_005', 'contact_email', 'info@caribbeanrealestate.com', 'Main contact email address', true, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('setting_006', 'maintenance_mode', 'false', 'Whether the site is in maintenance mode', false, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('setting_007', 'email_verification_required', 'true', 'Whether email verification is required for new users', false, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('setting_008', 'max_saved_searches', '10', 'Maximum number of saved searches per user', false, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('setting_009', 'currency_rates_api_key', 'sk_live_abc123xyz789', 'API key for currency conversion service', false, '2024-01-01T00:00:00Z', '2024-01-10T00:00:00Z'),
('setting_010', 'google_analytics_id', 'GA-12345678-9', 'Google Analytics tracking ID', false, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z');