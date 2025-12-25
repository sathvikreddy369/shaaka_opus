'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  HeartIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  TruckIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useAuthStore, useCartStore, useWishlistStore, useUIStore } from '@/store';
import { productAPI, reviewAPI } from '@/lib/api';
import { formatCurrency, getDiscountPercentage, formatDate } from '@/lib/utils';
import ProductGrid from '@/components/products/ProductGrid';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: { url: string; publicId: string }[];
  category: { _id: string; name: string; slug: string };
  stock: number;
  unit: string;
  weight?: string;
  nutritionInfo?: string;
  ingredients?: string;
  rating?: number;
  numReviews?: number;
  isFeatured: boolean;
}

interface Review {
  _id: string;
  user: { _id: string; name: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { isAuthenticated } = useAuthStore();
  const { addItem, isLoading: cartLoading } = useCartStore();
  const { isInWishlist, toggleItem } = useWishlistStore();
  const { openAuthModal, addToast } = useUIStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const response = await productAPI.getBySlug(slug);
        setProduct(response.data.product);

        // Fetch related products from the same category
        if (response.data.product.category) {
          const relatedResponse = await productAPI.getAll({
            category: response.data.product.category.slug,
            limit: 4,
          });
          setRelatedProducts(
            relatedResponse.data.products.filter(
              (p: Product) => p._id !== response.data.product._id
            )
          );
        }

        // Fetch reviews
        const reviewsResponse = await reviewAPI.getByProduct(response.data.product._id);
        setReviews(reviewsResponse.data.reviews || []);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-10 bg-gray-200 rounded w-1/3" />
              <div className="h-24 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <Link href="/products" className="btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product._id);
  const isOutOfStock = product.stock <= 0;
  const discount = product.discountPrice
    ? getDiscountPercentage(product.price, product.discountPrice)
    : 0;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    try {
      await addItem(product._id, quantity);
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

  const handleToggleWishlist = async () => {
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
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-primary-600">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/products" className="hover:text-primary-600">
              Products
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-primary-600"
            >
              {product.category.name}
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium truncate">{product.name}</li>
        </ol>
      </nav>

      {/* Product details */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {product.images?.[selectedImage]?.url ? (
              <Image
                src={product.images[selectedImage].url}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
            {discount > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1 text-sm font-semibold bg-accent-500 text-white rounded">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Thumbnail images */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index
                      ? 'border-primary-500'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>

          {/* Rating */}
          {product.numReviews !== undefined && product.numReviews > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(product.rating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating?.toFixed(1)} ({product.numReviews} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            {product.discountPrice ? (
              <>
                <span className="text-3xl font-bold text-primary-600">
                  {formatCurrency(product.discountPrice)}
                </span>
                <span className="text-xl text-gray-400 line-through">
                  {formatCurrency(product.price)}
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>

          <p className="text-gray-600 mb-2">Unit: {product.unit}</p>
          {product.weight && (
            <p className="text-gray-600 mb-4">Weight: {product.weight}</p>
          )}

          {/* Stock status */}
          <div className="mb-6">
            {isOutOfStock ? (
              <span className="text-red-600 font-medium">Out of Stock</span>
            ) : product.stock <= 10 ? (
              <span className="text-orange-600 font-medium">
                Only {product.stock} left in stock
              </span>
            ) : (
              <span className="text-green-600 font-medium">In Stock</span>
            )}
          </div>

          {/* Quantity and actions */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Quantity selector */}
            <div className="flex items-center border rounded-lg">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="p-3 hover:bg-gray-100 disabled:opacity-50"
              >
                <MinusIcon className="h-5 w-5" />
              </button>
              <span className="px-4 py-2 text-lg font-medium min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={quantity >= product.stock}
                className="p-3 hover:bg-gray-100 disabled:opacity-50"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || cartLoading}
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCartIcon className="h-5 w-5" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>

            {/* Wishlist */}
            <button
              onClick={handleToggleWishlist}
              className={`p-3 rounded-lg border transition-colors ${
                isWishlisted
                  ? 'bg-red-50 border-red-200 text-red-500'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              {isWishlisted ? (
                <HeartSolidIcon className="h-6 w-6" />
              ) : (
                <HeartIcon className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
            <div className="text-center">
              <TruckIcon className="h-6 w-6 mx-auto text-primary-600 mb-1" />
              <p className="text-xs text-gray-600">Free Delivery over ₹500</p>
            </div>
            <div className="text-center">
              <ShieldCheckIcon className="h-6 w-6 mx-auto text-primary-600 mb-1" />
              <p className="text-xs text-gray-600">100% Organic</p>
            </div>
            <div className="text-center">
              <ArrowPathIcon className="h-6 w-6 mx-auto text-primary-600 mb-1" />
              <p className="text-xs text-gray-600">Easy Returns</p>
            </div>
          </div>

          {/* Category */}
          <div className="mb-6">
            <span className="text-sm text-gray-500">Category: </span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="text-sm text-primary-600 hover:underline"
            >
              {product.category.name}
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('description')}
            className={`py-4 border-b-2 font-medium transition-colors ${
              activeTab === 'description'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 border-b-2 font-medium transition-colors ${
              activeTab === 'reviews'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reviews ({reviews.length})
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="mb-12">
        {activeTab === 'description' && (
          <div className="prose max-w-none">
            <p className="text-gray-600 whitespace-pre-line">{product.description}</p>

            {product.ingredients && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Ingredients</h3>
                <p className="text-gray-600">{product.ingredients}</p>
              </div>
            )}

            {product.nutritionInfo && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Nutrition Information</h3>
                <p className="text-gray-600 whitespace-pre-line">
                  {product.nutritionInfo}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {reviews.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No reviews yet. Be the first to review this product!
              </p>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review._id} className="border-b pb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{review.user.name}</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-gray-600">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}
    </div>
  );
}
