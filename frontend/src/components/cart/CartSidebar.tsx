'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, TrashIcon, MinusIcon, PlusIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCartStore, useUIStore } from '@/store';
import { formatCurrency } from '@/lib/utils';

export default function CartSidebar() {
  const { isCartSidebarOpen, closeCartSidebar } = useUIStore();
  const { cart, isLoading, updateItem, removeItem } = useCartStore();

  const handleQuantityChange = async (productId: string, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity <= 0) {
      await removeItem(productId);
    } else {
      await updateItem(productId, newQuantity);
    }
  };

  return (
    <Transition appear show={isCartSidebarOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeCartSidebar}>
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

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 border-b">
                      <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                        <ShoppingBagIcon className="h-6 w-6" />
                        Your Cart
                        {cart?.items?.length ? (
                          <span className="text-sm font-normal text-gray-500">
                            ({cart.items.length} items)
                          </span>
                        ) : null}
                      </Dialog.Title>
                      <button
                        onClick={closeCartSidebar}
                        className="p-2 rounded-full hover:bg-gray-100"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Cart items */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {!cart?.items?.length ? (
                        <div className="text-center py-12">
                          <ShoppingBagIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Your cart is empty
                          </h3>
                          <p className="text-gray-500 mb-6">
                            Add some products to get started
                          </p>
                          <Link
                            href="/products"
                            onClick={closeCartSidebar}
                            className="btn-primary"
                          >
                            Browse Products
                          </Link>
                        </div>
                      ) : (
                        <ul className="space-y-4">
                          {cart.items.map((item) => (
                            <li
                              key={item.product._id}
                              className="flex gap-4 p-3 bg-gray-50 rounded-lg"
                            >
                              {/* Product image */}
                              <Link
                                href={`/products/${item.product.slug}`}
                                onClick={closeCartSidebar}
                                className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200"
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
                                  onClick={closeCartSidebar}
                                  className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2"
                                >
                                  {item.product.name}
                                </Link>
                                <p className="text-sm text-gray-500 mt-1">
                                  {item.product.unit}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-2">
                                    {item.product.discountPrice ? (
                                      <>
                                        <span className="font-semibold text-primary-600">
                                          {formatCurrency(item.product.discountPrice)}
                                        </span>
                                        <span className="text-sm text-gray-400 line-through">
                                          {formatCurrency(item.product.price)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="font-semibold">
                                        {formatCurrency(item.product.price)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Quantity controls */}
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center border rounded-lg">
                                    <button
                                      onClick={() =>
                                        handleQuantityChange(item.product._id, item.quantity, -1)
                                      }
                                      disabled={isLoading}
                                      className="p-1.5 hover:bg-gray-100 disabled:opacity-50"
                                    >
                                      <MinusIcon className="h-4 w-4" />
                                    </button>
                                    <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleQuantityChange(item.product._id, item.quantity, 1)
                                      }
                                      disabled={isLoading || item.quantity >= item.product.stock}
                                      className="p-1.5 hover:bg-gray-100 disabled:opacity-50"
                                    >
                                      <PlusIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => removeItem(item.product._id)}
                                    disabled={isLoading}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                  >
                                    <TrashIcon className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Footer */}
                    {cart?.items?.length ? (
                      <div className="border-t p-4 space-y-4">
                        {/* Summary */}
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
                              {cart.deliveryCharge === 0
                                ? 'Free'
                                : formatCurrency(cart.deliveryCharge)}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                            <span>Total</span>
                            <span>{formatCurrency(cart.total)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          <Link
                            href="/checkout"
                            onClick={closeCartSidebar}
                            className="btn-primary w-full text-center block"
                          >
                            Proceed to Checkout
                          </Link>
                          <Link
                            href="/cart"
                            onClick={closeCartSidebar}
                            className="btn-secondary w-full text-center block"
                          >
                            View Cart
                          </Link>
                        </div>

                        {cart.subtotal < 500 && (
                          <p className="text-sm text-center text-gray-500">
                            Add {formatCurrency(500 - cart.subtotal)} more for free delivery!
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
