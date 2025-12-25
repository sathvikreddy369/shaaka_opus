'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, ShoppingBagIcon, TruckIcon } from '@heroicons/react/24/outline';
import { orderAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  status: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    pincode: string;
  };
  estimatedDelivery?: string;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#eab308', '#f97316'],
    });
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await orderAPI.getById(orderId!);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-12 h-12 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Placed Successfully!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for shopping with Shaaka. Your order has been confirmed.
          </p>

          {order && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Order Number</span>
                <span className="font-semibold">{order.orderNumber}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Total Amount</span>
                <span className="font-semibold text-primary">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Payment Method</span>
                <span className="font-medium">
                  {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                </span>
              </div>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-500 mb-1">Delivery Address</p>
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                <p className="text-gray-600 text-sm">
                  {order.shippingAddress.addressLine1}, {order.shippingAddress.city} - {order.shippingAddress.pincode}
                </p>
                <p className="text-gray-600 text-sm">{order.shippingAddress.phone}</p>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg text-left">
              <ShoppingBagIcon className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Order Confirmation</p>
                <p className="text-sm text-gray-600">
                  You&apos;ll receive an SMS confirmation shortly
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg text-left">
              <TruckIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Delivery</p>
                <p className="text-sm text-gray-600">
                  Expected within 24-48 hours
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {order && (
              <Link
                href={`/orders/${order._id}`}
                className="btn-primary"
              >
                Track Order
              </Link>
            )}
            <Link
              href="/products"
              className="btn-secondary"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Need help with your order?{' '}
            <Link href="/contact" className="text-primary hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
