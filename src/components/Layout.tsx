import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HomeIcon, 
  ChartBarIcon, 
  CogIcon, 
  CalendarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Skeleton from './LoadingSkeleton';
import { FaTablet } from 'react-icons/fa';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout, loading } = useAuth();

  // Automatically close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navigation = [
    { name: 'Home', href: '/dashboard', icon: HomeIcon },
    { name: 'Readings', href: '/dashboard/readings', icon: ChartBarIcon },
    { name: 'Genset', href: '/dashboard/genset', icon: CogIcon },
    { name: 'Tank Refill', href: '/dashboard/tank-refill', icon: ChartBarIcon },
    { name: 'Katima Engen', href: '/dashboard/katima-engen', icon: FaTablet }, // ADDED
    { name: 'Shift Roster', href: '/dashboard/shift-roster', icon: CalendarIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
  ];

  const renderNavigationItem = (item: typeof navigation[0]) => {
    if (loading) {
      return (
        <div key={item.name} className="px-2 py-2">
          <Skeleton.Base height="h-8" />
        </div>
      );
    }
    return (
      <Link
        key={item.name}
        to={item.href}
        className={`group flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-150 ${
          location.pathname === item.href
            ? 'bg-cyan-100 text-cyan-900 shadow'
            : 'text-gray-600 hover:bg-cyan-50 hover:text-cyan-900'
        }`}
        style={{ minHeight: 48 }}
      >
        <item.icon
          className={`mr-3 h-6 w-6 flex-shrink-0 ${
            location.pathname === item.href ? 'text-cyan-500' : 'text-gray-400 group-hover:text-cyan-500'
          }`}
        />
        {item.name}
      </Link>
    );
  };

  // Bottom navigation for mobile
  const bottomNav = (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex justify-around items-center py-2 shadow-lg lg:hidden">
      {navigation.slice(0, 4).map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={`flex flex-col items-center text-xs ${location.pathname === item.href ? 'text-cyan-600' : 'text-gray-400 hover:text-cyan-600'}`}
        >
          <item.icon className="h-6 w-6 mb-0.5" />
          {item.name.split(' ')[0]}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar with slide-in animation */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${sidebarOpen ? 'block' : 'pointer-events-none'}`}> 
        <div className={`fixed inset-0 bg-black bg-opacity-40 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setSidebarOpen(false)} />
        <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-cyan-700">Fuel Station</h2>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
              title="Close menu"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map(item => renderNavigationItem(item))}
          </nav>
          <div className="border-t border-gray-200 p-4 flex items-center gap-2">
            {loading ? (
              <Skeleton.Base width="w-32" height="h-6" />
            ) : (
              <>
                <div className="flex-shrink-0 rounded-full bg-cyan-100 w-8 h-8 flex items-center justify-center text-cyan-700 font-bold">
                  {user?.email?.[0]?.toUpperCase() || <span>?</span>}
                </div>
                <span className="text-sm text-gray-500 truncate">{user?.email}</span>
                <button
                  onClick={() => logout()}
                  className="ml-auto text-sm text-red-600 hover:text-red-700"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex h-16 items-center px-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-cyan-700">Fuel Station</h2>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map(item => renderNavigationItem(item))}
          </nav>
          <div className="border-t border-gray-200 p-4 flex items-center gap-2">
            {loading ? (
              <Skeleton.Base width="w-32" height="h-6" />
            ) : (
              <>
                <div className="flex-shrink-0 rounded-full bg-cyan-100 w-8 h-8 flex items-center justify-center text-cyan-700 font-bold">
                  {user?.email?.[0]?.toUpperCase() || <span>?</span>}
                </div>
                <span className="text-sm text-gray-500 truncate">{user?.email}</span>
                <button
                  onClick={() => logout()}
                  className="ml-auto text-sm text-red-600 hover:text-red-700"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 pb-16">
        <div className="sticky top-0 z-30 flex h-16 flex-shrink-0 bg-white shadow lg:hidden">
          <button
            type="button"
            className="px-4 text-cyan-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            title="Open menu"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <h2 className="text-lg font-semibold text-cyan-700">Fuel Station</h2>
          </div>
        </div>
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      {bottomNav}
    </div>
  );
};

export default Layout;