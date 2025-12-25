'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: { url: string; publicId: string };
  productCount?: number;
}

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/products?category=${category.slug}`}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 aspect-square">
        {category.image?.url ? (
          <Image
            src={category.image.url}
            alt={category.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">🌿</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-semibold text-lg group-hover:text-primary-200 transition-colors">
            {category.name}
          </h3>
          {category.productCount !== undefined && (
            <p className="text-sm text-gray-200">
              {category.productCount} products
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
