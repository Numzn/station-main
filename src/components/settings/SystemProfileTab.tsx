import { useState } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SystemProfile } from '../../types/settings';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SystemProfileTabProps {
  profile: SystemProfile;
  isLoading: boolean;
  error: string | null;
  onUpdate: (profile: SystemProfile) => void;
}

export const SystemProfileTab = ({ profile, isLoading, error, onUpdate }: SystemProfileTabProps) => {
  const [editState, setEditState] = useState({
    isEditing: false,
    isSaving: false,
    localProfile: profile
  });

  const handleSave = async () => {
    if (!editState.localProfile.name.trim()) {
      return;
    }

    try {
      setEditState(prev => ({ ...prev, isSaving: true }));
      const profileRef = doc(db, 'settings', 'systemProfile');
      const updatedProfile = {
        ...editState.localProfile,
        updatedAt: Timestamp.now()
      };
      await setDoc(profileRef, updatedProfile);
      onUpdate(updatedProfile);
      setEditState(prev => ({ ...prev, isEditing: false, isSaving: false }));
    } catch (err) {
      console.error('Error saving system profile:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="max-w-2xl divide-y divide-gray-200">
          <div className="space-y-4 pb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <div className="px-4 py-6 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold leading-6 text-gray-900">System Profile</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure your station's system information
              </p>
            </div>
            {!editState.isEditing && (
              <button
                type="button"
                onClick={() => setEditState(prev => ({ ...prev, isEditing: true }))}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Station Name
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  className={`
                    block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset 
                    ${editState.isEditing 
                      ? 'ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600' 
                      : 'ring-gray-200 bg-gray-50'
                    }
                    sm:text-sm sm:leading-6
                  `}
                  value={editState.localProfile.name}
                  onChange={e => setEditState(prev => ({
                    ...prev,
                    localProfile: { ...prev.localProfile, name: e.target.value }
                  }))}
                  disabled={!editState.isEditing}
                />
                {editState.isEditing && editState.localProfile.name.trim() === '' && (
                  <p className="mt-1 text-sm text-red-500">Station name is required</p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error saving profile</h3>
                    <p className="text-sm text-red-700 mt-2">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {editState.isEditing && (
              <div className="mt-6 flex items-center justify-end gap-x-4">
                <button
                  type="button"
                  onClick={() => setEditState(prev => ({ 
                    ...prev, 
                    isEditing: false,
                    localProfile: profile
                  }))}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={editState.isSaving || !editState.localProfile.name.trim()}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editState.isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        Last updated: {profile.updatedAt ? new Date(profile.updatedAt.toDate()).toLocaleString() : 'Never'}
      </div>
    </div>
  );
};
