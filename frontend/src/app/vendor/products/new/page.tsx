'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { vendorAPI } from '@/lib/api';
import {
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface QuantityOption {
  id: string;
  quantity: string;
  unit: string;
  price: number;
  discountPercent: number;
  discountFlat: number;
  stock: number;
}

export default function NewVendorProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [constituents, setConstituents] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quantityOptions, setQuantityOptions] = useState<QuantityOption[]>([
    {
      id: '1',
      quantity: '1',
      unit: 'piece',
      price: 0,
      discountPercent: 0,
      discountFlat: 0,
      stock: 10,
    },
  ]);
  
  // Food expiry settings
  const [isReadyToEat, setIsReadyToEat] = useState(false);
  const [readyToEatExpiryHours, setReadyToEatExpiryHours] = useState(4);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const addQuantityOption = () => {
    setQuantityOptions([
      ...quantityOptions,
      {
        id: Date.now().toString(),
        quantity: '1',
        unit: 'piece',
        price: 0,
        discountPercent: 0,
        discountFlat: 0,
        stock: 10,
      },
    ]);
  };

  const removeQuantityOption = (id: string) => {
    if (quantityOptions.length > 1) {
      setQuantityOptions(quantityOptions.filter((opt) => opt.id !== id));
    }
  };

  const updateQuantityOption = (id: string, field: keyof QuantityOption, value: any) => {
    setQuantityOptions(
      quantityOptions.map((opt) =>
        opt.id === id ? { ...opt, [field]: value } : opt
      )
    );
  };

  const calculateSellingPrice = (opt: QuantityOption) => {
    let discount = 0;
    if (opt.discountPercent > 0) {
      discount = (opt.price * opt.discountPercent) / 100;
    }
    discount += opt.discountFlat || 0;
    return Math.max(0, opt.price - discount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('constituents', constituents);
      formData.append('isReadyToEat', String(isReadyToEat));
      if (isReadyToEat) {
        formData.append('readyToEatExpiryHours', String(readyToEatExpiryHours));
      }
      formData.append(
        'quantityOptions',
        JSON.stringify(
          quantityOptions.map((opt) => ({
            quantity: opt.quantity,
            unit: opt.unit,
            price: opt.price,
            discountPercent: opt.discountPercent,
            discountFlat: opt.discountFlat,
            stock: opt.stock,
          }))
        )
      );

      if (image) {
        formData.append('image', image);
      }

      await vendorAPI.createProduct(formData);
      router.push('/vendor/products');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/vendor/products"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600">Create a new home-made product</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="e.g., Homemade Lemon Pickle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Describe your product, its taste, preparation method, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ingredients / Constituents
            </label>
            <textarea
              value={constituents}
              onChange={(e) => setConstituents(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="e.g., Lemon, Salt, Red Chilli Powder, Mustard Oil, Spices"
            />
          </div>
        </div>

        {/* Image */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Product Image</h2>
          <p className="text-sm text-gray-500">
            Upload one clear image of your product (max 5MB)
          </p>

          {imagePreview ? (
            <div className="relative w-48 h-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
              <PhotoIcon className="w-8 h-8 text-gray-400" />
              <span className="mt-2 text-sm text-gray-500">Upload Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Food Availability / Expiry Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Food Availability Settings</h2>
              <p className="text-sm text-gray-500">
                For fresh/perishable items that need time-limited availability
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="isReadyToEat"
              checked={isReadyToEat}
              onChange={(e) => setIsReadyToEat(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div>
              <label htmlFor="isReadyToEat" className="font-medium text-gray-700 cursor-pointer">
                This is a ready-to-eat / freshly prepared item
              </label>
              <p className="text-sm text-gray-500">
                Enable this for items like freshly cooked food, snacks, or perishables that should be hidden after a certain time
              </p>
            </div>
          </div>

          {isReadyToEat && (
            <div className="ml-7 space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How long should this product be available after you make it?
                </label>
                <select
                  value={readyToEatExpiryHours}
                  onChange={(e) => setReadyToEatExpiryHours(parseInt(e.target.value))}
                  className="w-full sm:w-48 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={3}>3 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={6}>6 hours</option>
                  <option value={8}>8 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                </select>
              </div>
              
              <div className="text-sm text-orange-700 space-y-1">
                <p><strong>How it works:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>When you prepare a fresh batch, activate it from your products list</li>
                  <li>Product will be visible to customers for {readyToEatExpiryHours} hours</li>
                  <li>After that, it will be automatically hidden</li>
                  <li>You can reactivate it anytime when you prepare a new batch</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Quantity Options */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Pricing & Stock</h2>
              <p className="text-sm text-gray-500">
                Add different quantity options for your product
              </p>
            </div>
            <button
              type="button"
              onClick={addQuantityOption}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
            >
              <PlusIcon className="w-4 h-4" />
              Add Option
            </button>
          </div>

          <div className="space-y-4">
            {quantityOptions.map((opt, index) => (
              <div
                key={opt.id}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    Option {index + 1}
                  </span>
                  {quantityOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuantityOption(opt.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="text"
                      value={opt.quantity}
                      onChange={(e) =>
                        updateQuantityOption(opt.id, 'quantity', e.target.value)
                      }
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., 250"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit *
                    </label>
                    <select
                      value={opt.unit}
                      onChange={(e) =>
                        updateQuantityOption(opt.id, 'unit', e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="piece">Piece(s)</option>
                      <option value="g">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="ml">Milliliters (ml)</option>
                      <option value="L">Liters (L)</option>
                      <option value="pack">Pack</option>
                      <option value="box">Box</option>
                      <option value="jar">Jar</option>
                      <option value="bottle">Bottle</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={opt.price}
                      onChange={(e) =>
                        updateQuantityOption(opt.id, 'price', parseFloat(e.target.value) || 0)
                      }
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock *
                    </label>
                    <input
                      type="number"
                      value={opt.stock}
                      onChange={(e) =>
                        updateQuantityOption(opt.id, 'stock', parseInt(e.target.value) || 0)
                      }
                      required
                      min="0"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      value={opt.discountPercent}
                      onChange={(e) =>
                        updateQuantityOption(
                          opt.id,
                          'discountPercent',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Flat Discount (₹)
                    </label>
                    <input
                      type="number"
                      value={opt.discountFlat}
                      onChange={(e) =>
                        updateQuantityOption(
                          opt.id,
                          'discountFlat',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                {/* Selling Price Preview */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Selling Price:</span>
                    <span className="font-semibold text-green-600">
                      ₹{calculateSellingPrice(opt).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Product'}
          </button>
          <Link
            href="/vendor/products"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
