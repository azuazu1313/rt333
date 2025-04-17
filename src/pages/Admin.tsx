import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, BarChart2, Settings, PenTool as Tool } from 'lucide-react';
import Header from '../components/Header';
import UserManagement from '../components/admin/UserManagement';
import BookingsManagement from '../components/admin/BookingsManagement';
import Dashboard from '../components/admin/Dashboard';
import PlatformSettings from '../components/admin/PlatformSettings';
import DevTools from '../components/admin/DevTools';
import { useAuth } from '../contexts/AuthContext';

const Admin = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  // Redirect if not admin
  React.useEffect(() => {
    if (userData?.role !== 'admin') {
      navigate('/');
    }
  }, [userData, navigate]);

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users, component: UserManagement },
    { id: 'bookings', label: 'Bookings', icon: Calendar, component: BookingsManagement },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2, component: Dashboard },
    { id: 'settings', label: 'Settings', icon: Settings, component: PlatformSettings },
    { id: 'devtools', label: 'Dev Tools', icon: Tool, component: DevTools }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || UserManagement;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
    </div>
  );
};

export default Admin;