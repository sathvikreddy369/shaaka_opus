'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { vendorAPI } from '@/lib/api';
import {
  ArrowLeftIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  CubeIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface OrderItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    images: Array<{ url: string }>;
  };
  productName: string;
  quantity: string;
  unit: string;
  price: number;
  sellingPrice: number;
  itemQuantity: number;
  total: number;
  vendor?: string;
  vendorStatus?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  subTotal: number;
  deliveryCharges: number;
  discount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryAddress: {
    name: string;
    phone: string;
    street: string;
    colony: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  customerSnapshot: {
    name: string;
    phone: string;
  };
  navigationLink?: string;
  distance?: {
    text: string;
    value: number;
  };
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Pending' },
  CONFIRMED: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Confirmed' },
  PREPARING: { color: 'text-purple-700', bg: 'bg-purple-100', label: 'Preparing' },
  READY: { color: 'text-indigo-700', bg: 'bg-indigo-100', label: 'Ready for Pickup' },
  PICKED_UP: { color: 'text-orange-700', bg: 'bg-orange-100', label: 'Picked Up' },
  DELIVERED: { color: 'text-green-700', bg: 'bg-green-100', label: 'Delivered' },
  CANCELLED: { color: 'text-red-700', bg: 'bg-red-100', label: 'Cancelled' },
};

// Vendor can update item status to these
const VENDOR_ALLOWED_STATUSES = ['PREPARING', 'READY'];

export default function VendorOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const response = await vendorAPI.getOrder(orderId);
      setOrder(response.data.data.order);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    setUpdating(itemId);
    try {
      await vendorAPI.updateOrderStatus(orderId, itemId, newStatus);
      fetchOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const getNextStatus = (currentStatus?: string) => {
    if (!currentStatus || currentStatus === 'PENDING' || currentStatus === 'CONFIRMED') {
      return 'PREPARING';
    }
    if (currentStatus === 'PREPARING') {
      return 'READY';
    }
    return null;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter items that belong to this vendor
  const vendorItems = order?.items.filter(item => item.vendor) || [];
  const vendorSubtotal = vendorItems.reduce((sum, item) => sum + item.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-gray-600">{error || 'Order not found'}</p>
        <Link
          href="/vendor/orders"
          className="mt-4 inline-block text-green-600 hover:text-green-700"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/vendor/orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Order #{order.orderNumber}
            </h1>
            <p className="text-gray-600">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Your Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Your Items</h2>
            {vendorItems.length === 0 ? (
              <p className="text-gray-500">No items from your store in this order.</p>
            ) : (
              <div className="space-y-4">
                {vendorItems.map((item) => {
                  const itemStatusConfig = STATUS_CONFIG[item.vendorStatus || 'PENDING'] || STATUS_CONFIG.PENDING;
                  const nextStatus = getNextStatus(item.vendorStatus);

                  return (
                    <div key={item._id} className="border rounded-lg p-4">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {item.product?.images?.[0]?.url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.product.images[0].url}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <CubeIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {item.productName}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {item.quantity} {item.unit} × {item.itemQuantity}
                              </p>
                              <p className="text-sm font-medium text-green-600 mt-1">
                                ₹{item.total.toFixed(2)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${itemStatusConfig.bg} ${itemStatusConfig.color}`}>
                              {itemStatusConfig.label}
                            </span>
                          </div>

                          {/* Update Status Button */}
                          {nextStatus && !['PICKED_UP', 'DELIVERED', 'CANCELLED'].includes(item.vendorStatus || '') && (
                            <button
                              onClick={() => updateItemStatus(item._id, nextStatus)}
                              disabled={updating === item._id}
                              className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {updating === item._id
                                ? 'Updating...'
                                : `Mark as ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vendor Subtotal */}
            {vendorItems.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Your Items Total</span>
                  <span>₹{vendorSubtotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Order Timeline</h2>
            <div className="space-y-4">
              {order.statusHistory.map((history, index) => {
                const config = STATUS_CONFIG[history.status] || STATUS_CONFIG.PENDING;
                return (
                  <div key={index} className="flex gap-4">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${config.bg} flex-shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {config.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(history.timestamp)}
                        </span>
                      </div>
                      {history.note && (
                        <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Distance & Navigation */}
          {order.distance && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Delivery Distance</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TruckIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{order.distance.text}</p>
                  <p className="text-sm text-gray-500">from your location</p>
                </div>
              </div>

              {order.navigationLink && (
                <a
                  href={order.navigationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MapPinIcon className="w-5 h-5" />
                  Navigate
                </a>
              )}
            </div>
          )}

          {/* Delivery Address */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Delivery Address</h2>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {order.deliveryAddress.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {order.deliveryAddress.street}
                    {order.deliveryAddress.colony && `, ${order.deliveryAddress.colony}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                  </p>
                  {order.deliveryAddress.landmark && (
                    <p className="text-sm text-gray-500 italic">
                      Landmark: {order.deliveryAddress.landmark}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <PhoneIcon className="w-5 h-5 text-gray-400" />
                <a
                  href={`tel:${order.deliveryAddress.phone}`}
                  className="text-green-600 hover:text-green-700"
                >
                  {order.deliveryAddress.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Customer</h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">
                  {order.customerSnapshot?.name || 'N/A'}
                </p>
                <a
                  href={`tel:${order.customerSnapshot?.phone}`}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  {order.customerSnapshot?.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Method</span>
                <span className="font-medium capitalize">
                  {order.paymentMethod?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium ${
                  order.paymentStatus === 'PAID' ? 'text-green-600' : 
                  order.paymentStatus === 'PENDING' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-green-50 rounded-xl p-6">
            <h3 className="font-semibold text-green-900 mb-2">Need Help?</h3>
            <p className="text-sm text-green-700 mb-4">
              Contact support if you have issues with this order.
            </p>
            <a
              href="tel:+911234567890"
              className="inline-flex items-center gap-2 text-green-700 hover:text-green-800"
            >
              <PhoneIcon className="w-4 h-4" />
              Call Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
