'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { adminAPI, categoryAPI } from '@/lib/api';
import { useUIStore } from '@/store';

interface ProductForm {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  stock: number;
  unit: string;
  weight?: number;
  weightUnit?: string;
  sku: string;
  isOrganic: boolean;
  isFeatured: boolean;
  isActive: boolean;
  tags: string;
  nutritionalInfo: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
}

interface Category {
  _id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const { addToast } = useUIStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductForm>({
    defaultValues: {
      isOrganic: true,
      isFeatured: false,
      isActive: true,
      unit: 'kg',
      weightUnit: 'g',
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data.categories);
    } catch {
      addToast('Failed to load categories', 'error');
    }
  };

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      addToast('Maximum 5 images allowed', 'error');
      return;
    }

    setImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, [images.length, addToast]);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductForm) => {
    if (images.length === 0) {
      addToast('Please add at least one image', 'error');
      return;
    }

    setLoading(true);
    try {
      // Create form data for multipart upload
      const formData = new FormData();
      
      // Append product data
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('price', data.price.toString());
      if (data.originalPrice) {
        formData.append('originalPrice', data.originalPrice.toString());
      }
      formData.append('category', data.category);
      formData.append('stock', data.stock.toString());
      formData.append('unit', data.unit);
      if (data.weight) {
        formData.append('weight', data.weight.toString());
      }
      if (data.weightUnit) {
        formData.append('weightUnit', data.weightUnit);
      }
      formData.append('sku', data.sku);
      formData.append('isOrganic', data.isOrganic.toString());
      formData.append('isFeatured', data.isFeatured.toString());
      formData.append('isActive', data.isActive.toString());
      
      if (data.tags) {
        const tagsArray = data.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
        formData.append('tags', JSON.stringify(tagsArray));
      }
      
      if (data.nutritionalInfo) {
        formData.append('nutritionalInfo', JSON.stringify(data.nutritionalInfo));
      }

      // Append images
      images.forEach((image) => {
        formData.append('images', image);
      });

      await adminAPI.createProduct(formData);
      addToast('Product created successfully!', 'success');
      router.push('/admin/products');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/products"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="input"
                    placeholder="e.g., Organic Tomatoes"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    {...register('description', { required: 'Description is required' })}
                    rows={4}
                    className="input"
                    placeholder="Describe the product..."
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    {...register('sku', { required: 'SKU is required' })}
                    className="input"
                    placeholder="e.g., ORG-TOM-001"
                  />
                  {errors.sku && (
                    <p className="text-red-500 text-sm mt-1">{errors.sku.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    {...register('tags')}
                    className="input"
                    placeholder="e.g., fresh, local, seasonal"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Images</h2>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {images.length < 5 && (
                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition">
                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">Add Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        multiple
                      />
                    </label>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Upload up to 5 images. First image will be the main product image.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Nutritional Information</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    {...register('nutritionalInfo.calories')}
                    className="input"
                    placeholder="kcal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Protein
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('nutritionalInfo.protein')}
                    className="input"
                    placeholder="g"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carbs
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('nutritionalInfo.carbs')}
                    className="input"
                    placeholder="g"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fat
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('nutritionalInfo.fat')}
                    className="input"
                    placeholder="g"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fiber
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('nutritionalInfo.fiber')}
                    className="input"
                    placeholder="g"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Per 100g serving</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Pricing & Stock</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('price', { 
                      required: 'Price is required',
                      min: { value: 0, message: 'Price must be positive' }
                    })}
                    className="input"
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('originalPrice')}
                    className="input"
                    placeholder="For showing discount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    {...register('stock', { 
                      required: 'Stock is required',
                      min: { value: 0, message: 'Stock must be positive' }
                    })}
                    className="input"
                    placeholder="0"
                  />
                  {errors.stock && (
                    <p className="text-red-500 text-sm mt-1">{errors.stock.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select {...register('unit')} className="input">
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="piece">Piece</option>
                    <option value="bunch">Bunch</option>
                    <option value="pack">Pack</option>
                    <option value="dozen">Dozen</option>
                    <option value="litre">Litre</option>
                    <option value="ml">Millilitre (ml)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight
                    </label>
                    <input
                      type="number"
                      {...register('weight')}
                      className="input"
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight Unit
                    </label>
                    <select {...register('weightUnit')} className="input">
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">L</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Organization</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    {...register('category', { required: 'Category is required' })}
                    className="input"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('isOrganic')}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Organic Product</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('isFeatured')}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured Product</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('isActive')}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Active (Visible)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <button
                type="submit"
                disabled={loading || uploading}
                className="btn-primary w-full"
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
              <Link
                href="/admin/products"
                className="btn-secondary w-full mt-3 text-center block"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
