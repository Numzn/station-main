import React, { useState } from 'react';

// Utility: Parse CSV string to array of arrays
function parseCSV(csv: string): string[][] {
  return csv
    .trim()
    .split(/\r?\n/)
    .map(line => line.split(','));
}

const COLUMN_COUNT = 10;
const DIESEL_ROWS = 223;
const PETROL_ROWS = 222;
const COLUMN_HEADERS = Array.from({ length: COLUMN_COUNT }, (_, i) => `Column ${i}`);

const KatimaEngenTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diesel' | 'petrol'>('diesel');
  const [dieselExtraRows, setDieselExtraRows] = useState<string[][]>([]);
  const [petrolExtraRows, setPetrolExtraRows] = useState<string[][]>([]);

  // Handle CSV upload for each tab
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>, tab: 'diesel' | 'petrol') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text).filter(row => row.length > 1 || (row.length === 1 && row[0] !== ''));
      if (tab === 'diesel') setDieselExtraRows(rows);
      else setPetrolExtraRows(rows);
    };
    reader.readAsText(file);
  };

  // Render table rows (reference + uploaded)
  const renderRows = (rowCount: number, extraRows: string[][]) => {
    const referenceRows = Array.from({ length: rowCount }, (_, i) => (
      <tr key={`ref-${i}`} className="bg-white even:bg-gray-50">
        {COLUMN_HEADERS.map((col, j) => (
          <td key={j} className="px-2 py-1 border text-xs text-gray-700">{col === 'Column 0' ? i : ''}</td>
        ))}
      </tr>
    ));
    const uploadedRows = extraRows.map((row, i) => (
      <tr key={`csv-${i}`} className="bg-blue-50 even:bg-blue-100">
        {Array.from({ length: COLUMN_COUNT }, (_, j) => (
          <td key={j} className="px-2 py-1 border text-xs text-blue-700">{row[j] || ''}</td>
        ))}
      </tr>
    ));
    return [...referenceRows, ...uploadedRows];
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-2 sm:p-4">
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all border-b-2 ${activeTab === 'diesel' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 bg-gray-100 hover:text-blue-600'}`}
          onClick={() => setActiveTab('diesel')}
        >
          Diesel Katima Engen
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all border-b-2 ${activeTab === 'petrol' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 bg-gray-100 hover:text-blue-600'}`}
          onClick={() => setActiveTab('petrol')}
        >
          Petrol Katima Engen
        </button>
      </div>
      <div className="bg-white rounded-b-lg shadow overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border-b">
          <label className="font-medium text-sm text-gray-700">
            Upload CSV for {activeTab === 'diesel' ? 'Diesel' : 'Petrol'}:
            <input
              type="file"
              accept=".csv"
              className="ml-2 block text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={e => handleCSVUpload(e, activeTab)}
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-xs">
            <thead className="bg-gray-100">
              <tr>
                {COLUMN_HEADERS.map((col, i) => (
                  <th key={i} className="px-2 py-1 border text-gray-800 font-semibold whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'diesel'
                ? renderRows(DIESEL_ROWS, dieselExtraRows)
                : renderRows(PETROL_ROWS, petrolExtraRows)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KatimaEngenTabs;
