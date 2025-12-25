'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HeartIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useAuthStore, useCartStore, useWishlistStore, useUIStore } from '@/store';
import { formatCurrency, getDiscountPercentage } from '@/lib/utils';

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  images: { url: string; publicId: string }[];
  stock: number;
  unit: string;
  rating?: number;
  numReviews?: number;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isAuthenticated } = useAuthStore();
  const { addItem, isLoading: cartLoading } = useCartStore();
  const { isInWishlist, toggleItem } = useWishlistStore();
  const { openAuthModal, addToast } = useUIStore();

  const isWishlisted = isInWishlist(product._id);
  const isOutOfStock = product.stock <= 0;
  const discount = product.discountPrice
    ? getDiscountPercentage(product.price, product.discountPrice)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    try {
      await addItem(product._id);
      addToast({
        type: 'success',
        message: `${product.name} added to cart`,
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to add to cart',
      });
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    try {
      await toggleItem(product._id);
      addToast({
        type: 'success',
        message: isWishlisted
          ? `${product.name} removed from wishlist`
          : `${product.name} added to wishlist`,
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update wishlist',
      });
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="card p-0 overflow-hidden transition-all duration-300 hover:shadow-lg">
        {/* Image container */}
        <div className="relative aspect-square bg-gray-100">
          {product.images?.[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 space-y-1">
            {discount > 0 && (
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-accent-500 text-white rounded">
                {discount}% OFF
              </span>
            )}
            {isOutOfStock && (
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-gray-800 text-white rounded">
                Out of Stock
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <button
            onClick={handleToggleWishlist}
            className="absolute top-2 right-2 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isWishlisted ? (
              <HeartSolidIcon className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 group-hover:text-primary-600 line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>

          <p className="text-sm text-gray-500 mt-1">{product.unit}</p>

          {/* Rating */}
          {product.rating !== undefined && product.numReviews !== undefined && product.numReviews > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(product.rating!) ? 'text-yellow-400' : 'text-gray-200'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-500">({product.numReviews})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 mt-3">
            {product.discountPrice ? (
              <>
                <span className="text-lg font-bold text-primary-600">
                  {formatCurrency(product.discountPrice)}
                </span>
                <span className="text-sm text-gray-400 line-through">
                  {formatCurrency(product.price)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>

          {/* Add to cart button */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || cartLoading}
            className="mt-3 w-full btn-primary py-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Link>
  );
}
