import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, BarChart2, Settings, PenTool as Tool, AlertTriangle, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import UserManagement from '../components/admin/UserManagement';
import BookingsManagement from '../components/admin/BookingsManagement';
import Dashboard from '../components/admin/Dashboard';
import PlatformSettings from '../components/admin/PlatformSettings';
import DevTools from '../components/admin/DevTools';
import { useAuth } from '../contexts/AuthContext';
import { Toaster } from '../components/ui/toaster';

const Admin = () => {
  const navigate = useNavigate();
  const { userData, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && userData?.user_role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [userData, loading, navigate]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2, component: Dashboard },
    { id: 'users', label: 'User Management', icon: Users, component: UserManagement },
    { id: 'bookings', label: 'Bookings', icon: Calendar, component: BookingsManagement },
    { id: 'settings', label: 'Settings', icon: Settings, component: PlatformSettings },
    { id: 'devtools', label: 'Dev Tools', icon: Tool, component: DevTools }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Dashboard;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p>Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back to Site Button */}
          <button
            onClick={() => navigate('/')}
            className="mb-8 flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Site
          </button>

          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 pr-8">
              <h1 className="text-2xl font-bold mb-8">Admin Portal</h1>
              <nav className="space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="mr-3 h-5 w-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </main>

      {/* Toast Container */}
      <Toaster />
    </div>
  );
};

export default Admin;
