'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminAPI } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Vendor {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  vendorProfile: {
    businessName: string;
    status: string;
    rating: number;
    totalOrders: number;
    totalRevenue: number;
    isFlagged: boolean;
    flagReason?: string;
    createdAt: string;
  };
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  PENDING_APPROVAL: { color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon, label: 'Pending' },
  APPROVED: { color: 'bg-green-100 text-green-700', icon: CheckCircleIcon, label: 'Approved' },
  REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircleIcon, label: 'Rejected' },
  SUSPENDED: { color: 'bg-gray-100 text-gray-700', icon: XCircleIcon, label: 'Suspended' },
  DISABLED: { color: 'bg-gray-100 text-gray-700', icon: XCircleIcon, label: 'Disabled' },
};

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const fetchVendors = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      let response;
      if (flaggedOnly) {
        response = await adminAPI.getFlaggedVendors({ page, limit: 20 });
      } else {
        const params: Record<string, unknown> = { page, limit: 20 };
        if (statusFilter) params.status = statusFilter;
        response = await adminAPI.getVendors(params);
      }
      const data = response.data.data;
      setVendors(data.vendors);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, flaggedOnly]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const filteredVendors = vendors.filter((vendor) => {
    if (!search) return true;
    return (
      vendor.vendorProfile?.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      vendor.name?.toLowerCase().includes(search.toLowerCase()) ||
      vendor.phone?.includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600">Manage vendor accounts and approvals</p>
        </div>
        <Link
          href="/admin/vendors/pending"
          className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
        >
          Pending Approvals
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, name, or phone..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setFlaggedOnly(false);
                }}
                disabled={flaggedOnly}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
              >
                <option value="">All Status</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={(e) => {
                  setFlaggedOnly(e.target.checked);
                  if (e.target.checked) setStatusFilter('');
                }}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Flagged Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Vendors</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.totalItems}</p>
        </div>
      </div>

      {/* Vendors List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <BuildingStorefrontIcon className="mx-auto mb-4 text-gray-400 w-12 h-12" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Vendors Found</h2>
          <p className="text-gray-600">
            {flaggedOnly ? 'No flagged vendors' : 'No vendors match your criteria'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Business
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Owner
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Rating
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Orders
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Revenue
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <BuildingStorefrontIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {vendor.vendorProfile?.businessName}
                          </p>
                          {vendor.vendorProfile?.isFlagged && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                              <ExclamationTriangleIcon className="w-3 h-3" />
                              Flagged
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-gray-900">{vendor.name}</p>
                      <p className="text-sm text-gray-500">{vendor.phone}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          statusConfig[vendor.vendorProfile?.status]?.color || 'bg-gray-100'
                        }`}
                      >
                        {statusConfig[vendor.vendorProfile?.status]?.label || vendor.vendorProfile?.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-900">
                        {vendor.vendorProfile?.rating?.toFixed(1) || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-900">
                        {vendor.vendorProfile?.totalOrders || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-900">
                        ₹{(vendor.vendorProfile?.totalRevenue || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/admin/vendors/${vendor._id}`}
                        className="inline-flex items-center gap-1 text-green-600 hover:text-green-700"
                      >
                        View
                        <ChevronRightIcon className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchVendors(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchVendors(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
