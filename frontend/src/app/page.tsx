import Link from 'next/link';
import Image from 'next/image';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import ProductGrid from '@/components/products/ProductGrid';
import CategoryCard from '@/components/categories/CategoryCard';
import { productAPI, categoryAPI } from '@/lib/api';

// Feature cards data
const features = [
  {
    icon: '🌱',
    title: '100% Organic',
    description: 'All products are certified organic and chemical-free',
  },
  {
    icon: '🚚',
    title: 'Free Delivery',
    description: 'Free delivery on orders above ₹500 within Hyderabad',
  },
  {
    icon: '🔄',
    title: 'Easy Returns',
    description: 'Not satisfied? Return within 7 days for full refund',
  },
  {
    icon: '💳',
    title: 'Secure Payment',
    description: 'Multiple payment options with complete security',
  },
];

// Why choose us data
const benefits = [
  {
    title: 'Farm Fresh Quality',
    description: 'We source directly from organic farms ensuring the freshest products reach your doorstep.',
    image: '/images/farm-fresh.jpg',
  },
  {
    title: 'No Preservatives',
    description: 'Our products are free from artificial preservatives, colors, and chemicals.',
    image: '/images/no-preservatives.jpg',
  },
  {
    title: 'Supporting Local Farmers',
    description: 'By choosing Shaaka, you support sustainable farming and local farming communities.',
    image: '/images/local-farmers.jpg',
  },
];

async function getCategories() {
  try {
    const response = await categoryAPI.getAll();
    return response.data.categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getFeaturedProducts() {
  try {
    const response = await productAPI.getFeatured();
    return response.data.products || [];
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
}

export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('/images/pattern.svg')] bg-repeat" />
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-2xl">
            <span className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
              🌿 100% Organic & Natural
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">
              Fresh Organic Groceries Delivered to Your Door
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8">
              Experience the goodness of nature with Shaaka. We bring you the finest
              organic spices, pulses, honey, ghee, and more from trusted farms across India.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/products"
                className="btn bg-white text-primary-600 hover:bg-primary-50 font-semibold"
              >
                Shop Now
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Link>
              <Link
                href="/about"
                className="btn border-2 border-white text-white hover:bg-white/10"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card text-center p-6 hover:shadow-lg transition-shadow"
              >
                <span className="text-4xl mb-3 block">{feature.icon}</span>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold">
                Shop by Category
              </h2>
              <p className="text-gray-600 mt-2">
                Browse our collection of organic products
              </p>
            </div>
            <Link
              href="/categories"
              className="hidden md:flex items-center text-primary-600 font-medium hover:text-primary-700"
            >
              View All
              <ArrowRightIcon className="h-5 w-5 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {categories.slice(0, 6).map((category: any) => (
              <CategoryCard key={category._id} category={category} />
            ))}
          </div>
          <div className="md:hidden mt-6 text-center">
            <Link
              href="/categories"
              className="btn-secondary inline-flex items-center"
            >
              View All Categories
              <ArrowRightIcon className="h-5 w-5 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold">
                Featured Products
              </h2>
              <p className="text-gray-600 mt-2">
                Our most loved organic products
              </p>
            </div>
            <Link
              href="/products"
              className="hidden md:flex items-center text-primary-600 font-medium hover:text-primary-700"
            >
              View All
              <ArrowRightIcon className="h-5 w-5 ml-1" />
            </Link>
          </div>
          <ProductGrid products={featuredProducts} />
          <div className="md:hidden mt-6 text-center">
            <Link
              href="/products"
              className="btn-secondary inline-flex items-center"
            >
              View All Products
              <ArrowRightIcon className="h-5 w-5 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-12 md:py-16 bg-secondary-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-heading font-bold">
              Why Choose Shaaka?
            </h2>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
              We&apos;re committed to bringing you the best organic products while
              supporting sustainable farming practices
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="card p-6 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">
                    {index === 0 ? '🌾' : index === 1 ? '🧪' : '👨‍🌾'}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-primary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Ready to Go Organic?
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of happy customers who have made the switch to organic.
            Start your healthy journey with Shaaka today!
          </p>
          <Link
            href="/products"
            className="btn bg-white text-primary-600 hover:bg-primary-50 font-semibold inline-flex items-center"
          >
            Start Shopping
            <ArrowRightIcon className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
              Stay Updated
            </h2>
            <p className="text-gray-600 mb-8">
              Subscribe to our newsletter for exclusive offers, new product
              announcements, and healthy living tips.
            </p>
            <form className="flex flex-col sm:flex-row gap-4 justify-center">
              <input
                type="email"
                placeholder="Enter your email"
                className="input flex-1 max-w-md"
              />
              <button type="submit" className="btn-primary whitespace-nowrap">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
