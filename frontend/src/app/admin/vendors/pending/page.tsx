'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAPI } from '@/lib/api';
import {
  BuildingStorefrontIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface PendingVendor {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  vendorProfile: {
    businessName: string;
    businessPhone: string;
    description?: string;
    address: {
      street: string;
      colony: string;
      city: string;
      pincode: string;
    };
    fssaiLicense?: string;
    createdAt: string;
  };
}

export default function PendingVendorsPage() {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPendingVendors = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getPendingVendors();
      setVendors(response.data.data.vendors);
    } catch (error) {
      console.error('Failed to fetch pending vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingVendors();
  }, []);

  const handleApprove = async (vendorId: string) => {
    if (!confirm('Are you sure you want to approve this vendor?')) return;
    
    setActionLoading(vendorId);
    try {
      await adminAPI.approveVendor(vendorId);
      fetchPendingVendors();
    } catch (error) {
      console.error('Failed to approve vendor:', error);
      alert('Failed to approve vendor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (vendorId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    setActionLoading(vendorId);
    try {
      await adminAPI.rejectVendor(vendorId, reason);
      fetchPendingVendors();
    } catch (error) {
      console.error('Failed to reject vendor:', error);
      alert('Failed to reject vendor');
    } finally {
      setActionLoading(null);
    }
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Vendor Approvals</h1>
          <p className="text-gray-600">Review and approve new vendor applications</p>
        </div>
      </div>

      {/* Pending Count */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
        <ClockIcon className="w-6 h-6 text-yellow-600" />
        <span className="text-yellow-800">
          <strong>{vendors.length}</strong> vendor{vendors.length !== 1 ? 's' : ''} awaiting approval
        </span>
      </div>

      {/* Vendors List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CheckIcon className="mx-auto mb-4 text-green-400 w-12 h-12" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h2>
          <p className="text-gray-600">
            No pending vendor applications at the moment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendors.map((vendor) => (
            <div
              key={vendor._id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              {/* Vendor Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <BuildingStorefrontIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {vendor.vendorProfile?.businessName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Applied {new Date(vendor.vendorProfile?.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(vendor._id)}
                      disabled={actionLoading === vendor._id}
                      className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(vendor._id)}
                      disabled={actionLoading === vendor._id}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === vendor._id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckIcon className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              </div>

              {/* Vendor Details */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Owner Details</h4>
                  <p className="text-gray-900">{vendor.name}</p>
                  <p className="text-gray-600">{vendor.phone}</p>
                  {vendor.email && <p className="text-gray-600">{vendor.email}</p>}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Business Contact</h4>
                  <p className="text-gray-900">{vendor.vendorProfile?.businessPhone}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Address</h4>
                  <p className="text-gray-900">
                    {vendor.vendorProfile?.address?.street}, {vendor.vendorProfile?.address?.colony}
                  </p>
                  <p className="text-gray-600">
                    {vendor.vendorProfile?.address?.city} - {vendor.vendorProfile?.address?.pincode}
                  </p>
                </div>

                {vendor.vendorProfile?.fssaiLicense && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">FSSAI License</h4>
                    <p className="text-gray-900">{vendor.vendorProfile.fssaiLicense}</p>
                  </div>
                )}

                {vendor.vendorProfile?.description && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                    <p className="text-gray-600">{vendor.vendorProfile.description}</p>
                  </div>
                )}
              </div>

              {/* View Full Profile Link */}
              <div className="px-4 py-3 bg-gray-50 border-t">
                <Link
                  href={`/admin/vendors/${vendor._id}`}
                  className="flex items-center justify-center gap-2 text-sm text-green-600 hover:text-green-700"
                >
                  View Full Profile
                  <ChevronRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
