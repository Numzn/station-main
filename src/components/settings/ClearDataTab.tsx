import { useState } from 'react';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ClearDataTabProps {
  isLoading: boolean;
  error: string | null;
}

const DATA_COLLECTIONS = [
  { id: 'readings', name: 'Tank Readings' },
  { id: 'tankRefills', name: 'Tank Refills' },
  { id: 'gensetLogs', name: 'Genset Logs' },
  { id: 'gensetFuel', name: 'Genset Fuel Records' },
  { id: 'gensetRuntime', name: 'Genset Runtime Records' },
  { id: 'gensetReadings', name: 'Genset Readings' }
];

export const ClearDataTab = ({ isLoading }: ClearDataTabProps) => {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [clearStatus, setClearStatus] = useState<{ success?: boolean; message?: string }>({});

  const handleClearData = async () => {
    try {
      setIsClearing(true);
      setClearStatus({});

      const deletePromises: Promise<void>[] = [];
      for (const col of DATA_COLLECTIONS) {
        const ref = collection(db, col.id);
        const snap = await getDocs(ref);
        for (const docSnap of snap.docs) {
          deletePromises.push(deleteDoc(docSnap.ref));
        }
      }
      await Promise.all(deletePromises);

      setShowConfirmDialog(false);
      setClearStatus({
        success: true,
        message: 'All station data collections have been cleared successfully.'
      });

      // Add a slight delay before refreshing to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Error clearing data:', err);
      setClearStatus({
        success: false,
        message: 'Failed to clear data. Please try again.'
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
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
              <h3 className="text-base font-semibold leading-6 text-gray-900">Clear Station Data</h3>
              <p className="mt-1 text-sm text-gray-500">
                Permanently delete data from selected collections
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Warning: Destructive Action</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>This action will permanently delete all data from the following collections:</p>
                    <ul className="list-disc list-inside mt-1">
                      {DATA_COLLECTIONS.map(col => (
                        <li key={col.id}>{col.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {clearStatus.message && (
            <div className={`rounded-md p-4 mb-6 ${clearStatus.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-sm ${clearStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                {clearStatus.message}
              </p>
            </div>
          )}

          <button
            className="inline-flex items-center justify-center gap-x-2 rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isClearing}
          >
            <TrashIcon className="h-5 w-5" aria-hidden="true" />
            {isClearing ? 'Clearing Data...' : 'Clear All Data'}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-x-3 text-red-600 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Confirm Data Deletion</h3>
            </div>
            
            <p className="mb-6 text-gray-600">
              Are you absolutely sure? This action will permanently delete all station data and cannot be undone.
            </p>

            <div className="flex justify-end gap-x-3">
              <button
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isClearing}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                onClick={handleClearData}
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Clearing...
                  </>
                ) : (
                  'Yes, Delete All Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
