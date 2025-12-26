'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useUIStore } from '@/store';
import { productAPI } from '@/lib/api';
import Image from 'next/image';

interface Product {
  _id: string;
  name: string;
  slug: string;
  images: Array<{ url: string; publicId: string }>;
  quantityOptions: Array<{
    quantity: string;
    sellingPrice: number;
  }>;
  category: { name: string; slug: string };
}

export default function SearchModal() {
  const router = useRouter();
  const { isSearchOpen, closeSearch, searchQuery, setSearchQuery } = useUIStore();
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
    // Reset state when modal opens
    if (isSearchOpen) {
      setSelectedIndex(-1);
    }
  }, [isSearchOpen]);

  // Debounced search for suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await productAPI.getAll({
        search: query,
        limit: 6,
      });
      const data = response.data.data || response.data;
      setSuggestions(data.products || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search input change with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, fetchSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        // Navigate to selected product
        router.push(`/products/${suggestions[selectedIndex].slug}`);
        closeSearch();
      } else if (searchQuery.trim()) {
        // Navigate to search page with query
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        closeSearch();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
    }
  };

  const handleProductClick = (slug: string) => {
    router.push(`/products/${slug}`);
    closeSearch();
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={closeSearch}
      />
      
      {/* Search Panel */}
      <div className="absolute top-0 left-0 right-0 bg-white shadow-xl">
        <div className="max-w-3xl mx-auto p-4">
          {/* Search Input */}
          <form onSubmit={handleSubmit}>
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="absolute left-4 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search for products..."
                className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={closeSearch}
                className="absolute right-4 p-1 hover:bg-gray-100 rounded-full"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </form>

          {/* Loading state */}
          {loading && (
            <div className="py-8 text-center text-gray-500">
              <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2">Searching...</p>
            </div>
          )}

          {/* Suggestions */}
          {!loading && suggestions.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-gray-500 mb-3">Products</p>
              <div className="space-y-2">
                {suggestions.map((product, index) => (
                  <button
                    key={product._id}
                    onClick={() => handleProductClick(product.slug)}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      index === selectedIndex
                        ? 'bg-primary-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                      {product.images?.[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <MagnifyingGlassIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        {product.category?.name} • ₹{product.quantityOptions?.[0]?.sellingPrice}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* View all results link */}
              {searchQuery.trim() && (
                <Link
                  href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                  onClick={closeSearch}
                  className="block mt-4 text-center text-primary-600 hover:text-primary-700 font-medium py-2"
                >
                  View all results for &quot;{searchQuery}&quot;
                </Link>
              )}
            </div>
          )}

          {/* No results */}
          {!loading && searchQuery.length >= 2 && suggestions.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No products found for &quot;{searchQuery}&quot;</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}

          {/* Quick Tips */}
          {!searchQuery && (
            <div className="py-6 text-center text-gray-500">
              <p className="text-sm">Start typing to search for products</p>
              <p className="text-xs mt-2">Press ↑↓ to navigate, Enter to select, Esc to close</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
