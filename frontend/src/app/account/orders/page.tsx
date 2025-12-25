'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBagIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore, useUIStore } from '@/store';
import { orderAPI } from '@/lib/api';
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils';

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  items: { product: { name: string }; quantity: number }[];
  total: number;
  createdAt: string;
}

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useUIStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated) return;

      setIsLoading(true);
      try {
        const response = await orderAPI.getAll({ page: currentPage, limit: 10 });
        setOrders(response.data.orders || []);
        setTotalPages(response.data.pages || 1);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, currentPage]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Please login to view your orders</h1>
        <button onClick={openAuthModal} className="btn-primary">
          Login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold mb-8">My Orders</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">No orders yet</h1>
        <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
        <Link href="/products" className="btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold">My Orders</h1>
        <Link href="/account" className="text-primary-600 hover:underline">
          Back to Account
        </Link>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order._id}
            href={`/orders/${order._id}`}
            className="card p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold">#{order.orderNumber}</span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getOrderStatusColor(
                    order.status
                  )}`}
                >
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {order.items.length} item{order.items.length > 1 ? 's' : ''} •{' '}
                {order.items
                  .slice(0, 2)
                  .map((item) => item.product.name)
                  .join(', ')}
                {order.items.length > 2 && ` +${order.items.length - 2} more`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                {formatCurrency(order.total)}
              </span>
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
