import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface FuelPrices {
  petrolPrice: number;
  dieselPrice: number;
  lastUpdated: string;
}

const TABS = [
  { key: 'prices', label: 'Fuel Prices' },
  { key: 'clear', label: 'Clear Data' },
  { key: 'users', label: 'Users' },
  { key: 'profile', label: 'System Profile' },
];

const Settings = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fuelPrices, setFuelPrices] = useState<FuelPrices>({
    petrolPrice: 0,
    dieselPrice: 0,
    lastUpdated: new Date().toISOString()
  });
  const [activeTab, setActiveTab] = useState<'prices' | 'clear' | 'users' | 'profile'>('prices');

  // User management and system profile state
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'staff' });
  const [editingUserIdx, setEditingUserIdx] = useState<number | null>(null);
  const [systemName, setSystemName] = useState('Fuel Station');
  const [editingSystemName, setEditingSystemName] = useState(false);

  useEffect(() => {
    loadFuelPrices();
    loadUsers();
    loadSystemName();
  }, []);

  const loadFuelPrices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const pricesRef = doc(db, 'settings', 'fuelPrices');
      const pricesSnap = await getDoc(pricesRef);
      
      if (pricesSnap.exists()) {
        setFuelPrices(pricesSnap.data() as FuelPrices);
      }
    } catch (err) {
      setError('Failed to load fuel prices');
      console.error('Error loading fuel prices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const pricesRef = doc(db, 'settings', 'fuelPrices');
      await setDoc(pricesRef, {
        ...fuelPrices,
        lastUpdated: new Date().toISOString()
      });
      setIsEditing(false);
    } catch (err) {
      setError('Failed to save fuel prices');
      console.error('Error saving fuel prices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Adaptive clear data function: add new collection names to this array to clear them automatically
  const DATA_COLLECTIONS = ['readings', 'tankRefills', 'gensetLogs', 'gensetFuel', 'gensetRuntime'];

  const handleClearData = async () => {
    try {
      setIsClearing(true);
      setError(null);

      // Dynamically clear all collections in DATA_COLLECTIONS
      const deletePromises: Promise<any>[] = [];
      for (const col of DATA_COLLECTIONS) {
        const ref = collection(db, col);
        const snap = await getDocs(ref);
        for (const docSnap of snap.docs) {
          deletePromises.push(deleteDoc(docSnap.ref));
        }
      }
      await Promise.all(deletePromises);

      setShowConfirmDialog(false);
      alert('All station data collections have been cleared successfully.');
    } catch (err) {
      setError('Failed to clear data');
      console.error('Error clearing data:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    }
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.phone) return;
    try {
      const usersRef = collection(db, 'users');
      await addDoc(usersRef, newUser);
      setNewUser({ name: '', email: '', phone: '', role: 'staff' });
      loadUsers();
    } catch (err) {
      setError('Failed to add user');
      console.error('Error adding user:', err);
    }
  };

  const updateUser = async (idx: number) => {
    const user = users[idx];
    if (!user.id) return;
    try {
      const userRef = doc(db, 'users', user.id);
      // Only update changed fields, not the whole newUser object
      await updateDoc(userRef, {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      });
      setEditingUserIdx(null);
      setNewUser({ name: '', email: '', phone: '', role: 'staff' });
      loadUsers();
    } catch (err) {
      setError('Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  const deleteUser = async (idx: number) => {
    const user = users[idx];
    if (!user.id) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await deleteDoc(userRef);
      loadUsers();
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const loadSystemName = async () => {
    try {
      const sysRef = doc(db, 'settings', 'systemProfile');
      const sysSnap = await getDoc(sysRef);
      if (sysSnap.exists()) setSystemName(sysSnap.data().name || 'Fuel Station');
    } catch (err) {
      setError('Failed to load system name');
      console.error('Error loading system name:', err);
    }
  };

  const saveSystemName = async () => {
    try {
      const sysRef = doc(db, 'settings', 'systemProfile');
      await setDoc(sysRef, { name: systemName });
      setEditingSystemName(false);
    } catch (err) {
      setError('Failed to save system name');
      console.error('Error saving system name:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <div className="mb-6 flex border-b border-gray-200">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 py-2 px-2 text-sm font-medium border-b-2 transition-colors duration-150 ${activeTab === tab.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-8 text-gray-900">Settings</h2>
                {/* Tab Content */}
                {activeTab === 'prices' && (
                  <div className="mb-8">
                    <div className="mb-4">
                      <label className="block text-gray-700 font-semibold mb-2">Petrol Price (ZMW/L)</label>
                      <input
                        type="number"
                        className="w-full border rounded px-3 py-2"
                        value={fuelPrices.petrolPrice}
                        disabled={!isEditing}
                        onChange={e => setFuelPrices({ ...fuelPrices, petrolPrice: parseFloat(e.target.value) })}
                        min={0}
                        step={0.01}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 font-semibold mb-2">Diesel Price (ZMW/L)</label>
                      <input
                        type="number"
                        className="w-full border rounded px-3 py-2"
                        value={fuelPrices.dieselPrice}
                        disabled={!isEditing}
                        onChange={e => setFuelPrices({ ...fuelPrices, dieselPrice: parseFloat(e.target.value) })}
                        min={0}
                        step={0.01}
                      />
                    </div>
                    <div className="mb-4 text-sm text-gray-500">
                      Last updated: {fuelPrices.lastUpdated ? new Date(fuelPrices.lastUpdated).toLocaleString() : 'N/A'}
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                          onClick={handleSave}
                          disabled={isLoading}
                        >
                          Save
                        </button>
                        <button
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                          onClick={() => { setIsEditing(false); loadFuelPrices(); }}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Prices
                      </button>
                    )}
                    {error && activeTab === 'prices' && <div className="text-red-500 mt-2">{error}</div>}
                  </div>
                )}
                {activeTab === 'clear' && (
                  <div className="pt-8 border-t border-gray-200">
                    <p className="mb-4">This will permanently delete all tank readings data. This action cannot be undone.</p>
                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={isClearing}
                    >
                      {isClearing ? 'Clearing...' : 'Clear All Readings Data'}
                    </button>
                    {showConfirmDialog && (
                      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                        <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
                          <h3 className="text-lg font-bold mb-2">Confirm Data Deletion</h3>
                          <p className="mb-4">Are you sure you want to clear all readings data? This cannot be undone.</p>
                          <div className="flex gap-2">
                            <button
                              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                              onClick={handleClearData}
                              disabled={isClearing}
                            >
                              Yes, Clear Data
                            </button>
                            <button
                              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                              onClick={() => setShowConfirmDialog(false)}
                              disabled={isClearing}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {error && activeTab === 'clear' && <div className="text-red-500 mt-2">{error}</div>}
                  </div>
                )}
                {activeTab === 'users' && (
                  <div className="pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-bold mb-4">Users</h3>
                    <form
                      className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2"
                      onSubmit={e => { e.preventDefault(); addUser(); }}
                    >
                      <input
                        type="text"
                        className="border rounded px-2 py-1 w-full"
                        placeholder="Name"
                        value={newUser.name}
                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                      />
                      <input
                        type="email"
                        className="border rounded px-2 py-1 w-full"
                        placeholder="Email"
                        value={newUser.email}
                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                      />
                      <input
                        type="tel"
                        className="border rounded px-2 py-1 w-full"
                        placeholder="Phone"
                        value={newUser.phone}
                        onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                      />
                      <select
                        className="border rounded px-2 py-1 w-full"
                        value={newUser.role}
                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 w-full"
                      >
                        Add
                      </button>
                    </form>
                    <div className="overflow-x-auto">
                      <table className="min-w-[700px] w-full text-left border mt-4 text-xs sm:text-sm md:text-base">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="py-2 px-4">Name</th>
                            <th className="py-2 px-4">Email</th>
                            <th className="py-2 px-4">Phone</th>
                            <th className="py-2 px-4">Role</th>
                            <th className="py-2 px-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-4 text-gray-400">No users found.</td>
                            </tr>
                          )}
                          {users.map((user, idx) => (
                            <tr key={user.id || idx} className="border-t align-top">
                              {editingUserIdx === idx ? (
                                <>
                                  <td className="py-2 px-2">
                                    <input
                                      type="text"
                                      className="border rounded px-2 py-1 w-full"
                                      value={newUser.name}
                                      onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    />
                                  </td>
                                  <td className="py-2 px-2">
                                    <input
                                      type="email"
                                      className="border rounded px-2 py-1 w-full"
                                      value={newUser.email}
                                      onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    />
                                  </td>
                                  <td className="py-2 px-2">
                                    <input
                                      type="tel"
                                      className="border rounded px-2 py-1 w-full"
                                      value={newUser.phone}
                                      onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                                    />
                                  </td>
                                  <td className="py-2 px-2">
                                    <select
                                      className="border rounded px-2 py-1 w-full"
                                      value={newUser.role}
                                      onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    >
                                      <option value="staff">Staff</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  </td>
                                  <td className="py-2 px-2 flex flex-col gap-2 min-w-[90px]">
                                    <button
                                      className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 mb-1"
                                      onClick={() => updateUser(idx)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      className="bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                                      onClick={() => setEditingUserIdx(null)}
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2 px-2 break-words max-w-[120px]">{user.name}</td>
                                  <td className="py-2 px-2 break-words max-w-[160px]">{user.email}</td>
                                  <td className="py-2 px-2 break-words max-w-[100px]">{user.phone}</td>
                                  <td className="py-2 px-2">{user.role}</td>
                                  <td className="py-2 px-2 flex flex-col gap-2 min-w-[90px]">
                                    <button
                                      className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 mb-1"
                                      onClick={() => { setEditingUserIdx(idx); setNewUser({ name: user.name, email: user.email, phone: user.phone, role: user.role }); }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                      onClick={() => deleteUser(idx)}
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {error && activeTab === 'users' && <div className="text-red-500 mt-2">{error}</div>}
                  </div>
                )}
                {activeTab === 'profile' && (
                  <div className="pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-bold mb-4">System Profile</h3>
                    <div className="mb-4">
                      <label className="block text-gray-700 font-semibold mb-2">System Name</label>
                      {editingSystemName ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="border rounded px-3 py-2"
                            value={systemName}
                            onChange={e => setSystemName(e.target.value)}
                          />
                          <button
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            onClick={saveSystemName}
                          >
                            Save
                          </button>
                          <button
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                            onClick={() => { setEditingSystemName(false); loadSystemName(); }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <span className="text-lg">{systemName}</span>
                          <button
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            onClick={() => setEditingSystemName(true)}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                    {error && activeTab === 'profile' && <div className="text-red-500 mt-2">{error}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;