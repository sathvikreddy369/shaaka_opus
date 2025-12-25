'use client';

import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '@/lib/api';
import { useUIStore } from '@/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface User {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  profileComplete: boolean;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  lastLogin?: string;
  addresses?: Array<{
    type: string;
    address: string;
    city: string;
    pincode: string;
    isDefault: boolean;
  }>;
}

export default function AdminCustomersPage() {
  const { addToast } = useUIStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers({
        page,
        limit: 20,
        role: roleFilter || undefined,
        search: search || undefined,
      });
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.pages);
    } catch {
      addToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: 'USER' | 'ADMIN') => {
    setUpdatingRole(userId);
    try {
      await adminAPI.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      addToast('User role updated successfully', 'success');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      addToast(errorMessage, 'error');
    } finally {
      setUpdatingRole(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
          </form>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="input w-auto"
          >
            <option value="">All Roles</option>
            <option value="USER">Customers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">
                            {user.name || 'Unnamed User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.profileComplete ? 'Complete' : 'Incomplete'} profile
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-900">
                          <PhoneIcon className="w-4 h-4 text-gray-400" />
                          {user.phone}
                        </div>
                        {user.email && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                            {user.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm">
                        <ShoppingBagIcon className="w-4 h-4 text-gray-400" />
                        {user.totalOrders || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(user.totalSpent || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user._id, e.target.value as 'USER' | 'ADMIN')
                        }
                        disabled={updatingRole === user._id}
                        className={`text-sm border rounded px-2 py-1 ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-50 border-purple-200 text-purple-700'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <option value="USER">Customer</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm py-1"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-sm py-1"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <Transition appear show={!!selectedUser} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSelectedUser(null)}>
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                  {selectedUser && (
                    <>
                      <Dialog.Title className="text-lg font-semibold mb-4">
                        Customer Details
                      </Dialog.Title>

                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">
                              {selectedUser.name || 'Unnamed User'}
                            </h3>
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                                selectedUser.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {selectedUser.role}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-b py-4">
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium">{selectedUser.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{selectedUser.email || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Orders</p>
                            <p className="font-medium">{selectedUser.totalOrders || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Spent</p>
                            <p className="font-medium">
                              {formatCurrency(selectedUser.totalSpent || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Member Since</p>
                            <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Last Login</p>
                            <p className="font-medium">
                              {selectedUser.lastLogin
                                ? formatDate(selectedUser.lastLogin)
                                : 'Never'}
                            </p>
                          </div>
                        </div>

                        {selectedUser.addresses && selectedUser.addresses.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Addresses</h4>
                            <div className="space-y-2">
                              {selectedUser.addresses.map((addr, i) => (
                                <div
                                  key={i}
                                  className="bg-gray-50 p-3 rounded-lg text-sm"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium capitalize">{addr.type}</span>
                                    {addr.isDefault && (
                                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600">
                                    {addr.address}, {addr.city} - {addr.pincode}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="btn-secondary w-full"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
