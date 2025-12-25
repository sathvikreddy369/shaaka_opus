'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircleIcon,
  TruckIcon,
  ShoppingBagIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore, useUIStore } from '@/store';
import { orderAPI } from '@/lib/api';
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils';

interface OrderItem {
  product: {
    _id: string;
    name: string;
    slug: string;
    images: { url: string }[];
  };
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const orderSteps = [
  { status: 'PENDING', label: 'Pending', icon: ClockIcon },
  { status: 'CONFIRMED', label: 'Confirmed', icon: CheckCircleIcon },
  { status: 'PROCESSING', label: 'Processing', icon: ShoppingBagIcon },
  { status: 'SHIPPED', label: 'Shipped', icon: TruckIcon },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircleIcon },
];

const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { isAuthenticated } = useAuthStore();
  const { openAuthModal, addToast } = useUIStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!isAuthenticated || !orderId) return;

      setIsLoading(true);
      try {
        const response = await orderAPI.getById(orderId);
        setOrder(response.data.order);
      } catch (error) {
        console.error('Error fetching order:', error);
        router.push('/account/orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [isAuthenticated, orderId, router]);

  const handleCancelOrder = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order?')) return;

    setIsCancelling(true);
    try {
      await orderAPI.cancel(order._id);
      addToast({ type: 'success', message: 'Order cancelled successfully' });
      // Refresh order data
      const response = await orderAPI.getById(orderId);
      setOrder(response.data.order);
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to cancel order',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Please login to view order details</h1>
        <button onClick={openAuthModal} className="btn-primary">
          Login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="card p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Order not found</h1>
        <Link href="/account/orders" className="btn-primary">
          View All Orders
        </Link>
      </div>
    );
  }

  const currentStatusIndex = statusOrder.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const canCancel =
    !isCancelled &&
    ['PENDING', 'CONFIRMED'].includes(order.status) &&
    order.paymentStatus !== 'REFUNDED';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/account/orders"
            className="text-primary-600 hover:underline text-sm mb-2 inline-block"
          >
            ← Back to Orders
          </Link>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">
            Order #{order.orderNumber}
          </h1>
          <p className="text-gray-500">Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${getOrderStatusColor(
              order.status
            )}`}
          >
            {getOrderStatusLabel(order.status)}
          </span>
          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="btn-secondary text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {/* Order progress */}
      {!isCancelled && order.status !== 'PAYMENT_FAILED' && (
        <div className="card p-6 mb-8">
          <h2 className="font-semibold mb-6">Order Progress</h2>
          <div className="relative">
            <div className="flex justify-between">
              {orderSteps.map((step, index) => {
                const stepIndex = statusOrder.indexOf(step.status);
                const isCompleted = stepIndex <= currentStatusIndex;
                const isCurrent = step.status === order.status;

                return (
                  <div
                    key={step.status}
                    className="flex flex-col items-center relative z-10"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`text-xs mt-2 ${
                        isCurrent ? 'font-semibold text-primary-600' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Progress line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-0">
              <div
                className="h-full bg-primary-500 transition-all"
                style={{
                  width: `${(currentStatusIndex / (orderSteps.length - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cancelled notice */}
      {isCancelled && (
        <div className="card p-6 mb-8 bg-red-50 border-red-200">
          <div className="flex items-center gap-3 text-red-700">
            <XCircleIcon className="h-6 w-6" />
            <div>
              <p className="font-semibold">This order has been cancelled</p>
              {order.paymentStatus === 'REFUNDED' && (
                <p className="text-sm">Your payment has been refunded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Order items */}
        <div className="md:col-span-2">
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.product._id} className="flex gap-4">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100"
                  >
                    {item.product.images?.[0]?.url ? (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                  </Link>
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="font-medium hover:text-primary-600"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      Qty: {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <hr className="my-6" />

            {/* Order summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery</span>
                <span>
                  {order.deliveryCharge === 0
                    ? 'Free'
                    : formatCurrency(order.deliveryCharge)}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order info */}
        <div className="md:col-span-1 space-y-6">
          {/* Shipping address */}
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Shipping Address</h2>
            <p className="font-medium">{order.shippingAddress.fullName}</p>
            <p className="text-gray-600 text-sm">
              {order.shippingAddress.phone}
            </p>
            <p className="text-gray-600 text-sm mt-2">
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 &&
                `, ${order.shippingAddress.addressLine2}`}
            </p>
            <p className="text-gray-600 text-sm">
              {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
              {order.shippingAddress.pincode}
            </p>
            {order.shippingAddress.landmark && (
              <p className="text-gray-500 text-sm">
                Near: {order.shippingAddress.landmark}
              </p>
            )}
          </div>

          {/* Payment info */}
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Payment</h2>
            <p className="text-sm">
              <span className="text-gray-500">Method: </span>
              <span className="font-medium">
                {order.paymentMethod === 'ONLINE'
                  ? 'Online Payment'
                  : 'Cash on Delivery'}
              </span>
            </p>
            <p className="text-sm mt-1">
              <span className="text-gray-500">Status: </span>
              <span
                className={`font-medium ${
                  order.paymentStatus === 'PAID'
                    ? 'text-green-600'
                    : order.paymentStatus === 'REFUNDED'
                    ? 'text-blue-600'
                    : 'text-yellow-600'
                }`}
              >
                {order.paymentStatus}
              </span>
            </p>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3">Order Notes</h2>
              <p className="text-gray-600 text-sm">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
