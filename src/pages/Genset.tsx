import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { GensetReading } from '../firebase/genset';
import { saveGensetReading, getLatestGensetReadings } from '../firebase/genset';
import Skeleton from '../components/LoadingSkeleton';
import { ExclamationTriangleIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const Genset = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentRunningHours, setCurrentRunningHours] = useState<string>('');
  const [lastReading, setLastReading] = useState<GensetReading | null>(null);
  const [recentReadings, setRecentReadings] = useState<GensetReading[]>([]);

  // Load historical data
  useEffect(() => {
    const loadReadings = async () => {
      try {
        setLoading(true);
        const readings = await getLatestGensetReadings(10);
        setRecentReadings(readings);
        if (readings.length > 0) {
          setLastReading(readings[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadReadings();
  }, []);

  // Calculate summary values for table
  const totalFuelThisMonth = recentReadings
    .filter(r => new Date(r.timestamp).getMonth() === new Date().getMonth())
    .reduce((sum, r) => sum + (r.fuelAdded || 0), 0);

  // Calculate next running time for refuel (show above the form)
  let nextRefuelRunningTime = '--';
  if (lastReading) {
    let hoursToAdd = 6; // default
    if (recentReadings.length > 1) {
      const lastInterval = lastReading.hoursSinceLastRefuel;
      hoursToAdd = lastInterval < 6 ? 7 : 6;
    }
    nextRefuelRunningTime = (lastReading.runningHours + hoursToAdd).toFixed(1);
  }

  const handleSubmitReading = async () => {
    if (!currentRunningHours || !user) return;

    try {
      const currentHours = parseFloat(currentRunningHours);
      if (isNaN(currentHours) || (lastReading && currentHours <= lastReading.runningHours)) {
        return;
      }

      const hoursSinceLastRefuel = lastReading 
        ? currentHours - lastReading.runningHours 
        : 0;

      const fuelConsumptionRate = hoursSinceLastRefuel > 0 
        ? 20 / hoursSinceLastRefuel 
        : 0;

      const reading = {
        runningHours: currentHours,
        hoursSinceLastRefuel,
        fuelAdded: 20,
        fuelConsumptionRate,
        operator: user.email || 'unknown',
        timestamp: new Date().toISOString()
      };

      await saveGensetReading(reading);
      
      // Refresh data after save
      const newReadings = await getLatestGensetReadings(10);
      setRecentReadings(newReadings);
      setLastReading(newReadings[0]);
      setCurrentRunningHours('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto space-y-6 px-2 py-6">
        {/* Summary Card Loading */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-3 mb-2">
          <div className="flex flex-col sm:flex-row sm:space-x-8 w-full justify-between items-center">
            <Skeleton.Card lines={2} />
            <Skeleton.Card lines={2} />
          </div>
        </div>

        {/* Input Form Loading */}
        <div className="bg-white shadow rounded-lg p-6">
          <Skeleton.Base width="w-1/3" height="h-8" className="mb-4" />
          <div className="space-y-4">
            <Skeleton.Card lines={3} />
          </div>
          <div className="mt-4">
            <Skeleton.Base height="h-10" />
          </div>
        </div>

        {/* Recent Readings Loading */}
        <div className="bg-white shadow rounded-lg p-6">
          <Skeleton.Base width="w-1/2" height="h-8" className="mb-4" />
          <div className="overflow-x-auto">
            <Skeleton.Table rows={5} columns={6} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-8">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Last Refuel At</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {lastReading ? lastReading.runningHours.toFixed(2) : '--'} hrs
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Next Refuel At</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {nextRefuelRunningTime} hrs
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="bg-blue-50 shadow-sm ring-1 ring-blue-900/5 rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Instructions</h3>
          <ol className="list-decimal list-inside text-sm text-blue-900 space-y-2">
            <li>Check the <b>Next Refuel At</b> value above</li>
            <li>When the genset hour meter reaches or exceeds this value, refuel with 20L</li>
            <li>Record the new reading using the form below</li>
          </ol>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-base font-semibold leading-7 text-gray-900 mb-6">Record New Reading</h2>
          <form onSubmit={e => { e.preventDefault(); handleSubmitReading(); }} autoComplete="off">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Current Hour Meter Reading
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={currentRunningHours}
                    onChange={e => {
                      const val = e.target.value.replace(',', '.');
                      setCurrentRunningHours(val);
                    }}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="e.g., 6633.99"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                  />
                </div>
                {lastReading && currentRunningHours && parseFloat(currentRunningHours) <= lastReading.runningHours && (
                  <div className="mt-2 flex items-center gap-x-2 text-sm text-red-600">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span>Reading must be greater than {lastReading.runningHours.toFixed(2)} hrs</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={
                    !currentRunningHours ||
                    !!(lastReading && (isNaN(parseFloat(currentRunningHours)) || parseFloat(currentRunningHours) <= lastReading.runningHours))
                  }
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Record Reading
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Recent Readings Table */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h2 className="text-base font-semibold leading-7 text-gray-900">Recent Readings</h2>
              <p className="mt-1 text-sm text-gray-500">
                A list of all genset readings including running hours and fuel consumption.
              </p>
            </div>
            <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
              <div className="text-sm text-blue-700">
                Total Fuel This Month: <span className="font-semibold">{totalFuelThisMonth} L</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flow-root">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Date/Time</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Running Hours</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Hours Since Last</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fuel Added</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fuel Rate (L/hr)</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentReadings.map((reading, idx) => {
                      const prev = recentReadings[idx + 1];
                      const hoursSincePrev = prev ? (reading.runningHours - prev.runningHours).toFixed(2) : '--';
                      return (
                        <tr key={idx}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-0">
                            {new Date(reading.timestamp).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-blue-700">
                            {reading.runningHours.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{hoursSincePrev}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{reading.fuelAdded} L</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {reading.fuelConsumptionRate ? reading.fuelConsumptionRate.toFixed(2) : '--'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{reading.operator}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden space-y-4 px-4 py-5">
          {recentReadings.map((reading, idx) => {
            const prev = recentReadings[idx + 1];
            const hoursSincePrev = prev ? (reading.runningHours - prev.runningHours).toFixed(2) : '--';
            return (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-sm font-medium text-gray-500">
                    {new Date(reading.timestamp).toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-blue-700">
                    {reading.runningHours.toFixed(2)} hrs
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Hours Since Last:</span>
                    <span className="ml-1 font-medium">{hoursSincePrev}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fuel Added:</span>
                    <span className="ml-1 font-medium">{reading.fuelAdded} L</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fuel Rate:</span>
                    <span className="ml-1 font-medium">
                      {reading.fuelConsumptionRate ? reading.fuelConsumptionRate.toFixed(2) : '--'} L/hr
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Operator:</span>
                    <span className="ml-1 font-medium">{reading.operator}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Genset;