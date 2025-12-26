'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import ProductGrid from '@/components/products/ProductGrid';
import { productAPI, categoryAPI } from '@/lib/api';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface QuantityOption {
  _id: string;
  quantity: string;
  price: number;
  discountPercent: number;
  discountFlat: number;
  sellingPrice: number;
  stock: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  images: { url: string; publicId: string }[];
  quantityOptions: QuantityOption[];
  isOutOfStock: boolean;
  averageRating?: number;
  reviewCount?: number;
  category?: { name: string; slug: string };
}

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Debounced search for suggestions (faster - 200ms)
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get('minPrice') || '',
    max: searchParams.get('maxPrice') || '',
  });
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('inStock') === 'true');
  
  // Applied search (only updates on enter or suggestion click)
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get('search') || '');
  const debouncedAppliedSearch = useDebounce(appliedSearch, 400);

  // Trending products
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);

  // Fetch categories once
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryAPI.getAll();
        const data = response.data.data || response.data;
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch search suggestions when typing (after 3 characters)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchQuery.length < 3) {
        setSearchSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await productAPI.getAll({
          search: debouncedSearchQuery,
          limit: 5,
        });
        const data = response.data.data || response.data;
        setSearchSuggestions(data.products || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSearchSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearchQuery]);

  // Fetch products when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, unknown> = {
          page: currentPage,
          limit: 12,
          sort: sortBy,
        };

        if (selectedCategory) params.category = selectedCategory;
        if (debouncedAppliedSearch) params.search = debouncedAppliedSearch;
        if (priceRange.min) params.minPrice = priceRange.min;
        if (priceRange.max) params.maxPrice = priceRange.max;
        if (inStockOnly) params.inStock = true;

        const response = await productAPI.getAll(params);
        const responseData = response.data.data || response.data;
        setProducts(responseData.products || []);
        setTotalProducts(responseData.pagination?.total || 0);
        setTotalPages(responseData.pagination?.pages || 1);
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategory, debouncedAppliedSearch, sortBy, priceRange, inStockOnly, currentPage]);

  // Handle click outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch trending when user starts typing but not enough chars
  useEffect(() => {
    if (searchQuery.length > 0 && searchQuery.length < 3 && trendingProducts.length === 0) {
      const fetchTrending = async () => {
        try {
          const response = await productAPI.getAll({ sort: 'popular', limit: 4 });
          const data = response.data.data || response.data;
          setTrendingProducts(data.products || []);
        } catch (error) {
          console.error('Error fetching trending:', error);
        }
      };
      fetchTrending();
    }
  }, [searchQuery, trendingProducts.length]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchQuery);
    setShowSuggestions(false);
    setCurrentPage(1);
  };

  const handleSuggestionClick = (product: Product) => {
    router.push(`/products/${product.slug}`);
    setShowSuggestions(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length === 0) {
      setAppliedSearch('');
      setCurrentPage(1);
    }
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setAppliedSearch('');
    setSortBy('newest');
    setPriceRange({ min: '', max: '' });
    setInStockOnly(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedCategory || appliedSearch || priceRange.min || priceRange.max || inStockOnly;

  const hasAdvancedFilters = priceRange.min || priceRange.max || inStockOnly;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header with Search */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-4">All Products</h1>
        
        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchQuery.length >= 3 && searchSuggestions.length > 0) {
                    setShowSuggestions(true);
                  } else if (searchQuery.length > 0 && searchQuery.length < 3) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Search for products..."
                className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400" />
                </button>
              )}
            </div>
          </form>

          {/* Search Suggestions Dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && searchQuery.length >= 3 && (
            <div 
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
            >
              <div className="p-2">
                <p className="text-xs text-gray-500 px-3 py-2">Products</p>
                {searchSuggestions.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => handleSuggestionClick(product)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {product.images?.[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <MagnifyingGlassIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        ₹{product.quantityOptions?.[0]?.sellingPrice}
                        {product.category?.name && ` • ${product.category.name}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t">
                <button
                  onClick={handleSearchSubmit}
                  className="w-full px-4 py-3 text-sm text-primary-600 hover:bg-primary-50 font-medium transition-colors"
                >
                  See all results for &quot;{searchQuery}&quot;
                </button>
              </div>
            </div>
          )}

          {/* Trending suggestions when typing < 3 chars */}
          {showSuggestions && searchQuery.length > 0 && searchQuery.length < 3 && trendingProducts.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
            >
              <div className="p-2">
                <p className="text-xs text-gray-500 px-3 py-2 flex items-center gap-1">
                  <ArrowTrendingUpIcon className="h-3 w-3" />
                  Trending
                </p>
                {trendingProducts.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => handleSuggestionClick(product)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {product.images?.[0]?.url && (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-sm text-gray-500">₹{product.quantityOptions?.[0]?.sellingPrice}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="px-4 py-2 text-xs text-gray-400 border-t">
                Type at least 3 characters to search
              </p>
            </div>
          )}

          {/* Loading indicator */}
          {isSearching && searchQuery.length >= 3 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Searching...</span>
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-600 mt-3">
          {totalProducts} products found
          {appliedSearch && ` for "${appliedSearch}"`}
          {selectedCategory && ` in ${categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}`}
        </p>
      </div>

      {/* Mobile: Top filter bar with category, sort, and filters button */}
      <div className="lg:hidden mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* Category dropdown */}
          <div className="relative flex-shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Sort dropdown */}
          <div className="relative flex-shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Advanced Filters button */}
          <button
            onClick={() => setShowFilters(true)}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              hasAdvancedFilters 
                ? 'border-primary-500 bg-primary-50 text-primary-700' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            <span>Filters</span>
            {hasAdvancedFilters && (
              <span className="w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters - Desktop only */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="card p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Filters</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Categories */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="input w-full"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input w-full"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) => {
                    setPriceRange({ ...priceRange, min: e.target.value });
                    setCurrentPage(1);
                  }}
                  placeholder="Min"
                  className="input w-full"
                  min="0"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) => {
                    setPriceRange({ ...priceRange, max: e.target.value });
                    setCurrentPage(1);
                  }}
                  placeholder="Max"
                  className="input w-full"
                  min="0"
                />
              </div>
            </div>

            {/* In Stock */}
            <div className="mb-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">In stock only</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {/* Active filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                  {categories.find(c => c.slug === selectedCategory)?.name}
                  <button onClick={() => setSelectedCategory('')} className="hover:bg-primary-100 rounded-full p-0.5">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {appliedSearch && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                  &quot;{appliedSearch}&quot;
                  <button onClick={() => { setSearchQuery(''); setAppliedSearch(''); }} className="hover:bg-primary-100 rounded-full p-0.5">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {(priceRange.min || priceRange.max) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                  ₹{priceRange.min || '0'} - ₹{priceRange.max || '∞'}
                  <button onClick={() => setPriceRange({ min: '', max: '' })} className="hover:bg-primary-100 rounded-full p-0.5">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                  In Stock
                  <button onClick={() => setInStockOnly(false)} className="hover:bg-primary-100 rounded-full p-0.5">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Products grid */}
          <ProductGrid products={products} isLoading={isLoading} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile filters modal - Advanced filters only */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-lg">Advanced Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={priceRange.min}
                      onChange={(e) => {
                        setPriceRange({ ...priceRange, min: e.target.value });
                      }}
                      placeholder="Min"
                      className="input w-full"
                      min="0"
                    />
                  </div>
                  <span className="text-gray-400">to</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={priceRange.max}
                      onChange={(e) => {
                        setPriceRange({ ...priceRange, max: e.target.value });
                      }}
                      placeholder="Max"
                      className="input w-full"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Status
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="stockStatus"
                      checked={!inStockOnly}
                      onChange={() => setInStockOnly(false)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">All Products</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="stockStatus"
                      checked={inStockOnly}
                      onChange={() => setInStockOnly(true)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">In Stock Only</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t space-y-2 bg-white">
              <button
                onClick={() => {
                  setShowFilters(false);
                  setCurrentPage(1);
                }}
                className="btn-primary w-full"
              >
                Apply Filters
              </button>
              {hasAdvancedFilters && (
                <button
                  onClick={() => {
                    setPriceRange({ min: '', max: '' });
                    setInStockOnly(false);
                    setCurrentPage(1);
                  }}
                  className="btn-secondary w-full"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded max-w-2xl mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card p-0 overflow-hidden">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
