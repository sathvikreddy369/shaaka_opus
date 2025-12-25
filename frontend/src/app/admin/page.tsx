'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  UsersIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface DashboardData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
  };
  recentOrders: {
    _id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    user: { name: string };
  }[];
  lowStockProducts: {
    _id: string;
    name: string;
    stock: number;
  }[];
  ordersByStatus: {
    _id: string;
    count: number;
  }[];
}

const statCards = [
  {
    name: 'Total Revenue',
    icon: CurrencyRupeeIcon,
    color: 'bg-green-500',
    key: 'totalRevenue',
    format: (v: number) => formatCurrency(v),
  },
  {
    name: 'Total Orders',
    icon: ShoppingBagIcon,
    color: 'bg-blue-500',
    key: 'totalOrders',
    format: (v: number) => v.toString(),
  },
  {
    name: 'Total Customers',
    icon: UsersIcon,
    color: 'bg-purple-500',
    key: 'totalCustomers',
    format: (v: number) => v.toString(),
  },
  {
    name: 'Total Products',
    icon: CubeIcon,
    color: 'bg-orange-500',
    key: 'totalProducts',
    format: (v: number) => v.toString(),
  },
];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await adminAPI.getDashboard();
        setData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold mt-1">
                  {stat.format(data.overview[stat.key as keyof typeof data.overview])}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-primary-600 text-sm hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {data.recentOrders.slice(0, 5).map((order) => (
              <div
                key={order._id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">#{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">{order.user?.name || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(order.total)}</p>
                  <p
                    className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                      order.status === 'DELIVERED'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {order.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders by status */}
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Orders by Status</h2>
          <div className="space-y-4">
            {data.ordersByStatus.map((status) => (
              <div key={status._id} className="flex items-center justify-between">
                <span className="text-gray-600">{status._id}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500"
                      style={{
                        width: `${(status.count / data.overview.totalOrders) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right">{status.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low stock products */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Low Stock Alert</h2>
            <Link href="/admin/products" className="text-primary-600 text-sm hover:underline">
              View All
            </Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No low stock products</p>
          ) : (
            <div className="space-y-4">
              {data.lowStockProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <p className="font-medium truncate">{product.name}</p>
                  <span
                    className={`text-sm font-medium px-2 py-0.5 rounded ${
                      product.stock === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {product.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/admin/products/new"
              className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
            >
              <CubeIcon className="h-8 w-8 mx-auto text-primary-600 mb-2" />
              <span className="text-sm font-medium">Add Product</span>
            </Link>
            <Link
              href="/admin/categories/new"
              className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
            >
              <svg
                className="h-8 w-8 mx-auto text-primary-600 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span className="text-sm font-medium">Add Category</span>
            </Link>
            <Link
              href="/admin/orders"
              className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
            >
              <ShoppingBagIcon className="h-8 w-8 mx-auto text-primary-600 mb-2" />
              <span className="text-sm font-medium">View Orders</span>
            </Link>
            <Link
              href="/admin/analytics"
              className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
            >
              <ArrowTrendingUpIcon className="h-8 w-8 mx-auto text-primary-600 mb-2" />
              <span className="text-sm font-medium">Analytics</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
