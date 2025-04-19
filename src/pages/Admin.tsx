import React, { useEffect } from 'react';
import { useNavigate, Routes, Route, Link, Outlet } from 'react-router-dom';
import { Users, Calendar, BarChart2, Settings, PenTool as Tool, AlertTriangle, ArrowLeft, Menu } from 'lucide-react';
import Header from '../components/Header';
import UserManagement from '../components/admin/UserManagement';
import BookingsManagement from '../components/admin/BookingsManagement';
import Dashboard from '../components/admin/Dashboard';
import PlatformSettings from '../components/admin/PlatformSettings';
import DevTools from '../components/admin/DevTools';
import { useAuth } from '../hooks/useAuth';
import { Toaster } from '../components/ui/toaster';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = () => {
  const navigate = useNavigate();
  const { userData, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && userData?.user_role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [userData, loading, navigate]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2, path: '/admin' },
    { id: 'users', label: 'User Management', icon: Users, path: '/admin/users' },
    { id: 'bookings', label: 'Bookings', icon: Calendar, path: '/admin/bookings' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
    { id: 'devtools', label: 'Dev Tools', icon: Tool, path: '/admin/dev-tools' }
  ];

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

          <div className="flex flex-col md:flex-row">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden mb-4 p-2 text-gray-600 hover:text-blue-600 transition-colors"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Sidebar */}
            <AnimatePresence>
              {(isSidebarOpen || window.innerWidth >= 768) && (
                <motion.div
                  initial={{ x: -300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={`
                    ${isSidebarOpen ? 'fixed inset-0 bg-white z-50 md:relative md:bg-transparent' : ''}
                    w-64 md:w-64 md:pr-8
                  `}
                >
                  <div className="p-4 md:p-0">
                    <h1 className="text-2xl font-bold mb-8">Admin Portal</h1>
                    <nav className="space-y-1">
                      {tabs.map(tab => (
                        <Link
                          key={tab.id}
                          to={tab.path}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md 
                          ${location.pathname === tab.path
                              ? 'bg-blue-100 text-blue-600'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <tab.icon className="mr-3 h-5 w-5" />
                          {tab.label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 mt-4 md:mt-0">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {/* Toast Container */}
      <Toaster />
    </div>
  );
};

const Admin = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="bookings" element={<BookingsManagement />} />
        <Route path="settings" element={<PlatformSettings />} />
        <Route path="dev-tools" element={<DevTools />} />
      </Route>
    </Routes>
  );
};

export default Admin;