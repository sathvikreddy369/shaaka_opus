'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { adminAPI } from '@/lib/api';
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
  ShoppingCartIcon,
  CurrencyRupeeIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface VendorDetails {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  vendorProfile: {
    businessName: string;
    businessPhone: string;
    businessEmail?: string;
    description?: string;
    status: string;
    address: {
      street: string;
      colony: string;
      city: string;
      state: string;
      pincode: string;
    };
    fssaiLicense?: string;
    deliveryRadius: number;
    commissionRate: number;
    rating: number;
    totalReviews: number;
    totalOrders: number;
    totalRevenue: number;
    isFlagged: boolean;
    flagReason?: string;
    isOperating: boolean;
    createdAt: string;
  };
}

interface ChangeLogEntry {
  field: string;
  oldValue: any;
  newValue: any;
  changedAt: string;
  changedBy?: {
    name: string;
  };
}

export default function VendorDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'changelog'>('details');

  const fetchVendorDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [detailsRes, changeLogRes] = await Promise.all([
        adminAPI.getVendorDetails(vendorId),
        adminAPI.getVendorChangeLog(vendorId),
      ]);
      setVendor(detailsRes.data.data.vendor);
      setChangeLog(changeLogRes.data.data.changeLog || []);
    } catch (error) {
      console.error('Failed to fetch vendor details:', error);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (vendorId) {
      fetchVendorDetails();
    }
  }, [vendorId, fetchVendorDetails]);

  const handleApprove = async () => {
    if (!confirm('Approve this vendor?')) return;
    setActionLoading(true);
    try {
      await adminAPI.approveVendor(vendorId);
      fetchVendorDetails();
    } catch (error) {
      alert('Failed to approve vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await adminAPI.rejectVendor(vendorId, reason);
      fetchVendorDetails();
    } catch (error) {
      alert('Failed to reject vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await adminAPI.suspendVendor(vendorId, reason);
      fetchVendorDetails();
    } catch (error) {
      alert('Failed to suspend vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!confirm('Enable this vendor?')) return;
    setActionLoading(true);
    try {
      await adminAPI.enableVendor(vendorId);
      fetchVendorDetails();
    } catch (error) {
      alert('Failed to enable vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlag = async () => {
    const reason = prompt('Enter flag reason:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await adminAPI.flagVendor(vendorId, 'SUSPICIOUS', reason);
      fetchVendorDetails();
    } catch (error) {
      alert('Failed to flag vendor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearFlag = async () => {
    if (!confirm('Clear flag from this vendor?')) return;
    setActionLoading(true);
    try {
      await adminAPI.clearVendorFlag(vendorId);
      fetchVendorDetails();
    } catch (error) {
      alert('Failed to clear flag');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCommission = async () => {
    const rate = prompt('Enter new commission rate (0-100):', vendor?.vendorProfile?.commissionRate?.toString());
    if (!rate) return;
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      alert('Invalid commission rate');
      return;
    }
    setActionLoading(true);
    try {
      await adminAPI.updateVendorCommission(vendorId, numRate);
      fetchVendorDetails();
    } catch (error) {
      alert('Failed to update commission');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Vendor not found</p>
        <Link href="/admin/vendors" className="text-green-600 hover:underline mt-2 inline-block">
          Back to Vendors
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    SUSPENDED: 'bg-orange-100 text-orange-700',
    DISABLED: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/vendors"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {vendor.vendorProfile?.businessName}
            </h1>
            <span className={`px-3 py-1 text-sm rounded-full ${statusColors[vendor.vendorProfile?.status] || 'bg-gray-100'}`}>
              {vendor.vendorProfile?.status}
            </span>
            {vendor.vendorProfile?.isFlagged && (
              <span className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Flagged
              </span>
            )}
          </div>
          <p className="text-gray-500">Vendor ID: {vendor._id}</p>
        </div>
      </div>

      {/* Flag Warning */}
      {vendor.vendorProfile?.isFlagged && vendor.vendorProfile?.flagReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Flagged for Review</p>
              <p className="text-red-600 text-sm mt-1">{vendor.vendorProfile.flagReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {vendor.vendorProfile?.status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
                Reject
              </button>
            </>
          )}
          {vendor.vendorProfile?.status === 'APPROVED' && (
            <button
              onClick={handleSuspend}
              disabled={actionLoading}
              className="flex items-center gap-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <XMarkIcon className="w-4 h-4" />
              Suspend
            </button>
          )}
          {vendor.vendorProfile?.status === 'SUSPENDED' && (
            <button
              onClick={handleEnable}
              disabled={actionLoading}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <CheckIcon className="w-4 h-4" />
              Enable
            </button>
          )}
          {vendor.vendorProfile?.isFlagged ? (
            <button
              onClick={handleClearFlag}
              disabled={actionLoading}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Clear Flag
            </button>
          ) : (
            <button
              onClick={handleFlag}
              disabled={actionLoading}
              className="flex items-center gap-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
              Flag
            </button>
          )}
          <button
            onClick={handleUpdateCommission}
            disabled={actionLoading}
            className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Update Commission ({vendor.vendorProfile?.commissionRate}%)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('changelog')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'changelog'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Change Log
          </button>
        </div>
      </div>

      {activeTab === 'details' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <StarIcon className="w-4 h-4" />
                <span className="text-sm">Rating</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-gray-900">
                  {vendor.vendorProfile?.rating?.toFixed(1) || '-'}
                </span>
                {vendor.vendorProfile?.rating && (
                  <StarIconSolid className="w-5 h-5 text-yellow-400" />
                )}
              </div>
              <p className="text-sm text-gray-500">
                {vendor.vendorProfile?.totalReviews || 0} reviews
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <ShoppingCartIcon className="w-4 h-4" />
                <span className="text-sm">Orders</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {vendor.vendorProfile?.totalOrders || 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <CurrencyRupeeIcon className="w-4 h-4" />
                <span className="text-sm">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₹{(vendor.vendorProfile?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <MapPinIcon className="w-4 h-4" />
                <span className="text-sm">Delivery Radius</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {vendor.vendorProfile?.deliveryRadius || 5} km
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BuildingStorefrontIcon className="w-5 h-5" />
                Business Information
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Business Name</dt>
                  <dd className="text-gray-900">{vendor.vendorProfile?.businessName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Business Phone</dt>
                  <dd className="text-gray-900">{vendor.vendorProfile?.businessPhone}</dd>
                </div>
                {vendor.vendorProfile?.businessEmail && (
                  <div>
                    <dt className="text-sm text-gray-500">Business Email</dt>
                    <dd className="text-gray-900">{vendor.vendorProfile.businessEmail}</dd>
                  </div>
                )}
                {vendor.vendorProfile?.fssaiLicense && (
                  <div>
                    <dt className="text-sm text-gray-500">FSSAI License</dt>
                    <dd className="text-gray-900">{vendor.vendorProfile.fssaiLicense}</dd>
                  </div>
                )}
                {vendor.vendorProfile?.description && (
                  <div>
                    <dt className="text-sm text-gray-500">Description</dt>
                    <dd className="text-gray-600">{vendor.vendorProfile.description}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Owner Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Owner Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Name</dt>
                  <dd className="text-gray-900">{vendor.name}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-gray-400" />
                  <dd className="text-gray-900">{vendor.phone}</dd>
                </div>
                {vendor.email && (
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <dd className="text-gray-900">{vendor.email}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPinIcon className="w-5 h-5" />
                Business Address
              </h3>
              <address className="not-italic text-gray-600">
                {vendor.vendorProfile?.address?.street}<br />
                {vendor.vendorProfile?.address?.colony}<br />
                {vendor.vendorProfile?.address?.city}, {vendor.vendorProfile?.address?.state}<br />
                {vendor.vendorProfile?.address?.pincode}
              </address>
            </div>

            {/* Operating Status */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Operating Status</h3>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    vendor.vendorProfile?.isOperating ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-gray-900">
                  {vendor.vendorProfile?.isOperating ? 'Currently Operating' : 'Not Operating'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Joined {new Date(vendor.vendorProfile?.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'changelog' && (
        <div className="bg-white rounded-xl shadow-sm">
          {changeLog.length === 0 ? (
            <div className="p-12 text-center">
              <DocumentTextIcon className="mx-auto mb-4 text-gray-400 w-12 h-12" />
              <p className="text-gray-500">No changes recorded</p>
            </div>
          ) : (
            <div className="divide-y">
              {changeLog.map((entry, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {entry.field} changed
                      </p>
                      <div className="mt-1 text-sm">
                        <span className="text-red-600 line-through">
                          {JSON.stringify(entry.oldValue)}
                        </span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">
                          {JSON.stringify(entry.newValue)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{new Date(entry.changedAt).toLocaleString()}</p>
                      {entry.changedBy && <p>by {entry.changedBy.name}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
