'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { vendorAPI } from '@/lib/api';
import {
  CubeIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  todayOrders: number;
  pendingOrders: number;
  todayRevenue: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  items: Array<{
    productName: string;
    quantity: number;
    subtotal: number;
    vendorStatus: string;
  }>;
  total: number;
  status: string;
  createdAt: string;
}

export default function VendorDashboard() {
  const { user, isApprovedVendor } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!isApprovedVendor()) {
        setLoading(false);
        return;
      }

      try {
        const response = await vendorAPI.getDashboard();
        const data = response.data.data;
        setStats(data.stats);
        setRecentOrders(data.recentOrders || []);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [isApprovedVendor]);

  const vendorProfile = user?.vendorProfile;

  // Show pending approval state
  if (!isApprovedVendor()) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          {vendorProfile?.status === 'PENDING_APPROVAL' ? (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="text-yellow-600 w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Application Under Review
              </h1>
              <p className="text-gray-600 mb-6">
                Thank you for registering as a vendor! Your application is currently
                being reviewed by our team. This usually takes 1-2 business days.
              </p>
              <div className="bg-yellow-50 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-yellow-800 mb-2">What&apos;s Next?</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• We&apos;ll verify your business details</li>
                  <li>• You&apos;ll receive a notification once approved</li>
                  <li>• After approval, you can start adding products</li>
                </ul>
              </div>
            </>
          ) : vendorProfile?.status === 'REJECTED' ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationCircleIcon className="text-red-600 w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Application Rejected
              </h1>
              <p className="text-gray-600 mb-4">
                Unfortunately, your vendor application was not approved.
              </p>
              <p className="text-sm text-gray-500">
                Please contact our support team for more information.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationCircleIcon className="text-orange-600 w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Account Suspended
              </h1>
              <p className="text-gray-600">
                Your vendor account has been suspended. Please contact support.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {vendorProfile?.businessName}!
          </h1>
          <p className="text-gray-600">Here&apos;s what&apos;s happening with your store today.</p>
        </div>
        <Link
          href="/vendor/products/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Add Product
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today&apos;s Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.todayOrders || 0}</p>
              <p className="text-sm text-orange-600">{stats?.pendingOrders || 0} pending</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCartIcon className="text-blue-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today&apos;s Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{stats?.todayRevenue?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-500">
                Total: ₹{stats?.totalRevenue?.toLocaleString() || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyRupeeIcon className="text-green-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeProducts || 0}</p>
              <p className="text-sm text-gray-500">
                {stats?.totalProducts || 0} total
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CubeIcon className="text-purple-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.averageRating?.toFixed(1) || '0.0'}
              </p>
              <p className="text-sm text-gray-500">{stats?.totalReviews || 0} reviews</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <StarIcon className="text-yellow-600 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/vendor/orders?status=PENDING"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <ClockIcon className="text-orange-500 w-5 h-5" />
              <span className="text-sm">View Pending Orders</span>
              {stats?.pendingOrders ? (
                <span className="ml-auto bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                  {stats.pendingOrders}
                </span>
              ) : null}
            </Link>
            <Link
              href="/vendor/products/new"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <CubeIcon className="text-green-500 w-5 h-5" />
              <span className="text-sm">Add New Product</span>
            </Link>
            <Link
              href="/vendor/settings"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <ArrowTrendingUpIcon className="text-blue-500 w-5 h-5" />
              <span className="text-sm">Update Store Settings</span>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link
              href="/vendor/orders"
              className="text-sm text-green-600 hover:text-green-700"
            >
              View All
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCartIcon className="mx-auto mb-2 text-gray-400 w-8 h-8" />
              <p>No orders yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.slice(0, 5).map((order) => (
                <Link
                  key={order._id}
                  href={`/vendor/orders/${order._id}`}
                  className="block p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">#{order.orderNumber}</span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'CONFIRMED'
                          ? 'bg-blue-100 text-blue-700'
                          : order.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{order.customerName}</span>
                    <span className="font-medium">₹{order.total}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Operating Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {vendorProfile?.isAcceptingOrders ? (
              <CheckCircleIcon className="text-green-500 w-6 h-6" />
            ) : (
              <ExclamationCircleIcon className="text-orange-500 w-6 h-6" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {vendorProfile?.isAcceptingOrders
                  ? 'Your store is accepting orders'
                  : 'Your store is not accepting orders'}
              </p>
              <p className="text-sm text-gray-500">
                Delivery radius: {vendorProfile?.deliveryRadius || 5}km
              </p>
            </div>
          </div>
          <Link
            href="/vendor/settings"
            className="text-sm text-green-600 hover:text-green-700"
          >
            Change Status
          </Link>
        </div>
      </div>
    </div>
  );
}
