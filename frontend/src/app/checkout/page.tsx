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
  PlusIcon,
  HomeIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useCartStore, useAuthStore, useUIStore } from '@/store';
import { orderAPI, authAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Address {
  _id: string;
  label: 'Home' | 'Office' | 'Other';
  houseNumber: string;
  street: string;
  colony: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

interface AddressForm {
  label: 'Home' | 'Office' | 'Other';
  houseNumber: string;
  street: string;
  colony: string;
  landmark: string;
  latitude: number;
  longitude: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, fetchCart, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { openAuthModal, addToast } = useUIStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'address' | 'payment' | 'review'>('address');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressForm>();

  const watchedLat = watch('latitude');
  const watchedLng = watch('longitude');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
      fetchAddresses();
    }
  }, [isAuthenticated, fetchCart]);

  const fetchAddresses = async () => {
    try {
      const response = await authAPI.getAddresses();
      const data = response.data.data || response.data;
      const addressList = data.addresses || [];
      setAddresses(addressList);
      
      // Auto-select default address
      const defaultAddr = addressList.find((a: Address) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr._id);
      } else if (addressList.length > 0) {
        setSelectedAddressId(addressList[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      addToast({ type: 'error', message: 'Geolocation is not supported' });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude);
        setValue('longitude', position.coords.longitude);
        setGettingLocation(false);
        addToast({ type: 'success', message: 'Location detected!' });
      },
      () => {
        setGettingLocation(false);
        addToast({ type: 'error', message: 'Failed to get location' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openAddAddressModal = () => {
    reset({
      label: 'Home',
      houseNumber: '',
      street: '',
      colony: '',
      landmark: '',
      latitude: 17.385,
      longitude: 78.4867,
    });
    setShowAddressModal(true);
  };

  const onAddAddress = async (data: AddressForm) => {
    try {
      const response = await authAPI.addAddress({ ...data, isDefault: addresses.length === 0 });
      const resData = response.data.data || response.data;
      const newAddresses = resData.addresses || [];
      setAddresses(newAddresses);
      
      // Select the newly added address
      if (newAddresses.length > 0) {
        const newAddress = newAddresses[newAddresses.length - 1];
        setSelectedAddressId(newAddress._id);
      }
      
      setShowAddressModal(false);
      addToast({ type: 'success', message: 'Address added!' });
    } catch (error: any) {
      addToast({ type: 'error', message: error.response?.data?.message || 'Failed to add address' });
    }
  };

  const proceedToPayment = () => {
    if (!selectedAddressId) {
      addToast({ type: 'error', message: 'Please select a delivery address' });
      return;
    }
    setStep('payment');
  };

  const proceedToReview = () => {
    setStep('review');
  };

  const placeOrder = async () => {
    if (!selectedAddressId || !cart) return;

    setIsLoading(true);
    try {
      const response = await orderAPI.create({
        addressId: selectedAddressId,
        paymentMethod,
        orderNotes: notes || undefined,
      });

      const responseData = response.data.data || response.data;
      const { order, razorpayOrder } = responseData;

      if (paymentMethod === 'RAZORPAY' && razorpayOrder) {
        // Check if Razorpay key is configured
        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
          addToast({
            type: 'error',
            message: 'Payment gateway not configured. Please try again later.',
          });
          setIsLoading(false);
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'Shaaka',
          description: `Order #${order.orderNumber}`,
          order_id: razorpayOrder.id,
          handler: async (razorpayResponse: any) => {
            try {
              await orderAPI.verifyPayment(order._id, {
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
              });

              addToast({ type: 'success', message: 'Payment successful! Order confirmed.' });
              await clearCart();
              router.push(`/order-success?orderId=${order._id}`);
            } catch (error: any) {
              // Payment verification failed, but webhook might still process it
              addToast({
                type: 'warning',
                message: 'Payment processing. Please check your order status.',
              });
              await clearCart();
              router.push(`/order-success?orderId=${order._id}`);
            }
          },
          prefill: {
            name: user?.name || '',
            contact: user?.phone || '',
            email: user?.email || '',
          },
          theme: {
            color: '#22c55e',
          },
          modal: {
            ondismiss: async () => {
              // Check if payment was actually completed (in case of page issues)
              try {
                const statusResponse = await orderAPI.checkPaymentStatus(order._id);
                const statusData = statusResponse.data.data || statusResponse.data;
                
                if (statusData.paymentStatus === 'PAID') {
                  addToast({ type: 'success', message: 'Payment successful!' });
                  await clearCart();
                  router.push(`/order-success?orderId=${order._id}`);
                  return;
                }
              } catch (e) {
                // Ignore - payment likely not completed
              }
              
              addToast({
                type: 'info',
                message: 'Payment not completed. You can complete it from your orders page.',
              });
              // Redirect to order page where they can retry payment
              router.push(`/orders/${order._id}`);
            },
          },
          retry: {
            enabled: true,
            max_count: 3,
          },
        };

        const razorpay = new window.Razorpay(options);
        
        // Handle payment failures
        razorpay.on('payment.failed', function (response: any) {
          console.error('Payment failed:', response.error);
          addToast({
            type: 'error',
            message: response.error?.description || 'Payment failed. Please try again.',
          });
        });
        
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

  const getAddressIcon = (label: string) => {
    switch (label) {
      case 'Home': return HomeIcon;
      case 'Office': return BuildingOfficeIcon;
      default: return MapPinIcon;
    }
  };

  const formatAddress = (address: Address) => {
    return [address.houseNumber, address.street, address.colony].filter(Boolean).join(', ');
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Please login to checkout</h1>
        <button onClick={openAuthModal} className="btn-primary">
          Login
        </button>
      </div>
    );
  }

  if (!cart?.items?.length) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
        <Link href="/products" className="btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  const selectedAddress = addresses.find(a => a._id === selectedAddressId);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {/* Steps indicator */}
        <div className="flex items-center justify-center mb-8">
          {[
            { key: 'address', label: 'Address', num: 1 },
            { key: 'payment', label: 'Payment', num: 2 },
            { key: 'review', label: 'Review', num: 3 },
          ].map((s, idx) => (
            <Fragment key={s.key}>
              {idx > 0 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                    step === s.key
                      ? 'bg-primary-600 text-white'
                      : ['payment', 'review'].indexOf(step) >= ['payment', 'review'].indexOf(s.key as any)
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {s.num}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">{s.label}</span>
              </div>
            </Fragment>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Address Selection */}
            {step === 'address' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-primary-600" />
                  Delivery Address
                </h2>

                {loadingAddresses ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-24 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No saved addresses</p>
                    <button onClick={openAddAddressModal} className="btn-primary">
                      Add Address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => {
                      const Icon = getAddressIcon(address.label);
                      const isSelected = selectedAddressId === address._id;
                      
                      return (
                        <label
                          key={address._id}
                          className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={isSelected}
                            onChange={() => setSelectedAddressId(address._id)}
                            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900">{address.label}</span>
                              {address.isDefault && (
                                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">{formatAddress(address)}</p>
                            {address.landmark && (
                              <p className="text-gray-500 text-xs">Near: {address.landmark}</p>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircleIcon className="h-5 w-5 text-primary-600 flex-shrink-0" />
                          )}
                        </label>
                      );
                    })}

                    <button
                      onClick={openAddAddressModal}
                      className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 transition"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add New Address
                    </button>
                  </div>
                )}

                {addresses.length > 0 && (
                  <button
                    onClick={proceedToPayment}
                    disabled={!selectedAddressId}
                    className="btn-primary w-full mt-6 disabled:opacity-50"
                  >
                    Continue to Payment
                  </button>
                )}
              </div>
            )}

            {/* Step 2: Payment Method */}
            {step === 'payment' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-primary-600" />
                  Payment Method
                </h2>

                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition ${
                      paymentMethod === 'RAZORPAY'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'RAZORPAY'}
                      onChange={() => setPaymentMethod('RAZORPAY')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Pay Online</p>
                      <p className="text-sm text-gray-500">
                        UPI, Credit/Debit Card, Net Banking
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Recommended
                    </span>
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition ${
                      paymentMethod === 'COD'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Cash on Delivery</p>
                      <p className="text-sm text-gray-500">Pay when delivered</p>
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
                    placeholder="Any special instructions..."
                  />
                </div>

                <div className="flex gap-4 mt-6">
                  <button onClick={() => setStep('address')} className="btn-secondary flex-1">
                    Back
                  </button>
                  <button onClick={proceedToReview} className="btn-primary flex-1">
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && selectedAddress && (
              <div className="space-y-6">
                {/* Address Summary */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <TruckIcon className="h-5 w-5 text-primary-600" />
                      Delivery Address
                    </h2>
                    <button
                      onClick={() => setStep('address')}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <p className="font-medium text-gray-900">{selectedAddress.label}</p>
                  <p className="text-gray-600">{formatAddress(selectedAddress)}</p>
                  {selectedAddress.landmark && (
                    <p className="text-gray-500 text-sm">Near: {selectedAddress.landmark}</p>
                  )}
                </div>

                {/* Payment Summary */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <CreditCardIcon className="h-5 w-5 text-primary-600" />
                      Payment Method
                    </h2>
                    <button
                      onClick={() => setStep('payment')}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <p className="font-medium text-gray-900">
                    {paymentMethod === 'RAZORPAY' ? 'Pay Online' : 'Cash on Delivery'}
                  </p>
                  {notes && <p className="text-gray-500 text-sm mt-1">Note: {notes}</p>}
                </div>

                {/* Order Items */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
                  <div className="space-y-3">
                    {cart.items.map((item) => (
                      <div key={item._id} className="flex gap-4 py-3 border-b last:border-0">
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
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.quantityOption?.quantity} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(item.subtotal || item.quantityOption?.sellingPrice * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep('payment')} className="btn-secondary flex-1">
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

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                {cart.items.slice(0, 3).map((item) => (
                  <div key={item._id} className="flex gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      {item.product.images?.[0]?.url && (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
                {cart.items.length > 3 && (
                  <p className="text-sm text-gray-500">+{cart.items.length - 3} more items</p>
                )}
              </div>

              <hr className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(cart.subtotal)}</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(cart.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery</span>
                  <span className="text-gray-900">
                    {cart.deliveryCharge === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      formatCurrency(cart.deliveryCharge)
                    )}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(cart.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      <Transition appear show={showAddressModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowAddressModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title className="text-xl font-semibold text-gray-900 mb-4">
                    Add New Address
                  </Dialog.Title>

                  <form onSubmit={handleSubmit(onAddAddress)} className="space-y-4">
                    {/* Address Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address Type
                      </label>
                      <div className="flex gap-3">
                        {(['Home', 'Office', 'Other'] as const).map((type) => (
                          <label key={type} className="flex-1 cursor-pointer">
                            <input
                              type="radio"
                              {...register('label')}
                              value={type}
                              className="sr-only peer"
                            />
                            <div className="text-center py-2 px-3 border rounded-lg peer-checked:border-primary-500 peer-checked:bg-primary-50 peer-checked:text-primary-700 transition">
                              {type}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Location */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Delivery Location *
                        </label>
                        <button
                          type="button"
                          onClick={getCurrentLocation}
                          disabled={gettingLocation}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <MapPinIcon className="w-4 h-4" />
                          {gettingLocation ? 'Getting...' : 'Use current location'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            {...register('latitude', { required: 'Required' })}
                            className="input text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            {...register('longitude', { required: 'Required' })}
                            className="input text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        House/Flat No. *
                      </label>
                      <input
                        type="text"
                        {...register('houseNumber', { required: 'Required' })}
                        className="input"
                        placeholder="e.g., Flat 101"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street *
                      </label>
                      <input
                        type="text"
                        {...register('street', { required: 'Required' })}
                        className="input"
                        placeholder="e.g., Main Road"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Area/Colony *
                      </label>
                      <input
                        type="text"
                        {...register('colony', { required: 'Required' })}
                        className="input"
                        placeholder="e.g., Banjara Hills"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        {...register('landmark')}
                        className="input"
                        placeholder="e.g., Near City Center"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary flex-1">
                        Add Address
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
