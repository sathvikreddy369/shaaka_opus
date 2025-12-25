'use client';

import { useState, useEffect } from 'react';
import {
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  UsersIcon,
  ArchiveBoxIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '@/lib/api';
import { useUIStore } from '@/store';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    revenueChange: number;
    totalOrders: number;
    ordersChange: number;
    totalCustomers: number;
    customersChange: number;
    totalProducts: number;
    productsChange: number;
    averageOrderValue: number;
    aovChange: number;
  };
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  topProducts: Array<{
    name: string;
    sold: number;
    revenue: number;
  }>;
  topCategories: Array<{
    name: string;
    revenue: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    type: string;
    message: string;
    time: string;
  }>;
}

const COLORS = ['#22c55e', '#eab308', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function AdminAnalyticsPage() {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAnalytics({ period });
      setData(response.data);
    } catch {
      addToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(data?.overview.totalRevenue || 0),
      change: data?.overview.revenueChange || 0,
      icon: CurrencyRupeeIcon,
      color: 'bg-green-500',
    },
    {
      label: 'Total Orders',
      value: data?.overview.totalOrders || 0,
      change: data?.overview.ordersChange || 0,
      icon: ShoppingBagIcon,
      color: 'bg-blue-500',
    },
    {
      label: 'Customers',
      value: data?.overview.totalCustomers || 0,
      change: data?.overview.customersChange || 0,
      icon: UsersIcon,
      color: 'bg-purple-500',
    },
    {
      label: 'Products',
      value: data?.overview.totalProducts || 0,
      change: data?.overview.productsChange || 0,
      icon: ArchiveBoxIcon,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
          className="input w-auto"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div
                className={`flex items-center text-sm ${
                  stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change >= 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                )}
                {Math.abs(stat.change)}%
              </div>
            </div>
            <h3 className="text-2xl font-bold">{stat.value}</h3>
            <p className="text-gray-500 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueByDay || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Orders by Status</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.ordersByStatus || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="status"
                >
                  {(data?.ordersByStatus || []).map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Products</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={(data?.topProducts || []).slice(0, 5)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip formatter={(value: number) => [value, 'Units Sold']} />
                <Bar dataKey="sold" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue by Category</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.topCategories || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="revenue"
                  nameKey="name"
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                >
                  {(data?.topCategories || []).map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Orders Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenueByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data?.overview.averageOrderValue || 0)}
              </p>
              <p
                className={`text-sm ${
                  (data?.overview.aovChange || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {(data?.overview.aovChange || 0) >= 0 ? '↑' : '↓'}{' '}
                {Math.abs(data?.overview.aovChange || 0)}% vs last period
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Completed Orders</p>
              <p className="text-2xl font-bold text-green-700">
                {data?.ordersByStatus?.find((s) => s.status === 'DELIVERED')?.count || 0}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-700">
                {data?.ordersByStatus?.find((s) => s.status === 'PENDING')?.count || 0}
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Processing Orders</p>
              <p className="text-2xl font-bold text-blue-700">
                {(data?.ordersByStatus?.find((s) => s.status === 'CONFIRMED')?.count || 0) +
                  (data?.ordersByStatus?.find((s) => s.status === 'PROCESSING')?.count || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
