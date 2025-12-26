'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { ArrowLeftIcon, PhotoIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { adminAPI, categoryAPI, productAPI } from '@/lib/api';
import { useUIStore } from '@/store';

interface QuantityOption {
  _id?: string;
  quantity: string;
  price: number;
  discountPercent: number;
  discountFlat: number;
  stock: number;
  sku: string;
}

interface ProductForm {
  name: string;
  description: string;
  constituents: string;
  category: string;
  quantityOptions: QuantityOption[];
  metaTitle: string;
  metaDescription: string;
  isFeatured: boolean;
  isActive: boolean;
}

interface Category {
  _id: string;
  name: string;
}

interface ExistingImage {
  _id: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
}

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { addToast } = useUIStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    watch,
  } = useForm<ProductForm>({
    defaultValues: {
      quantityOptions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'quantityOptions',
  });

  const quantityOptions = watch('quantityOptions');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // First try to get by ID, then by slug
      let productRes;
      try {
        productRes = await productAPI.getById(id);
      } catch {
        productRes = await productAPI.getBySlug(id);
      }

      const [categoriesRes] = await Promise.all([
        categoryAPI.getAll(),
      ]);

      const productData = productRes.data.data || productRes.data;
      const product = productData.product;
      const categoriesData = categoriesRes.data.data || categoriesRes.data;
      setCategories(categoriesData.categories || []);
      setExistingImages(product.images || []);

      // Map quantity options to form format
      const formQuantityOptions = (product.quantityOptions || []).map((opt: any) => ({
        _id: opt._id,
        quantity: opt.quantity,
        price: opt.price,
        discountPercent: opt.discountPercent || 0,
        discountFlat: opt.discountFlat || 0,
        stock: opt.stock,
        sku: opt.sku || '',
      }));

      reset({
        name: product.name,
        description: product.description,
        constituents: product.constituents || '',
        category: product.category?._id || product.category,
        quantityOptions: formQuantityOptions,
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        isFeatured: product.isFeatured || false,
        isActive: product.isActive !== false,
      });
    } catch (error) {
      console.error('Error loading product:', error);
      addToast({ type: 'error', message: 'Failed to load product' });
      router.push('/admin/products');
    } finally {
      setFetching(false);
    }
  };

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length - removedImageIds.length + newImages.length;
    
    if (files.length + totalImages > 5) {
      addToast({ type: 'error', message: 'Maximum 5 images allowed' });
      return;
    }

    setNewImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, [existingImages.length, removedImageIds.length, newImages.length, addToast]);

  const removeExistingImage = (imageId: string) => {
    setRemovedImageIds((prev) => [...prev, imageId]);
  };

  const restoreExistingImage = (imageId: string) => {
    setRemovedImageIds((prev) => prev.filter((id) => id !== imageId));
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateSellingPrice = (price: number, discountPercent: number, discountFlat: number) => {
    let discount = (price * discountPercent) / 100;
    discount += discountFlat;
    return Math.max(0, price - discount);
  };

  const onSubmit = async (data: ProductForm) => {
    const activeExisting = existingImages.length - removedImageIds.length;
    const totalImages = activeExisting + newImages.length;

    if (totalImages === 0) {
      addToast({ type: 'error', message: 'Please add at least one image' });
      return;
    }

    if (data.quantityOptions.length === 0) {
      addToast({ type: 'error', message: 'Please add at least one quantity option' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      formData.append('name', data.name);
      formData.append('description', data.description);
      if (data.constituents) {
        formData.append('constituents', data.constituents);
      }
      formData.append('category', data.category);
      formData.append('isFeatured', data.isFeatured.toString());
      formData.append('isActive', data.isActive.toString());
      if (data.metaTitle) {
        formData.append('metaTitle', data.metaTitle);
      }
      if (data.metaDescription) {
        formData.append('metaDescription', data.metaDescription);
      }
      
      // Add quantity options as JSON string
      formData.append('quantityOptions', JSON.stringify(data.quantityOptions));

      // Images to delete
      if (removedImageIds.length > 0) {
        removedImageIds.forEach(imageId => {
          formData.append('deleteImages', imageId);
        });
      }

      // New images
      newImages.forEach((image) => {
        formData.append('images', image);
      });

      await adminAPI.updateProduct(id, formData);
      addToast({ type: 'success', message: 'Product updated successfully!' });
      router.push('/admin/products');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update product';
      addToast({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalImageCount = existingImages.length - removedImageIds.length + newImages.length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/products"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Product</h1>
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
                    Constituents / Ingredients
                  </label>
                  <textarea
                    {...register('constituents')}
                    rows={2}
                    className="input"
                    placeholder="List the ingredients or constituents..."
                  />
                </div>
              </div>
            </div>

            {/* Quantity Options */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Quantity Options</h2>
                <button
                  type="button"
                  onClick={() => append({ quantity: '', price: 0, discountPercent: 0, discountFlat: 0, stock: 0, sku: '' })}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Option
                </button>
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-sm text-gray-600">Option {index + 1}</span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantity Label *
                        </label>
                        <input
                          type="text"
                          {...register(`quantityOptions.${index}.quantity` as const, { required: 'Required' })}
                          className="input text-sm"
                          placeholder="e.g., 250g, 500g, 1kg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(`quantityOptions.${index}.price` as const, { 
                            required: 'Required',
                            valueAsNumber: true,
                            min: { value: 0, message: 'Must be positive' }
                          })}
                          className="input text-sm"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Discount %
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(`quantityOptions.${index}.discountPercent` as const, { 
                            valueAsNumber: true,
                            min: 0,
                            max: 100
                          })}
                          className="input text-sm"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Flat Discount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(`quantityOptions.${index}.discountFlat` as const, { 
                            valueAsNumber: true,
                            min: 0
                          })}
                          className="input text-sm"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Stock *
                        </label>
                        <input
                          type="number"
                          {...register(`quantityOptions.${index}.stock` as const, { 
                            required: 'Required',
                            valueAsNumber: true,
                            min: { value: 0, message: 'Must be >= 0' }
                          })}
                          className="input text-sm"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          SKU
                        </label>
                        <input
                          type="text"
                          {...register(`quantityOptions.${index}.sku` as const)}
                          className="input text-sm"
                          placeholder="e.g., TOM-250G"
                        />
                      </div>
                    </div>
                    
                    {quantityOptions[index] && (
                      <div className="mt-2 flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          Selling Price: <span className="font-medium text-primary">
                            ₹{calculateSellingPrice(
                              quantityOptions[index].price || 0,
                              quantityOptions[index].discountPercent || 0,
                              quantityOptions[index].discountFlat || 0
                            ).toFixed(2)}
                          </span>
                        </span>
                        {quantityOptions[index].stock === 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Images</h2>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {/* Existing images */}
                  {existingImages.map((image, index) => {
                    const isRemoved = removedImageIds.includes(image._id);
                    return (
                      <div key={image._id} className="relative">
                        <img
                          src={image.url}
                          alt={`Product ${index + 1}`}
                          className={`w-24 h-24 object-cover rounded-lg border ${
                            isRemoved ? 'opacity-40' : ''
                          }`}
                        />
                        {index === 0 && !isRemoved && (
                          <span className="absolute bottom-0 left-0 right-0 bg-primary text-white text-xs text-center py-0.5 rounded-b-lg">
                            Primary
                          </span>
                        )}
                        {isRemoved ? (
                          <button
                            type="button"
                            onClick={() => restoreExistingImage(image._id)}
                            className="absolute -top-2 -right-2 p-1 bg-green-500 text-white rounded-full hover:bg-green-600 text-xs px-2"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeExistingImage(image._id)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* New image previews */}
                  {newImagePreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative">
                      <img
                        src={preview}
                        alt={`New ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-green-400"
                      />
                      <span className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-xs text-center py-0.5 rounded-b-lg">
                        New
                      </span>
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {totalImageCount < 5 && (
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

            {/* SEO */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">SEO (Optional)</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    {...register('metaTitle')}
                    className="input"
                    placeholder="SEO title for search engines"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    {...register('metaDescription')}
                    rows={2}
                    className="input"
                    placeholder="SEO description for search engines"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
                    <span className="text-sm font-medium text-gray-700">Active (Visible in store)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Stock Actions</h2>
              <p className="text-sm text-gray-600 mb-3">
                Set all quantity options to out of stock:
              </p>
              <button
                type="button"
                onClick={() => {
                  const currentOptions = quantityOptions.map(opt => ({
                    ...opt,
                    stock: 0,
                  }));
                  reset({ ...watch(), quantityOptions: currentOptions });
                }}
                className="btn-secondary w-full text-sm"
              >
                Mark All Out of Stock
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Saving...' : 'Save Changes'}
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
