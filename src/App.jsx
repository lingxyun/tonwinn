
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Orders from './pages/Orders';
import Accounts from './pages/Accounts';

import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { PrivacyProvider } from './context/PrivacyContext';
import Settings from './pages/Settings';

import { DataProvider } from './context/DataContext';
import Login from './pages/Login';
import Categories from './pages/Categories';
import { Toaster } from 'sonner';

import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';
import AuthorizationOverlay from './components/auth/AuthorizationOverlay';

import SearchModal from './components/dashboard/SearchModal';

function App() {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <HashRouter>
      <AuthProvider>
        <SettingsProvider>
          <PrivacyProvider>
            <DataProvider>
              <AuthorizationOverlay>
                <Routes>
                  <Route path="/login" element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  } />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="suppliers" element={<Suppliers />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/categories" element={<Categories />} />
                    <Route path="accounts" element={<Accounts />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Routes>
                <Toaster position="top-center" richColors />
                <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
              </AuthorizationOverlay>
            </DataProvider>
          </PrivacyProvider>
        </SettingsProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
