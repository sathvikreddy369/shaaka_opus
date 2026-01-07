'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { vendorAPI } from '@/lib/api';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  ExclamationCircleIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: Array<{ url: string; isPrimary: boolean }>;
  category: { name: string; slug: string };
  quantityOptions: Array<{
    _id: string;
    quantity: string;
    price: number;
    sellingPrice: number;
    stock: number;
  }>;
  isActive: boolean;
  isOutOfStock: boolean;
  isReadyToEat?: boolean;
  readyToEatExpiryHours?: number;
  readyToEatActivatedAt?: string;
  isHiddenDueToExpiry?: boolean;
  averageRating: number;
  totalReviews: number;
  totalSales: number;
  createdAt: string;
}

export default function VendorProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 12 };
      if (search) params.search = search;
      if (filter !== 'all') params.isActive = filter === 'active';

      const response = await vendorAPI.getProducts(params);
      const data = response.data.data;
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await vendorAPI.deleteProduct(productId);
      fetchProducts(pagination.currentPage);
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const toggleStock = async (product: Product) => {
    try {
      // Toggle stock for all quantity options
      for (const opt of product.quantityOptions) {
        await vendorAPI.updateProductStock(
          product._id,
          opt._id,
          product.isOutOfStock ? 10 : 0
        );
      }
      fetchProducts(pagination.currentPage);
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  const activateReadyToEat = async (productId: string) => {
    try {
      await vendorAPI.activateReadyToEat(productId);
      fetchProducts(pagination.currentPage);
    } catch (error) {
      console.error('Failed to activate product:', error);
      alert('Failed to activate product. Please try again.');
    }
  };

  const deactivateReadyToEat = async (productId: string) => {
    try {
      await vendorAPI.deactivateReadyToEat(productId);
      fetchProducts(pagination.currentPage);
    } catch (error) {
      console.error('Failed to deactivate product:', error);
      alert('Failed to deactivate product. Please try again.');
    }
  };

  const getReadyToEatStatus = (product: Product) => {
    if (!product.isReadyToEat) return null;
    
    if (!product.readyToEatActivatedAt || product.isHiddenDueToExpiry) {
      return { status: 'expired', message: 'Not active - tap to make available' };
    }
    
    const activatedAt = new Date(product.readyToEatActivatedAt);
    const expiresAt = new Date(activatedAt.getTime() + (product.readyToEatExpiryHours || 4) * 60 * 60 * 1000);
    const now = new Date();
    
    if (now >= expiresAt) {
      return { status: 'expired', message: 'Expired - tap to make available again' };
    }
    
    const hoursRemaining = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10;
    return { status: 'active', message: `${hoursRemaining}h remaining`, expiresAt };
  };

  const getPrimaryImage = (product: Product) => {
    const primary = product.images.find((img) => img.isPrimary);
    return primary?.url || product.images[0]?.url;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <Link
          href="/vendor/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                  filter === status
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CubeIcon className="mx-auto mb-4 text-gray-400 w-12 h-12" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Products Yet</h2>
          <p className="text-gray-600 mb-6">
            Start by adding your first home-made product
          </p>
          <Link
            href="/vendor/products/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              {/* Image */}
              <div className="relative aspect-square bg-gray-100">
                {getPrimaryImage(product) ? (
                  <Image
                    src={getPrimaryImage(product)!}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <CubeIcon className="text-gray-300 w-12 h-12" />
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {!product.isActive && (
                    <span className="px-2 py-1 bg-gray-800 text-white text-xs rounded">
                      Inactive
                    </span>
                  )}
                  {product.isOutOfStock && (
                    <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                      Out of Stock
                    </span>
                  )}
                  {product.isReadyToEat && (
                    <span className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                      getReadyToEatStatus(product)?.status === 'active'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}>
                      <ClockIcon className="w-3 h-3" />
                      Fresh Food
                    </span>
                  )}
                </div>

                {/* Menu Button */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() =>
                      setActiveMenu(activeMenu === product._id ? null : product._id)
                    }
                    className="p-2 bg-white rounded-full shadow hover:bg-gray-50"
                  >
                    <EllipsisVerticalIcon className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenu === product._id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                      <Link
                        href={`/vendor/products/${product._id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                        onClick={() => setActiveMenu(null)}
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit Product
                      </Link>
                      <button
                        onClick={() => {
                          toggleStock(product);
                          setActiveMenu(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 w-full"
                      >
                        {product.isOutOfStock ? (
                          <>
                            <EyeIcon className="w-4 h-4" />
                            Mark In Stock
                          </>
                        ) : (
                          <>
                            <EyeSlashIcon className="w-4 h-4" />
                            Mark Out of Stock
                          </>
                        )}
                      </button>
                      {product.isReadyToEat && (
                        <>
                          {getReadyToEatStatus(product)?.status === 'active' ? (
                            <button
                              onClick={() => {
                                deactivateReadyToEat(product._id);
                                setActiveMenu(null);
                              }}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-orange-50 text-orange-600 w-full"
                            >
                              <PauseIcon className="w-4 h-4" />
                              Hide (Sold Out)
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                activateReadyToEat(product._id);
                                setActiveMenu(null);
                              }}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-green-50 text-green-600 w-full"
                            >
                              <PlayIcon className="w-4 h-4" />
                              Activate Fresh Batch
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => {
                          handleDelete(product._id);
                          setActiveMenu(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.category.name}</p>

                {/* Price */}
                <div className="mt-2">
                  {product.quantityOptions.length > 0 && (
                    <p className="font-semibold text-green-600">
                      ₹{product.quantityOptions[0].sellingPrice}
                      {product.quantityOptions[0].price >
                        product.quantityOptions[0].sellingPrice && (
                        <span className="text-sm text-gray-400 line-through ml-2">
                          ₹{product.quantityOptions[0].price}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <span>{product.totalSales} sold</span>
                  {product.totalReviews > 0 && (
                    <span>★ {product.averageRating.toFixed(1)}</span>
                  )}
                </div>

                {/* Stock */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500">Stock</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.quantityOptions.map((opt) => (
                      <span
                        key={opt._id}
                        className={`text-xs px-2 py-1 rounded ${
                          opt.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : opt.stock <= 5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {opt.quantity}: {opt.stock}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ready-to-eat status */}
                {product.isReadyToEat && (
                  <div className="mt-3 pt-3 border-t">
                    {(() => {
                      const status = getReadyToEatStatus(product);
                      if (!status) return null;
                      
                      return (
                        <div className={`p-2 rounded-lg text-sm ${
                          status.status === 'active'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" />
                            <span className="font-medium">
                              {status.status === 'active' ? 'Live: ' : ''}
                              {status.message}
                            </span>
                          </div>
                          {status.status === 'active' && (
                            <button
                              onClick={() => deactivateReadyToEat(product._id)}
                              className="mt-2 w-full text-xs bg-orange-100 hover:bg-orange-200 px-2 py-1 rounded"
                            >
                              Sold Out / Hide Now
                            </button>
                          )}
                          {status.status === 'expired' && (
                            <button
                              onClick={() => activateReadyToEat(product._id)}
                              className="mt-2 w-full text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                            >
                              Make Available Now
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchProducts(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchProducts(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Click outside to close menu */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}
