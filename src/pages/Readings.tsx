import React, { useState, useEffect } from 'react';
import { saveReadings, getLatestReadings } from '../firebase/firestore';
import Skeleton from '../components/LoadingSkeleton';


interface PumpReading {
  opening: number;
  closing: number;
  sales: number;
}

interface TankSummary {
  opening: number;
  closing: number;
  dipReading: number;
  tankSales: number;
  pumpSales: number;
  variance: number;
  meterReading: number;
}

const Readings = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [petrolPumps, setPetrolPumps] = useState<PumpReading[]>([
    { opening: 0, closing: 0, sales: 0 },
    { opening: 0, closing: 0, sales: 0 },
    { opening: 0, closing: 0, sales: 0 },
    { opening: 0, closing: 0, sales: 0 },
  ]);
  const [dieselPumps, setDieselPumps] = useState<PumpReading[]>([
    { opening: 0, closing: 0, sales: 0 },
    { opening: 0, closing: 0, sales: 0 },
    { opening: 0, closing: 0, sales: 0 },
    { opening: 0, closing: 0, sales: 0 },
  ]);
  const [petrolTank, setPetrolTank] = useState<TankSummary>({
    opening: 0,
    closing: 0,
    dipReading: 0,
    tankSales: 0,
    pumpSales: 0,
    variance: 0,
    meterReading: 0,
  });
  const [dieselTank, setDieselTank] = useState<TankSummary>({
    opening: 0,
    closing: 0,
    dipReading: 0,
    tankSales: 0,
    pumpSales: 0,
    variance: 0,
    meterReading: 0,
  });

  // Load the latest readings (not just today's or yesterday's)
  useEffect(() => {
    const loadReadings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Loading latest readings...');
        const latestReadings = await getLatestReadings();
        if (latestReadings) {
          // Use last closing as new opening for each pump
          setPetrolPumps(latestReadings.petrolPumps.map((pump: PumpReading) => ({
            opening: pump.closing,
            closing: 0,
            sales: 0
          })));
          setDieselPumps(latestReadings.dieselPumps.map((pump: PumpReading) => ({
            opening: pump.closing,
            closing: 0,
            sales: 0
          })));
          setPetrolTank(latestReadings.petrolTank);
          setDieselTank(latestReadings.dieselTank);
        }
      } catch (err) {
        setError('Failed to load readings');
      } finally {
        setIsLoading(false);
      }
    };

    loadReadings();
  }, []);

  // When editing, set opening = previous closing, allow closing edit
  const handleEditReadings = () => {
    setIsEditing(true);
    setPetrolPumps(prev => prev.map(pump => ({
      ...pump,
      opening: pump.opening || 0,
      closing: 0,
      sales: 0
    })));
    setDieselPumps(prev => prev.map(pump => ({
      ...pump,
      opening: pump.opening || 0,
      closing: 0,
      sales: 0
    })));
  };

  // Live update difference (sales) as closing is entered
  const handleClosingChange = (value: string, pumpType: 'petrol' | 'diesel', index: number) => {
    const formattedValue = formatInputValue(value);
    const closingValue = parseFloat(formattedValue) || 0;
    const pumps = pumpType === 'petrol' ? petrolPumps : dieselPumps;
    const setPumps = pumpType === 'petrol' ? setPetrolPumps : setDieselPumps;
    const updatedPumps = [...pumps];
    updatedPumps[index] = {
      ...updatedPumps[index],
      closing: closingValue,
      sales: closingValue - updatedPumps[index].opening
    };
    setPumps(updatedPumps);
  };

  // Update handleUpdateReadings to include validation
  const handleUpdateReadings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const timestamp = new Date().toISOString();
      const readingsData = {
        petrolPumps: petrolPumps.map(p => ({ ...p, timestamp })),
        dieselPumps: dieselPumps.map(p => ({ ...p, timestamp })),
        petrolTank,
        dieselTank
      };
      console.log('Readings data to save:', readingsData);

      // Save to Firestore
      await saveReadings(readingsData);
      console.log('Readings saved successfully');

      // After save, set closing as new opening for next shift
      setPetrolPumps(petrolPumps.map(p => ({ opening: p.closing, closing: 0, sales: 0 })));
      setDieselPumps(dieselPumps.map(p => ({ opening: p.closing, closing: 0, sales: 0 })));
      setIsEditing(false);
      alert('Readings saved successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save readings';
      console.error('Error saving readings:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatInputValue = (value: string) => {
    // Remove all non-numeric except . and -
    let numericValue = value.replace(/[^\d.-]/g, '');
    // Always show leading zero for decimals
    if (numericValue.startsWith('.')) {
      numericValue = '0' + numericValue;
    } else if (numericValue.startsWith('-.')) {
      numericValue = '-0.' + numericValue.slice(2);
    }
    // Remove leading zeros for integers (except for 0 itself)
    if (/^-?0\d+/.test(numericValue)) {
      numericValue = numericValue.replace(/^-?0+/, (match) => (match.startsWith('-') ? '-' : ''));
    }
    // Handle multiple decimal points
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('');
    }
    // Limit to 3 decimal places
    if (parts.length === 2 && parts[1].length > 3) {
      numericValue = parts[0] + '.' + parts[1].slice(0, 3);
    }
    return numericValue;
  };

  // Utility for rounding to 2 decimal places
  const round2 = (val: number) => Number(val).toFixed(2);

  // Restore dip reading handler for tank summary
  const handleDipReadingChange = (value: string, tankType: 'petrol' | 'diesel') => {
    const formattedValue = formatInputValue(value);
    const meters = parseFloat(formattedValue) || 0;
    const liters = dipToLiters(meters);
    if (tankType === 'petrol') {
      setPetrolTank(prev => {
        const newTankSales = prev.opening - liters;
        return {
          ...prev,
          meterReading: meters,
          dipReading: meters,
          closing: liters,
          tankSales: newTankSales,
          variance: newTankSales - prev.pumpSales
        };
      });
    } else {
      setDieselTank(prev => {
        const newTankSales = prev.opening - liters;
        return {
          ...prev,
          meterReading: meters,
          dipReading: meters,
          closing: liters,
          tankSales: newTankSales,
          variance: newTankSales - prev.pumpSales
        };
      });
    }
  };

  // Conversion function (replace with real formula as needed)
  const dipToLiters = (meters: number) => {
    // Example: 1 meter = 1000 liters
    return meters * 1000;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Pump Operations Loading */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <Skeleton.Base width="w-1/3" height="h-8" />
          </div>
          <div className="space-y-6">
            {/* Petrol Pumps Loading */}
            <div>
              <Skeleton.Base width="w-1/4" className="mb-4" />
              <Skeleton.Table rows={4} columns={3} />
            </div>
            {/* Diesel Pumps Loading */}
            <div>
              <Skeleton.Base width="w-1/4" className="mb-4" />
              <Skeleton.Table rows={4} columns={3} />
            </div>
          </div>
        </div>

        {/* Tank Summary Loading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Petrol Tank Loading */}
          <div className="bg-white shadow rounded-lg p-6">
            <Skeleton.Base width="w-1/3" className="mb-4" />
            <div className="space-y-4">
              <Skeleton.Card lines={6} />
            </div>
          </div>
          {/* Diesel Tank Loading */}
          <div className="bg-white shadow rounded-lg p-6">
            <Skeleton.Base width="w-1/3" className="mb-4" />
            <div className="space-y-4">
              <Skeleton.Card lines={6} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          {typeof error === 'string' ? (
            <p className="text-gray-600">{error}</p>
          ) : (
            error
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pump Operations Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Pump Operations (Meter Readings)</h2>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateReadings}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Update Readings
                </button>
              </>
            ) : (
              <button
                onClick={handleEditReadings}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Edit Readings
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8 text-center">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Opening</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diff</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {petrolPumps.map((petrolPump, i) => (
                <React.Fragment key={`row-${i}`}>
                  <tr>
                    <td className="px-2 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 w-8 text-center">P{i + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{petrolPump.opening}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isEditing ? (
                        <input
                          type="number"
                          value={petrolPump.closing === 0 ? '' : petrolPump.closing}
                          onChange={e => handleClosingChange(e.target.value, 'petrol', i)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2 px-2 bg-white min-w-0 text-right"
                          placeholder="0.00"
                          style={{ minWidth: 0 }}
                          inputMode="decimal"
                        />
                      ) : (
                        petrolPump.closing
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{petrolPump.sales}</td>
                  </tr>
                  {dieselPumps[i] && (
                    <tr>
                      <td className="px-2 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 w-8 text-center">D{i + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{dieselPumps[i].opening}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={dieselPumps[i].closing === 0 ? '' : dieselPumps[i].closing}
                            onChange={e => handleClosingChange(e.target.value, 'diesel', i)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2 px-2 bg-white min-w-0 text-right"
                            placeholder="0.00"
                            style={{ minWidth: 0 }}
                            inputMode="decimal"
                          />
                        ) : (
                          dieselPumps[i].closing
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{dieselPumps[i].sales}</td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tank Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Petrol Tank Summary */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Petrol Tank Summary</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Opening (Previous Closing)</label>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{round2(petrolTank.opening)} L</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dip Reading</label>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">UN1 Measurement (Meters)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={petrolTank.meterReading || ''}
                      onChange={e => handleDipReadingChange(e.target.value, 'petrol')}
                      className="block w-full rounded-lg border-gray-300 shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-base py-3 px-4 pr-10 sm:text-sm"
                      placeholder="0.000"
                      inputMode="decimal"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">m</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Converted Value (Liters)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={petrolTank.closing.toFixed(3)}
                      readOnly
                      className="block w-full rounded-lg border-gray-200 bg-gray-100 text-gray-700 text-base py-3 px-4 pr-10 sm:text-sm cursor-not-allowed"
                      tabIndex={-1}
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">L</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tank Sales</label>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{round2(petrolTank.tankSales)} L</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pump Sales (P1-P4)</label>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{round2(petrolTank.pumpSales)} L</p>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Variance</label>
                <p className={`mt-1 text-2xl font-semibold ${petrolTank.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{round2(petrolTank.variance)} L</p>
              </div>
            </div>
          </div>
        </div>

        {/* Diesel Tank Summary */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Diesel Tank Summary</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Opening (Previous Closing)</label>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{round2(dieselTank.opening)} L</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dip Reading</label>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">D2 Measurement (Meters)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={dieselTank.meterReading || ''}
                      onChange={e => handleDipReadingChange(e.target.value, 'diesel')}
                      className="block w-full rounded-lg border-gray-300 shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-base py-3 px-4 pr-10 sm:text-sm"
                      placeholder="0.000"
                      inputMode="decimal"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">m</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Converted Value (Liters)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={dieselTank.closing.toFixed(3)}
                      readOnly
                      className="block w-full rounded-lg border-gray-200 bg-gray-100 text-gray-700 text-base py-3 px-4 pr-10 sm:text-sm cursor-not-allowed"
                      tabIndex={-1}
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">L</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tank Sales</label>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{round2(dieselTank.tankSales)} L</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pump Sales (D1-D4)</label>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{round2(dieselTank.pumpSales)} L</p>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Variance</label>
                <p className={`mt-1 text-2xl font-semibold ${dieselTank.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{round2(dieselTank.variance)} L</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Totals Section */}
      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Total Closing Values (Tank Summary)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700">Total Petrol Closing</label>
            <p className="mt-1 text-2xl font-semibold text-blue-600">
              {petrolTank.closing > 0 ? round2(petrolTank.closing) : '0.00'} L
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700">Total Diesel Closing</label>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              {dieselTank.closing > 0 ? round2(dieselTank.closing) : '0.00'} L
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700">Combined Total</label>
            <p className="mt-1 text-2xl font-semibold text-purple-600">
              {round2(petrolTank.closing + dieselTank.closing)} L
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Readings;