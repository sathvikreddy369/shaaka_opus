'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { vendorAPI } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  ChevronRightIcon,
  FunnelIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface OrderItem {
  _id: string;
  productSnapshot: {
    name: string;
    image: string;
  };
  quantityOptionSnapshot: {
    quantity: string;
    sellingPrice: number;
  };
  quantity: number;
  subtotal: number;
  vendorStatus: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  customerSnapshot: {
    name: string;
    phone: string;
  };
  deliveryAddress: {
    street: string;
    colony: string;
    landmark?: string;
  };
  items: OrderItem[];
  vendorTotal: number;
  status: string;
  navigationLink?: string;
  createdAt: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon, label: 'Pending' },
  PREPARING: { color: 'bg-blue-100 text-blue-700', icon: CubeIcon, label: 'Preparing' },
  READY: { color: 'bg-purple-100 text-purple-700', icon: CheckCircleIcon, label: 'Ready' },
  PICKED_UP: { color: 'bg-indigo-100 text-indigo-700', icon: TruckIcon, label: 'Picked Up' },
  DELIVERED: { color: 'bg-green-100 text-green-700', icon: CheckCircleIcon, label: 'Delivered' },
  CANCELLED: { color: 'bg-red-100 text-red-700', icon: XCircleIcon, label: 'Cancelled' },
};

const vendorStatuses = ['PENDING', 'PREPARING', 'READY', 'PICKED_UP'];

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;

      const response = await vendorAPI.getOrders(params);
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

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      await vendorAPI.updateOrderStatus(orderId, itemId, newStatus);
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
      order.customerSnapshot.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600">Manage and track your customer orders</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
            />
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Orders Yet</h2>
          <p className="text-gray-600">
            Orders for your products will appear here
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
                        statusConfig[order.status]?.color || 'bg-gray-100 text-gray-700'
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
                    ₹{order.vendorTotal?.toLocaleString()}
                  </p>
                  {order.navigationLink && (
                    <a
                      href={order.navigationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <MapPinIcon className="w-3.5 h-3.5" />
                      Navigate
                    </a>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.customerSnapshot.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.customerSnapshot.phone}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>{order.deliveryAddress.street}</p>
                    <p>
                      {order.deliveryAddress.colony}
                      {order.deliveryAddress.landmark && ` (${order.deliveryAddress.landmark})`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item._id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.productSnapshot.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.quantityOptionSnapshot.quantity} × {item.quantity} = ₹
                        {item.subtotal}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 text-sm rounded-full ${
                          statusConfig[item.vendorStatus]?.color ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {statusConfig[item.vendorStatus]?.label || item.vendorStatus}
                      </span>

                      {/* Status Actions */}
                      {item.vendorStatus !== 'CANCELLED' &&
                        item.vendorStatus !== 'DELIVERED' && (
                          <select
                            value=""
                            onChange={(e) =>
                              updateItemStatus(order._id, item._id, e.target.value)
                            }
                            className="px-3 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Update Status</option>
                            {vendorStatuses
                              .filter((s) => {
                                const currentIndex = vendorStatuses.indexOf(
                                  item.vendorStatus
                                );
                                const optionIndex = vendorStatuses.indexOf(s);
                                return optionIndex > currentIndex;
                              })
                              .map((status) => (
                                <option key={status} value={status}>
                                  {statusConfig[status]?.label || status}
                                </option>
                              ))}
                          </select>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {/* View Details Link */}
              <div className="px-4 py-3 bg-gray-50 border-t">
                <Link
                  href={`/vendor/orders/${order._id}`}
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
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchOrders(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
