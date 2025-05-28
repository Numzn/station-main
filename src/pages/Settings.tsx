import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { FuelPrices, User, SystemProfile, SettingsTab } from '../types/settings';
import { FuelPricesTab } from '../components/settings/FuelPricesTab';
import { UsersTab } from '../components/settings/UsersTab';
import { SystemProfileTab } from '../components/settings/SystemProfileTab';
import { ClearDataTab } from '../components/settings/ClearDataTab';
import Skeleton from '../components/LoadingSkeleton';
import { 
  CurrencyDollarIcon, 
  UsersIcon, 
  Cog6ToothIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';

const TABS = [
  { key: 'prices', label: 'Fuel Prices', icon: CurrencyDollarIcon, description: 'Manage fuel prices' },
  { key: 'users', label: 'Users', icon: UsersIcon, description: 'Manage staff accounts' },
  { key: 'profile', label: 'System Profile', icon: Cog6ToothIcon, description: 'Configure system settings' },
  { key: 'clear', label: 'Clear Data', icon: TrashIcon, description: 'Clear system data' }
] as const;

const Settings = () => {
  // State
  const [activeTab, setActiveTab] = useState<SettingsTab>('prices');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [fuelPrices, setFuelPrices] = useState<FuelPrices>({
    petrolPrice: 0,
    dieselPrice: 0,
    lastUpdated: new Date().toISOString()
  });
  const [users, setUsers] = useState<User[]>([]);
  const [systemProfile, setSystemProfile] = useState<SystemProfile>({
    name: 'Fuel Station'
  });

  // Data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load fuel prices
        const pricesRef = doc(db, 'settings', 'fuelPrices');
        const pricesSnap = await getDoc(pricesRef);
        if (pricesSnap.exists()) {
          setFuelPrices(pricesSnap.data() as FuelPrices);
        }

        // Load users
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));

        // Load system profile
        const profileRef = doc(db, 'settings', 'systemProfile');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setSystemProfile(profileSnap.data() as SystemProfile);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <Skeleton.Base width="w-48" height="h-8" className="mb-2" />
            <Skeleton.Base width="w-72" height="h-4" />
          </div>

          <div className="bg-white shadow rounded-lg animate-pulse">
            <div className="border-b border-gray-200 px-6">
              <div className="flex space-x-8">
                {TABS.map((_, i) => (
                  <div key={i} className="py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-gray-200 rounded" />
                      <div className="w-20 h-5 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6">
              <Skeleton.Base width="w-48" height="h-6" className="mb-2" />
              <Skeleton.Base width="w-96" height="h-4" className="mb-8" />
              <Skeleton.Card lines={6} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your station settings and preferences</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Settings">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon 
                      className={`
                        -ml-0.5 mr-2 h-5 w-5 
                        ${activeTab === tab.key ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {TABS.find(t => t.key === activeTab)?.label}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {TABS.find(t => t.key === activeTab)?.description}
              </p>
            </div>

            <div className="bg-white">
              {activeTab === 'prices' && (
                <FuelPricesTab
                  prices={fuelPrices}
                  isLoading={isLoading}
                  error={error}
                  onUpdate={setFuelPrices}
                />
              )}

              {activeTab === 'users' && (
                <UsersTab
                  users={users}
                  isLoading={isLoading}
                  error={error}
                  onUpdate={() => {
                    const usersRef = collection(db, 'users');
                    getDocs(usersRef).then(snap => {
                      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
                    });
                  }}
                />
              )}

              {activeTab === 'profile' && (
                <SystemProfileTab
                  profile={systemProfile}
                  isLoading={isLoading}
                  error={error}
                  onUpdate={setSystemProfile}
                />
              )}

              {activeTab === 'clear' && (
                <ClearDataTab
                  isLoading={isLoading}
                  error={error}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
