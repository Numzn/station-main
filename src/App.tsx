import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Readings from './pages/Readings';
import Genset from './pages/Genset';
import ShiftRoster from './pages/ShiftRoster';
import Settings from './pages/Settings';
import TankRefill from './pages/TankRefill';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Router basename="/">
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="/signin" element={<SignIn />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="readings" element={<Readings />} />
                  <Route path="genset" element={<Genset />} />
                  <Route path="tank-refill" element={<TankRefill />} />
                  <Route path="shift-roster" element={<ShiftRoster />} />
                  <Route path="settings" element={<Settings />} />
                </Routes>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;