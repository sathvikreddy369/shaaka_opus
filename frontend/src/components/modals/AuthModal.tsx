'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useAuthStore, useUIStore } from '@/store';
import { authAPI } from '@/lib/api';

interface PhoneFormData {
  phone: string;
}

interface OTPFormData {
  otp: string;
}

interface ProfileFormData {
  name: string;
  email?: string;
}

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode, authPhone, setAuthPhone } = useUIStore();
  const { login, completeProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const phoneForm = useForm<PhoneFormData>();
  const otpForm = useForm<OTPFormData>();
  const profileForm = useForm<ProfileFormData>();

  const handleSendOTP = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await authAPI.sendOTP(data.phone);
      setAuthPhone(data.phone);
      setAuthModalMode('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (data: OTPFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await login(authPhone, data.otp);
      const { user } = useAuthStore.getState();
      if (!user?.isProfileComplete) {
        setAuthModalMode('profile');
      } else {
        handleClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProfile = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await completeProfile(data);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    closeAuthModal();
    setError('');
    phoneForm.reset();
    otpForm.reset();
    profileForm.reset();
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError('');
    try {
      await authAPI.sendOTP(authPhone);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isAuthModalOpen} as={Fragment}>
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
                    {authModalMode === 'login' && 'Welcome to Shaaka'}
                    {authModalMode === 'otp' && 'Verify OTP'}
                    {authModalMode === 'profile' && 'Complete Profile'}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {authModalMode === 'login' && (
                  <form onSubmit={phoneForm.handleSubmit(handleSendOTP)}>
                    <p className="text-gray-600 mb-4">
                      Enter your phone number to login or create an account
                    </p>
                    <div className="mb-4">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600">
                          +91
                        </span>
                        <input
                          id="phone"
                          type="tel"
                          placeholder="9876543210"
                          maxLength={10}
                          {...phoneForm.register('phone', {
                            required: 'Phone number is required',
                            pattern: {
                              value: /^[6-9]\d{9}$/,
                              message: 'Enter a valid 10-digit phone number',
                            },
                          })}
                          className="input rounded-l-none flex-1"
                        />
                      </div>
                      {phoneForm.formState.errors.phone && (
                        <p className="text-red-500 text-sm mt-1">
                          {phoneForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full disabled:opacity-50"
                    >
                      {isLoading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </form>
                )}

                {authModalMode === 'otp' && (
                  <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)}>
                    <p className="text-gray-600 mb-4">
                      Enter the OTP sent to +91 {authPhone}
                    </p>
                    <div className="mb-4">
                      <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                        OTP
                      </label>
                      <input
                        id="otp"
                        type="text"
                        placeholder="Enter 4-digit OTP"
                        maxLength={4}
                        {...otpForm.register('otp', {
                          required: 'OTP is required',
                          pattern: {
                            value: /^\d{4}$/,
                            message: 'Enter a valid 4-digit OTP',
                          },
                        })}
                        className="input w-full text-center text-2xl tracking-widest"
                      />
                      {otpForm.formState.errors.otp && (
                        <p className="text-red-500 text-sm mt-1">
                          {otpForm.formState.errors.otp.message}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full disabled:opacity-50 mb-3"
                    >
                      {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => setAuthModalMode('login')}
                        className="text-primary-600 hover:underline"
                      >
                        Change number
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={isLoading}
                        className="text-primary-600 hover:underline disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </form>
                )}

                {authModalMode === 'profile' && (
                  <form onSubmit={profileForm.handleSubmit(handleCompleteProfile)}>
                    <p className="text-gray-600 mb-4">
                      Please complete your profile to continue
                    </p>
                    <div className="space-y-4 mb-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          id="name"
                          type="text"
                          placeholder="Enter your name"
                          {...profileForm.register('name', {
                            required: 'Name is required',
                            minLength: {
                              value: 2,
                              message: 'Name must be at least 2 characters',
                            },
                          })}
                          className="input w-full"
                        />
                        {profileForm.formState.errors.name && (
                          <p className="text-red-500 text-sm mt-1">
                            {profileForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email (Optional)
                        </label>
                        <input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          {...profileForm.register('email', {
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: 'Enter a valid email address',
                            },
                          })}
                          className="input w-full"
                        />
                        {profileForm.formState.errors.email && (
                          <p className="text-red-500 text-sm mt-1">
                            {profileForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : 'Continue'}
                    </button>
                  </form>
                )}

                <p className="text-xs text-gray-500 text-center mt-4">
                  By continuing, you agree to our{' '}
                  <a href="/terms" className="text-primary-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy-policy" className="text-primary-600 hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
