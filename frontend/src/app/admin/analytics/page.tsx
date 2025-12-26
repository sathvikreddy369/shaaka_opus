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

interface RevenueData {
  chartData: Array<{
    _id: string;
    revenue: number;
    orders: number;
    avgOrderValue: number;
  }>;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    growthRate: number;
    previousPeriodRevenue: number;
  };
}

interface DashboardData {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalUsers: number;
    newUsers: number;
  };
  ordersByStatus: Record<string, number>;
  ordersByPaymentMethod: Array<{
    _id: string;
    count: number;
    revenue: number;
  }>;
  topProducts: Array<{
    _id: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  lowStockProducts: Array<{
    _id: string;
    name: string;
    quantity: string;
    stock: number;
  }>;
}

const COLORS = ['#22c55e', '#eab308', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444'];

const statusLabels: Record<string, string> = {
  'PLACED': 'Placed',
  'CONFIRMED': 'Confirmed',
  'PACKED': 'Packed',
  'READY_TO_DELIVER': 'Ready',
  'HANDED_TO_AGENT': 'Out for Delivery',
  'DELIVERED': 'Delivered',
  'CANCELLED': 'Cancelled',
  'REFUND_INITIATED': 'Refund Initiated',
  'REFUNDED': 'Refunded',
};

export default function AdminAnalyticsPage() {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [revenueResponse, dashboardResponse] = await Promise.all([
        adminAPI.getAnalytics({ period }),
        adminAPI.getDashboard({ period }),
      ]);
      
      const revenue = revenueResponse.data.data || revenueResponse.data;
      const dashboard = dashboardResponse.data.data || dashboardResponse.data;
      
      setRevenueData(revenue);
      setDashboardData(dashboard);
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to load analytics' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !revenueData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Convert chart data for display
  const chartData = revenueData?.chartData?.map(item => ({
    date: item._id,
    revenue: item.revenue,
    orders: item.orders,
  })) || [];

  // Convert ordersByStatus object to array for pie chart
  const ordersByStatusArray = Object.entries(dashboardData?.ordersByStatus || {}).map(([status, count]) => ({
    status: statusLabels[status] || status,
    count: count as number,
  }));

  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(revenueData?.summary?.totalRevenue || 0),
      change: revenueData?.summary?.growthRate || 0,
      icon: CurrencyRupeeIcon,
      color: 'bg-green-500',
    },
    {
      label: 'Total Orders',
      value: revenueData?.summary?.totalOrders || dashboardData?.overview?.totalOrders || 0,
      change: 0,
      icon: ShoppingBagIcon,
      color: 'bg-blue-500',
    },
    {
      label: 'Total Users',
      value: dashboardData?.overview?.totalUsers || 0,
      subtext: `${dashboardData?.overview?.newUsers || 0} new`,
      icon: UsersIcon,
      color: 'bg-purple-500',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(revenueData?.summary?.avgOrderValue || 0),
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
          onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
          className="input w-auto"
        >
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="year">Last Year</option>
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
              {stat.change !== undefined && stat.change !== 0 && (
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
                  {Math.abs(stat.change).toFixed(1)}%
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold">{stat.value}</h3>
            <p className="text-gray-500 text-sm">{stat.label}</p>
            {(stat as any).subtext && <p className="text-xs text-green-600 mt-1">{(stat as any).subtext}</p>}
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
              <AreaChart data={chartData}>
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
            {ordersByStatusArray.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatusArray}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                  >
                    {ordersByStatusArray.map((_entry, index) => (
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
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No orders data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Selling Products</h2>
          <div className="h-80">
            {(dashboardData?.topProducts?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={(dashboardData?.topProducts || []).slice(0, 5).map(p => ({
                    name: (p.productName || 'Unknown').substring(0, 20),
                    quantity: p.totalQuantity,
                    revenue: p.totalRevenue,
                  }))}
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
                    width={120}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : value,
                      name === 'revenue' ? 'Revenue' : 'Units Sold'
                    ]} 
                  />
                  <Bar dataKey="quantity" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No product data
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue by Payment Method</h2>
          <div className="h-80">
            {(dashboardData?.ordersByPaymentMethod?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(dashboardData?.ordersByPaymentMethod || []).map(p => ({
                      name: p._id === 'RAZORPAY' ? 'Online' : 'COD',
                      value: p.revenue,
                      count: p.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {(dashboardData?.ordersByPaymentMethod || []).map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#3b82f6' : '#22c55e'}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No payment data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Trend & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Orders Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Delivered Orders</p>
              <p className="text-2xl font-bold text-green-700">
                {dashboardData?.overview?.deliveredOrders || 0}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-700">
                {dashboardData?.overview?.pendingOrders || 0}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">Cancelled Orders</p>
              <p className="text-2xl font-bold text-red-700">
                {dashboardData?.overview?.cancelledOrders || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {(dashboardData?.lowStockProducts?.length || 0) > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-orange-600">⚠️ Low Stock Alert</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData?.lowStockProducts?.map((product) => (
              <div key={product._id} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-600">{product.quantity}</p>
                <p className="text-sm font-semibold text-orange-600">
                  Only {product.stock} left
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
