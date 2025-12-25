'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MapPinIcon,
  HomeIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { authAPI } from '@/lib/api';
import { useAuthStore, useUIStore } from '@/store';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface Address {
  _id: string;
  type: 'home' | 'office' | 'other';
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface AddressForm {
  type: 'home' | 'office' | 'other';
  name: string;
  phone: string;
  address: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressForm>();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    fetchAddresses();
  }, [isAuthenticated, router]);

  const fetchAddresses = async () => {
    try {
      const response = await authAPI.getProfile();
      setAddresses(response.data.user.addresses || []);
    } catch {
      addToast('Failed to load addresses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAddress(null);
    reset({
      type: 'home',
      name: user?.name || '',
      phone: user?.phone || '',
      address: '',
      landmark: '',
      city: '',
      state: 'Telangana',
      pincode: '',
      isDefault: addresses.length === 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (address: Address) => {
    setEditingAddress(address);
    reset({
      type: address.type,
      name: address.name,
      phone: address.phone,
      address: address.address,
      landmark: address.landmark || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: AddressForm) => {
    setSubmitting(true);
    try {
      if (editingAddress) {
        const response = await authAPI.updateAddress(editingAddress._id, data);
        setAddresses(response.data.user.addresses);
        setUser(response.data.user);
        addToast('Address updated successfully!', 'success');
      } else {
        const response = await authAPI.addAddress(data);
        setAddresses(response.data.user.addresses);
        setUser(response.data.user);
        addToast('Address added successfully!', 'success');
      }
      setModalOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save address';
      addToast(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await authAPI.deleteAddress(id);
      setAddresses(response.data.user.addresses);
      setUser(response.data.user);
      addToast('Address deleted successfully!', 'success');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete address';
      addToast(errorMessage, 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      const response = await authAPI.setDefaultAddress(id);
      setAddresses(response.data.user.addresses);
      setUser(response.data.user);
      addToast('Default address updated!', 'success');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update default address';
      addToast(errorMessage, 'error');
    }
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home':
        return HomeIcon;
      case 'office':
        return BuildingOfficeIcon;
      default:
        return MapPinIcon;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/account"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold">Saved Addresses</h1>
          </div>
          <button
            onClick={openCreateModal}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add New
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <MapPinIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No addresses saved
            </h2>
            <p className="text-gray-500 mb-6">
              Add your delivery address to checkout faster
            </p>
            <button onClick={openCreateModal} className="btn-primary">
              Add Address
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => {
              const Icon = getAddressIcon(address.type);
              return (
                <div
                  key={address._id}
                  className={`bg-white rounded-lg shadow p-6 ${
                    address.isDefault ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          address.isDefault ? 'bg-primary/10' : 'bg-gray-100'
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            address.isDefault ? 'text-primary' : 'text-gray-500'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold capitalize">{address.type}</span>
                          {address.isDefault && (
                            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="font-medium">{address.name}</p>
                        <p className="text-gray-600">{address.address}</p>
                        {address.landmark && (
                          <p className="text-gray-500 text-sm">Near: {address.landmark}</p>
                        )}
                        <p className="text-gray-600">
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">Phone: {address.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(address)}
                        className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(address._id)}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {!address.isDefault && (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={() => setAsDefault(address._id)}
                        className="text-sm text-primary hover:underline"
                      >
                        Set as default address
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Transition appear show={modalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setModalOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                    <Dialog.Title className="text-lg font-semibold mb-4">
                      {editingAddress ? 'Edit Address' : 'Add New Address'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      {/* Address Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address Type
                        </label>
                        <div className="flex gap-3">
                          {(['home', 'office', 'other'] as const).map((type) => (
                            <label
                              key={type}
                              className="flex-1 cursor-pointer"
                            >
                              <input
                                type="radio"
                                {...register('type')}
                                value={type}
                                className="sr-only peer"
                              />
                              <div className="text-center py-2 px-3 border rounded-lg peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition capitalize">
                                {type}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            {...register('name', { required: 'Name is required' })}
                            className="input"
                          />
                          {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone *
                          </label>
                          <input
                            type="tel"
                            {...register('phone', {
                              required: 'Phone is required',
                              pattern: {
                                value: /^[6-9]\d{9}$/,
                                message: 'Invalid phone number',
                              },
                            })}
                            className="input"
                          />
                          {errors.phone && (
                            <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address *
                        </label>
                        <textarea
                          {...register('address', { required: 'Address is required' })}
                          rows={2}
                          className="input"
                          placeholder="House/Flat No., Building, Street, Area"
                        />
                        {errors.address && (
                          <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Landmark
                        </label>
                        <input
                          type="text"
                          {...register('landmark')}
                          className="input"
                          placeholder="Nearby landmark (optional)"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City *
                          </label>
                          <input
                            type="text"
                            {...register('city', { required: 'City is required' })}
                            className="input"
                          />
                          {errors.city && (
                            <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pincode *
                          </label>
                          <input
                            type="text"
                            {...register('pincode', {
                              required: 'Pincode is required',
                              pattern: {
                                value: /^[1-9][0-9]{5}$/,
                                message: 'Invalid pincode',
                              },
                            })}
                            className="input"
                          />
                          {errors.pincode && (
                            <p className="text-red-500 text-xs mt-1">{errors.pincode.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                        <select {...register('state')} className="input">
                          <option value="Telangana">Telangana</option>
                          <option value="Andhra Pradesh">Andhra Pradesh</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          {...register('isDefault')}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                          Set as default delivery address
                        </span>
                      </label>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setModalOpen(false)}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="btn-primary flex-1"
                        >
                          {submitting
                            ? 'Saving...'
                            : editingAddress
                            ? 'Update'
                            : 'Add Address'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* Delete Confirmation */}
        <Transition appear show={!!deleteConfirm} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setDeleteConfirm(null)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                    <Dialog.Title className="text-lg font-semibold mb-2">
                      Delete Address
                    </Dialog.Title>
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to delete this address?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  );
}
