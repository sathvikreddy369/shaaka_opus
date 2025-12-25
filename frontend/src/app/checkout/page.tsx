'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import {
  ShoppingBagIcon,
  MapPinIcon,
  CreditCardIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { useCartStore, useAuthStore, useUIStore } from '@/store';
import { orderAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ShippingFormData {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, fetchCart, clearCart } = useCartStore();
  const { user, isAuthenticated, isLocationSet } = useAuthStore();
  const { openAuthModal, openLocationModal, addToast } = useUIStore();

  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ShippingFormData>({
    mode: 'onChange',
    defaultValues: {
      fullName: user?.name || '',
      phone: user?.phone || '',
      city: 'Hyderabad',
      state: 'Telangana',
    },
  });

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);

  const onShippingSubmit = (data: ShippingFormData) => {
    setShippingData(data);
    setStep('payment');
  };

  const handlePaymentMethodChange = (method: 'ONLINE' | 'COD') => {
    setPaymentMethod(method);
  };

  const proceedToReview = () => {
    setStep('review');
  };

  const placeOrder = async () => {
    if (!shippingData || !cart) return;

    setIsLoading(true);
    try {
      const response = await orderAPI.create({
        shippingAddress: shippingData,
        paymentMethod,
        notes: notes || undefined,
      });

      const { order, razorpayOrder } = response.data;

      if (paymentMethod === 'ONLINE' && razorpayOrder) {
        // Open Razorpay checkout
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'Shaaka',
          description: `Order #${order.orderNumber}`,
          order_id: razorpayOrder.id,
          handler: async (response: any) => {
            try {
              // Verify payment
              await orderAPI.verifyPayment(order._id, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });

              addToast({ type: 'success', message: 'Order placed successfully!' });
              await clearCart();
              router.push(`/order-success?orderId=${order._id}`);
            } catch (error: any) {
              addToast({
                type: 'error',
                message: error.response?.data?.message || 'Payment verification failed',
              });
            }
          },
          prefill: {
            name: shippingData.fullName,
            contact: shippingData.phone,
            email: user?.email || '',
          },
          theme: {
            color: '#22c55e',
          },
          modal: {
            ondismiss: () => {
              addToast({
                type: 'warning',
                message: 'Payment cancelled. Your order is still pending.',
              });
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        // COD order
        addToast({ type: 'success', message: 'Order placed successfully!' });
        await clearCart();
        router.push(`/order-success?orderId=${order._id}`);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to place order',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Please login to checkout</h1>
        <button onClick={openAuthModal} className="btn-primary">
          Login
        </button>
      </div>
    );
  }

  if (!isLocationSet) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <MapPinIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Please verify your location</h1>
        <p className="text-gray-500 mb-6">
          We need to confirm that we deliver to your area before you can checkout.
        </p>
        <button onClick={openLocationModal} className="btn-primary">
          Check Delivery Availability
        </button>
      </div>
    );
  }

  if (!cart?.items?.length) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/products" className="btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-heading font-bold mb-8">Checkout</h1>

      {/* Steps indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step === 'shipping'
                ? 'bg-primary-600 text-white'
                : 'bg-primary-100 text-primary-600'
            }`}
          >
            1
          </div>
          <span className="ml-2 mr-4 text-sm font-medium">Shipping</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-200" />
        <div className="flex items-center mx-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step === 'payment'
                ? 'bg-primary-600 text-white'
                : step === 'review'
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            2
          </div>
          <span className="ml-2 mr-4 text-sm font-medium">Payment</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-200" />
        <div className="flex items-center ml-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step === 'review'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            3
          </div>
          <span className="ml-2 text-sm font-medium">Review</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Shipping form */}
          {step === 'shipping' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                Shipping Address
              </h2>

              <form onSubmit={handleSubmit(onShippingSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      {...register('fullName', { required: 'Full name is required' })}
                      className="input w-full"
                      placeholder="Enter full name"
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      {...register('phone', {
                        required: 'Phone is required',
                        pattern: {
                          value: /^[6-9]\d{9}$/,
                          message: 'Enter a valid 10-digit phone number',
                        },
                      })}
                      className="input w-full"
                      placeholder="Enter phone number"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    {...register('addressLine1', { required: 'Address is required' })}
                    className="input w-full"
                    placeholder="House/Flat No., Building Name"
                  />
                  {errors.addressLine1 && (
                    <p className="text-red-500 text-sm mt-1">{errors.addressLine1.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  <input
                    {...register('addressLine2')}
                    className="input w-full"
                    placeholder="Street, Area, Colony"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      {...register('city', { required: 'City is required' })}
                      className="input w-full bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      {...register('state', { required: 'State is required' })}
                      className="input w-full bg-gray-50"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode *
                    </label>
                    <input
                      {...register('pincode', {
                        required: 'Pincode is required',
                        pattern: {
                          value: /^5\d{5}$/,
                          message: 'Enter a valid Hyderabad pincode',
                        },
                      })}
                      className="input w-full"
                      placeholder="Enter pincode"
                    />
                    {errors.pincode && (
                      <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Landmark
                  </label>
                  <input
                    {...register('landmark')}
                    className="input w-full"
                    placeholder="Near landmark (optional)"
                  />
                </div>

                <button type="submit" className="btn-primary w-full" disabled={!isValid}>
                  Continue to Payment
                </button>
              </form>
            </div>
          )}

          {/* Payment method */}
          {step === 'payment' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5" />
                Payment Method
              </h2>

              <div className="space-y-4">
                <label
                  className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'ONLINE'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'ONLINE'}
                    onChange={() => handlePaymentMethodChange('ONLINE')}
                    className="w-5 h-5 text-primary-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Pay Online</p>
                    <p className="text-sm text-gray-500">
                      Pay securely using UPI, Credit/Debit Card, Net Banking
                    </p>
                  </div>
                  <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                    Recommended
                  </span>
                </label>

                <label
                  className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'COD'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'COD'}
                    onChange={() => handlePaymentMethodChange('COD')}
                    className="w-5 h-5 text-primary-600"
                  />
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-gray-500">
                      Pay when your order is delivered
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input w-full"
                  rows={3}
                  placeholder="Any special instructions for delivery..."
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep('shipping')}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button onClick={proceedToReview} className="btn-primary flex-1">
                  Review Order
                </button>
              </div>
            </div>
          )}

          {/* Review order */}
          {step === 'review' && shippingData && (
            <div className="space-y-6">
              {/* Shipping summary */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <TruckIcon className="h-5 w-5" />
                    Shipping Address
                  </h2>
                  <button
                    onClick={() => setStep('shipping')}
                    className="text-primary-600 text-sm hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="font-medium">{shippingData.fullName}</p>
                <p className="text-gray-600">{shippingData.phone}</p>
                <p className="text-gray-600">
                  {shippingData.addressLine1}
                  {shippingData.addressLine2 && `, ${shippingData.addressLine2}`}
                </p>
                <p className="text-gray-600">
                  {shippingData.city}, {shippingData.state} - {shippingData.pincode}
                </p>
                {shippingData.landmark && (
                  <p className="text-gray-500 text-sm">Near: {shippingData.landmark}</p>
                )}
              </div>

              {/* Payment summary */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5" />
                    Payment Method
                  </h2>
                  <button
                    onClick={() => setStep('payment')}
                    className="text-primary-600 text-sm hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="font-medium">
                  {paymentMethod === 'ONLINE' ? 'Pay Online' : 'Cash on Delivery'}
                </p>
                {notes && <p className="text-gray-500 mt-2">Note: {notes}</p>}
              </div>

              {/* Order items */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">Order Items</h2>
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.product._id} className="flex gap-4">
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
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
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.product.name}</p>
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
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('payment')}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  onClick={placeOrder}
                  disabled={isLoading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            {/* Items preview */}
            <div className="space-y-3 mb-4">
              {cart.items.slice(0, 3).map((item) => (
                <div key={item.product._id} className="flex gap-3">
                  <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                    {item.product.images?.[0]?.url ? (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
              {cart.items.length > 3 && (
                <p className="text-sm text-gray-500">
                  +{cart.items.length - 3} more items
                </p>
              )}
            </div>

            <hr className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(cart.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery</span>
                <span>
                  {cart.deliveryCharge === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatCurrency(cart.deliveryCharge)
                  )}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(cart.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
