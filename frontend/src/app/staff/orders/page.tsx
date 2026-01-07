'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { staffAPI } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  FunnelIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface Order {
  _id: string;
  orderNumber: string;
  user: {
    name: string;
    phone: string;
  };
  deliveryAddress: {
    street: string;
    colony: string;
  };
  items: Array<{
    productSnapshot: { name: string };
    quantity: number;
  }>;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon, label: 'Pending' },
  PLACED: { color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon, label: 'Placed' },
  CONFIRMED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircleIcon, label: 'Confirmed' },
  PACKED: { color: 'bg-purple-100 text-purple-700', icon: CubeIcon, label: 'Packed' },
  READY_TO_DELIVER: { color: 'bg-indigo-100 text-indigo-700', icon: TruckIcon, label: 'Ready to Deliver' },
  HANDED_TO_AGENT: { color: 'bg-orange-100 text-orange-700', icon: TruckIcon, label: 'Handed to Agent' },
  DELIVERED: { color: 'bg-green-100 text-green-700', icon: CheckCircleIcon, label: 'Delivered' },
  CANCELLED: { color: 'bg-red-100 text-red-700', icon: XCircleIcon, label: 'Cancelled' },
};

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;

      const response = await staffAPI.getOrders(params);
      const data = response.data.data;
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await staffAPI.updateOrderStatus(orderId, newStatus);
      fetchOrders(pagination.currentPage);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update order status');
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!search) return true;
    return (
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600">Manage and update order status</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number or customer..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Status</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CubeIcon className="mx-auto mb-4 text-gray-400 w-12 h-12" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Orders Found</h2>
          <p className="text-gray-600">
            Orders will appear here when customers place them
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              {/* Order Header */}
              <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      #{order.orderNumber}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        statusConfig[order.status]?.color || 'bg-gray-100'
                      }`}
                    >
                      {statusConfig[order.status]?.label || order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    ₹{order.total?.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.items?.length || 0} items
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 border-b">
                <p className="font-medium text-gray-900">{order.user?.name}</p>
                <p className="text-sm text-gray-500">{order.user?.phone}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {order.deliveryAddress?.street}, {order.deliveryAddress?.colony}
                </p>
              </div>

              {/* Status Update - Staff can only update to: PACKED, READY_TO_DELIVER, HANDED_TO_AGENT */}
              {['CONFIRMED', 'PACKED', 'READY_TO_DELIVER'].includes(order.status) && (
                <div className="p-4 bg-gray-50 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Update Status:</span>
                  <div className="flex gap-2">
                    {order.status === 'CONFIRMED' && (
                      <button
                        onClick={() => updateOrderStatus(order._id, 'PACKED')}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                      >
                        Mark Packed
                      </button>
                    )}
                    {order.status === 'PACKED' && (
                      <button
                        onClick={() => updateOrderStatus(order._id, 'READY_TO_DELIVER')}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                      >
                        Ready to Deliver
                      </button>
                    )}
                    {order.status === 'READY_TO_DELIVER' && (
                      <button
                        onClick={() => updateOrderStatus(order._id, 'HANDED_TO_AGENT')}
                        className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700"
                      >
                        Handed to Agent
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* View Details */}
              <div className="px-4 py-3 border-t">
                <Link
                  href={`/staff/orders/${order._id}`}
                  className="flex items-center justify-center gap-2 text-sm text-green-600 hover:text-green-700"
                >
                  View Full Details
                  <ChevronRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchOrders(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchOrders(pagination.currentPage + 1)}
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
