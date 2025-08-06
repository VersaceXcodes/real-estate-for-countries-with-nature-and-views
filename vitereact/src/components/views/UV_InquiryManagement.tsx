import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types from Zod schemas
interface PropertyInquiry {
  inquiry_id: string;
  property_id: string;
  sender_user_id: string | null;
  recipient_user_id: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  message: string;
  status: 'unread' | 'read' | 'responded' | 'archived';
  is_interested_in_viewing: boolean;
  wants_similar_properties: boolean;
  response_message: string | null;
  responded_at: string | null;
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
}

interface InquiryResponse {
  response_id: string;
  inquiry_id: string;
  sender_user_id: string;
  message: string;
  attachments: string | null;
  is_read: boolean;
  created_at: string;
}

interface InquiryListResponse {
  inquiries: (PropertyInquiry & {
    property?: {
      property_id: string;
      title: string;
      price: number;
      currency: string;
      property_type: string;
      country: string;
      city: string | null;
    };
  })[];
  total_count: number;
  page: number;
  per_page: number;
}

interface InquiryFilters {
  status: string | null;
  property_id: string | null;
  priority: string | null;
  date_from: string | null;
  date_to: string | null;
}

interface ResponseTemplate {
  id: string;
  name: string;
  template: string;
}

const UV_InquiryManagement: React.FC = () => {
  // Global state access
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [inquiryFilters, setInquiryFilters] = useState<InquiryFilters>({
    status: null,
    property_id: null,
    priority: null,
    date_from: null,
    date_to: null,
  });
  const [selectedInquiryIds, setSelectedInquiryIds] = useState<string[]>([]);
  const [activeInquiry, setActiveInquiry] = useState<PropertyInquiry | null>(null);
  const [responseForm, setResponseForm] = useState({
    message: '',
    attachments: null as string | null,
  });
  const [showDetailView, setShowDetailView] = useState(false);

  const queryClient = useQueryClient();

  // Predefined response templates
  const responseTemplates: ResponseTemplate[] = [
    {
      id: 'thank_you',
      name: 'Thank you for your interest',
      template: 'Thank you for your interest in this property. I would be happy to provide you with more information or schedule a viewing at your convenience.',
    },
    {
      id: 'schedule_viewing',
      name: 'Schedule a viewing',
      template: 'I would be delighted to show you this property in person. Please let me know your availability and I will arrange a viewing that works for your schedule.',
    },
    {
      id: 'request_info',
      name: 'Request more information',
      template: 'Thank you for your inquiry. I have additional information about this property including recent updates and neighborhood details. Would you like me to send these to you?',
    },
    {
      id: 'status_update',
      name: 'Property status update',
      template: 'Thank you for your interest. I wanted to update you on the current status of this property and answer any questions you might have.',
    },
  ];

  // API functions
  const fetchInquiries = async (): Promise<InquiryListResponse> => {
    if (!currentUser?.user_id || !authToken) {
      throw new Error('Authentication required');
    }

    const params = new URLSearchParams({
      recipient_user_id: currentUser.user_id,
      sort_by: 'created_at',
      sort_order: 'desc',
      limit: '50',
      offset: '0',
    });

    if (inquiryFilters.status) params.append('status', inquiryFilters.status);
    if (inquiryFilters.priority) params.append('priority', inquiryFilters.priority);
    if (inquiryFilters.date_from) params.append('date_from', inquiryFilters.date_from);
    if (inquiryFilters.date_to) params.append('date_to', inquiryFilters.date_to);

    const { data } = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/inquiries?${params}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    return data;
  };

  const fetchInquiryResponses = async (inquiryId: string): Promise<InquiryResponse[]> => {
    if (!authToken) {
      throw new Error('Authentication required');
    }

    const { data } = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/inquiries/${inquiryId}/responses`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    return data;
  };

  // React Query hooks
  const {
    data: inquiriesData,
    isLoading: inquiriesLoading,
    error: inquiriesError,
  } = useQuery({
    queryKey: ['inquiries', currentUser?.user_id, inquiryFilters],
    queryFn: fetchInquiries,
    enabled: !!currentUser?.user_id && !!authToken,
  });

  const {
    data: conversationResponses = [],
    isLoading: responsesLoading,
  } = useQuery({
    queryKey: ['inquiry-responses', activeInquiry?.inquiry_id],
    queryFn: () => fetchInquiryResponses(activeInquiry!.inquiry_id),
    enabled: !!activeInquiry?.inquiry_id && !!authToken,
  });

  // Mutations
  const sendResponseMutation = useMutation({
    mutationFn: async ({ inquiryId, message, attachments }: { inquiryId: string; message: string; attachments: string | null }) => {
      if (!authToken) throw new Error('Authentication required');
      
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/inquiries/${inquiryId}/responses`,
        { message, attachments },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry-responses', activeInquiry?.inquiry_id] });
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      setResponseForm({ message: '', attachments: null });
    },
  });

  const updateInquiryStatusMutation = useMutation({
    mutationFn: async ({ inquiryId, status }: { inquiryId: string; status: string }) => {
      if (!authToken) throw new Error('Authentication required');
      
      const { data } = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/inquiries/${inquiryId}`,
        { status },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return data;
    },
    onSuccess: (updatedInquiry) => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      if (activeInquiry?.inquiry_id === updatedInquiry.inquiry_id) {
        setActiveInquiry(updatedInquiry);
      }
    },
  });

  // Event handlers
  const handleFilterChange = (key: keyof InquiryFilters, value: string | null) => {
    setInquiryFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleInquirySelect = (inquiry: PropertyInquiry) => {
    setActiveInquiry(inquiry);
    setShowDetailView(true);
    
    // Mark as read if unread
    if (inquiry.status === 'unread') {
      updateInquiryStatusMutation.mutate({
        inquiryId: inquiry.inquiry_id,
        status: 'read',
      });
    }
  };

  const handleSendResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiry || !responseForm.message.trim()) return;

    sendResponseMutation.mutate({
      inquiryId: activeInquiry.inquiry_id,
      message: responseForm.message,
      attachments: responseForm.attachments,
    });
  };

  const handleTemplateSelect = (template: ResponseTemplate) => {
    setResponseForm(prev => ({ ...prev, message: template.template }));
  };

  const handleStatusUpdate = (inquiryId: string, newStatus: string) => {
    updateInquiryStatusMutation.mutate({ inquiryId, status: newStatus });
  };

  const handleBulkStatusUpdate = (newStatus: string) => {
    selectedInquiryIds.forEach(inquiryId => {
      updateInquiryStatusMutation.mutate({ inquiryId, status: newStatus });
    });
    setSelectedInquiryIds([]);
  };

  const toggleInquirySelection = (inquiryId: string) => {
    setSelectedInquiryIds(prev =>
      prev.includes(inquiryId)
        ? prev.filter(id => id !== inquiryId)
        : [...prev, inquiryId]
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'unread':
        return 'bg-red-100 text-red-800';
      case 'read':
        return 'bg-yellow-100 text-yellow-800';
      case 'responded':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const inquiries = inquiriesData?.inquiries || [];
  const totalInquiries = inquiriesData?.total_count || 0;
  const unreadCount = inquiries.filter(inquiry => inquiry.status === 'unread').length;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Inquiry Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage communication with potential buyers
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  to="/my-listings"
                  className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Back to Listings
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!showDetailView ? (
            <>
              {/* Dashboard Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{totalInquiries}</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Inquiries</dt>
                          <dd className="text-lg font-medium text-gray-900">{totalInquiries}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{unreadCount}</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Unread</dt>
                          <dd className="text-lg font-medium text-gray-900">{unreadCount}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {inquiries.filter(i => i.status === 'responded').length}
                          </span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Responded</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {inquiries.filter(i => i.status === 'responded').length}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {inquiries.filter(i => i.is_interested_in_viewing).length}
                          </span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Viewing Requests</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {inquiries.filter(i => i.is_interested_in_viewing).length}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white shadow rounded-lg mb-6">
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={inquiryFilters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value || null)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">All statuses</option>
                        <option value="unread">Unread</option>
                        <option value="read">Read</option>
                        <option value="responded">Responded</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={inquiryFilters.priority || ''}
                        onChange={(e) => handleFilterChange('priority', e.target.value || null)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">All priorities</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                      <input
                        type="date"
                        value={inquiryFilters.date_from || ''}
                        onChange={(e) => handleFilterChange('date_from', e.target.value || null)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                      <input
                        type="date"
                        value={inquiryFilters.date_to || ''}
                        onChange={(e) => handleFilterChange('date_to', e.target.value || null)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => setInquiryFilters({
                          status: null,
                          property_id: null,
                          priority: null,
                          date_from: null,
                          date_to: null,
                        })}
                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedInquiryIds.length > 0 && (
                <div className="bg-white shadow rounded-lg mb-6">
                  <div className="px-4 py-3 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-700">
                          {selectedInquiryIds.length} inquiries selected
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleBulkStatusUpdate('read')}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                        >
                          Mark as Read
                        </button>
                        <button
                          onClick={() => handleBulkStatusUpdate('archived')}
                          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                        >
                          Archive
                        </button>
                        <button
                          onClick={() => setSelectedInquiryIds([])}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Inquiries List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  {inquiriesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading inquiries...</p>
                    </div>
                  ) : inquiriesError ? (
                    <div className="text-center py-8">
                      <p className="text-red-600">Error loading inquiries</p>
                    </div>
                  ) : inquiries.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No inquiries found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {inquiries.map((inquiry) => (
                        <div
                          key={inquiry.inquiry_id}
                          className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                            inquiry.status === 'unread' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                          }`}
                          onClick={() => handleInquirySelect(inquiry)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedInquiryIds.includes(inquiry.inquiry_id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleInquirySelection(inquiry.inquiry_id);
                                }}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="text-lg font-medium text-gray-900">
                                    {inquiry.sender_name}
                                  </h3>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(inquiry.status)}`}>
                                    {inquiry.status}
                                  </span>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeClass(inquiry.priority)}`}>
                                    {inquiry.priority}
                                  </span>
                                  {inquiry.is_interested_in_viewing && (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                      Viewing Request
                                    </span>
                                  )}
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-2">
                                  <p>Email: {inquiry.sender_email}</p>
                                  {inquiry.sender_phone && <p>Phone: {inquiry.sender_phone}</p>}
                                </div>

                                {inquiry.property && (
                                  <div className="text-sm text-gray-700 mb-2">
                                    <p className="font-medium">Property: {inquiry.property.title}</p>
                                    <p>{inquiry.property.price.toLocaleString()} {inquiry.property.currency} • {inquiry.property.property_type} • {inquiry.property.country}</p>
                                  </div>
                                )}

                                <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                  {inquiry.message}
                                </p>

                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>Received: {formatDate(inquiry.created_at)}</span>
                                  {inquiry.responded_at && (
                                    <span>Responded: {formatDate(inquiry.responded_at)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusUpdate(inquiry.inquiry_id, 'read');
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Mark Read
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusUpdate(inquiry.inquiry_id, 'archived');
                                }}
                                className="text-gray-600 hover:text-gray-800 text-sm"
                              >
                                Archive
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Detail View */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowDetailView(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  ← Back to Inquiries
                </button>
                
                {activeInquiry && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusUpdate(activeInquiry.inquiry_id, 'responded')}
                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Mark as Responded
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(activeInquiry.inquiry_id, 'archived')}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>

              {activeInquiry && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Inquirer Info & Property Context */}
                  <div className="space-y-6">
                    {/* Inquirer Information */}
                    <div className="bg-white shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Inquirer Information</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Name</p>
                            <p className="text-sm text-gray-900">{activeInquiry.sender_name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="text-sm text-gray-900">{activeInquiry.sender_email}</p>
                          </div>
                          {activeInquiry.sender_phone && (
                            <div>
                              <p className="text-sm font-medium text-gray-500">Phone</p>
                              <p className="text-sm text-gray-900">{activeInquiry.sender_phone}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-500">Status</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(activeInquiry.status)}`}>
                              {activeInquiry.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Priority</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeClass(activeInquiry.priority)}`}>
                              {activeInquiry.priority}
                            </span>
                          </div>
                          {activeInquiry.is_interested_in_viewing && (
                            <div>
                              <p className="text-sm font-medium text-gray-500">Special Requests</p>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                Interested in viewing
                              </span>
                            </div>
                          )}
                          {activeInquiry.wants_similar_properties && (
                            <div>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Wants similar properties
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Property Context - TODO: Would need property details endpoint */}
                    <div className="bg-white shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Property Context</h3>
                        <div className="text-center py-4">
                          <p className="text-gray-600 text-sm">Property details loading...</p>
                          <Link
                            to={`/property/${activeInquiry.property_id}`}
                            className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View Property Details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Conversation & Response */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Conversation Thread */}
                    <div className="bg-white shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation</h3>
                        
                        {/* Original Inquiry */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-900">Original Inquiry</h4>
                            <span className="text-xs text-gray-500">{formatDate(activeInquiry.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{activeInquiry.message}</p>
                        </div>

                        {/* Response Thread */}
                        {responsesLoading ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                          </div>
                        ) : (
                          <div className="space-y-4 mb-6">
                            {conversationResponses.map((response) => (
                              <div key={response.response_id} className="p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-gray-900">Your Response</h4>
                                  <span className="text-xs text-gray-500">{formatDate(response.created_at)}</span>
                                </div>
                                <p className="text-sm text-gray-700">{response.message}</p>
                                {response.attachments && (
                                  <div className="mt-2">
                                    <span className="text-xs text-gray-500">Attachments: {response.attachments}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Response Form */}
                        <form onSubmit={handleSendResponse} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Quick Response Templates
                            </label>
                            <select
                              onChange={(e) => {
                                const template = responseTemplates.find(t => t.id === e.target.value);
                                if (template) handleTemplateSelect(template);
                              }}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Select a template...</option>
                              {responseTemplates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Your Response
                            </label>
                            <textarea
                              value={responseForm.message}
                              onChange={(e) => setResponseForm(prev => ({ ...prev, message: e.target.value }))}
                              rows={6}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Type your response here..."
                              required
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              {responseForm.message.length}/2000 characters
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setResponseForm({ message: '', attachments: null })}
                              className="text-gray-600 hover:text-gray-800 text-sm"
                            >
                              Clear
                            </button>
                            <button
                              type="submit"
                              disabled={sendResponseMutation.isPending || !responseForm.message.trim()}
                              className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {sendResponseMutation.isPending ? 'Sending...' : 'Send Response'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_InquiryManagement;