'use client';

import ProductCard from './ProductCard';

interface QuantityOption {
  _id: string;
  quantity: string;
  price: number;
  sellingPrice: number;
  discountPercent: number;
  discountFlat: number;
  stock: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  images: { url: string; publicId: string }[];
  quantityOptions: QuantityOption[];
  isOutOfStock: boolean;
  rating?: number;
  numReviews?: number;
}

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export default function ProductGrid({
  products,
  isLoading,
  emptyMessage = 'No products found',
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="card p-0 overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
