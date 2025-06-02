import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { TankRefill } from '../firebase/tankRefill';
import { saveTankRefill, getLatestTankRefills } from '../firebase/tankRefill';
import { TANK_CAPACITY, TANK_MAX_DIP } from '../config/tankConstants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Skeleton from '../components/LoadingSkeleton';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const TankRefillPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentRefills, setRecentRefills] = useState<TankRefill[]>([]);
  const [step, setStep] = useState<'prep' | 'offload' | 'review'>('prep');
  const [photo, setPhoto] = useState<File | null>(null);
  const [currentRefill, setCurrentRefill] = useState<Partial<TankRefill>>({
    tankType: 'petrol',
    initialDip: 0,
    expectedDelivery: 0,
    finalDip: 0,
    operator: user?.email || '',
    signature: false,
    invoiceNumber: '',
    notes: '',
  });
  // Add error state for displaying errors in the review step
  const [error, setError] = useState<string | null>(null);

  // Load historical data
  useEffect(() => {
    const loadRefills = async () => {
      try {
        setLoading(true);
        const refills = await getLatestTankRefills(10);
        setRecentRefills(refills);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRefills();
  }, []);

  // Calculate overage when final volume changes
  useEffect(() => {
    if (currentRefill.finalVolume && currentRefill.initialVolume && currentRefill.expectedDelivery) {
      const expectedFinal = currentRefill.initialVolume + currentRefill.expectedDelivery;
      const overage = currentRefill.finalVolume - expectedFinal;
      const overagePercentage = (overage / currentRefill.expectedDelivery) * 100;

      setCurrentRefill(prev => ({
        ...prev,
        overage,
        overagePercentage
      }));
    }
  }, [currentRefill.finalVolume, currentRefill.initialVolume, currentRefill.expectedDelivery]);

  // Enhanced validation
  const validateRefill = () => {
    if (!currentRefill.tankType) return 'Tank type is required';
    if (!currentRefill.initialDip) return 'Initial dip reading is required';
    if (!currentRefill.expectedDelivery) return 'Expected delivery volume is required';
    if (!currentRefill.finalDip) return 'Final dip reading is required';
    if (!currentRefill.invoiceNumber) return 'Invoice number is required';
    if (!currentRefill.signature) return 'Please confirm by checking the signature box';

    // Use the true tank max if available, else fallback to operational capacity
    const maxVolume = (TANK_MAX_DIP && TANK_MAX_DIP[currentRefill.tankType]?.liters) || TANK_CAPACITY[currentRefill.tankType];
    const actualDelivered = (currentRefill.finalDip || 0) - (currentRefill.initialDip || 0);
    if (actualDelivered + (currentRefill.initialDip || 0) > maxVolume) {
      return `Final dip exceeds tank capacity (${maxVolume}L)`;
    }
    // Only warn, do not block save
    if (currentRefill.expectedDelivery && currentRefill.finalDip && currentRefill.initialDip) {
      const volumeDiff = Math.abs(actualDelivered - currentRefill.expectedDelivery);
      const percentDiff = (volumeDiff / currentRefill.expectedDelivery) * 100;
      if (percentDiff > 5) {
        return 'warn'; // Special flag for warning
      }
    }
    return null;
  };

  // Step 1: Delivery Preparation (Prep)
  const handlePrepLock = () => {
    setStep('offload');
  };

  // Step 2: Delivery Completion (Offload)
  const handleOffloadNext = () => {
    setStep('review');
  };

  // Step 3: Confirmation & Submission
  const handleSave = async () => {
    const validationError = validateRefill();
    if (validationError && validationError !== 'warn') {
      setError(validationError);
      return;
    }
    // Show warning but proceed if 'warn'
    if (validationError === 'warn') {
      setError('Warning: Large variance detected. Please verify measurements.');
    } else {
      setError(null);
    }
    try {
      setLoading(true);
      await saveTankRefill({
        ...currentRefill,
        photo,
        timestamp: new Date().toISOString(),
      } as TankRefill);

      // --- Update /tankLevels/current with the new final dip ---
      if (currentRefill.tankType && typeof currentRefill.finalDip === 'number') {
        const tankLevelsRef = doc(db, 'tankLevels', 'current');
        await setDoc(
          tankLevelsRef,
          {
            [currentRefill.tankType]: currentRefill.finalDip,
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );
      }
      // --- End update ---

      const newRefills = await getLatestTankRefills(10);
      setRecentRefills(newRefills);
      setCurrentRefill({
        tankType: 'petrol',
        initialDip: 0,
        expectedDelivery: 0,
        finalDip: 0,
        operator: user?.email || '',
        signature: false,
        invoiceNumber: '',
        notes: '',
      });
      setPhoto(null);
      setStep('prep');
    } catch (err) {
      setError('Failed to save refill record. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // PDF export function
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    // Security/authentic look: blue header, watermark, and station name
    doc.setFillColor(41, 50, 100); // deep blue
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('STATION FUEL REFILL SUMMARY', 105, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Confidential - For Internal Use Only', 105, 26, { align: 'center' });
    // Station name (customize as needed)
    doc.setTextColor(41, 50, 100);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Filling Station: Main City Service Station', 14, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 52);
    doc.text(`Operator: ${user?.email || ''}`, 14, 60);
    // Table
    autoTable(doc, {
      startY: 70,
      head: [['Field', 'Value']],
      body: [
        ['Tank', currentRefill.tankType?.toUpperCase() || ''],
        ['Invoice Number', currentRefill.invoiceNumber || ''],
        ['Initial Dip (L)', currentRefill.initialDip?.toString() || ''],
        ['Expected Delivery (L)', currentRefill.expectedDelivery?.toString() || ''],
        ['Final Dip (L)', currentRefill.finalDip?.toString() || ''],
        ['Actual Delivered (L)', ((currentRefill.finalDip || 0) - (currentRefill.initialDip || 0)).toFixed(2)],
        ['Variance (L)', (((currentRefill.finalDip || 0) - (currentRefill.initialDip || 0)) - (currentRefill.expectedDelivery || 0)).toFixed(2)],
        ['Status', (((currentRefill.finalDip || 0) - (currentRefill.initialDip || 0)) - (currentRefill.expectedDelivery || 0)) === 0 ? 'Exact' : (((currentRefill.finalDip || 0) - (currentRefill.initialDip || 0)) - (currentRefill.expectedDelivery || 0)) > 0 ? 'Over' : 'Short'],
        ['Digital Signature', currentRefill.signature ? 'Signed' : 'Not Signed'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 50, 100], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 11 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
    });
    // Watermark (drawn after table so it's visible)
    doc.setTextColor(220, 220, 220);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.text('SECURE', 105, 150, { align: 'center', angle: 30 });
    doc.setTextColor(40);
    doc.setFontSize(12);
    doc.save('TankRefillSummary.pdf');
  };

  // Helper: Color by tank type
  const tankColor = currentRefill.tankType === 'petrol' ? 'green' : 'purple';

  // Step 1: Delivery Preparation (Initial Dip & Expected Delivery)
  const renderPrepStep = () => (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6" role="form" aria-label="Tank Refill Form">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Preparation</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="tankType" className="text-sm font-medium text-gray-700">Tank Type</label>
          <select
            id="tankType"
            value={currentRefill.tankType}
            onChange={e => setCurrentRefill(prev => ({ ...prev, tankType: e.target.value as 'petrol' | 'diesel' }))}
            className={`rounded-md border-gray-300 shadow-sm focus:border-${tankColor}-500 focus:ring-${tankColor}-500 bg-${tankColor}-50 px-3 py-2 text-base`}
            aria-label="Select tank type"
          >
            <option value="petrol">Petrol Tank</option>
            <option value="diesel">Diesel Tank</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="invoiceNumber" className="text-sm font-medium text-gray-700">Invoice Number</label>
          <input
            id="invoiceNumber"
            type="text"
            value={currentRefill.invoiceNumber}
            onChange={e => setCurrentRefill(prev => ({ ...prev, invoiceNumber: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 text-base"
            placeholder="Enter invoice number"
            aria-label="Invoice number input"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="initialDip" className="text-sm font-medium text-gray-700">Initial Dip (L)</label>
          <input
            id="initialDip"
            type="number"
            value={currentRefill.initialDip || ''}
            onChange={e => setCurrentRefill(prev => ({ ...prev, initialDip: Number(e.target.value) }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 text-base"
            placeholder="Enter initial dip reading (liters)"
            aria-label="Initial dip measurement in liters"
            inputMode="decimal"
            min="0"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Expected Delivery (L)</label>
          <input
            type="number"
            value={currentRefill.expectedDelivery || ''}
            onChange={e => setCurrentRefill(prev => ({ ...prev, expectedDelivery: Number(e.target.value) }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 text-base"
            placeholder="Enter expected delivery volume (liters)"
            aria-label="Expected delivery volume in liters"
            inputMode="decimal"
            min="0"
          />
        </div>
      </div>
      <button
        className={`mt-6 w-full py-3 px-4 rounded-md text-white text-lg ${tankColor === 'green' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} font-semibold transition-all`}
        onClick={handlePrepLock}
        disabled={!(Number(currentRefill.initialDip) > 0 && Number(currentRefill.expectedDelivery) > 0 && currentRefill.invoiceNumber)}
      >
        Start Offload
      </button>
    </div>
  );

  // Step 2: Delivery Completion (Final Dip)
  const renderOffloadStep = () => (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Completion</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="finalDip" className="text-sm font-medium text-gray-700">Final Dip (L)</label>
          <input
            id="finalDip"
            type="number"
            value={currentRefill.finalDip || ''}
            onChange={e => setCurrentRefill(prev => ({ ...prev, finalDip: Number(e.target.value) }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 text-base"
            placeholder="Enter final dip reading (liters)"
            aria-label="Final dip measurement in liters"
            inputMode="decimal"
            min="0"
          />
        </div>
      </div>
      <button
        className={`mt-6 w-full py-3 px-4 rounded-md text-white text-lg ${tankColor === 'green' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} font-semibold transition-all`}
        onClick={handleOffloadNext}
        disabled={!(Number(currentRefill.finalDip) > 0)}
      >
        Review Summary
      </button>
      <button
        className="mt-2 w-full py-2 px-4 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium"
        onClick={() => setStep('prep')}
      >
        Back
      </button>
    </div>
  );

  // Step 3: Review & Confirmation
  const actualDelivered = Number(((currentRefill.finalDip || 0) - (currentRefill.initialDip || 0)).toFixed(2));
  const variance = Number((actualDelivered - (currentRefill.expectedDelivery || 0)).toFixed(2));
  const status = variance === 0 ? 'Exact' : variance > 0 ? 'Over' : 'Short';

  const renderReviewStep = () => (
    <div className={`rounded-lg shadow-lg p-6 border-2 border-${tankColor}-600 bg-${tankColor}-50`}> 
      <h2 className={`text-lg font-bold text-${tankColor}-700 mb-4`}>Refill Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>Tank: <span className={`font-semibold text-${tankColor}-700`}>{currentRefill.tankType?.toUpperCase()}</span></div>
        <div>Initial Dip: <span className="font-semibold">{currentRefill.initialDip} L</span></div>
        <div>Expected: <span className="font-semibold">{currentRefill.expectedDelivery} L</span></div>
        <div>Final Dip: <span className="font-semibold">{currentRefill.finalDip} L</span></div>
        <div>Actual Delivered: <span className="font-semibold">{actualDelivered} L</span></div>
        <div>Variance: <span className={status === 'Exact' ? 'text-green-700' : status === 'Over' ? 'text-yellow-700' : 'text-red-700'}>{variance} L ({status})</span></div>
        <div>Status: <span className="font-semibold">Verified</span></div>
        <div>Operator: <span className="font-semibold">{user?.email}</span></div>
        <div>Timestamp: <span className="font-semibold">{new Date().toLocaleString()}</span></div>
      </div>
      {/* Digital Signature */}
      <div className="mt-4 flex items-center">
        <input
          id="signature"
          type="checkbox"
          checked={currentRefill.signature}
          onChange={e => setCurrentRefill(prev => ({ ...prev, signature: e.target.checked }))}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
        <label htmlFor="signature" className="ml-2 text-gray-700">Digital Signature: I confirm all measurements are accurate</label>
      </div>
      {/* Photo Upload (optional) */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Attach Invoice Photo (optional)</label>
        <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} />
        {photo && <span className="ml-2 text-xs text-gray-500">{photo.name}</span>}
      </div>
      {/* Error display */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-red-800">{error}</div>
      )}
      {/* Action Buttons */}
      <div className="mt-6 flex flex-col md:flex-row gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !currentRefill.signature}
          className={`flex-1 py-2 px-4 rounded-md text-white bg-${tankColor}-600 hover:bg-${tankColor}-700 font-medium`}
        >
          Save Refill Record
        </button>
        {/* Only keep the Share Summary (PDF) button */}
        <button
          onClick={handleDownloadPDF}
          className="flex-1 py-2 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-medium"
        >
          Share Summary (PDF)
        </button>
      </div>
      <button
        className="mt-2 w-full py-2 px-4 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium"
        onClick={() => setStep('offload')}
      >
        Back
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Form Loading */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <Skeleton.Base width="w-1/3" height="h-8" className="mb-6" />
          <div className="space-y-4">
            <Skeleton.Card lines={4} />
          </div>
        </div>
        
        {/* Recent Activity Loading */}
        <div className="bg-white shadow rounded-lg p-6">
          <Skeleton.Base width="w-1/4" height="h-8" className="mb-6" />
          <Skeleton.Table rows={5} columns={7} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step === 'prep' && renderPrepStep()}
      {step === 'offload' && renderOffloadStep()}
      {step === 'review' && renderReviewStep()}
      {/* Audit Log (Recent Refills) */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Audit Log</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initial Dip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Dip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentRefills.map((refill, idx) => {
                const actual = Number(((refill.finalDip || 0) - (refill.initialDip || 0)).toFixed(2));
                const variance = Number((actual - (refill.expectedDelivery || 0)).toFixed(2));
                const status = variance === 0 ? 'Exact' : variance > 0 ? 'Over' : 'Short';
                return (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(refill.timestamp).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-${refill.tankType === 'petrol' ? 'green' : 'purple'}-700`}>
                      {refill.tankType.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {refill.initialDip} L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {refill.expectedDelivery} L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {refill.finalDip} L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {actual} L
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${status === 'Exact' ? 'text-green-700' : status === 'Over' ? 'text-yellow-700' : 'text-red-700'}`}>{variance} L</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{refill.operator}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TankRefillPage;
