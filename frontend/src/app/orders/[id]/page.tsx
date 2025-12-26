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
  StarIcon,
  ArchiveBoxIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuthStore, useUIStore } from '@/store';
import { orderAPI, reviewAPI } from '@/lib/api';
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils';

interface OrderItem {
  _id: string;
  product: string;
  productSnapshot: {
    name: string;
    slug: string;
    image: string;
  };
  quantityOptionSnapshot: {
    quantity: string;
    price: number;
    sellingPrice: number;
  };
  quantity: number;
  subtotal: number;
  isReviewed: boolean;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
  deliveryAddress: {
    label: string;
    houseNumber: string;
    street: string;
    colony: string;
    landmark?: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  orderNotes?: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const orderSteps = [
  { status: 'PLACED', label: 'Placed', icon: ClockIcon },
  { status: 'CONFIRMED', label: 'Confirmed', icon: CheckCircleIcon },
  { status: 'PACKED', label: 'Packed', icon: ArchiveBoxIcon },
  { status: 'READY_TO_DELIVER', label: 'Ready', icon: ShoppingBagIcon },
  { status: 'HANDED_TO_AGENT', label: 'Out for Delivery', icon: UserIcon },
  { status: 'DELIVERED', label: 'Delivered', icon: TruckIcon },
];

const statusOrder = ['PLACED', 'CONFIRMED', 'PACKED', 'READY_TO_DELIVER', 'HANDED_TO_AGENT', 'DELIVERED'];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { isAuthenticated } = useAuthStore();
  const { openAuthModal, addToast } = useUIStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!isAuthenticated || !orderId) return;

      setIsLoading(true);
      try {
        const response = await orderAPI.getById(orderId);
        const data = response.data.data || response.data;
        setOrder(data.order);
      } catch (error) {
        console.error('Error fetching order:', error);
        router.push('/account/orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [isAuthenticated, orderId, router]);

  const handleOpenReview = (item: OrderItem) => {
    setReviewingItem(item);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewingItem || !order) return;
    
    setIsSubmittingReview(true);
    try {
      await reviewAPI.create({
        productId: reviewingItem.product,
        orderId: order._id,
        orderItemId: reviewingItem._id,
        rating: reviewRating,
        comment: reviewComment,
      });
      
      addToast({ type: 'success', message: 'Review submitted successfully!' });
      setShowReviewModal(false);
      
      // Refresh order to update isReviewed status
      const response = await orderAPI.getById(orderId);
      const data = response.data.data || response.data;
      setOrder(data.order);
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to submit review',
      });
    } finally {
      setIsSubmittingReview(false);
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
  const isDelivered = order.status === 'DELIVERED';
  const isPaymentFailed = order.status === 'PAYMENT_FAILED';

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
        </div>
      </div>

      {/* Payment Failed Notice */}
      {isPaymentFailed && (
        <div className="card p-6 mb-8 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Payment Failed</h3>
              <p className="text-red-600 text-sm mt-1">
                Your payment could not be processed. Please place a new order to continue shopping.
              </p>
              <Link href="/cart" className="btn-primary mt-3 inline-block text-sm">
                Go to Cart
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Order progress */}
      {!isCancelled && !isPaymentFailed && (
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
                <div key={item._id} className="flex gap-4 border-b pb-4 last:border-0">
                  <Link
                    href={`/products/${item.productSnapshot.slug}`}
                    className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100"
                  >
                    {item.productSnapshot.image ? (
                      <Image
                        src={item.productSnapshot.image}
                        alt={item.productSnapshot.name}
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
                      href={`/products/${item.productSnapshot.slug}`}
                      className="font-medium hover:text-primary-600"
                    >
                      {item.productSnapshot.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {item.quantityOptionSnapshot.quantity} × {item.quantity}
                    </p>
                    <p className="text-sm text-gray-500">
                      ₹{item.quantityOptionSnapshot.sellingPrice} each
                    </p>
                    {/* Review button for delivered orders */}
                    {isDelivered && !item.isReviewed && (
                      <button
                        onClick={() => handleOpenReview(item)}
                        className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <StarIcon className="h-4 w-4" />
                        Write a Review
                      </button>
                    )}
                    {item.isReviewed && (
                      <span className="mt-2 text-sm text-green-600 flex items-center gap-1">
                        <CheckCircleIcon className="h-4 w-4" />
                        Reviewed
                      </span>
                    )}
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.subtotal)}
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
          
          {/* Status History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="card p-6 mt-6">
              <h2 className="font-semibold mb-4">Order Timeline</h2>
              <div className="space-y-4">
                {order.statusHistory.map((history, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-primary-500' : 'bg-gray-300'}`} />
                      {index < order.statusHistory.length - 1 && (
                        <div className="absolute top-3 left-1.5 w-0.5 h-full -ml-px bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-sm">{getOrderStatusLabel(history.status)}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(history.timestamp)}</p>
                      {history.note && <p className="text-sm text-gray-600 mt-1">{history.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order info */}
        <div className="md:col-span-1 space-y-6">
          {/* Delivery address */}
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Delivery Address</h2>
            <p className="font-medium">{order.deliveryAddress.label}</p>
            <p className="text-gray-600 text-sm mt-2">
              {order.deliveryAddress.houseNumber}, {order.deliveryAddress.street}
            </p>
            <p className="text-gray-600 text-sm">
              {order.deliveryAddress.colony}
            </p>
            {order.deliveryAddress.landmark && (
              <p className="text-gray-500 text-sm">
                Landmark: {order.deliveryAddress.landmark}
              </p>
            )}
          </div>

          {/* Payment info */}
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Payment</h2>
            <p className="text-sm">
              <span className="text-gray-500">Method: </span>
              <span className="font-medium">
                {order.paymentMethod === 'RAZORPAY'
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
          {order.orderNotes && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3">Order Notes</h2>
              <p className="text-gray-600 text-sm">{order.orderNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && reviewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Review {reviewingItem.productSnapshot.name}</h3>
            
            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="p-1"
                  >
                    {star <= reviewRating ? (
                      <StarIconSolid className="h-8 w-8 text-yellow-400" />
                    ) : (
                      <StarIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Review (optional)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                className="input w-full"
                placeholder="Tell us about your experience with this product..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="btn-secondary flex-1"
                disabled={isSubmittingReview}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                className="btn-primary flex-1"
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
