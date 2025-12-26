'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeftIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { orderAPI } from '@/lib/api';
import { useUIStore } from '@/store';
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils';

interface PaymentInfo {
  method: string;
  status: string;
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  transactionId?: string;
  paymentMethod?: string;
  fee?: number;
  tax?: number;
  upiVpa?: string;
  cardDetails?: {
    last4: string;
    network: string;
    type: string;
    issuer?: string;
  };
  bankName?: string;
  walletName?: string;
  contact?: string;
  email?: string;
  capturedAt?: string;
  error?: {
    code: string;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
  };
  failedAt?: string;
  refund?: {
    refundId: string;
    amount: number;
    refundedAt: string;
  };
}

interface PaymentAttempt {
  attemptedAt: string;
  paymentId?: string;
  status: string;
  method?: string;
  error?: {
    code: string;
    description: string;
  };
}

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
    sellingPrice: number;
  };
  quantity: number;
  subtotal: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  user: { _id: string; name: string; phone: string; email: string };
  items: OrderItem[];
  deliveryAddress: {
    label: string;
    houseNumber: string;
    street: string;
    colony: string;
    landmark?: string;
  };
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  orderNotes?: string;
  adminNotes?: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  createdAt: string;
  cancellationReason?: string;
  cancelledBy?: string;
  refundAmount?: number;
}

const statusTransitions: Record<string, string[]> = {
  'PLACED': ['CONFIRMED', 'CANCELLED'],
  'PAYMENT_PENDING': ['CONFIRMED', 'CANCELLED'],
  'PAYMENT_FAILED': ['CANCELLED'],
  'CONFIRMED': ['PACKED', 'CANCELLED'],
  'PACKED': ['READY_TO_DELIVER', 'CANCELLED'],
  'READY_TO_DELIVER': ['HANDED_TO_AGENT'],
  'HANDED_TO_AGENT': ['DELIVERED'],
  'DELIVERED': [],
  'CANCELLED': ['REFUND_INITIATED'],
  'REFUND_INITIATED': ['REFUNDED'],
  'REFUNDED': [],
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { addToast } = useUIStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await orderAPI.getAdminById(orderId);
        const data = response.data.data || response.data;
        setOrder(data.order);
        setPaymentInfo(data.paymentInfo);
        setPaymentAttempts(data.paymentAttempts || []);
      } catch (error) {
        console.error('Error fetching order:', error);
        router.push('/admin/orders');
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, router]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    
    setIsUpdating(true);
    try {
      await orderAPI.updateStatus(order._id, newStatus);
      
      // Refresh order data
      const response = await orderAPI.getAdminById(orderId);
      const data = response.data.data || response.data;
      setOrder(data.order);
      setPaymentInfo(data.paymentInfo);
      
      addToast({ type: 'success', message: 'Order status updated' });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update status',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'upi':
        return DevicePhoneMobileIcon;
      case 'card':
        return CreditCardIcon;
      case 'netbanking':
        return BuildingLibraryIcon;
      case 'cod':
        return BanknotesIcon;
      default:
        return CreditCardIcon;
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'PENDING':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'REFUNDED':
      case 'REFUND_INITIATED':
        return <ExclamationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
          <div className="card p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-bold">Order not found</h1>
        <Link href="/admin/orders" className="btn-primary mt-4">
          Back to Orders
        </Link>
      </div>
    );
  }

  const PaymentIcon = getPaymentMethodIcon(paymentInfo?.paymentMethod);
  const nextStatuses = statusTransitions[order.status] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-gray-500">Placed on {formatDateTime(order.createdAt)}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 text-sm font-medium rounded-full ${getOrderStatusColor(order.status)}`}
        >
          {getOrderStatusLabel(order.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{order.user?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{order.user?.phone || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{order.user?.email || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Delivery Address</p>
                <p className="font-medium">
                  {[
                    order.deliveryAddress.houseNumber,
                    order.deliveryAddress.street,
                    order.deliveryAddress.colony,
                    order.deliveryAddress.landmark,
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item._id} className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.productSnapshot.image && (
                      <Image
                        src={item.productSnapshot.image}
                        alt={item.productSnapshot.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.productSnapshot.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantityOptionSnapshot.quantity} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>
            
            {/* Order summary */}
            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery</span>
                <span>{order.deliveryCharge > 0 ? formatCurrency(order.deliveryCharge) : 'Free'}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Status History</h2>
            <div className="space-y-3">
              {order.statusHistory.map((history, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    index === 0 ? 'bg-primary-500' : 'bg-gray-300'
                  }`} />
                  <div>
                    <p className="font-medium">{getOrderStatusLabel(history.status)}</p>
                    <p className="text-sm text-gray-500">{formatDateTime(history.timestamp)}</p>
                    {history.note && (
                      <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {nextStatuses.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Update Status</h2>
              <div className="space-y-2">
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={isUpdating}
                    className={`w-full btn-secondary text-sm ${
                      status === 'CANCELLED' ? 'text-red-600 border-red-300 hover:bg-red-50' : ''
                    } disabled:opacity-50`}
                  >
                    {isUpdating ? 'Updating...' : `→ ${getOrderStatusLabel(status)}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <PaymentIcon className="h-5 w-5" />
              Payment Details
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <div className="flex items-center gap-2">
                  {getPaymentStatusIcon(order.paymentStatus)}
                  <span className="font-medium">{order.paymentStatus}</span>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Method</span>
                <span className="font-medium">
                  {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                </span>
              </div>

              {paymentInfo?.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Payment Type</span>
                  <span className="font-medium capitalize">{paymentInfo.paymentMethod}</span>
                </div>
              )}

              {/* UPI Details */}
              {paymentInfo?.upiVpa && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">UPI ID</span>
                  <span className="font-medium font-mono text-sm">{paymentInfo.upiVpa}</span>
                </div>
              )}

              {/* Card Details */}
              {paymentInfo?.cardDetails && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Card</span>
                    <span className="font-medium">
                      {paymentInfo.cardDetails.network} ****{paymentInfo.cardDetails.last4}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Type</span>
                    <span className="font-medium capitalize">{paymentInfo.cardDetails.type}</span>
                  </div>
                </>
              )}

              {/* Bank Details */}
              {paymentInfo?.bankName && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Bank</span>
                  <span className="font-medium">{paymentInfo.bankName}</span>
                </div>
              )}

              {/* Wallet Details */}
              {paymentInfo?.walletName && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Wallet</span>
                  <span className="font-medium">{paymentInfo.walletName}</span>
                </div>
              )}

              {paymentInfo?.razorpayPaymentId && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Payment ID</span>
                  <span className="font-mono text-xs">{paymentInfo.razorpayPaymentId}</span>
                </div>
              )}

              {paymentInfo?.transactionId && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Transaction ID</span>
                  <span className="font-mono text-xs">{paymentInfo.transactionId}</span>
                </div>
              )}

              {paymentInfo?.contact && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Payer Phone</span>
                  <span className="font-medium">{paymentInfo.contact}</span>
                </div>
              )}

              {paymentInfo?.email && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Payer Email</span>
                  <span className="font-medium text-sm">{paymentInfo.email}</span>
                </div>
              )}

              {paymentInfo?.fee && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Gateway Fee</span>
                  <span className="font-medium">{formatCurrency(paymentInfo.fee)}</span>
                </div>
              )}

              {paymentInfo?.capturedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Paid At</span>
                  <span className="text-sm">{formatDateTime(paymentInfo.capturedAt)}</span>
                </div>
              )}

              {/* Refund Info */}
              {paymentInfo?.refund && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-medium mb-2 text-blue-600">Refund Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Refund ID</span>
                      <span className="font-mono text-xs">{paymentInfo.refund.refundId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount</span>
                      <span className="font-medium">{formatCurrency(paymentInfo.refund.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Refunded At</span>
                      <span className="text-sm">{formatDateTime(paymentInfo.refund.refundedAt)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Info */}
              {paymentInfo?.error && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-medium mb-2 text-red-600">Payment Error</h3>
                  <div className="bg-red-50 p-3 rounded-lg text-sm">
                    <p className="font-medium">{paymentInfo.error.code}</p>
                    <p className="text-gray-600">{paymentInfo.error.description}</p>
                    {paymentInfo.error.reason && (
                      <p className="text-gray-500 mt-1">Reason: {paymentInfo.error.reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Attempts */}
          {paymentAttempts.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Payment Attempts</h2>
              <div className="space-y-3">
                {paymentAttempts.map((attempt, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      attempt.status === 'success' ? 'bg-green-500' :
                      attempt.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{attempt.status}</span>
                        <span className="text-gray-500 text-xs">
                          {formatDateTime(attempt.attemptedAt)}
                        </span>
                      </div>
                      {attempt.method && (
                        <p className="text-gray-500 capitalize">{attempt.method}</p>
                      )}
                      {attempt.error && (
                        <p className="text-red-500 text-xs mt-1">{attempt.error.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {(order.orderNotes || order.cancellationReason) && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Notes</h2>
              {order.orderNotes && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Customer Note</p>
                  <p className="text-sm">{order.orderNotes}</p>
                </div>
              )}
              {order.cancellationReason && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cancellation Reason</p>
                  <p className="text-sm text-red-600">{order.cancellationReason}</p>
                  {order.cancelledBy && (
                    <p className="text-xs text-gray-400">By: {order.cancelledBy}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
