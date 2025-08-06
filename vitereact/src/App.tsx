import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Import global shared views
import GV_TopNav from '@/components/views/GV_TopNav.tsx';
import GV_MobileNav from '@/components/views/GV_MobileNav.tsx';
import GV_Footer from '@/components/views/GV_Footer.tsx';

// Import unique views
import UV_Landing from '@/components/views/UV_Landing.tsx';
import UV_Registration from '@/components/views/UV_Registration.tsx';
import UV_Login from '@/components/views/UV_Login.tsx';
import UV_PasswordReset from '@/components/views/UV_PasswordReset.tsx';
import UV_SearchResults from '@/components/views/UV_SearchResults.tsx';
import UV_PropertyDetails from '@/components/views/UV_PropertyDetails.tsx';
import UV_UserDashboard from '@/components/views/UV_UserDashboard.tsx';
import UV_ProfileSettings from '@/components/views/UV_ProfileSettings.tsx';
import UV_CreateListing from '@/components/views/UV_CreateListing.tsx';
import UV_SavedProperties from '@/components/views/UV_SavedProperties.tsx';
import UV_MyListings from '@/components/views/UV_MyListings.tsx';
import UV_InquiryManagement from '@/components/views/UV_InquiryManagement.tsx';
import UV_Help from '@/components/views/UV_Help.tsx';
import UV_Terms from '@/components/views/UV_Terms.tsx';
import UV_Privacy from '@/components/views/UV_Privacy.tsx';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Loading component for auth initialization
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Protected route wrapper for authenticated users only
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use individual selectors to avoid infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Protected route wrapper for specific user types
const UserTypeProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedTypes: ('buyer' | 'seller' | 'agent')[] 
}> = ({ children, allowedTypes }) => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (currentUser && !allowedTypes.includes(currentUser.user_type)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Auth redirect component for login/register pages
const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Layout wrapper with global navigation and footer
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Top Navigation */}
      <GV_TopNav />
      <GV_MobileNav />
      
      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Global Footer */}
      <GV_Footer />
    </div>
  );
};

const App: React.FC = () => {
  // Use individual selectors to avoid infinite loops
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const initializeAuth = useAppStore(state => state.initialize_auth);
  
  useEffect(() => {
    // Initialize auth state when app loads to verify stored tokens
    initializeAuth();
  }, [initializeAuth]);
  
  // Show loading spinner during auth initialization
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<UV_Landing />} />
            <Route path="/search" element={<UV_SearchResults />} />
            <Route path="/property/:property_id" element={<UV_PropertyDetails />} />
            <Route path="/help" element={<UV_Help />} />
            <Route path="/terms" element={<UV_Terms />} />
            <Route path="/privacy" element={<UV_Privacy />} />
            
            {/* Authentication Routes (redirect if already authenticated) */}
            <Route 
              path="/register" 
              element={
                <AuthRedirect>
                  <UV_Registration />
                </AuthRedirect>
              } 
            />
            <Route 
              path="/login" 
              element={
                <AuthRedirect>
                  <UV_Login />
                </AuthRedirect>
              } 
            />
            <Route 
              path="/reset-password" 
              element={
                <AuthRedirect>
                  <UV_PasswordReset />
                </AuthRedirect>
              } 
            />
            
            {/* Protected Routes (require authentication) */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <UV_UserDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <UV_ProfileSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* Seller/Agent Only Routes */}
            <Route 
              path="/create-listing" 
              element={
                <UserTypeProtectedRoute allowedTypes={['seller', 'agent']}>
                  <UV_CreateListing />
                </UserTypeProtectedRoute>
              } 
            />
            <Route 
              path="/edit-listing/:listing_id" 
              element={
                <UserTypeProtectedRoute allowedTypes={['seller', 'agent']}>
                  <UV_CreateListing />
                </UserTypeProtectedRoute>
              } 
            />
            <Route 
              path="/my-listings" 
              element={
                <UserTypeProtectedRoute allowedTypes={['seller', 'agent']}>
                  <UV_MyListings />
                </UserTypeProtectedRoute>
              } 
            />
            <Route 
              path="/inquiries" 
              element={
                <UserTypeProtectedRoute allowedTypes={['seller', 'agent']}>
                  <UV_InquiryManagement />
                </UserTypeProtectedRoute>
              } 
            />
            
            {/* Buyer Only Routes */}
            <Route 
              path="/saved-properties" 
              element={
                <UserTypeProtectedRoute allowedTypes={['buyer']}>
                  <UV_SavedProperties />
                </UserTypeProtectedRoute>
              } 
            />
            
            {/* Catch all route - redirect to appropriate page based on auth status */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </QueryClientProvider>
    </Router>
  );
};

export default App;