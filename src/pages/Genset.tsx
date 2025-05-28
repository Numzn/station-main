import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { GensetReading } from '../firebase/genset';
import { saveGensetReading, getLatestGensetReadings } from '../firebase/genset';

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 px-2 py-6">
      {/* Summary Card: Last & Next Refuel */}
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-3 mb-2 flex flex-col items-center">
        <div className="flex flex-col sm:flex-row sm:space-x-8 w-full justify-between items-center">
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs text-gray-700">Last Refuel At</span>
            <span className="text-lg font-bold text-blue-800">{lastReading ? lastReading.runningHours.toFixed(2) : '--'} hrs</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs text-gray-700">Next Refuel At</span>
            <span className="text-lg font-bold text-yellow-800">{nextRefuelRunningTime} hrs</span>
          </div>
        </div>
      </div>

      {/* Step-by-step instructions */}
      <div className="bg-gray-100 border-l-4 border-gray-400 rounded p-3 mb-2">
        <ol className="list-decimal list-inside text-gray-700 text-xs sm:text-sm space-y-1">
          <li>Check the <b>Next Refuel At</b> value above.</li>
          <li>When the genset hour meter reaches or exceeds this value, refuel with 20L and record the new reading below.</li>
          <li>Only enter the number shown on the genset hour meter (decimals allowed).</li>
        </ol>
      </div>

      <h2 className="text-xl font-bold text-center text-blue-800 mb-2">Genset Refueling Log</h2>
      <form
        className="bg-white shadow rounded-lg p-4 space-y-4"
        onSubmit={e => { e.preventDefault(); handleSubmitReading(); }}
        autoComplete="off"
      >
        <label className="block text-base font-medium text-gray-700 mb-1 text-center">Current Hour Meter Reading</label>
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          value={currentRunningHours}
          onChange={e => {
            const val = e.target.value.replace(',', '.');
            setCurrentRunningHours(val);
          }}
          className="focus:ring-blue-500 focus:border-blue-500 block w-full text-lg border-gray-300 rounded-md py-3 px-4 text-center"
          placeholder="e.g., 6633.99"
          style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
        />
        {/* Validation feedback */}
        {lastReading && currentRunningHours && parseFloat(currentRunningHours) <= lastReading.runningHours && (
          <div className="text-xs text-red-600 text-center">Reading must be greater than last refuel ({lastReading.runningHours.toFixed(2)} hrs)</div>
        )}
        <button
          type="submit"
          disabled={
            !currentRunningHours ||
            !!(lastReading && (isNaN(parseFloat(currentRunningHours)) || parseFloat(currentRunningHours) <= lastReading.runningHours))
          }
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition-all"
        >
          Record Reading
        </button>
      </form>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Recent Refueling Log</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Running Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Since Last</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Added</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Rate (L/hr)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentReadings.map((reading, idx) => {
                const prev = recentReadings[idx + 1];
                const hoursSincePrev = prev ? (reading.runningHours - prev.runningHours).toFixed(2) : '--';
                return (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(reading.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-800 font-bold">{reading.runningHours.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{hoursSincePrev}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{reading.fuelAdded} L</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{reading.fuelConsumptionRate ? reading.fuelConsumptionRate.toFixed(2) : '--'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{reading.operator}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile stacked cards remain below for small screens */}
        <div className="sm:hidden space-y-3 mt-4">
          {recentReadings.map((reading, idx) => {
            const prev = recentReadings[idx + 1];
            const hoursSincePrev = prev ? (reading.runningHours - prev.runningHours).toFixed(2) : '--';
            return (
              <div key={idx} className="border rounded-lg p-2 flex flex-col bg-gray-50">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-600">Date/Time:</span>
                  <span className="text-gray-900">{new Date(reading.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-600">Running Hours:</span>
                  <span className="text-blue-800 font-bold">{reading.runningHours.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-600">Hours Since Last:</span>
                  <span className="text-gray-900">{hoursSincePrev}</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-600">Fuel Added:</span>
                  <span className="text-gray-900">{reading.fuelAdded} L</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-600">Fuel Rate (L/hr):</span>
                  <span className="text-gray-900">{reading.fuelConsumptionRate ? reading.fuelConsumptionRate.toFixed(2) : '--'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-600">Operator:</span>
                  <span className="text-gray-900">{reading.operator}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-blue-700 text-center">Total Fuel Used This Month: <span className="font-bold">{totalFuelThisMonth} L</span></div>
      </div>
    </div>
  );
};

export default Genset;