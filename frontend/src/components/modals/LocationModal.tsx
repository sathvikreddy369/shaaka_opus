'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, MapPinIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore, useUIStore } from '@/store';

export default function LocationModal() {
  const { isLocationModalOpen, closeLocationModal, addToast } = useUIStore();
  const { setLocation, isLocationSet, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser');
      setLocationStatus('error');
      return;
    }

    setIsLoading(true);
    setLocationStatus('checking');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        if (!isAuthenticated) {
          // For non-authenticated users, just check if location is valid
          // Hyderabad coordinates: 17.385, 78.4867, 25km radius
          const distance = getDistanceFromLatLonInKm(latitude, longitude, 17.385, 78.4867);
          if (distance <= 25) {
            setLocationStatus('success');
            addToast({
              type: 'success',
              message: 'Great! We deliver to your location.',
            });
          } else {
            setLocationStatus('error');
            setErrorMessage(`Sorry, we currently don't deliver to your location. We deliver within 25km of Hyderabad.`);
          }
          setIsLoading(false);
          return;
        }

        try {
          const isWithinArea = await setLocation(latitude, longitude);
          if (isWithinArea) {
            setLocationStatus('success');
            addToast({
              type: 'success',
              message: 'Great! We deliver to your location.',
            });
            setTimeout(() => {
              closeLocationModal();
            }, 1500);
          } else {
            setLocationStatus('error');
            setErrorMessage(`Sorry, we currently don't deliver to your location. We deliver within 25km of Hyderabad.`);
          }
        } catch (err) {
          setLocationStatus('error');
          setErrorMessage('Failed to verify location. Please try again.');
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        setIsLoading(false);
        setLocationStatus('error');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage('Please allow location access to check delivery availability.');
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setErrorMessage('Location request timed out. Please try again.');
            break;
          default:
            setErrorMessage('An unknown error occurred.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClose = () => {
    closeLocationModal();
    setLocationStatus('idle');
    setErrorMessage('');
  };

  return (
    <Transition appear show={isLocationModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold">
                    Check Delivery Availability
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="text-center">
                  {locationStatus === 'idle' && (
                    <>
                      <div className="w-20 h-20 mx-auto bg-primary-50 rounded-full flex items-center justify-center mb-4">
                        <MapPinIcon className="h-10 w-10 text-primary-500" />
                      </div>
                      <p className="text-gray-600 mb-6">
                        We need your location to check if we deliver to your area.
                        We currently deliver within 25km of Hyderabad.
                      </p>
                      <button
                        onClick={handleGetLocation}
                        disabled={isLoading}
                        className="btn-primary w-full disabled:opacity-50"
                      >
                        {isLoading ? 'Checking...' : 'Allow Location Access'}
                      </button>
                    </>
                  )}

                  {locationStatus === 'checking' && (
                    <>
                      <div className="w-20 h-20 mx-auto bg-primary-50 rounded-full flex items-center justify-center mb-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                      </div>
                      <p className="text-gray-600">
                        Checking your location...
                      </p>
                    </>
                  )}

                  {locationStatus === 'success' && (
                    <>
                      <div className="w-20 h-20 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircleIcon className="h-10 w-10 text-green-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-green-600 mb-2">
                        Great news!
                      </h3>
                      <p className="text-gray-600 mb-6">
                        We deliver to your location. Enjoy free delivery on orders above ₹500!
                      </p>
                      <button
                        onClick={handleClose}
                        className="btn-primary w-full"
                      >
                        Start Shopping
                      </button>
                    </>
                  )}

                  {locationStatus === 'error' && (
                    <>
                      <div className="w-20 h-20 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
                        <XCircleIcon className="h-10 w-10 text-red-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-red-600 mb-2">
                        Oops!
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {errorMessage}
                      </p>
                      <button
                        onClick={() => setLocationStatus('idle')}
                        className="btn-secondary w-full"
                      >
                        Try Again
                      </button>
                    </>
                  )}
                </div>

                <p className="text-xs text-gray-500 text-center mt-6">
                  Your location data is only used to verify delivery availability
                  and is not stored or shared with third parties.
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Helper function to calculate distance between two coordinates
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
