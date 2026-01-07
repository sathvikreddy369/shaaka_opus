'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  UserIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface Staff {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  staffDetails: {
    department: string;
    permissions: string[];
    isActive: boolean;
    createdAt: string;
  };
}

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    department: '',
    permissions: [] as string[],
  });
  const [createLoading, setCreateLoading] = useState(false);

  const allPermissions = [
    'MANAGE_ORDERS',
    'MANAGE_PRODUCTS',
    'MANAGE_INVENTORY',
    'VIEW_ANALYTICS',
    'MANAGE_CUSTOMERS',
  ];

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getStaffList();
      setStaffList(response.data.data.staff);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleToggleActive = async (staffId: string) => {
    try {
      await adminAPI.toggleStaffActive(staffId);
      fetchStaff();
    } catch (error) {
      console.error('Failed to toggle staff status:', error);
      alert('Failed to update staff status');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.phone) {
      alert('Name and phone are required');
      return;
    }

    setCreateLoading(true);
    try {
      await adminAPI.createStaff(createForm);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        phone: '',
        email: '',
        department: '',
        permissions: [],
      });
      fetchStaff();
    } catch (error: any) {
      console.error('Failed to create staff:', error);
      alert(error.response?.data?.message || 'Failed to create staff');
    } finally {
      setCreateLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const filteredStaff = staffList.filter((staff) => {
    if (!search) return true;
    return (
      staff.name.toLowerCase().includes(search.toLowerCase()) ||
      staff.phone.includes(search) ||
      staff.staffDetails?.department?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage staff accounts and permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or department..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <UserIcon className="mx-auto mb-4 text-gray-400 w-12 h-12" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Staff Found</h2>
          <p className="text-gray-600 mb-4">
            {search ? 'No staff match your search criteria' : 'Add staff members to get started'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <PlusIcon className="w-5 h-5" />
              Add Staff
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Department
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Permissions
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStaff.map((staff) => (
                  <tr key={staff._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{staff.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-gray-900">{staff.phone}</p>
                      {staff.email && (
                        <p className="text-sm text-gray-500">{staff.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-900">
                        {staff.staffDetails?.department || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          staff.staffDetails?.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {staff.staffDetails?.isActive ? (
                          <>
                            <CheckCircleIcon className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="w-3 h-3" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {staff.staffDetails?.permissions?.slice(0, 2).map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {perm.replace('MANAGE_', '').replace('VIEW_', '')}
                          </span>
                        ))}
                        {(staff.staffDetails?.permissions?.length || 0) > 2 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            +{staff.staffDetails.permissions.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleToggleActive(staff._id)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          staff.staffDetails?.isActive
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {staff.staffDetails?.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Add New Staff</h2>
            </div>
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 rounded-l-lg text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                      })
                    }
                    className="flex-1 px-4 py-2 border rounded-r-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  placeholder="e.g., Operations, Fulfillment"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {allPermissions.map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={createForm.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">
                        {permission.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
