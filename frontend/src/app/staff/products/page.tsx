'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { staffAPI } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Product {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  category: {
    name: string;
  };
  quantityOptions: Array<{
    quantity: string;
    sellingPrice: number;
    costPrice: number;
  }>;
  isActive: boolean;
  isOutOfStock: boolean;
}

export default function StaffProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (stockFilter === 'in-stock') params.isOutOfStock = false;
      if (stockFilter === 'out-of-stock') params.isOutOfStock = true;

      const response = await staffAPI.getProducts(params);
      const data = response.data.data;
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [stockFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleStock = async (product: Product) => {
    try {
      // Use markOutOfStock endpoint if product is in stock, otherwise we need to update stock
      if (!product.isOutOfStock) {
        await staffAPI.markOutOfStock(product._id);
      } else {
        // To mark back in stock, set stock to a positive number for the first quantity option
        const quantityOptionId = product.quantityOptions?.[0]?.quantity || '';
        await staffAPI.updateProductStock(product._id, quantityOptionId, 10);
      }
      fetchProducts(pagination.currentPage);
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update product stock');
    }
  };

  const filteredProducts = products.filter((product) => {
    if (!search) return true;
    return product.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-600">Manage product stock and availability</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All Products</option>
            <option value="in-stock">In Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CubeIcon className="mx-auto mb-4 text-gray-400 w-12 h-12" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Products Found</h2>
          <p className="text-gray-600">
            Products will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product._id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100">
                {product.images?.[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CubeIcon className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {/* Stock Badge */}
                <div
                  className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full ${
                    product.isOutOfStock
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {product.isOutOfStock ? 'Out of Stock' : 'In Stock'}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {product.category?.name}
                </p>
                {product.quantityOptions?.[0] && (
                  <p className="text-green-600 font-semibold mt-2">
                    ₹{product.quantityOptions[0].sellingPrice}
                    <span className="text-gray-400 text-sm font-normal ml-1">
                      / {product.quantityOptions[0].quantity}
                    </span>
                  </p>
                )}

                {/* Stock Toggle */}
                <button
                  onClick={() => toggleStock(product)}
                  className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    product.isOutOfStock
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  {product.isOutOfStock ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Mark In Stock
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-4 h-4" />
                      Mark Out of Stock
                    </>
                  )}
                </button>
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
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchProducts(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
