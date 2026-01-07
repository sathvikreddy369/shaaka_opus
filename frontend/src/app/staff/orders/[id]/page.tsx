'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { staffAPI } from '@/lib/api';
import {
  ArrowLeftIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  CubeIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
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
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
    updatedBy?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Pending' },
  PLACED: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Placed' },
  CONFIRMED: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Confirmed' },
  PACKED: { color: 'text-purple-700', bg: 'bg-purple-100', label: 'Packed' },
  READY_TO_DELIVER: { color: 'text-indigo-700', bg: 'bg-indigo-100', label: 'Ready to Deliver' },
  HANDED_TO_AGENT: { color: 'text-orange-700', bg: 'bg-orange-100', label: 'Handed to Agent' },
  DELIVERED: { color: 'text-green-700', bg: 'bg-green-100', label: 'Delivered' },
  CANCELLED: { color: 'text-red-700', bg: 'bg-red-100', label: 'Cancelled' },
};

// Staff can only update to these statuses (order lifecycle: CONFIRMED -> PACKED -> READY_TO_DELIVER -> HANDED_TO_AGENT)
const STAFF_ALLOWED_STATUSES = ['PACKED', 'READY_TO_DELIVER', 'HANDED_TO_AGENT'];

export default function StaffOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const fetchOrder = useCallback(async () => {
    try {
      const response = await staffAPI.getOrder(orderId);
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

  const updateStatus = async (newStatus: string) => {
    if (!STAFF_ALLOWED_STATUSES.includes(newStatus)) {
      alert('You are not authorized to set this status');
      return;
    }

    setUpdating(true);
    try {
      await staffAPI.updateOrderStatus(orderId, newStatus, note || undefined);
      setNote('');
      fetchOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getNextAllowedStatus = () => {
    if (!order) return null;
    
    const currentIndex = ['PENDING', 'PLACED', 'CONFIRMED', 'PACKED', 'READY_TO_DELIVER', 'HANDED_TO_AGENT', 'DELIVERED'].indexOf(order.status);
    
    if (order.status === 'CONFIRMED') return 'PACKED';
    if (order.status === 'PACKED') return 'READY_TO_DELIVER';
    if (order.status === 'READY_TO_DELIVER') return 'HANDED_TO_AGENT';
    
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
          href="/staff/orders"
          className="mt-4 inline-block text-green-600 hover:text-green-700"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const nextStatus = getNextAllowedStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/staff/orders"
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
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item._id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product?.images?.[0]?.url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.product.images[0].url}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CubeIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {item.productName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {item.quantity} {item.unit} × {item.itemQuantity}
                    </p>
                    <p className="text-sm font-medium text-green-600">
                      ₹{item.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>₹{order.subTotal.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-green-600">-₹{order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Charges</span>
                <span>₹{order.deliveryCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total</span>
                <span>₹{order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Status History</h2>
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
          {/* Update Status */}
          {nextStatus && !['DELIVERED', 'CANCELLED'].includes(order.status) && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Update Status</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Add a note..."
                  />
                </div>

                <button
                  onClick={() => updateStatus(nextStatus)}
                  disabled={updating}
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updating ? 'Updating...' : `Mark as ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Staff can update: Packed, Handed to Agent, Out for Delivery
                </p>
              </div>
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

              {order.navigationLink && (
                <a
                  href={order.navigationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <TruckIcon className="w-5 h-5" />
                  Open in Maps
                </a>
              )}
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
        </div>
      </div>
    </div>
  );
}
