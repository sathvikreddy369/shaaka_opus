'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { vendorAPI } from '@/lib/api';
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  CreditCardIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  UserIcon,
  InformationCircleIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

interface VendorFormData {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  description: string;
  fssaiLicense: string;
  address: {
    street: string;
    colony: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
  };
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
  };
  deliveryRadius: number;
}

const steps = [
  { id: 1, title: 'Confirm Info', icon: UserIcon },
  { id: 2, title: 'Business Info', icon: BuildingStorefrontIcon },
  { id: 3, title: 'Address', icon: MapPinIcon },
  { id: 4, title: 'Bank Details', icon: CreditCardIcon },
];

export default function VendorRegisterPage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchProfile, isInitialized } = useAuthStore();
  const { openAuthModal } = useUIStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get default address from user if available
  const userDefaultAddress = user?.addresses?.find((a: any) => a.isDefault) || user?.addresses?.[0];

  const [formData, setFormData] = useState<VendorFormData>(() => ({
    businessName: '',
    businessPhone: user?.phone || '',
    businessEmail: user?.email || '',
    description: '',
    fssaiLicense: '',
    address: {
      street: userDefaultAddress?.street || '',
      colony: userDefaultAddress?.colony || userDefaultAddress?.area || '',
      city: userDefaultAddress?.city || 'Hyderabad',
      state: userDefaultAddress?.state || 'Telangana',
      pincode: userDefaultAddress?.pincode || '',
      latitude: userDefaultAddress?.latitude || 0,
      longitude: userDefaultAddress?.longitude || 0,
    },
    bankDetails: {
      accountName: user?.name || '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
    },
    deliveryRadius: 5,
  }));

  // Update form data when user loads
  useEffect(() => {
    if (user) {
      const userAddress = user.addresses?.find((a: any) => a.isDefault) || user.addresses?.[0];
      setFormData(prev => ({
        ...prev,
        businessPhone: user.phone || prev.businessPhone,
        businessEmail: user.email || prev.businessEmail,
        address: {
          ...prev.address,
          street: userAddress?.street || prev.address.street,
          colony: userAddress?.colony || prev.address.colony,
          city: userAddress?.city || prev.address.city,
          state: userAddress?.state || prev.address.state,
          pincode: userAddress?.pincode || prev.address.pincode,
          latitude: userAddress?.latitude || prev.address.latitude,
          longitude: userAddress?.longitude || prev.address.longitude,
        },
        bankDetails: {
          ...prev.bankDetails,
          accountName: user.name || prev.bankDetails.accountName,
        },
      }));
    }
  }, [user]);

  // Show loading while mounting or auth is initializing
  if (!mounted || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BuildingStorefrontIcon className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Become a Vendor</h1>
          <p className="text-gray-600 mb-6">
            Start selling your products on Shaaka! Please log in or create an account to begin your vendor registration.
          </p>
          <button
            onClick={openAuthModal}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <PhoneIcon className="w-5 h-5" />
            Login / Sign Up
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Already have an account? Log in to continue your vendor registration.
          </p>
        </div>
      </div>
    );
  }

  // Redirect if already a vendor with a proper vendor profile
  if (user?.role === 'VENDOR' && user?.vendorProfile) {
    router.push('/vendor');
    return null;
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      }
      const [parent, child] = keys;
      return {
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      };
    });
  };

  const validateStep = (step: number): boolean => {
    setError('');
    
    switch (step) {
      case 1:
        // Confirmation step - just needs user to review
        return true;
      case 2:
        if (!formData.businessName.trim()) {
          setError('Business name is required');
          return false;
        }
        if (!formData.businessPhone.trim() || formData.businessPhone.length !== 10) {
          setError('Valid 10-digit phone number is required');
          return false;
        }
        break;
      case 3:
        if (!formData.address.street.trim() || !formData.address.colony.trim()) {
          setError('Street and colony are required');
          return false;
        }
        if (!formData.address.pincode.trim() || formData.address.pincode.length !== 6) {
          setError('Valid 6-digit pincode is required');
          return false;
        }
        break;
      case 4:
        // Bank details are optional but if provided should be complete
        if (formData.bankDetails.accountNumber && !formData.bankDetails.accountName) {
          setError('Account name is required with account number');
          return false;
        }
        break;
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError('');

    try {
      // For now, use manual coordinates. In production, you'd use geocoding
      const dataToSubmit = {
        ...formData,
        address: {
          ...formData.address,
          latitude: formData.address.latitude || 17.385,
          longitude: formData.address.longitude || 78.4867,
        },
      };

      await vendorAPI.register(dataToSubmit);
      setSuccess(true);
      
      // Refresh user profile to get vendor role
      await fetchProfile();
      
      // Redirect to vendor dashboard after a short delay
      setTimeout(() => {
        router.push('/vendor');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Registration Successful!
          </h1>
          <p className="text-gray-600">
            Your vendor application has been submitted. We&apos;ll review it and get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Become a Home Maker Vendor
          </h1>
          <p className="text-gray-600">
            Join our platform and start selling your homemade food products
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : isCompleted
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-1 mx-2 rounded ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Confirm User Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900">Review Your Information</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    We&apos;ve pre-filled some information from your account. Please review and confirm before proceeding.
                  </p>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Your Account Details
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Name
                  </label>
                  <p className="font-medium text-gray-900">{user?.name || 'Not provided'}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Phone
                  </label>
                  <p className="font-medium text-gray-900">+91 {user?.phone || 'Not provided'}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg sm:col-span-2">
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Email
                  </label>
                  <p className="font-medium text-gray-900">{user?.email || 'Not provided'}</p>
                </div>
              </div>

              {userDefaultAddress && (
                <>
                  <h3 className="text-md font-semibold text-gray-900 mt-6 mb-3">
                    Default Address (Can be edited in next steps)
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">
                      {userDefaultAddress.street}, {userDefaultAddress.colony}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {userDefaultAddress.city}, {userDefaultAddress.state} - {userDefaultAddress.pincode}
                    </p>
                  </div>
                </>
              )}

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Add your business details in the next step</li>
                  <li>• Confirm or update your business address</li>
                  <li>• Optionally add bank details for payouts</li>
                  <li>• Your application will be reviewed within 24-48 hours</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Business Info */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Business Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => updateFormData('businessName', e.target.value)}
                  placeholder="e.g., Mom's Kitchen"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Phone *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 rounded-l-lg text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={formData.businessPhone}
                    onChange={(e) =>
                      updateFormData('businessPhone', e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    placeholder="9876543210"
                    className="flex-1 px-4 py-2 border rounded-r-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => updateFormData('businessEmail', e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Tell us about your food business..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FSSAI License Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.fssaiLicense}
                  onChange={(e) => updateFormData('fssaiLicense', e.target.value)}
                  placeholder="14 digit FSSAI number"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Address */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Business Address
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => updateFormData('address.street', e.target.value)}
                  placeholder="House/Building number, Street name"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colony/Area *
                </label>
                <input
                  type="text"
                  value={formData.address.colony}
                  onChange={(e) => updateFormData('address.colony', e.target.value)}
                  placeholder="Colony or Area name"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => updateFormData('address.city', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => updateFormData('address.state', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode *
                </label>
                <input
                  type="text"
                  value={formData.address.pincode}
                  onChange={(e) =>
                    updateFormData('address.pincode', e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="500001"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Radius (km)
                </label>
                <select
                  value={formData.deliveryRadius}
                  onChange={(e) => updateFormData('deliveryRadius', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={3}>3 km</option>
                  <option value={5}>5 km</option>
                  <option value={7}>7 km</option>
                  <option value={10}>10 km</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum distance you can deliver from your location
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Bank Details */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Bank Details (Optional)
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                You can add bank details later from your settings page.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.accountName}
                  onChange={(e) => updateFormData('bankDetails.accountName', e.target.value)}
                  placeholder="Name as on bank account"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) =>
                    updateFormData('bankDetails.accountNumber', e.target.value.replace(/\D/g, ''))
                  }
                  placeholder="Bank account number"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.bankName}
                  onChange={(e) => updateFormData('bankDetails.bankName', e.target.value)}
                  placeholder="e.g., State Bank of India"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) =>
                    updateFormData('bankDetails.ifscCode', e.target.value.toUpperCase())
                  }
                  placeholder="SBIN0001234"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Next
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <CheckIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
