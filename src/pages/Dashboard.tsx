import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getLatestReadings } from '../firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { TANK_MAX_DIP, TANK_CAPACITY } from '../config/tankConstants';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface FuelPrices {
  petrolPrice: number;
  dieselPrice: number;
  lastUpdated: string;
}

// Animated Tank Level Component
interface TankLevelAnimatedProps {
  label: string;
  color: string;
  heightCm: number;
  capacityL: number;
  currentLiters: number;
}

const TankLevelAnimated: React.FC<TankLevelAnimatedProps> = ({ label, color, heightCm, currentLiters }) => {
  // Even smaller SVG dimensions and thinner outline
  const svgWidth = 36;
  const svgHeight = 58;
  const tankWall = 2; // half as thick as before
  const tankInnerWidth = svgWidth - 2 * tankWall;
  const tankInnerHeight = svgHeight - 2 * tankWall;
  // Calculate fill percent
  const fillPercent = Math.max(0, Math.min(1, currentLiters / heightCm));
  // Calculate fluid height in SVG
  const fluidHeight = fillPercent * tankInnerHeight;
  // Animated wave
  const waveId = useRef(`wave-${Math.random().toString(36).substr(2, 9)}`);
  const [waveOffset, setWaveOffset] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveOffset((prev) => (prev + 1) % 60);
    }, 120);
    return () => clearInterval(interval);
  }, []);
  // Wave path
  const waveAmplitude = 1.2;
  const waveLength = 9;
  const waveY = svgHeight - tankWall - fluidHeight;
  let wavePath = `M${tankWall},${waveY}`;
  for (let x = 0; x <= tankInnerWidth; x += 2) {
    const y = waveY + waveAmplitude * Math.sin((2 * Math.PI * (x + waveOffset)) / waveLength);
    wavePath += ` L${tankWall + x},${y}`;
  }
  wavePath += ` L${svgWidth - tankWall},${svgHeight - tankWall}`;
  wavePath += ` L${tankWall},${svgHeight - tankWall} Z`;
  // Current height in cm
  const currentCm = Math.max(0, Math.min(heightCm, currentLiters));
  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
        {/* Tank U-shape */}
        <rect x={tankWall/2} y={tankWall/2} width={svgWidth-tankWall} height={svgHeight-tankWall} rx={svgWidth/4} fill="#f3f4f6" stroke="#2563eb" strokeWidth={tankWall} />
        {/* Animated fluid with wave */}
        <clipPath id={waveId.current}>
          <rect x={tankWall} y={tankWall} width={tankInnerWidth} height={tankInnerHeight} rx={tankInnerWidth/2} />
        </clipPath>
        <path d={wavePath} fill={color} clipPath={`url(#${waveId.current})`} style={{ transition: 'd 0.3s' }} />
        {/* Tank outline again for clarity, even thinner */}
        <rect x={tankWall/2} y={tankWall/2} width={svgWidth-tankWall} height={svgHeight-tankWall} rx={svgWidth/4} fill="none" stroke="#2563eb" strokeWidth={tankWall/2} />
        {/* Much smaller label and dip reading */}
        <text x={svgWidth/2} y={tankWall+7} textAnchor="middle" fontSize="5" fill="#1e293b" fontWeight="bold">{label} Tank</text>
        <text x={svgWidth/2} y={waveY-1} textAnchor="middle" fontSize="6" fill={color} fontWeight="bold">{currentCm.toFixed(1)} cm</text>
      </svg>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [todayStats, setTodayStats] = useState({
    totalSales: 0,
    fuelVolume: 0,
    transactions: 0,
    variance: 0,
    petrolSales: 0,
    dieselSales: 0,
    petrolVariance: 0,
    dieselVariance: 0,
    pumpSales: {
      petrol: [0, 0, 0, 0],
      diesel: [0, 0, 0, 0]
    },
    tankLevels: {
      petrol: 0,
      diesel: 0
    },
    petrolDipReading: 0,
    dieselDipReading: 0
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load fuel prices
      console.log('Loading fuel prices...');
      const pricesRef = doc(db, 'settings', 'fuelPrices');
      const pricesSnap = await getDoc(pricesRef);
      if (pricesSnap.exists()) {
        const priceData = pricesSnap.data() as FuelPrices;
        console.log('Loaded fuel prices:', priceData);
      } else {
        console.log('No fuel prices found, using defaults');
      }

      // Load the latest readings (not just today's)
      console.log('Loading latest readings...');
      const readings = await getLatestReadings();
      console.log('Loaded readings:', readings);

      if (readings) {
        // Calculate pump sales
        const petrolPumpSales = (readings.petrolPumps as Array<{sales: number}>).map((pump: {sales: number}) => pump.sales);
        const dieselPumpSales = (readings.dieselPumps as Array<{sales: number}>).map((pump: {sales: number}) => pump.sales);
        
        const totalPetrolSales = petrolPumpSales.reduce((sum: number, sales: number) => sum + sales, 0);
        const totalDieselSales = dieselPumpSales.reduce((sum: number, sales: number) => sum + sales, 0);
        
        const totalVolume = totalPetrolSales + totalDieselSales;
        const totalSales = (totalPetrolSales * (pricesSnap.exists() ? (pricesSnap.data() as FuelPrices).petrolPrice : 0)) + 
                         (totalDieselSales * (pricesSnap.exists() ? (pricesSnap.data() as FuelPrices).dieselPrice : 0));
        
        // Calculate tank levels as percentages
        const petrolTankLevel = (readings.petrolTank.closing / 10000) * 100;
        const dieselTankLevel = (readings.dieselTank.closing / 10000) * 100;

        // Calculate variances
        const petrolVariance = readings.petrolTank.variance;
        const dieselVariance = readings.dieselTank.variance;
        const totalVariance = petrolVariance + dieselVariance;
        
        // Estimate transactions (assuming average transaction of 20L)
        const estimatedTransactions = Math.round(totalVolume / 20);

        setTodayStats({
          totalSales,
          fuelVolume: totalVolume,
          transactions: estimatedTransactions,
          variance: totalVariance,
          petrolSales: totalPetrolSales,
          dieselSales: totalDieselSales,
          petrolVariance,
          dieselVariance,
          pumpSales: {
            petrol: petrolPumpSales,
            diesel: dieselPumpSales
          },
          tankLevels: {
            petrol: petrolTankLevel,
            diesel: dieselTankLevel
          },
          petrolDipReading: readings.petrolTank.meterReading || 0,
          dieselDipReading: readings.dieselTank.meterReading || 0
        });
      } else {
        console.log('No readings found');
        setTodayStats({
          totalSales: 0,
          fuelVolume: 0,
          transactions: 0,
          variance: 0,
          petrolSales: 0,
          dieselSales: 0,
          petrolVariance: 0,
          dieselVariance: 0,
          pumpSales: {
            petrol: [0, 0, 0, 0],
            diesel: [0, 0, 0, 0]
          },
          tankLevels: {
            petrol: 0,
            diesel: 0
          },
          petrolDipReading: 0,
          dieselDipReading: 0
        });
      }
    } catch (err) {
      console.error('Detailed error in loadData:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
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

  // Update chart data with real values
  const salesData = {
    labels: ['P1', 'P2', 'P3', 'P4', 'D1', 'D2', 'D3', 'D4'],
    datasets: [
      {
        label: 'Pump Sales (Liters)',
        data: [
          ...todayStats.pumpSales.petrol,
          ...todayStats.pumpSales.diesel
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(199, 199, 199, 0.6)',
          'rgba(83, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  

  const varianceData = {
    labels: ['Petrol', 'Diesel'],
    datasets: [
      {
        label: 'Tank vs Pump Variance',
        data: [todayStats.petrolVariance, todayStats.dieselVariance],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Fuel Station Analytics',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Main Content (no duplicate nav bar) */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Total Sales Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h3 className="text-lg font-medium text-gray-900">Total Sales Today</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-semibold text-gray-900">K {todayStats.totalSales.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Fuel Volume Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h3 className="text-lg font-medium text-gray-900">Fuel Volume</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-semibold text-gray-900">{todayStats.fuelVolume.toFixed(2)} L</p>
              </div>
            </div>
          </div>

          {/* Transactions Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h3 className="text-lg font-medium text-gray-900">Transactions</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-semibold text-gray-900">{todayStats.transactions}</p>
              </div>
            </div>
          </div>

          {/* Variance Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h3 className="text-lg font-medium text-gray-900">Total Variance</h3>
                </div>
              </div>
              <div className="mt-4">
                <p className={`text-3xl font-semibold ${todayStats.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {todayStats.variance >= 0 ? '+' : ''} {todayStats.variance.toFixed(2)} L
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pump Sales Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Pump Sales Distribution</h2>
            <div className="h-80">
              <Bar
                data={salesData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: true,
                      text: 'Pump Sales Distribution (Liters)',
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Tank Levels Section */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Tank Levels</h2>
            <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
              <TankLevelAnimated
                label="Petrol"
                color="#16a34a"
                heightCm={TANK_MAX_DIP.petrol.cm}
                capacityL={TANK_CAPACITY.petrol}
                currentLiters={todayStats.petrolDipReading}
              />
              <TankLevelAnimated
                label="Diesel"
                color="#a21caf"
                heightCm={TANK_MAX_DIP.diesel.cm}
                capacityL={TANK_CAPACITY.diesel}
                currentLiters={todayStats.dieselDipReading}
              />
            </div>
          </div>

          {/* Variance Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Tank vs Pump Variance</h2>
            <div className="h-80">
              <Bar
                data={varianceData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: true,
                      text: 'Tank vs Pump Variance (Liters)',
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-600">Total Petrol Sales</h3>
                <p className="mt-2 text-2xl font-semibold text-blue-900">{todayStats.petrolSales.toFixed(2)} L</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600">Total Diesel Sales</h3>
                <p className="mt-2 text-2xl font-semibold text-green-900">{todayStats.dieselSales.toFixed(2)} L</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-600">Petrol Variance</h3>
                <p className="mt-2 text-2xl font-semibold text-purple-900">
                  {todayStats.petrolVariance >= 0 ? '+' : ''}{todayStats.petrolVariance.toFixed(2)} L
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-red-600">Diesel Variance</h3>
                <p className="mt-2 text-2xl font-semibold text-red-900">
                  {todayStats.dieselVariance >= 0 ? '+' : ''}{todayStats.dieselVariance.toFixed(2)} L
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={() => navigate('/dashboard/readings')}
            className="p-6 bg-white shadow rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <h3 className="text-lg font-medium text-gray-900">Readings</h3>
            <p className="mt-2 text-sm text-gray-500">Enter daily pump and tank readings</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/genset')}
            className="p-6 bg-white shadow rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <h3 className="text-lg font-medium text-gray-900">Genset</h3>
            <p className="mt-2 text-sm text-gray-500">Monitor generator operations</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/shift-roster')}
            className="p-6 bg-white shadow rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <h3 className="text-lg font-medium text-gray-900">Shift Roster</h3>
            <p className="mt-2 text-sm text-gray-500">Manage staff shifts</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/settings')}
            className="p-6 bg-white shadow rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <h3 className="text-lg font-medium text-gray-900">Settings</h3>
            <p className="mt-2 text-sm text-gray-500">Configure fuel prices and other settings</p>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;