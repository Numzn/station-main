import { useState } from 'react';
import type { User } from '../../types/settings';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  PencilSquareIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface UsersTabProps {
  users: User[];
  isLoading: boolean;
  error: string | null;
  onUpdate: () => void;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  role: 'staff' | 'admin';
}

const DEFAULT_USER: UserFormData = {
  name: '',
  email: '',
  phone: '',
  role: 'staff'
};

export const UsersTab = ({ users, isLoading, error: serverError, onUpdate }: UsersTabProps) => {
  const [formState, setFormState] = useState({
    error: '',
    isProcessing: false,
    showDeleteConfirm: null as string | null,
    editingUser: null as { id: string; data: UserFormData } | null,
    formData: DEFAULT_USER
  });

  const validateUser = (user: UserFormData) => {
    if (!user.name.trim()) return 'Name is required';
    if (!user.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      return 'Valid email is required';
    }
    if (!user.phone.trim()) return 'Phone number is required';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateUser(formState.formData);
    if (error) {
      setFormState(prev => ({ ...prev, error }));
      return;
    }

    try {
      setFormState(prev => ({ ...prev, isProcessing: true, error: '' }));
      
      if (formState.editingUser) {
        const userRef = doc(db, 'users', formState.editingUser.id);
        await updateDoc(userRef, { 
          name: formState.formData.name,
          email: formState.formData.email,
          phone: formState.formData.phone,
          role: formState.formData.role
        });
      } else {
        const usersRef = collection(db, 'users');
        await addDoc(usersRef, formState.formData);
      }

      setFormState(prev => ({
        ...prev,
        formData: DEFAULT_USER,
        editingUser: null,
        isProcessing: false
      }));
      onUpdate();
    } catch (err) {
      console.error('Error saving user:', err);
      setFormState(prev => ({
        ...prev,
        error: 'Failed to save user',
        isProcessing: false
      }));
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      setFormState(prev => ({ ...prev, isProcessing: true, error: '' }));
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      setFormState(prev => ({
        ...prev,
        showDeleteConfirm: null,
        isProcessing: false
      }));
      onUpdate();
    } catch (err) {
      console.error('Error deleting user:', err);
      setFormState(prev => ({
        ...prev,
        error: 'Failed to delete user',
        isProcessing: false
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded w-full"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit User Form */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              {formState.editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            {formState.editingUser && (
              <button
                type="button"
                onClick={() => setFormState(prev => ({ ...prev, editingUser: null, formData: DEFAULT_USER }))}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formState.formData.name}
                onChange={e => setFormState(prev => ({
                  ...prev,
                  formData: { ...prev.formData, name: e.target.value }
                }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formState.formData.email}
                onChange={e => setFormState(prev => ({
                  ...prev,
                  formData: { ...prev.formData, email: e.target.value }
                }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formState.formData.phone}
                onChange={e => setFormState(prev => ({
                  ...prev,
                  formData: { ...prev.formData, phone: e.target.value }
                }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={formState.formData.role}
                onChange={e => setFormState(prev => ({
                  ...prev,
                  formData: { ...prev.formData, role: e.target.value as 'staff' | 'admin' }
                }))}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {(formState.error || serverError) && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {formState.error || serverError}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <button
              type="submit"
              disabled={formState.isProcessing}
              className="inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {formState.isProcessing
                ? 'Processing...'
                : formState.editingUser
                  ? 'Save Changes'
                  : 'Add User'
              }
            </button>
          </div>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {user.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.email}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.phone}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10' 
                        : 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setFormState(prev => ({
                          ...prev,
                          editingUser: { id: user.id!, data: { ...user } },
                          formData: { ...user }
                        }))}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setFormState(prev => ({ ...prev, showDeleteConfirm: user.id! }))}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {formState.showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Delete User
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this user? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    onClick={() => {
                      if (formState.showDeleteConfirm) {
                        handleDelete(formState.showDeleteConfirm);
                      }
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={() => setFormState(prev => ({ ...prev, showDeleteConfirm: null }))}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
