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
          setPetrolPumps(latestReadings.petrolPumps);
          setDieselPumps(latestReadings.dieselPumps);
          setPetrolTank(latestReadings.petrolTank);
          setDieselTank(latestReadings.dieselTank);
        } else {
          console.log('No previous readings found, using default values');
          // Keep the default values that were set in the initial state
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load readings';
        console.error('Error loading readings:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadReadings();
  }, []);

  // Calculate pump sales totals
  useEffect(() => {
    const petrolPumpSales = petrolPumps.reduce((sum, pump) => sum + pump.sales, 0);
    const dieselPumpSales = dieselPumps.reduce((sum, pump) => sum + pump.sales, 0);

    setPetrolTank(prev => ({
      ...prev,
      pumpSales: petrolPumpSales,
      variance: prev.tankSales - petrolPumpSales
    }));

    setDieselTank(prev => ({
      ...prev,
      pumpSales: dieselPumpSales,
      variance: prev.tankSales - dieselPumpSales
    }));
  }, [petrolPumps, dieselPumps]);

  // Conversion function (replace with real formula as needed)
  const dipToLiters = (meters: number) => {
    // Example: 1 meter = 1000 liters
    return meters * 1000;
  };

  // Update tank closing and tank sales when dip reading changes
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

  const formatInputValue = (value: string) => {
    // Allow decimal point and numbers
    if (value === '.') return '0.';
    if (value === '-.') return '-0.';
    
    // Remove any non-numeric characters except decimal point and minus sign
    const numericValue = value.replace(/[^\d.-]/g, '');
    
    // Handle multiple decimal points
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 3 decimal places
    if (parts.length === 2 && parts[1].length > 3) {
      return parts[0] + '.' + parts[1].slice(0, 3);
    }
    
    return numericValue;
  };

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

  // Add useEffect to update totals when tank values change
  useEffect(() => {
    console.log('Tank values updated:', {
      petrolClosing: petrolTank.closing,
      dieselClosing: dieselTank.closing,
      total: petrolTank.closing + dieselTank.closing
    });
  }, [petrolTank.closing, dieselTank.closing]);

  // Add a function to calculate totals
 

  // Add a function to validate readings before saving
  const validateReadings = () => {
    const errors = [];

    // Check if all pump closing values are entered
    petrolPumps.forEach((pump, index) => {
      if (pump.closing === 0) {
        errors.push(`Petrol Pump P${index + 1} closing value is required`);
      }
    });

    dieselPumps.forEach((pump, index) => {
      if (pump.closing === 0) {
        errors.push(`Diesel Pump D${index + 1} closing value is required`);
      }
    });

    // Check if tank closing values are entered
    if (petrolTank.closing === 0) {
      errors.push('Petrol tank closing value is required');
    }
    if (dieselTank.closing === 0) {
      errors.push('Diesel tank closing value is required');
    }

    return errors;
  };

  // Update handleUpdateReadings to include validation
  const handleUpdateReadings = async () => {
    try {
      const validationErrors = validateReadings();
      if (validationErrors.length > 0) {
        setError(
          <div>
            <div className="text-lg font-semibold mb-2 text-red-600">Please fill in all required fields:</div>
            <ul className="list-disc list-inside text-left text-red-500">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        );
        return;
      }

      setIsLoading(true);
      setError(null);
      console.log('Saving readings...');

      const readingsData = {
        petrolPumps,
        dieselPumps,
        petrolTank,
        dieselTank
      };
      console.log('Readings data to save:', readingsData);

      // Save to Firestore
      await saveReadings(readingsData);
      console.log('Readings saved successfully');

      // Update local state (Pump Operations only: clear closing for next entry and transfer closing to opening)
      // After saving, do NOT use the old state for opening values. Use the just-entered closing values directly.
      const updatedPetrolPumps = petrolPumps.map(pump => ({
        opening: pump.closing, // always use the just-entered closing value
        closing: 0,
        sales: 0
      }));
      setPetrolPumps(updatedPetrolPumps);

      const updatedDieselPumps = dieselPumps.map(pump => ({
        opening: pump.closing,
        closing: 0,
        sales: 0
      }));
      setDieselPumps(updatedDieselPumps);

      setPetrolTank(prev => ({
        ...prev,
        opening: prev.closing, // always use the just-entered closing value
        closing: 0,
        dipReading: 0,
        meterReading: 0
      }));
      setDieselTank(prev => ({
        ...prev,
        opening: prev.closing,
        closing: 0,
        dipReading: 0,
        meterReading: 0
      }));

      // Do NOT reload from Firestore after saving, just update local state

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

  // Utility for rounding to 2 decimal places
  const round2 = (val: number) => Number(val).toFixed(2);

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
                  onClick={() => {
                    setIsEditing(false);
                    // Reload the current readings instead of calling loadReadings directly
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    getLatestReadings().then(readings => {
                      if (readings) {
                        setPetrolPumps(readings.petrolPumps);
                        setDieselPumps(readings.dieselPumps);
                        setPetrolTank(readings.petrolTank);
                        setDieselTank(readings.dieselTank);
                      }
                    });
                  }}
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
                onClick={() => {
                  setIsEditing(true);
                  // Clear closing values for all pumps
                  setPetrolPumps(prevPumps => prevPumps.map(pump => ({
                    ...pump,
                    closing: 0,
                    sales: 0
                  })));
                  setDieselPumps(prevPumps => prevPumps.map(pump => ({
                    ...pump,
                    closing: 0,
                    sales: 0
                  })));
                  // Clear tank closing values and related fields
                  setPetrolTank(prev => ({
                    ...prev,
                    closing: 0,
                    dipReading: 0,
                    meterReading: 0,
                    tankSales: 0,
                    variance: 0
                  }));
                  setDieselTank(prev => ({
                    ...prev,
                    closing: 0,
                    dipReading: 0,
                    meterReading: 0,
                    tankSales: 0,
                    variance: 0
                  }));
                }}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pump</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Reading</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Reading</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales (Liters)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Pump Pairs */}
              {petrolPumps.map((pump, index) => (
                <React.Fragment key={`pair-${index}`}>
                  {/* Petrol Pump */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">P{index + 1} (Petrol)</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{round2(pump.opening)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={pump.closing}
                            onChange={(e) => handleClosingChange(e.target.value, 'petrol', index)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-8 py-2 px-3 md:py-2 md:px-3 text-base md:text-sm bg-white transition-all duration-150 ease-in-out min-w-0"
                            placeholder="0.00"
                            style={{ minWidth: 0 }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">L</span>
                        </div>
                      ) : (
                        round2(pump.closing)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{round2(pump.sales)}</td>
                  </tr>
                  {/* Diesel Pump */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">D{index + 1} (Diesel)</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{round2(dieselPumps[index].opening)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={dieselPumps[index].closing}
                            onChange={(e) => handleClosingChange(e.target.value, 'diesel', index)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-8 py-2 px-3 md:py-2 md:px-3 text-base md:text-sm bg-white transition-all duration-150 ease-in-out min-w-0"
                            placeholder="0.00"
                            style={{ minWidth: 0 }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">L</span>
                        </div>
                      ) : (
                        round2(dieselPumps[index].closing)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{round2(dieselPumps[index].sales)}</td>
                  </tr>
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