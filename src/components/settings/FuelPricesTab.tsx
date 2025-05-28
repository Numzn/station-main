import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { FuelPrices } from '../../types/settings';

interface FuelPricesTabProps {
  prices: FuelPrices;
  isLoading: boolean;
  error: string | null;
  onUpdate: (prices: FuelPrices) => void;
}

export const FuelPricesTab = ({ prices, isLoading, error, onUpdate }: FuelPricesTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localPrices, setLocalPrices] = useState(prices);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const pricesRef = doc(db, 'settings', 'fuelPrices');
      const updatedPrices = {
        ...localPrices,
        lastUpdated: new Date().toISOString()
      };
      await setDoc(pricesRef, updatedPrices);
      onUpdate(updatedPrices);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving fuel prices:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="max-w-2xl divide-y divide-gray-200">
          <div className="space-y-4 pb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
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
              <h3 className="text-base font-semibold leading-6 text-gray-900">Current Fuel Prices</h3>
              <p className="mt-1 text-sm text-gray-500">
                Update the current fuel prices for the station
              </p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Edit Prices
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Petrol Price (ZMW/L)
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  className={`
                    block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset 
                    ${isEditing 
                      ? 'ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600' 
                      : 'ring-gray-200 bg-gray-50'
                    }
                    sm:text-sm sm:leading-6
                  `}
                  value={localPrices.petrolPrice}
                  disabled={!isEditing}
                  onChange={e => setLocalPrices(prev => ({ ...prev, petrolPrice: parseFloat(e.target.value) }))}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
              <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Diesel Price (ZMW/L)
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  className={`
                    block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset 
                    ${isEditing 
                      ? 'ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600' 
                      : 'ring-gray-200 bg-gray-50'
                    }
                    sm:text-sm sm:leading-6
                  `}
                  value={localPrices.dieselPrice}
                  disabled={!isEditing}
                  onChange={e => setLocalPrices(prev => ({ ...prev, dieselPrice: parseFloat(e.target.value) }))}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            Last updated: {localPrices.lastUpdated ? new Date(localPrices.lastUpdated).toLocaleString() : 'N/A'}
          </div>
        </div>

        {isEditing && (
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-3 rounded-b-lg border-t border-gray-200">
            <button
              type="button"
              className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={() => { setIsEditing(false); setLocalPrices(prices); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
