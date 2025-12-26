'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrashIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useCartStore, useAuthStore, useUIStore } from '@/store';
import { formatCurrency } from '@/lib/utils';

export default function CartPage() {
  const { cart, isLoading, fetchCart, updateItem, removeItem, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal, addToast } = useUIStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const handleQuantityChange = async (productId: string, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity <= 0) {
      await removeItem(productId);
      addToast({ type: 'success', message: 'Item removed from cart' });
    } else {
      await updateItem(productId, newQuantity);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    await removeItem(productId);
    addToast({ type: 'success', message: 'Item removed from cart' });
  };

  const handleClearCart = async () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      await clearCart();
      addToast({ type: 'success', message: 'Cart cleared' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Please login to view your cart</h1>
        <button onClick={openAuthModal} className="btn-primary">
          Login
        </button>
      </div>
    );
  }

  if (isLoading && !cart) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold mb-8">Shopping Cart</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 flex gap-4">
              <div className="w-24 h-24 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!cart?.items?.length) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Add some products to get started</p>
        <Link href="/products" className="btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold">Shopping Cart</h1>
        <button
          onClick={handleClearCart}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div key={item._id} className="card p-4 flex gap-4">
              {/* Product image */}
              <Link
                href={`/products/${item.product.slug}`}
                className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100"
              >
                {item.product.images?.[0]?.url ? (
                  <Image
                    src={item.product.images[0].url}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </Link>

              {/* Product details */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2"
                >
                  {item.product.name}
                </Link>
                <p className="text-sm text-gray-500 mt-1">{item.quantityOption?.quantity || 'N/A'}</p>

                <div className="flex items-center gap-2 mt-2">
                  {item.quantityOption?.sellingPrice < item.quantityOption?.price ? (
                    <>
                      <span className="font-semibold text-primary-600">
                        {formatCurrency(item.quantityOption?.sellingPrice || 0)}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(item.quantityOption?.price || 0)}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold">
                      {formatCurrency(item.quantityOption?.sellingPrice || item.price || 0)}
                    </span>
                  )}
                </div>

                {/* Mobile: Quantity and remove */}
                <div className="flex items-center justify-between mt-4 md:hidden">
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() =>
                        handleQuantityChange(item._id, item.quantity, -1)
                      }
                      disabled={isLoading}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        handleQuantityChange(item._id, item.quantity, 1)
                      }
                      disabled={isLoading || item.quantity >= (item.quantityOption?.stock || 0)}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item._id)}
                    disabled={isLoading}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Desktop: Quantity and total */}
              <div className="hidden md:flex items-center gap-6">
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() =>
                      handleQuantityChange(item._id, item.quantity, -1)
                    }
                    disabled={isLoading}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-1 text-sm font-medium min-w-[3rem] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      handleQuantityChange(item._id, item.quantity, 1)
                    }
                    disabled={isLoading || item.quantity >= (item.quantityOption?.stock || 0)}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-right min-w-[6rem]">
                  <p className="font-semibold">
                    {formatCurrency(item.subtotal || (item.quantityOption?.sellingPrice * item.quantity))}
                  </p>
                </div>

                <button
                  onClick={() => handleRemoveItem(item._id)}
                  disabled={isLoading}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Subtotal ({cart.items.length} items)
                </span>
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

              <hr className="my-4" />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(cart.total)}</span>
              </div>
            </div>

            {cart.subtotal < 500 && (
              <p className="mt-4 text-sm text-center text-gray-500 bg-yellow-50 p-3 rounded-lg">
                Add {formatCurrency(500 - cart.subtotal)} more for free delivery!
              </p>
            )}

            <Link
              href="/checkout"
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ArrowRightIcon className="h-5 w-5" />
            </Link>

            <Link
              href="/products"
              className="btn-secondary w-full mt-3 text-center block"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
