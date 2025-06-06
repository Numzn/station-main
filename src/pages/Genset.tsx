import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { GensetReading } from '../firebase/genset';
import { saveGensetReading, getLatestGensetReadings } from '../firebase/genset';
import Skeleton from '../components/LoadingSkeleton';
import { ExclamationTriangleIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { FaGasPump } from 'react-icons/fa';

const Genset = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentRunningHours, setCurrentRunningHours] = useState<string>('');
  const [lastReading, setLastReading] = useState<GensetReading | null>(null);
  const [recentReadings, setRecentReadings] = useState<GensetReading[]>([]);
  const [gensetStatus, setGensetStatus] = useState<'running' | 'stopped'>('running');
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState(0); // 0: Input, 1: Confirm, 2: Done

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
    setFormError(null);
    if (!currentRunningHours || !user) return;

    try {
      const currentHours = parseFloat(currentRunningHours);
      if (isNaN(currentHours) || (lastReading && currentHours <= lastReading.runningHours)) {
        setFormError('Hour meter reading must be greater than last reading.');
        return;
      }
      if (lastReading && currentHours === lastReading.runningHours) {
        setFormError('Hour meter reading is unchanged. Please enter a new value.');
        return;
      }
      const hoursSinceLastRefuel = lastReading ? currentHours - lastReading.runningHours : 0;
      const fuelAdded = 20;
      const fuelConsumptionRate = hoursSinceLastRefuel > 0 ? fuelAdded / hoursSinceLastRefuel : 0;
      // Calculate power outage start (timestamp - hours run)
      const now = new Date();
      const powerOutageStart = new Date(now.getTime() - hoursSinceLastRefuel * 60 * 60 * 1000).toISOString();
      // Suspicious flag: 20L but <3 hrs run
      const suspicious = fuelAdded === 20 && hoursSinceLastRefuel > 0 && hoursSinceLastRefuel < 3;
      const reading: GensetReading & { gensetStatus: 'running' | 'stopped'; powerOutageStart: string; suspicious?: boolean } = {
        runningHours: currentHours,
        hoursSinceLastRefuel,
        fuelAdded,
        fuelConsumptionRate,
        operator: user.email || 'unknown',
        timestamp: now.toISOString(),
        gensetStatus,
        powerOutageStart,
        ...(suspicious ? { suspicious: true } : {})
      };
      await saveGensetReading(reading);
      // Refresh data after save
      const newReadings = await getLatestGensetReadings(10);
      setRecentReadings(newReadings);
      setLastReading(newReadings[0]);
      setCurrentRunningHours('');
      setGensetStatus('running');
      setStep(2);
      setTimeout(() => setStep(0), 1200);
    } catch (err) {
      setFormError('Failed to save reading.');
      console.error(err);
    }
  };

  // Calculate next expected meter reading and refuel time
  let nextExpectedMeter = '';
  let nextExpectedRefuelTime = '';
  if (currentRunningHours) {
    const curr = parseFloat(currentRunningHours);
    if (!isNaN(curr)) {
      nextExpectedMeter = (curr + 6).toFixed(2);
      const nextRefuelDate = new Date();
      nextRefuelDate.setHours(nextRefuelDate.getHours() + 6);
      nextExpectedRefuelTime = nextRefuelDate.toLocaleString();
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto space-y-6 px-2 py-6">
        <div className="bg-gradient-to-br from-blue-200/60 to-cyan-200/60 backdrop-blur-lg rounded-2xl shadow-lg p-6 animate-pulse">
          <Skeleton.Card lines={2} />
        </div>
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg p-6">
          <Skeleton.Base width="w-1/3" height="h-8" className="mb-4" />
          <Skeleton.Card lines={3} />
        </div>
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg p-6">
          <Skeleton.Base width="w-1/2" height="h-8" className="mb-4" />
          <Skeleton.Table rows={5} columns={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-2 py-8">
      {/* Header Card with Animated Icon and Stats */}
      <div className="relative bg-gradient-to-br from-blue-200/70 via-cyan-100/70 to-white/80 rounded-3xl shadow-xl p-8 flex flex-col md:flex-row items-center gap-8 overflow-hidden">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="bg-white/70 rounded-full p-4 shadow-lg animate-pulse">
            <FaGasPump className="text-cyan-600 w-12 h-12 animate-bounce" />
          </div>
          <h1 className="text-3xl font-extrabold text-cyan-900 tracking-tight drop-shadow">Genset Refueling</h1>
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="flex items-center gap-2 bg-white/60 rounded-lg px-4 py-2 shadow">
              <ClockIcon className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-700">Last Refuel: <b>{lastReading ? lastReading.runningHours.toFixed(2) : '--'} hrs</b></span>
            </div>
            <div className="flex items-center gap-2 bg-white/60 rounded-lg px-4 py-2 shadow">
              <ChartBarIcon className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-gray-700">Next Refuel: <b>{nextRefuelRunningTime} hrs</b></span>
            </div>
            <div className="flex items-center gap-2 bg-white/60 rounded-lg px-4 py-2 shadow">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-sm text-gray-700">This Month: <b>{totalFuelThisMonth} L</b></span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center md:items-end gap-4">
          <div className="w-full max-w-xs">
            {/* Stepper */}
            <ol className="flex items-center w-full text-sm font-medium text-gray-500 space-x-2">
              <li className={`flex-1 flex items-center gap-2 ${step === 0 ? 'text-cyan-700 font-bold' : ''}`}><span className="w-6 h-6 flex items-center justify-center rounded-full bg-cyan-100">1</span>Input</li>
              <li className={`flex-1 flex items-center gap-2 ${step === 1 ? 'text-cyan-700 font-bold' : ''}`}><span className="w-6 h-6 flex items-center justify-center rounded-full bg-cyan-100">2</span>Confirm</li>
              <li className={`flex-1 flex items-center gap-2 ${step === 2 ? 'text-cyan-700 font-bold' : ''}`}><span className="w-6 h-6 flex items-center justify-center rounded-full bg-cyan-100">3</span>Done</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Input Form Card */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
        <form onSubmit={e => { e.preventDefault(); setStep(1); }} autoComplete="off" className="space-y-6">
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-1">Current Hour Meter Reading</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={currentRunningHours}
              onChange={e => {
                const val = e.target.value.replace(',', '.');
                setCurrentRunningHours(val);
              }}
              className="block w-full rounded-xl border-0 py-3 px-4 text-lg text-gray-900 shadow ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-cyan-500 bg-white/80"
              placeholder="e.g., 6633.99"
              style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
            />
            {lastReading && currentRunningHours && parseFloat(currentRunningHours) <= lastReading.runningHours && (
              <div className="mt-2 flex items-center gap-x-2 text-sm text-red-600">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>Reading must be greater than {lastReading.runningHours.toFixed(2)} hrs</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-1">Genset Status</label>
            <select
              className="mt-2 block w-full rounded-xl border-0 py-3 px-4 text-lg text-gray-900 shadow ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-cyan-500 bg-white/80"
              value={gensetStatus}
              onChange={e => setGensetStatus(e.target.value as 'running' | 'stopped')}
            >
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>
          {currentRunningHours && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base text-cyan-900 bg-cyan-50 rounded-xl p-4 mt-2">
              <div>Next expected meter reading: <span className="font-bold">{nextExpectedMeter}</span></div>
              <div>Next expected refuel time: <span className="font-bold">{nextExpectedRefuelTime}</span></div>
            </div>
          )}
          {formError && (
            <div className="mt-2 flex items-center gap-x-2 text-base text-red-600">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>{formError}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => { setCurrentRunningHours(''); setGensetStatus('running'); setFormError(null); setStep(0); }}
              className="rounded-xl px-4 py-2 text-base font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={
                !currentRunningHours ||
                !!(lastReading && (isNaN(parseFloat(currentRunningHours)) || parseFloat(currentRunningHours) <= lastReading.runningHours))
              }
              className="rounded-xl bg-cyan-600 px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </form>
        {/* Step 2: Confirm */}
        {step === 1 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col gap-6 animate-fade-in">
              <h2 className="text-xl font-bold text-cyan-800 flex items-center gap-2"><FaGasPump className="text-cyan-600" /> Confirm Refuel Log</h2>
              <ul className="space-y-2 text-base text-gray-700">
                <li><b>Hour Meter:</b> {currentRunningHours}</li>
                <li><b>Status:</b> {gensetStatus}</li>
                <li><b>Operator:</b> {user?.email}</li>
                <li><b>Next Meter:</b> {nextExpectedMeter}</li>
                <li><b>Next Refuel:</b> {nextExpectedRefuelTime}</li>
              </ul>
              <div className="flex gap-4 justify-end">
                <button onClick={() => setStep(0)} className="rounded-xl px-4 py-2 text-base font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Back</button>
                <button onClick={handleSubmitReading} className="rounded-xl bg-cyan-600 px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-cyan-500 transition">Confirm & Save</button>
              </div>
            </div>
          </div>
        )}
        {/* Step 3: Done */}
        {step === 2 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center gap-4 animate-fade-in">
              <FaGasPump className="text-green-500 w-12 h-12 animate-bounce" />
              <h2 className="text-2xl font-bold text-green-700">Log Saved!</h2>
            </div>
          </div>
        )}
      </div>

      {/* Timeline/Log Feed */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-8">
        <h2 className="text-xl font-bold text-cyan-900 mb-4">Recent Refueling Logs</h2>
        <ol className="relative border-l-4 border-cyan-200">
          {recentReadings.map((reading, idx) => {
            const suspicious = reading.fuelAdded === 20 && reading.hoursSinceLastRefuel > 0 && reading.hoursSinceLastRefuel < 3;
            return (
              <li key={idx} className="mb-10 ml-6">
                <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-8 ring-white ${suspicious ? 'bg-yellow-400' : 'bg-cyan-500'} animate-pulse`} />
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-lg font-bold text-cyan-800">{reading.runningHours.toFixed(2)} hrs</span>
                    <span className="text-xs text-gray-500">{new Date(reading.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="inline-block px-2 py-1 rounded bg-cyan-100 text-cyan-800 text-xs font-semibold">{reading.gensetStatus}</span>
                    <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">{reading.fuelAdded}L</span>
                    <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">{reading.hoursSinceLastRefuel.toFixed(2)} hrs run</span>
                    <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">{reading.operator}</span>
                    {suspicious && <span className="inline-block px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-semibold">Suspicious</span>}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <b>Power Outage Start:</b> {reading.powerOutageStart ? new Date(reading.powerOutageStart).toLocaleString() : '--'}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default Genset;