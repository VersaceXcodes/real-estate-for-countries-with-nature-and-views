import { app, pool } from './server.ts';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, jest } from '@jest/globals';

// Mock external services
jest.mock('./services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendInquiryNotification: jest.fn().mockResolvedValue(true),
  sendPropertyAlert: jest.fn().mockResolvedValue(true)
}));

jest.mock('./services/imageService', () => ({
  optimizeImage: jest.fn().mockResolvedValue('https://cdn.example.com/optimized-image.jpg'),
  processUpload: jest.fn().mockResolvedValue({ url: 'https://cdn.example.com/processed.jpg', size: 1024000 })
}));

jest.mock('./services/geocodingService', () => ({
  geocodeAddress: jest.fn().mockResolvedValue({ latitude: 10.2994, longitude: -85.8397 }),
  reverseGeocode: jest.fn().mockResolvedValue({ country: 'Costa Rica', region: 'Guanacaste', city: 'Tamarindo' })
}));

describe('NatureEstate Backend API Tests', () => {
  let testUserId;
  let testPropertyId;
  let authToken;
  let testInquiryId;

  beforeAll(async () => {
    // Database setup - create test database if needed
    await pool.query('BEGIN');
  });

  afterAll(async () => {
    // Clean up
    await pool.query('ROLLBACK');
    await pool.end();
  });

  beforeEach(async () => {
    // Start fresh transaction for each test
    await pool.query('SAVEPOINT test_start');
  });

  afterEach(async () => {
    // Rollback to savepoint
    await pool.query('ROLLBACK TO SAVEPOINT test_start');
  });

  // ==================== AUTHENTICATION TESTS ====================

  describe('Authentication Endpoints', () => {
    describe('POST /auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          email: 'newuser@test.com',
          password: 'password123',
          name: 'Test User',
          user_type: 'buyer',
          countries_of_interest: '["Costa Rica", "Panama"]'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe(userData.email);
        expect(response.body.user.name).toBe(userData.name);
        expect(response.body.user.user_type).toBe(userData.user_type);
        expect(response.body.user.is_verified).toBe(false);
        expect(response.body.user.email_verified).toBe(false);

        testUserId = response.body.user.user_id;
        authToken = response.body.token;
      });

      it('should reject registration with invalid email', async () => {
        const userData = {
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
          user_type: 'buyer'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('email');
      });

      it('should reject registration with weak password', async () => {
        const userData = {
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
          user_type: 'buyer'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('password');
      });

      it('should reject duplicate email registration', async () => {
        const userData = {
          email: 'john.doe@example.com', // Already exists in seed data
          password: 'password123',
          name: 'Duplicate User',
          user_type: 'buyer'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('email');
      });
    });

    describe('POST /auth/login', () => {
      it('should login with valid credentials', async () => {
        const loginData = {
          email: 'john.doe@example.com',
          password: 'password123' // Plain text as per seed data
        };

        const response = await request(app)
          .post('/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe(loginData.email);
        
        authToken = response.body.token;
      });

      it('should reject login with invalid password', async () => {
        const loginData = {
          email: 'john.doe@example.com',
          password: 'wrongpassword'
        };

        const response = await request(app)
          .post('/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('credential');
      });

      it('should reject login with non-existent email', async () => {
        const loginData = {
          email: 'nonexistent@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /auth/forgot-password', () => {
      it('should send password reset email for valid email', async () => {
        const response = await request(app)
          .post('/auth/forgot-password')
          .send({ email: 'john.doe@example.com' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('reset');
      });

      it('should handle forgot password for non-existent email gracefully', async () => {
        const response = await request(app)
          .post('/auth/forgot-password')
          .send({ email: 'nonexistent@example.com' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /auth/verify-email', () => {
      it('should verify email with valid token', async () => {
        const response = await request(app)
          .post('/auth/verify-email')
          .send({ token: 'verify_token_004' }) // From seed data
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should reject invalid verification token', async () => {
        const response = await request(app)
          .post('/auth/verify-email')
          .send({ token: 'invalid_token' })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== PROPERTY TESTS ====================

  describe('Property Management', () => {
    beforeEach(async () => {
      // Get auth token for property operations
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'jane.smith@example.com', password: 'password123' });
      authToken = loginResponse.body.token;
    });

    describe('GET /properties', () => {
      it('should return property search results without authentication', async () => {
        const response = await request(app)
          .get('/properties')
          .expect(200);

        expect(response.body).toHaveProperty('properties');
        expect(response.body).toHaveProperty('total_count');
        expect(Array.isArray(response.body.properties)).toBe(true);
        expect(response.body.properties.length).toBeGreaterThan(0);
      });

      it('should filter properties by country', async () => {
        const response = await request(app)
          .get('/properties?country=Costa Rica')
          .expect(200);

        expect(response.body.properties).toHaveLength(1);
        expect(response.body.properties[0].country).toBe('Costa Rica');
      });

      it('should filter properties by price range', async () => {
        const response = await request(app)
          .get('/properties?price_min=300000&price_max=500000')
          .expect(200);

        response.body.properties.forEach(property => {
          expect(property.price).toBeGreaterThanOrEqual(300000);
          expect(property.price).toBeLessThanOrEqual(500000);
        });
      });

      it('should filter properties by property type', async () => {
        const response = await request(app)
          .get('/properties?property_type=villa')
          .expect(200);

        response.body.properties.forEach(property => {
          expect(property.property_type).toBe('villa');
        });
      });

      it('should filter properties by bedrooms and bathrooms', async () => {
        const response = await request(app)
          .get('/properties?bedrooms_min=3&bathrooms_min=2')
          .expect(200);

        response.body.properties.forEach(property => {
          if (property.bedrooms !== null) {
            expect(property.bedrooms).toBeGreaterThanOrEqual(3);
          }
          if (property.bathrooms !== null) {
            expect(property.bathrooms).toBeGreaterThanOrEqual(2);
          }
        });
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/properties?limit=2&offset=0')
          .expect(200);

        expect(response.body.properties).toHaveLength(2);
        expect(response.body).toHaveProperty('total_count');
      });

      it('should support sorting', async () => {
        const response = await request(app)
          .get('/properties?sort_by=price&sort_order=asc')
          .expect(200);

        const prices = response.body.properties.map(p => p.price);
        for (let i = 1; i < prices.length; i++) {
          expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
        }
      });

      it('should filter by natural features', async () => {
        const response = await request(app)
          .get('/properties?natural_features=Ocean Front')
          .expect(200);

        response.body.properties.forEach(property => {
          expect(property.natural_features).toContain('Ocean Front');
        });
      });
    });

    describe('GET /properties/:property_id', () => {
      it('should return property details with owner and photos', async () => {
        const response = await request(app)
          .get('/properties/prop_001')
          .expect(200);

        expect(response.body).toHaveProperty('property_id', 'prop_001');
        expect(response.body).toHaveProperty('title');
        expect(response.body).toHaveProperty('owner');
        expect(response.body).toHaveProperty('photos');
        expect(Array.isArray(response.body.photos)).toBe(true);
        expect(response.body.photos.length).toBeGreaterThan(0);
      });

      it('should return 404 for non-existent property', async () => {
        const response = await request(app)
          .get('/properties/nonexistent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should increment view count on property access', async () => {
        const beforeResponse = await request(app)
          .get('/properties/prop_001');
        const initialViewCount = beforeResponse.body.view_count;

        await request(app)
          .post('/properties/prop_001/view')
          .send({
            session_id: 'test_session_123',
            ip_address: '127.0.0.1',
            user_agent: 'Test Browser'
          });

        const afterResponse = await request(app)
          .get('/properties/prop_001');
        
        expect(afterResponse.body.view_count).toBeGreaterThan(initialViewCount);
      });
    });

    describe('POST /properties', () => {
      it('should create a new property listing', async () => {
        const propertyData = {
          title: 'Test Mountain Cabin',
          description: 'Beautiful cabin with stunning mountain views',
          property_type: 'cabin',
          price: 450000,
          currency: 'USD',
          country: 'Costa Rica',
          region: 'Cartago',
          city: 'Turrialba',
          square_footage: 1800,
          land_size: 3.5,
          land_size_unit: 'acres',
          bedrooms: 3,
          bathrooms: 2,
          year_built: 2019,
          natural_features: '["Mountain Views", "Forest Proximity"]',
          outdoor_amenities: '["Hiking Trails", "Fire Pit"]',
          property_condition: 'excellent'
        };

        const response = await request(app)
          .post('/properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData)
          .expect(201);

        expect(response.body).toHaveProperty('property_id');
        expect(response.body.title).toBe(propertyData.title);
        expect(response.body.price).toBe(propertyData.price);
        expect(response.body.status).toBe('active');
        expect(response.body.view_count).toBe(0);
        expect(response.body.inquiry_count).toBe(0);

        testPropertyId = response.body.property_id;
      });

      it('should require authentication for property creation', async () => {
        const propertyData = {
          title: 'Unauthorized Property',
          property_type: 'house',
          price: 300000,
          country: 'Panama'
        };

        const response = await request(app)
          .post('/properties')
          .send(propertyData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should validate required fields', async () => {
        const incompleteData = {
          title: 'Incomplete Property'
          // Missing required fields
        };

        const response = await request(app)
          .post('/properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incompleteData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('errors');
      });

      it('should validate property type enum', async () => {
        const invalidData = {
          title: 'Invalid Type Property',
          property_type: 'invalid_type',
          price: 300000,
          country: 'Panama'
        };

        const response = await request(app)
          .post('/properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /properties/:property_id', () => {
      beforeEach(async () => {
        // Create a test property first
        const propertyData = {
          title: 'Test Property for Update',
          property_type: 'house',
          price: 300000,
          country: 'Belize'
        };

        const response = await request(app)
          .post('/properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData);
        
        testPropertyId = response.body.property_id;
      });

      it('should update property successfully', async () => {
        const updateData = {
          title: 'Updated Property Title',
          price: 350000,
          description: 'Updated description with new details'
        };

        const response = await request(app)
          .put(`/properties/${testPropertyId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.title).toBe(updateData.title);
        expect(response.body.price).toBe(updateData.price);
        expect(response.body.description).toBe(updateData.description);
      });

      it('should prevent unauthorized property updates', async () => {
        // Login as different user
        const otherUserLogin = await request(app)
          .post('/auth/login')
          .send({ email: 'mike.johnson@example.com', password: 'user123' });

        const response = await request(app)
          .put(`/properties/${testPropertyId}`)
          .set('Authorization', `Bearer ${otherUserLogin.body.token}`)
          .send({ title: 'Unauthorized Update' })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /properties/:property_id', () => {
      beforeEach(async () => {
        const propertyData = {
          title: 'Test Property for Deletion',
          property_type: 'land',
          price: 200000,
          country: 'Guatemala'
        };

        const response = await request(app)
          .post('/properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send(propertyData);
        
        testPropertyId = response.body.property_id;
      });

      it('should delete property successfully', async () => {
        const response = await request(app)
          .delete(`/properties/${testPropertyId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify property is no longer accessible
        await request(app)
          .get(`/properties/${testPropertyId}`)
          .expect(404);
      });

      it('should prevent unauthorized property deletion', async () => {
        const otherUserLogin = await request(app)
          .post('/auth/login')
          .send({ email: 'david.brown@example.com', password: 'password123' });

        const response = await request(app)
          .delete(`/properties/${testPropertyId}`)
          .set('Authorization', `Bearer ${otherUserLogin.body.token}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== PROPERTY PHOTOS TESTS ====================

  describe('Property Photos', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'jane.smith@example.com', password: 'password123' });
      authToken = loginResponse.body.token;
    });

    describe('GET /properties/:property_id/photos', () => {
      it('should return property photos ordered correctly', async () => {
        const response = await request(app)
          .get('/properties/prop_001/photos')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        // Check primary photo is first or marked correctly
        const primaryPhoto = response.body.find(photo => photo.is_primary);
        expect(primaryPhoto).toBeTruthy();
        
        // Check ordering
        for (let i = 1; i < response.body.length; i++) {
          expect(response.body[i].photo_order).toBeGreaterThanOrEqual(
            response.body[i - 1].photo_order
          );
        }
      });
    });

    describe('POST /properties/:property_id/photos', () => {
      it('should add photo to property', async () => {
        const photoData = {
          photo_url: 'https://example.com/test-photo.jpg',
          caption: 'Test photo caption',
          photo_order: 5,
          is_primary: false,
          photo_type: 'exterior',
          file_size: 1250000
        };

        const response = await request(app)
          .post('/properties/prop_001/photos')
          .set('Authorization', `Bearer ${authToken}`)
          .send(photoData)
          .expect(201);

        expect(response.body).toHaveProperty('photo_id');
        expect(response.body.photo_url).toBe(photoData.photo_url);
        expect(response.body.caption).toBe(photoData.caption);
        expect(response.body.photo_order).toBe(photoData.photo_order);
      });

      it('should handle primary photo designation correctly', async () => {
        const photoData = {
          photo_url: 'https://example.com/new-primary.jpg',
          is_primary: true,
          photo_type: 'exterior'
        };

        const response = await request(app)
          .post('/properties/prop_001/photos')
          .set('Authorization', `Bearer ${authToken}`)
          .send(photoData)
          .expect(201);

        expect(response.body.is_primary).toBe(true);

        // Verify old primary photo is no longer primary
        const allPhotos = await request(app)
          .get('/properties/prop_001/photos');
        
        const primaryPhotos = allPhotos.body.filter(photo => photo.is_primary);
        expect(primaryPhotos).toHaveLength(1);
        expect(primaryPhotos[0].photo_id).toBe(response.body.photo_id);
      });

      it('should require property ownership for photo upload', async () => {
        const otherUserLogin = await request(app)
          .post('/auth/login')
          .send({ email: 'mike.johnson@example.com', password: 'user123' });

        const photoData = {
          photo_url: 'https://example.com/unauthorized.jpg',
          photo_type: 'exterior'
        };

        const response = await request(app)
          .post('/properties/prop_001/photos')
          .set('Authorization', `Bearer ${otherUserLogin.body.token}`)
          .send(photoData)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== INQUIRIES TESTS ====================

  describe('Property Inquiries', () => {
    describe('POST /properties/:property_id/inquiries', () => {
      it('should create inquiry from authenticated user', async () => {
        const loginResponse = await request(app)
          .post('/auth/login')
          .send({ email: 'john.doe@example.com', password: 'password123' });

        const inquiryData = {
          recipient_user_id: 'user_002',
          sender_name: 'John Doe',
          sender_email: 'john.doe@example.com',
          sender_phone: '+1-555-0101',
          message: 'I am interested in viewing this property. When would be a good time?',
          is_interested_in_viewing: true,
          wants_similar_properties: true,
          priority: 'high'
        };

        const response = await request(app)
          .post('/properties/prop_001/inquiries')
          .set('Authorization', `Bearer ${loginResponse.body.token}`)
          .send(inquiryData)
          .expect(201);

        expect(response.body).toHaveProperty('inquiry_id');
        expect(response.body.sender_name).toBe(inquiryData.sender_name);
        expect(response.body.message).toBe(inquiryData.message);
        expect(response.body.status).toBe('unread');
        expect(response.body.is_interested_in_viewing).toBe(true);

        testInquiryId = response.body.inquiry_id;
      });

      it('should create inquiry from anonymous user', async () => {
        const inquiryData = {
          recipient_user_id: 'user_002',
          sender_name: 'Anonymous Buyer',
          sender_email: 'anonymous@example.com',
          message: 'Could you provide more information about this property?',
          is_interested_in_viewing: false,
          wants_similar_properties: true
        };

        const response = await request(app)
          .post('/properties/prop_001/inquiries')
          .send(inquiryData)
          .expect(201);

        expect(response.body).toHaveProperty('inquiry_id');
        expect(response.body.sender_user_id).toBeNull();
        expect(response.body.sender_name).toBe(inquiryData.sender_name);
      });

      it('should validate required inquiry fields', async () => {
        const incompleteInquiry = {
          sender_name: 'Test User'
          // Missing required fields
        };

        const response = await request(app)
          .post('/properties/prop_001/inquiries')
          .send(incompleteInquiry)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should update property inquiry count', async () => {
        const beforeResponse = await request(app)
          .get('/properties/prop_001');
        const initialCount = beforeResponse.body.inquiry_count;

        const inquiryData = {
          recipient_user_id: 'user_002',
          sender_name: 'Count Test User',
          sender_email: 'counttest@example.com',
          message: 'Testing inquiry count increment'
        };

        await request(app)
          .post('/properties/prop_001/inquiries')
          .send(inquiryData)
          .expect(201);

        const afterResponse = await request(app)
          .get('/properties/prop_001');
        
        expect(afterResponse.body.inquiry_count).toBe(initialCount + 1);
      });
    });

    describe('GET /inquiries', () => {
      beforeEach(async () => {
        const loginResponse = await request(app)
          .post('/auth/login')
          .send({ email: 'jane.smith@example.com', password: 'password123' });
        authToken = loginResponse.body.token;
      });

      it('should return user inquiries with filtering', async () => {
        const response = await request(app)
          .get('/inquiries?recipient_user_id=user_002')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('inquiries');
        expect(response.body).toHaveProperty('total_count');
        expect(Array.isArray(response.body.inquiries)).toBe(true);
        
        response.body.inquiries.forEach(inquiry => {
          expect(inquiry.recipient_user_id).toBe('user_002');
          expect(inquiry).toHaveProperty('property');
        });
      });

      it('should filter inquiries by status', async () => {
        const response = await request(app)
          .get('/inquiries?status=unread')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.inquiries.forEach(inquiry => {
          expect(inquiry.status).toBe('unread');
        });
      });

      it('should filter inquiries by priority', async () => {
        const response = await request(app)
          .get('/inquiries?priority=high')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.inquiries.forEach(inquiry => {
          expect(inquiry.priority).toBe('high');
        });
      });

      it('should support date range filtering', async () => {
        const dateFrom = '2024-01-15T00:00:00Z';
        const dateTo = '2024-01-20T23:59:59Z';

        const response = await request(app)
          .get(`/inquiries?date_from=${dateFrom}&date_to=${dateTo}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.inquiries.forEach(inquiry => {
          const inquiryDate = new Date(inquiry.created_at);
          expect(inquiryDate.getTime()).toBeGreaterThanOrEqual(new Date(dateFrom).getTime());
          expect(inquiryDate.getTime()).toBeLessThanOrEqual(new Date(dateTo).getTime());
        });
      });
    });

    describe('POST /inquiries/:inquiry_id/responses', () => {
      beforeEach(async () => {
        const loginResponse = await request(app)
          .post('/auth/login')
          .send({ email: 'jane.smith@example.com', password: 'password123' });
        authToken = loginResponse.body.token;
      });

      it('should create inquiry response', async () => {
        const responseData = {
          message: 'Thank you for your interest! I would be happy to arrange a viewing. What time works best for you?',
          attachments: '["property_details.pdf", "floor_plan.jpg"]'
        };

        const response = await request(app)
          .post('/inquiries/inq_001/responses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(responseData)
          .expect(201);

        expect(response.body).toHaveProperty('response_id');
        expect(response.body.message).toBe(responseData.message);
        expect(response.body.attachments).toBe(responseData.attachments);
        expect(response.body.is_read).toBe(false);
      });

      it('should update inquiry status when response is created', async () => {
        const responseData = {
          message: 'Response to update inquiry status'
        };

        await request(app)
          .post('/inquiries/inq_004/responses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(responseData)
          .expect(201);

        const inquiryResponse = await request(app)
          .get('/inquiries/inq_004')
          .set('Authorization', `Bearer ${authToken}`);

        expect(inquiryResponse.body.status).toBe('responded');
        expect(inquiryResponse.body.responded_at).toBeTruthy();
      });

      it('should require authorization to respond to inquiry', async () => {
        const responseData = {
          message: 'Unauthorized response attempt'
        };

        const response = await request(app)
          .post('/inquiries/inq_001/responses')
          .send(responseData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== SAVED PROPERTIES TESTS ====================

  describe('Saved Properties', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'john.doe@example.com', password: 'password123' });
      authToken = loginResponse.body.token;
    });

    describe('GET /saved-properties', () => {
      it('should return user saved properties with details', async () => {
        const response = await request(app)
          .get('/saved-properties')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('saved_properties');
        expect(response.body).toHaveProperty('total_count');
        expect(Array.isArray(response.body.saved_properties)).toBe(true);
        
        response.body.saved_properties.forEach(savedProperty => {
          expect(savedProperty).toHaveProperty('property');
          expect(savedProperty).toHaveProperty('notes');
          expect(savedProperty).toHaveProperty('created_at');
        });
      });

      it('should filter saved properties by country', async () => {
        const response = await request(app)
          .get('/saved-properties?filter_country=Costa Rica')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.saved_properties.forEach(savedProperty => {
          expect(savedProperty.property.country).toBe('Costa Rica');
        });
      });

      it('should support different sorting options', async () => {
        const response = await request(app)
          .get('/saved-properties?sort_by=price_low_high')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const prices = response.body.saved_properties.map(sp => sp.property.price);
        for (let i = 1; i < prices.length; i++) {
          expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
        }
      });
    });

    describe('POST /saved-properties', () => {
      it('should save property to favorites', async () => {
        const saveData = {
          property_id: 'prop_003',
          notes: 'Potential retirement property - check HOA fees'
        };

        const response = await request(app)
          .post('/saved-properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send(saveData)
          .expect(201);

        expect(response.body).toHaveProperty('saved_property_id');
        expect(response.body.property_id).toBe(saveData.property_id);
        expect(response.body.notes).toBe(saveData.notes);
      });

      it('should prevent duplicate saves', async () => {
        const saveData = {
          property_id: 'prop_001', // Already saved in seed data
          notes: 'Attempting duplicate save'
        };

        const response = await request(app)
          .post('/saved-properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send(saveData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already saved');
      });

      it('should update property favorite count', async () => {
        const beforeResponse = await request(app)
          .get('/properties/prop_005');
        const initialCount = beforeResponse.body.favorite_count;

        const saveData = {
          property_id: 'prop_005',
          notes: 'Testing favorite count'
        };

        await request(app)
          .post('/saved-properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send(saveData)
          .expect(201);

        const afterResponse = await request(app)
          .get('/properties/prop_005');
        
        expect(afterResponse.body.favorite_count).toBe(initialCount + 1);
      });
    });

    describe('DELETE /saved-properties/:saved_property_id', () => {
      it('should remove property from favorites', async () => {
        const response = await request(app)
          .delete('/saved-properties/saved_001')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify property is no longer in saved list
        const savedResponse = await request(app)
          .get('/saved-properties')
          .set('Authorization', `Bearer ${authToken}`);

        const foundSaved = savedResponse.body.saved_properties.find(
          sp => sp.saved_property_id === 'saved_001'
        );
        expect(foundSaved).toBeUndefined();
      });
    });
  });

  // ==================== SAVED SEARCHES TESTS ====================

  describe('Saved Searches', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'john.doe@example.com', password: 'password123' });
      authToken = loginResponse.body.token;
    });

    describe('GET /saved-searches', () => {
      it('should return user saved searches', async () => {
        const response = await request(app)
          .get('/saved-searches')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        response.body.forEach(search => {
          expect(search).toHaveProperty('search_name');
          expect(search).toHaveProperty('alert_frequency');
          expect(search).toHaveProperty('is_active');
        });
      });
    });

    describe('POST /saved-searches', () => {
      it('should create saved search with alert configuration', async () => {
        const searchData = {
          search_name: 'Luxury Mountain Properties',
          country: 'Costa Rica',
          property_type: 'villa',
          price_min: 500000,
          price_max: 1500000,
          bedrooms_min: 3,
          natural_features: '["Mountain Views", "Forest Proximity"]',
          outdoor_amenities: '["Private Pool", "Hiking Trails"]',
          alert_frequency: 'weekly',
          is_active: true
        };

        const response = await request(app)
          .post('/saved-searches')
          .set('Authorization', `Bearer ${authToken}`)
          .send(searchData)
          .expect(201);

        expect(response.body).toHaveProperty('saved_search_id');
        expect(response.body.search_name).toBe(searchData.search_name);
        expect(response.body.country).toBe(searchData.country);
        expect(response.body.alert_frequency).toBe(searchData.alert_frequency);
        expect(response.body.is_active).toBe(true);
      });

      it('should validate search parameters', async () => {
        const invalidSearch = {
          search_name: 'Invalid Search',
          property_type: 'invalid_type',
          price_min: -1000
        };

        const response = await request(app)
          .post('/saved-searches')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidSearch)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /saved-searches/:saved_search_id', () => {
      it('should update saved search configuration', async () => {
        const updateData = {
          search_name: 'Updated Search Name',
          alert_frequency: 'daily',
          is_active: false,
          price_max: 800000
        };

        const response = await request(app)
          .put('/saved-searches/search_001')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.search_name).toBe(updateData.search_name);
        expect(response.body.alert_frequency).toBe(updateData.alert_frequency);
        expect(response.body.is_active).toBe(false);
        expect(response.body.price_max).toBe(updateData.price_max);
      });
    });
  });

  // ==================== NOTIFICATIONS TESTS ====================

  describe('Notifications', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'jane.smith@example.com', password: 'password123' });
      authToken = loginResponse.body.token;
    });

    describe('GET /notifications', () => {
      it('should return user notifications with filtering', async () => {
        const response = await request(app)
          .get('/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('notifications');
        expect(response.body).toHaveProperty('total_count');
        expect(response.body).toHaveProperty('unread_count');
        expect(Array.isArray(response.body.notifications)).toBe(true);
      });

      it('should filter notifications by type', async () => {
        const response = await request(app)
          .get('/notifications?type=inquiry')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.notifications.forEach(notification => {
          expect(notification.type).toBe('inquiry');
        });
      });

      it('should filter notifications by read status', async () => {
        const response = await request(app)
          .get('/notifications?is_read=false')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.notifications.forEach(notification => {
          expect(notification.is_read).toBe(false);
        });
      });

      it('should filter notifications by priority', async () => {
        const response = await request(app)
          .get('/notifications?priority=high')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.notifications.forEach(notification => {
          expect(notification.priority).toBe('high');
        });
      });
    });

    describe('PUT /notifications/:notification_id/read', () => {
      it('should mark notification as read', async () => {
        const response = await request(app)
          .put('/notifications/notif_001/read')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify notification is marked as read
        const notificationResponse = await request(app)
          .get('/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        const notification = notificationResponse.body.notifications.find(
          n => n.notification_id === 'notif_001'
        );
        expect(notification.is_read).toBe(true);
      });
    });

    describe('PUT /notifications/mark-all-read', () => {
      it('should mark all notifications as read', async () => {
        const response = await request(app)
          .put('/notifications/mark-all-read')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify all notifications are marked as read
        const notificationsResponse = await request(app)
          .get('/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(notificationsResponse.body.unread_count).toBe(0);
      });
    });
  });

  // ==================== DASHBOARD TESTS ====================

  describe('Dashboard Statistics', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'jane.smith@example.com', password: 'password123' });
      authToken = loginResponse.body.token;
    });

    describe('GET /dashboard/stats', () => {
      it('should return comprehensive dashboard statistics', async () => {
        const response = await request(app)
          .get('/dashboard/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('user_type');
        expect(response.body).toHaveProperty('total_properties');
        expect(response.body).toHaveProperty('total_inquiries');
        expect(response.body).toHaveProperty('total_views');
        expect(response.body).toHaveProperty('total_favorites');
        expect(response.body).toHaveProperty('recent_activity');
        expect(Array.isArray(response.body.recent_activity)).toBe(true);
      });

      it('should provide role-specific statistics for seller', async () => {
        const response = await request(app)
          .get('/dashboard/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.user_type).toBe('seller');
        expect(response.body).toHaveProperty('active_listings');
        expect(response.body).toHaveProperty('pending_inquiries');
        expect(typeof response.body.total_properties).toBe('number');
      });

      it('should provide role-specific statistics for buyer', async () => {
        const buyerLogin = await request(app)
          .post('/auth/login')
          .send({ email: 'john.doe@example.com', password: 'password123' });

        const response = await request(app)
          .get('/dashboard/stats')
          .set('Authorization', `Bearer ${buyerLogin.body.token}`)
          .expect(200);

        expect(response.body.user_type).toBe('buyer');
        expect(response.body).toHaveProperty('total_favorites');
        expect(typeof response.body.total_inquiries).toBe('number');
      });
    });
  });

  // ==================== ANALYTICS TESTS ====================

  describe('Property Analytics', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'jane.smith@example.com', password: 'password123' });
      authToken = loginResponse.body.token;
    });

    describe('GET /properties/:property_id/analytics', () => {
      it('should return property analytics data', async () => {
        const response = await request(app)
          .get('/properties/prop_001/analytics')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        response.body.forEach(analytics => {
          expect(analytics).toHaveProperty('date');
          expect(analytics).toHaveProperty('views_count');
          expect(analytics).toHaveProperty('inquiries_count');
          expect(analytics).toHaveProperty('favorites_count');
          expect(analytics).toHaveProperty('shares_count');
          expect(analytics).toHaveProperty('search_impressions');
        });
      });

      it('should filter analytics by date range', async () => {
        const dateFrom = '2024-01-16';
        const dateTo = '2024-01-18';

        const response = await request(app)
          .get(`/properties/prop_001/analytics?date_from=${dateFrom}&date_to=${dateTo}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.forEach(analytics => {
          expect(analytics.date).toBeGreaterThanOrEqual(dateFrom);
          expect(analytics.date).toBeLessThanOrEqual(dateTo);
        });
      });

      it('should require property ownership for analytics access', async () => {
        const otherUserLogin = await request(app)
          .post('/auth/login')
          .send({ email: 'mike.johnson@example.com', password: 'user123' });

        const response = await request(app)
          .get('/properties/prop_001/analytics')
          .set('Authorization', `Bearer ${otherUserLogin.body.token}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== SEARCH HISTORY TESTS ====================

  describe('Search History', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'john.doe@example.com', password: 'password123' });
      authToken = loginResponse.body.token;
    });

    describe('GET /search-history', () => {
      it('should return user search history', async () => {
        const response = await request(app)
          .get('/search-history')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        response.body.forEach(searchRecord => {
          expect(searchRecord).toHaveProperty('search_history_id');
          expect(searchRecord).toHaveProperty('created_at');
          expect(searchRecord).toHaveProperty('results_count');
        });
      });

      it('should support pagination for search history', async () => {
        const response = await request(app)
          .get('/search-history?limit=5&offset=0')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.length).toBeLessThanOrEqual(5);
      });
    });

    describe('POST /search-history', () => {
      it('should record search in history', async () => {
        const searchData = {
          country: 'Mexico',
          property_type: 'condominium',
          price_min: 200000,
          price_max: 500000,
          natural_features: 'Beachfront',
          location_text: 'Riviera Maya',
          sort_by: 'price_asc',
          results_count: 8
        };

        const response = await request(app)
          .post('/search-history')
          .set('Authorization', `Bearer ${authToken}`)
          .send(searchData)
          .expect(201);

        expect(response.body).toHaveProperty('search_history_id');
        expect(response.body.country).toBe(searchData.country);
        expect(response.body.property_type).toBe(searchData.property_type);
        expect(response.body.results_count).toBe(searchData.results_count);
      });

      it('should record anonymous search with session ID', async () => {
        const searchData = {
          session_id: 'anonymous_session_123',
          country: 'Panama',
          property_type: 'land',
          natural_features: 'Private Island',
          results_count: 3
        };

        const response = await request(app)
          .post('/search-history')
          .send(searchData)
          .expect(201);

        expect(response.body.session_id).toBe(searchData.session_id);
        expect(response.body.user_id).toBeNull();
      });
    });
  });

  // ==================== USER PROFILE TESTS ====================

  describe('User Profile Management', () => {
    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'john.doe@example.com', password: 'password123' });
      authToken = loginResponse.body.token;
    });

    describe('GET /users/me', () => {
      it('should return current user profile', async () => {
        const response = await request(app)
          .get('/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('user_id');
        expect(response.body).toHaveProperty('email');
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('user_type');
        expect(response.body.email).toBe('john.doe@example.com');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/users/me')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /users/me', () => {
      it('should update user profile', async () => {
        const updateData = {
          name: 'John Updated Doe',
          phone: '+1-555-9999',
          notification_preferences: '{"email": true, "sms": false, "push": true}',
          countries_of_interest: '["Costa Rica", "Panama", "Belize"]'
        };

        const response = await request(app)
          .put('/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.name).toBe(updateData.name);
        expect(response.body.phone).toBe(updateData.phone);
        expect(response.body.notification_preferences).toBe(updateData.notification_preferences);
      });

      it('should validate email format on update', async () => {
        const updateData = {
          email: 'invalid-email-format'
        };

        const response = await request(app)
          .put('/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should prevent duplicate email updates', async () => {
        const updateData = {
          email: 'jane.smith@example.com' // Already exists
        };

        const response = await request(app)
          .put('/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('email');
      });
    });

    describe('GET /users/:user_id', () => {
      it('should return public user profile', async () => {
        const response = await request(app)
          .get('/users/user_002')
          .expect(200);

        expect(response.body).toHaveProperty('user_id', 'user_002');
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('user_type');
        expect(response.body).toHaveProperty('is_verified');
        expect(response.body).not.toHaveProperty('email');
        expect(response.body).not.toHaveProperty('password_hash');
      });

      it('should return 404 for non-existent user', async () => {
        const response = await request(app)
          .get('/users/nonexistent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe('Error Handling', () => {
    it('should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .post('/properties')
        .send({ title: 'Test Property' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const mockQuery = jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/properties')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('error');

      mockQuery.mockRestore();
    });

    it('should validate request body schema', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'jane.smith@example.com', password: 'password123' });

      const invalidPropertyData = {
        title: '', // Invalid empty title
        property_type: 'invalid_type', // Invalid enum value
        price: -1000, // Invalid negative price
        country: '' // Invalid empty country
      };

      const response = await request(app)
        .post('/properties')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .send(invalidPropertyData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousQuery = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/properties?country=${encodeURIComponent(maliciousQuery)}`)
        .expect(200);

      // Should return empty results, not crash
      expect(response.body.properties).toEqual([]);
      expect(response.body.total_count).toBe(0);
    });

    it('should handle large request payloads appropriately', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'jane.smith@example.com', password: 'password123' });

      const largeDescription = 'A'.repeat(10000); // Very long description

      const response = await request(app)
        .post('/properties')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .send({
          title: 'Large Description Property',
          property_type: 'house',
          price: 300000,
          country: 'Panama',
          description: largeDescription
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('description');
    });
  });

  // ==================== INTEGRATION WORKFLOW TESTS ====================

  describe('Complete User Workflows', () => {
    it('should handle complete buyer journey', async () => {
      // 1. Register new buyer
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'newbuyer@example.com',
          password: 'buyerpass123',
          name: 'New Buyer',
          user_type: 'buyer',
          countries_of_interest: '["Costa Rica"]'
        })
        .expect(201);

      const buyerToken = registerResponse.body.token;

      // 2. Search for properties
      const searchResponse = await request(app)
        .get('/properties?country=Costa Rica&property_type=villa')
        .expect(200);

      expect(searchResponse.body.properties.length).toBeGreaterThan(0);
      const targetProperty = searchResponse.body.properties[0];

      // 3. View property details
      await request(app)
        .get(`/properties/${targetProperty.property_id}`)
        .expect(200);

      // 4. Save property to favorites
      await request(app)
        .post('/saved-properties')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          property_id: targetProperty.property_id,
          notes: 'Interested in this villa for retirement'
        })
        .expect(201);

      // 5. Create inquiry
      const inquiryResponse = await request(app)
        .post(`/properties/${targetProperty.property_id}/inquiries`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          recipient_user_id: targetProperty.user_id,
          sender_name: 'New Buyer',
          sender_email: 'newbuyer@example.com',
          message: 'I am interested in viewing this property',
          is_interested_in_viewing: true
        })
        .expect(201);

      // 6. Save search for future alerts
      await request(app)
        .post('/saved-searches')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          search_name: 'Costa Rica Villas',
          country: 'Costa Rica',
          property_type: 'villa',
          price_max: 1000000,
          alert_frequency: 'weekly'
        })
        .expect(201);

      // 7. Check dashboard
      const dashboardResponse = await request(app)
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(dashboardResponse.body.user_type).toBe('buyer');
      expect(dashboardResponse.body.total_favorites).toBeGreaterThan(0);
      expect(dashboardResponse.body.total_inquiries).toBeGreaterThan(0);
    });

    it('should handle complete seller journey', async () => {
      // 1. Login as seller
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'david.brown@example.com', password: 'password123' });
      const sellerToken = loginResponse.body.token;

      // 2. Create new property listing
      const propertyResponse = await request(app)
        .post('/properties')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Eco-Friendly Bamboo House',
          description: 'Sustainable bamboo construction with solar power and rainwater collection',
          property_type: 'house',
          price: 275000,
          currency: 'USD',
          country: 'Costa Rica',
          region: 'Puntarenas',
          city: 'Uvita',
          square_footage: 1600,
          land_size: 2.0,
          land_size_unit: 'acres',
          bedrooms: 2,
          bathrooms: 2,
          year_built: 2023,
          natural_features: '["Rainforest", "Ocean Views", "Wildlife Corridor"]',
          outdoor_amenities: '["Deck", "Organic Garden", "Solar Panels"]',
          property_condition: 'excellent',
          special_features: '["Sustainable Design", "Off-Grid Capable"]'
        })
        .expect(201);

      const newPropertyId = propertyResponse.body.property_id;

      // 3. Add photos to property
      await request(app)
        .post(`/properties/${newPropertyId}/photos`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          photo_url: 'https://example.com/bamboo-house-exterior.jpg',
          caption: 'Sustainable bamboo construction',
          photo_order: 1,
          is_primary: true,
          photo_type: 'exterior'
        })
        .expect(201);

      await request(app)
        .post(`/properties/${newPropertyId}/photos`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          photo_url: 'https://example.com/bamboo-house-interior.jpg',
          caption: 'Open floor plan with natural lighting',
          photo_order: 2,
          photo_type: 'interior'
        })
        .expect(201);

      // 4. Check property appears in search
      const searchResponse = await request(app)
        .get('/properties?country=Costa Rica')
        .expect(200);

      const foundProperty = searchResponse.body.properties.find(
        p => p.property_id === newPropertyId
      );
      expect(foundProperty).toBeTruthy();

      // 5. Simulate inquiry received and response
      const inquiryResponse = await request(app)
        .post(`/properties/${newPropertyId}/inquiries`)
        .send({
          recipient_user_id: propertyResponse.body.user_id,
          sender_name: 'Interested Buyer',
          sender_email: 'buyer@example.com',
          message: 'Love the sustainable features! Can we arrange a viewing?',
          is_interested_in_viewing: true
        })
        .expect(201);

      // 6. Respond to inquiry
      await request(app)
        .post(`/inquiries/${inquiryResponse.body.inquiry_id}/responses`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          message: 'Thank you for your interest! I would be happy to show you the property. The sustainable features are my favorite aspect too.'
        })
        .expect(201);

      // 7. Check dashboard statistics
      const dashboardResponse = await request(app)
        .get('/dashboard/stats')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(dashboardResponse.body.user_type).toBe('seller');
      expect(dashboardResponse.body.total_properties).toBeGreaterThan(0);
      expect(dashboardResponse.body.total_inquiries).toBeGreaterThan(0);

      // 8. Check property analytics
      const analyticsResponse = await request(app)
        .get(`/properties/${newPropertyId}/analytics`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(Array.isArray(analyticsResponse.body)).toBe(true);
    });

    it('should handle inquiry thread conversation', async () => {
      // Setup: Create inquiry
      const inquiryResponse = await request(app)
        .post('/properties/prop_001/inquiries')
        .send({
          recipient_user_id: 'user_002',
          sender_name: 'Thread Test Buyer',
          sender_email: 'threadtest@example.com',
          message: 'Initial inquiry about the property'
        })
        .expect(201);

      const inquiryId = inquiryResponse.body.inquiry_id;

      // Get tokens for both users
      const sellerLogin = await request(app)
        .post('/auth/login')
        .send({ email: 'jane.smith@example.com', password: 'password123' });
      const sellerToken = sellerLogin.body.token;

      const buyerLogin = await request(app)
        .post('/auth/register')
        .send({
          email: 'threadtest@example.com',
          password: 'password123',
          name: 'Thread Test Buyer',
          user_type: 'buyer'
        });
      const buyerToken = buyerLogin.body.token;

      // 1. Seller responds
      await request(app)
        .post(`/inquiries/${inquiryId}/responses`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          message: 'Thank you for your inquiry! The property has amazing views.'
        })
        .expect(201);

      // 2. Buyer responds back
      await request(app)
        .post(`/inquiries/${inquiryId}/responses`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          message: 'That sounds wonderful! What about the proximity to beaches?'
        })
        .expect(201);

      // 3. Check complete conversation thread
      const responsesResponse = await request(app)
        .get(`/inquiries/${inquiryId}/responses`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(responsesResponse.body.length).toBe(2);
      expect(responsesResponse.body[0].message).toContain('amazing views');
      expect(responsesResponse.body[1].message).toContain('proximity to beaches');

      // 4. Verify inquiry status updated
      const inquiryDetailsResponse = await request(app)
        .get(`/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(inquiryDetailsResponse.body.status).toBe('responded');
    });
  });
});