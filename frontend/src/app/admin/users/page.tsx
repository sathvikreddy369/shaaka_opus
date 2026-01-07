'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  UserGroupIcon,
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
  role: 'USER' | 'ADMIN' | 'STAFF' | 'VENDOR';
  isActive: boolean;
  profileComplete: boolean;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  lastLogin?: string;
  vendorProfile?: {
    _id: string;
    businessName: string;
    status: string;
  };
  staffDetails?: {
    isActive: boolean;
    department: string;
  };
  addresses?: Array<{
    type: string;
    address: string;
    city: string;
    pincode: string;
    isDefault: boolean;
  }>;
}

const roleConfig: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  USER: { icon: UserIcon, color: 'text-gray-700', bgColor: 'bg-gray-100', label: 'Customer' },
  ADMIN: { icon: ShieldCheckIcon, color: 'text-purple-700', bgColor: 'bg-purple-100', label: 'Admin' },
  STAFF: { icon: WrenchScrewdriverIcon, color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Staff' },
  VENDOR: { icon: BuildingStorefrontIcon, color: 'text-green-700', bgColor: 'bg-green-100', label: 'Vendor' },
};

export default function AdminUsersPage() {
  const { addToast } = useUIStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    customers: 0,
    vendors: 0,
    staff: 0,
    admins: 0,
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers({
        page,
        limit: 20,
        role: roleFilter || undefined,
        search: search || undefined,
      });
      const data = response.data.data || response.data;
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
      
      // Calculate stats
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const getRoleConfig = (role: string) => {
    return roleConfig[role] || roleConfig.USER;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users Management</h1>
          <p className="text-gray-500">Manage all users including customers, vendors, and staff</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <UserIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.customers}</p>
              <p className="text-sm text-gray-500">Customers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BuildingStorefrontIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.vendors}</p>
              <p className="text-sm text-gray-500">Vendors</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <WrenchScrewdriverIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.staff}</p>
              <p className="text-sm text-gray-500">Staff</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
          </div>
        </div>
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
                className="input pl-10 w-full"
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
            <option value="VENDOR">Vendors</option>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
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
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const config = getRoleConfig(user.role);
                  const Icon = config.icon;
                  
                  return (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">
                              {user.name || 'Unnamed User'}
                            </div>
                            {user.vendorProfile && (
                              <div className="text-sm text-green-600">
                                {user.vendorProfile.businessName}
                              </div>
                            )}
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
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                        {user.role === 'VENDOR' && user.vendorProfile && (
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            user.vendorProfile.status === 'APPROVED' 
                              ? 'bg-green-100 text-green-700'
                              : user.vendorProfile.status === 'PENDING_APPROVAL'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.vendorProfile.status.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === 'USER' && (
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <ShoppingBagIcon className="w-4 h-4 text-gray-400" />
                              {user.totalOrders || 0} orders
                            </div>
                            <div className="text-gray-500">
                              {formatCurrency(user.totalSpent || 0)} spent
                            </div>
                          </div>
                        )}
                        {user.role === 'VENDOR' && user.vendorProfile && (
                          <Link 
                            href={`/admin/vendors/${user.vendorProfile._id}`}
                            className="text-sm text-green-600 hover:underline"
                          >
                            View Vendor Profile →
                          </Link>
                        )}
                        {user.role === 'STAFF' && (
                          <span className={`text-sm ${user.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>
                            {user.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        )}
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
                  );
                })
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
                        User Details
                      </Dialog.Title>

                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          {(() => {
                            const config = getRoleConfig(selectedUser.role);
                            const Icon = config.icon;
                            return (
                              <>
                                <div className={`w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center`}>
                                  <Icon className={`w-8 h-8 ${config.color}`} />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold">
                                    {selectedUser.name || 'Unnamed User'}
                                  </h3>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.color}`}>
                                    <Icon className="w-3 h-3" />
                                    {config.label}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
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
                          {selectedUser.role === 'USER' && (
                            <>
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
                            </>
                          )}
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

                        {selectedUser.vendorProfile && (
                          <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-medium text-green-800 mb-2">Vendor Profile</h4>
                            <p className="text-sm text-green-700">
                              Business: {selectedUser.vendorProfile.businessName}
                            </p>
                            <p className="text-sm text-green-700">
                              Status: {selectedUser.vendorProfile.status}
                            </p>
                            <Link
                              href={`/admin/vendors/${selectedUser.vendorProfile._id}`}
                              className="text-sm text-green-600 hover:underline mt-2 inline-block"
                            >
                              View Full Vendor Profile →
                            </Link>
                          </div>
                        )}

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
