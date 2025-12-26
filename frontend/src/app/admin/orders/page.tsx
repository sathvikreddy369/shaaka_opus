'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { orderAPI } from '@/lib/api';
import { useUIStore } from '@/store';
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils';

interface Order {
  _id: string;
  orderNumber: string;
  user: { _id: string; name: string; phone: string };
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  items: { quantity: number }[];
  createdAt: string;
}

const filterStatusOptions = [
  { value: '', label: 'All Status' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'READY_TO_DELIVER', label: 'Ready to Deliver' },
  { value: 'HANDED_TO_AGENT', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// Valid status transitions
const statusTransitions: Record<string, string[]> = {
  'PLACED': ['CONFIRMED', 'CANCELLED'],
  'CONFIRMED': ['PACKED', 'CANCELLED'],
  'PACKED': ['READY_TO_DELIVER', 'CANCELLED'],
  'READY_TO_DELIVER': ['HANDED_TO_AGENT'],
  'HANDED_TO_AGENT': ['DELIVERED'],
  'DELIVERED': [],
  'CANCELLED': [],
  'REFUND_INITIATED': [],
  'REFUNDED': [],
};

function getNextStatusOptions(currentStatus: string): string[] {
  return statusTransitions[currentStatus] || [];
}

export default function AdminOrdersPage() {
  const { addToast } = useUIStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const params: any = { page: currentPage, limit: 10 };
        if (selectedStatus) params.status = selectedStatus;

        const response = await orderAPI.getAllAdmin(params);
        const data = response.data.data || response.data;
        setOrders(data.orders || []);
        setTotalPages(data.pages || data.pagination?.pages || 1);
        setTotalOrders(data.total || data.pagination?.total || 0);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage, selectedStatus]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      setOrders(
        orders.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );
      addToast({ type: 'success', message: 'Order status updated' });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update status',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-gray-500">{totalOrders} orders total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-4">
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setCurrentPage(1);
          }}
          className="input md:w-48"
        >
          {filterStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Orders table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Order
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Customer
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Items
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Total
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Payment
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Date
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-4">
                      <div className="animate-pulse h-4 bg-gray-200 rounded" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-medium">#{order.orderNumber}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{order.user?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-500">{order.user?.phone}</p>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {(order.items || []).reduce((acc, item) => acc + item.quantity, 0)} items
                    </td>
                    <td className="px-4 py-4 font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm">
                        {order.paymentMethod === 'RAZORPAY' ? 'Online' : 'COD'}
                      </p>
                      <p
                        className={`text-xs ${
                          order.paymentStatus === 'PAID'
                            ? 'text-green-600'
                            : order.paymentStatus === 'REFUNDED'
                            ? 'text-blue-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {order.paymentStatus}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full inline-block w-fit ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                        {getNextStatusOptions(order.status).length > 0 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusChange(order._id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="text-xs px-2 py-1 rounded border border-gray-300 bg-white"
                            defaultValue=""
                          >
                            <option value="">Update status...</option>
                            {getNextStatusOptions(order.status).map((status) => (
                              <option key={status} value={status}>
                                → {getOrderStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg inline-flex"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * 10 + 1} to{' '}
              {Math.min(currentPage * 10, totalOrders)} of {totalOrders}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
