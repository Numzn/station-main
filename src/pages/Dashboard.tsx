import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onSnapshot, collection, query, orderBy, limit, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
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
import Skeleton from '../components/LoadingSkeleton';

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

// Animated Tank Level Component
interface TankLevelAnimatedProps {
  label: string;
  color: string;
  heightCm: number;
  capacityL: number;
  currentLiters: number;
}

const TankLevelAnimated: React.FC<TankLevelAnimatedProps> = ({ label, color, heightCm, capacityL, currentLiters }) => {
  // Smaller SVG for compact look
  const svgWidth = 48;
  const svgHeight = 90;
  const tankWall = 4;
  const tankInnerWidth = svgWidth - 2 * tankWall;
  const tankInnerHeight = svgHeight - 2 * tankWall;
  // Calculate fill percent
  const fillPercent = Math.max(0, Math.min(1, currentLiters / heightCm));
  const fluidHeight = fillPercent * tankInnerHeight;
  // Animated wave
  const waveId = useRef(`wave-${Math.random().toString(36).substr(2, 9)}`);
  const [waveOffset, setWaveOffset] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveOffset((prev) => (prev + 2) % 60);
    }, 80);
    return () => clearInterval(interval);
  }, []);
  // Wave path
  const waveAmplitude = 2.5;
  const waveLength = 14;
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
  // Modern glassmorphism style with improved label alignment and color-respecting liquid
  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <div className="relative w-full flex flex-col items-center">
        {/* Tank label above tank, centered and bold */}
        <div className="mb-1 w-full flex justify-center">
          <span className="text-xs font-bold tracking-wide text-gray-800 bg-white/80 px-2 py-0.5 rounded shadow-sm border border-gray-200">
            {label} Tank
          </span>
        </div>
        <svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto drop-shadow-xl"
        >
          {/* Tank body with glass effect */}
          <rect
            x={tankWall / 2}
            y={tankWall / 2}
            width={svgWidth - tankWall}
            height={svgHeight - tankWall}
            rx={svgWidth / 4}
            fill="url(#glassGradient)"
            stroke="#e5e7eb"
            strokeWidth={tankWall}
            style={{ filter: 'blur(0.5px)' }}
          />
          <defs>
            <linearGradient id="glassGradient" x1="0" y1="0" x2="0" y2={svgHeight} gradientUnits="userSpaceOnUse">
              <stop stopColor="#f3f4f6" stopOpacity="0.9" />
              <stop offset="1" stopColor="#e0e7ef" stopOpacity="0.7" />
            </linearGradient>
            {/* Liquid color respects prop color, no white fade */}
            <linearGradient id={`liquidGradient-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2={svgHeight} gradientUnits="userSpaceOnUse">
              <stop stopColor={color} stopOpacity="0.95" />
              <stop offset="1" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          {/* Animated fluid with wave */}
          <clipPath id={waveId.current}>
            <rect x={tankWall} y={tankWall} width={tankInnerWidth} height={tankInnerHeight} rx={tankInnerWidth / 2} />
          </clipPath>
          <path
            d={wavePath}
            fill={`url(#liquidGradient-${color.replace('#','')})`}
            clipPath={`url(#${waveId.current})`}
            style={{ transition: 'd 0.3s' }}
          />
          {/* Tank outline for clarity */}
          <rect
            x={tankWall / 2}
            y={tankWall / 2}
            width={svgWidth - tankWall}
            height={svgHeight - tankWall}
            rx={svgWidth / 4}
            fill="none"
            stroke="#2563eb"
            strokeWidth={tankWall / 2}
          />
          {/* Dip reading, centered inside tank, above the liquid */}
          <text
            x={svgWidth / 2}
            y={Math.max(waveY - 6, tankWall + 14)}
            textAnchor="middle"
            fontSize="8"
            fill={color}
            fontWeight="bold"
            style={{ textShadow: '0 1px 2px #fff' }}
          >
            {currentCm.toFixed(1)} cm
          </text>
        </svg>
        {/* Modern info card below tank, always aligned and readable */}
        <div className="mt-1 w-full flex flex-col items-center">
          <div className="w-11/12 bg-white/80 backdrop-blur-md rounded-xl shadow px-2 py-1 flex flex-col items-center border border-gray-200">
            <span className="text-[10px] text-gray-500 font-medium">Capacity: {capacityL} L</span>
            <span className="text-[11px] text-gray-700 font-semibold">{((currentLiters / heightCm) * capacityL).toFixed(0)} L</span>
          </div>
        </div>
      </div>
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

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    // Listen for live tank levels from /tankLevels/current
    const tankLevelsRef = firestoreDoc(db, 'tankLevels', 'current');
    const unsubscribeTankLevels = onSnapshot(tankLevelsRef, (docSnap) => {
      if (!docSnap.exists()) {
        setTodayStats(prev => ({ ...prev, petrolDipReading: 0, dieselDipReading: 0 }));
        setIsLoading(false);
        return;
      }
      const tankLevels = docSnap.data();
      setTodayStats(prev => ({
        ...prev,
        petrolDipReading: tankLevels.petrol || 0,
        dieselDipReading: tankLevels.diesel || 0
      }));
      setIsLoading(false);
    });
    // Listen for latest readings (most recent document in 'readings')
    const readingsQuery = query(collection(db, 'readings'), orderBy('date', 'desc'), limit(1));
    const unsubscribeReadings = onSnapshot(readingsQuery, async (snapshot) => {
      const docSnap = snapshot.docs[0];
      if (!docSnap) {
        setTodayStats(prev => ({ ...prev, pumpSales: { petrol: [0,0,0,0], diesel: [0,0,0,0] }, petrolSales: 0, dieselSales: 0, totalSales: 0, fuelVolume: 0, transactions: 0, variance: 0, petrolVariance: 0, dieselVariance: 0 }));
        setIsLoading(false);
        return;
      }
      const readings = docSnap.data();
      // Listen for fuel prices
      const pricesRef = firestoreDoc(db, 'settings', 'fuelPrices');
      const unsubscribePrices = onSnapshot(pricesRef, (pricesSnap) => {
        let petrolPrice = 0, dieselPrice = 0;
        if (pricesSnap.exists()) {
          const prices = pricesSnap.data();
          petrolPrice = prices.petrolPrice || 0;
          dieselPrice = prices.dieselPrice || 0;
        }
        // Calculate pump sales
        const petrolPumpSales = (readings.petrolPumps || []).map((pump: {sales: number}) => pump.sales);
        const dieselPumpSales = (readings.dieselPumps || []).map((pump: {sales: number}) => pump.sales);
        const totalPetrolSales = petrolPumpSales.reduce((sum: number, sales: number) => sum + sales, 0);
        const totalDieselSales = dieselPumpSales.reduce((sum: number, sales: number) => sum + sales, 0);
        const totalVolume = totalPetrolSales + totalDieselSales;
        const totalSales = (totalPetrolSales * petrolPrice) + (totalDieselSales * dieselPrice);
        // Calculate variances
        const petrolVariance = readings.petrolTank?.variance || 0;
        const dieselVariance = readings.dieselTank?.variance || 0;
        const totalVariance = petrolVariance + dieselVariance;
        // Estimate transactions (assuming average transaction of 20L)
        const estimatedTransactions = Math.round(totalVolume / 20);
        setTodayStats(prev => ({
          ...prev,
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
          }
        }));
        setIsLoading(false);
      });
      // Clean up prices listener when readings change
      return () => unsubscribePrices();
    });
    // Clean up on unmount
    return () => {
      unsubscribeTankLevels();
      unsubscribeReadings();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Summary Cards Loading */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg p-5">
                <Skeleton.Card lines={2} />
              </div>
            ))}
          </div>

          {/* Charts Loading */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white shadow rounded-lg p-6">
              <Skeleton.Base height="h-80" />
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <Skeleton.Base height="h-80" />
            </div>
          </div>

          {/* Tank Levels Loading */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
              <Skeleton.Base height="h-48" width="w-24" />
              <Skeleton.Base height="h-48" width="w-24" />
            </div>
          </div>

          {/* Navigation Grid Loading */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6">
                <Skeleton.Card lines={2} />
              </div>
            ))}
          </div>
        </main>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats - Modern Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">Today</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">K {todayStats.totalSales.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div className="text-sm font-medium text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">Volume</div>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Total Fuel Volume</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{todayStats.fuelVolume.toFixed(2)} L</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-50">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className={`text-sm font-medium ${todayStats.variance >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2.5 py-0.5 rounded-full`}>
                Variance
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500">Total Variance</h3>
            <div className="mt-2 flex items-baseline">
              <p className={`text-2xl font-semibold ${todayStats.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {todayStats.variance >= 0 ? '+' : ''}{todayStats.variance.toFixed(2)} L
              </p>
            </div>
          </div>
        </div>

        {/* Tank Status and Distribution Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tank Levels Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Tank Levels</h2>
              <button
                onClick={() => navigate('/dashboard/readings')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Update Readings →
              </button>
            </div>
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

          {/* Sales Distribution Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Sales Distribution</h2>
              <div className="text-sm text-gray-500">By Pump</div>
            </div>
            <div className="h-[300px]">
              <Bar
                data={salesData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: false
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        display: false
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Summary and Variance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Fuel Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-700">Petrol Sales</h3>
                <p className="mt-2 text-2xl font-semibold text-blue-900">{todayStats.petrolSales.toFixed(2)} L</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-emerald-700">Diesel Sales</h3>
                <p className="mt-2 text-2xl font-semibold text-emerald-900">{todayStats.dieselSales.toFixed(2)} L</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-700">Petrol Variance</h3>
                <p className="mt-2 text-2xl font-semibold text-purple-900">
                  {todayStats.petrolVariance >= 0 ? '+' : ''}{todayStats.petrolVariance.toFixed(2)} L
                </p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-rose-700">Diesel Variance</h3>
                <p className="mt-2 text-2xl font-semibold text-rose-900">
                  {todayStats.dieselVariance >= 0 ? '+' : ''}{todayStats.dieselVariance.toFixed(2)} L
                </p>
              </div>
            </div>
          </div>

          {/* Variance Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Variance Analysis</h2>
              <div className="text-sm text-gray-500">Tank vs Pump</div>
            </div>
            <div className="h-[300px]">
              <Bar
                data={varianceData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: false
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        display: false
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={() => navigate('/dashboard/readings')}
            className="group bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">Readings</h3>
                <p className="mt-1 text-sm text-gray-500">Enter daily readings</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/genset')}
            className="group bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-50 group-hover:bg-yellow-100 transition-colors">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-yellow-600">Genset</h3>
                <p className="mt-1 text-sm text-gray-500">Monitor generator</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/shift-roster')}
            className="group bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 group-hover:bg-green-100 transition-colors">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">Staff</h3>
                <p className="mt-1 text-sm text-gray-500">Manage shifts</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/settings')}
            className="group bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md border border-gray-100 text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-50 group-hover:bg-purple-100 transition-colors">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600">Settings</h3>
                <p className="mt-1 text-sm text-gray-500">Configure system</p>
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;