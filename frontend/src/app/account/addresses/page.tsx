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
  label: 'Home' | 'Office' | 'Other';
  houseNumber: string;
  street: string;
  colony: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

interface AddressForm {
  label: 'Home' | 'Office' | 'Other';
  houseNumber: string;
  street: string;
  colony: string;
  landmark: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export default function AddressesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressForm>();

  const watchedLat = watch('latitude');
  const watchedLng = watch('longitude');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    fetchAddresses();
  }, [isAuthenticated, router]);

  const fetchAddresses = async () => {
    try {
      const response = await authAPI.getAddresses();
      const data = response.data.data || response.data;
      setAddresses(data.addresses || []);
    } catch {
      addToast({ type: 'error', message: 'Failed to load addresses' });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      addToast({ type: 'error', message: 'Geolocation is not supported by your browser' });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude);
        setValue('longitude', position.coords.longitude);
        setGettingLocation(false);
        addToast({ type: 'success', message: 'Location detected successfully!' });
      },
      (error) => {
        setGettingLocation(false);
        let message = 'Failed to get location';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Please allow location access';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location information unavailable';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out';
        }
        addToast({ type: 'error', message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const openCreateModal = () => {
    setEditingAddress(null);
    reset({
      label: 'Home',
      houseNumber: '',
      street: '',
      colony: '',
      landmark: '',
      latitude: 17.385,
      longitude: 78.4867,
      isDefault: addresses.length === 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (address: Address) => {
    setEditingAddress(address);
    reset({
      label: address.label,
      houseNumber: address.houseNumber,
      street: address.street,
      colony: address.colony,
      landmark: address.landmark || '',
      latitude: address.latitude,
      longitude: address.longitude,
      isDefault: address.isDefault,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: AddressForm) => {
    setSubmitting(true);
    try {
      if (editingAddress) {
        const response = await authAPI.updateAddress(editingAddress._id, data);
        const resData = response.data.data || response.data;
        setAddresses(resData.addresses || []);
        addToast({ type: 'success', message: 'Address updated successfully!' });
      } else {
        const response = await authAPI.addAddress(data);
        const resData = response.data.data || response.data;
        setAddresses(resData.addresses || []);
        addToast({ type: 'success', message: 'Address added successfully!' });
      }
      setModalOpen(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save address';
      addToast({ type: 'error', message: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await authAPI.deleteAddress(id);
      const resData = response.data.data || response.data;
      setAddresses(resData.addresses || []);
      addToast({ type: 'success', message: 'Address deleted successfully!' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete address';
      addToast({ type: 'error', message: errorMessage });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      const response = await authAPI.setDefaultAddress(id);
      const resData = response.data.data || response.data;
      setAddresses(resData.addresses || []);
      addToast({ type: 'success', message: 'Default address updated!' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update default address';
      addToast({ type: 'error', message: errorMessage });
    }
  };

  const getAddressIcon = (label: string) => {
    switch (label) {
      case 'Home':
        return HomeIcon;
      case 'Office':
        return BuildingOfficeIcon;
      default:
        return MapPinIcon;
    }
  };

  const formatAddress = (address: Address) => {
    const parts = [address.houseNumber, address.street, address.colony].filter(Boolean);
    return parts.join(', ');
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
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
              const Icon = getAddressIcon(address.label);
              return (
                <div
                  key={address._id}
                  className={`bg-white rounded-lg shadow p-6 ${
                    address.isDefault ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          address.isDefault ? 'bg-primary-50' : 'bg-gray-100'
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            address.isDefault ? 'text-primary-600' : 'text-gray-500'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{address.label}</span>
                          {address.isDefault && (
                            <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700">{formatAddress(address)}</p>
                        {address.landmark && (
                          <p className="text-gray-500 text-sm">Near: {address.landmark}</p>
                        )}
                        <p className="text-gray-400 text-xs mt-1">
                          📍 {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(address)}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(address._id)}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {!address.isDefault && (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={() => setAsDefault(address._id)}
                        className="text-sm text-primary-600 hover:underline"
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
              <div className="fixed inset-0 bg-black/50" />
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
                  <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white p-6 shadow-xl transition-all">
                    <Dialog.Title className="text-xl font-semibold text-gray-900 mb-4">
                      {editingAddress ? 'Edit Address' : 'Add New Address'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      {/* Address Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address Type
                        </label>
                        <div className="flex gap-3">
                          {(['Home', 'Office', 'Other'] as const).map((type) => (
                            <label key={type} className="flex-1 cursor-pointer">
                              <input
                                type="radio"
                                {...register('label')}
                                value={type}
                                className="sr-only peer"
                              />
                              <div className="text-center py-2 px-3 border rounded-lg peer-checked:border-primary-500 peer-checked:bg-primary-50 peer-checked:text-primary-700 transition">
                                {type}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Delivery Location *
                          </label>
                          <button
                            type="button"
                            onClick={getCurrentLocation}
                            disabled={gettingLocation}
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <MapPinIcon className="w-4 h-4" />
                            {gettingLocation ? 'Getting location...' : 'Use current location'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                            <input
                              type="number"
                              step="any"
                              {...register('latitude', {
                                required: 'Latitude is required',
                                min: { value: -90, message: 'Invalid latitude' },
                                max: { value: 90, message: 'Invalid latitude' },
                              })}
                              className="input text-sm"
                              placeholder="17.385"
                            />
                            {errors.latitude && (
                              <p className="text-red-500 text-xs mt-1">{errors.latitude.message}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                            <input
                              type="number"
                              step="any"
                              {...register('longitude', {
                                required: 'Longitude is required',
                                min: { value: -180, message: 'Invalid longitude' },
                                max: { value: 180, message: 'Invalid longitude' },
                              })}
                              className="input text-sm"
                              placeholder="78.4867"
                            />
                            {errors.longitude && (
                              <p className="text-red-500 text-xs mt-1">{errors.longitude.message}</p>
                            )}
                          </div>
                        </div>
                        {watchedLat && watchedLng && (
                          <p className="text-xs text-gray-500 mt-2">
                            📍 {Number(watchedLat).toFixed(4)}, {Number(watchedLng).toFixed(4)}
                          </p>
                        )}
                      </div>

                      {/* House Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          House/Flat/Apartment No. *
                        </label>
                        <input
                          type="text"
                          {...register('houseNumber', { required: 'House number is required' })}
                          className="input"
                          placeholder="e.g., Flat 101, Tower A"
                        />
                        {errors.houseNumber && (
                          <p className="text-red-500 text-xs mt-1">{errors.houseNumber.message}</p>
                        )}
                      </div>

                      {/* Street */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Street/Road *
                        </label>
                        <input
                          type="text"
                          {...register('street', { required: 'Street is required' })}
                          className="input"
                          placeholder="e.g., Main Road"
                        />
                        {errors.street && (
                          <p className="text-red-500 text-xs mt-1">{errors.street.message}</p>
                        )}
                      </div>

                      {/* Colony */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Area/Colony/Locality *
                        </label>
                        <input
                          type="text"
                          {...register('colony', { required: 'Colony/Area is required' })}
                          className="input"
                          placeholder="e.g., Banjara Hills"
                        />
                        {errors.colony && (
                          <p className="text-red-500 text-xs mt-1">{errors.colony.message}</p>
                        )}
                      </div>

                      {/* Landmark */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          {...register('landmark')}
                          className="input"
                          placeholder="e.g., Near City Center Mall"
                        />
                      </div>

                      {/* Default checkbox */}
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          {...register('isDefault')}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          Set as default delivery address
                        </span>
                      </label>

                      <div className="flex gap-3 pt-4">
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
                            ? 'Update Address'
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
              <div className="fixed inset-0 bg-black/50" />
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
                  <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-xl bg-white p-6 shadow-xl transition-all">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                      Delete Address
                    </Dialog.Title>
                    <p className="text-gray-600 mb-6">
                      Are you sure you want to delete this address? This action cannot be undone.
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
