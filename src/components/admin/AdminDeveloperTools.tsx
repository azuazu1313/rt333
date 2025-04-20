import React, { useState } from 'react';
import DatabaseBrowser from './DatabaseBrowser';
import FeatureFlags from './FeatureFlags';
import SystemStatus from './SystemStatus';
import InviteLinks from './InviteLinks';
import { Database, Flag, Activity, Link } from 'lucide-react';

const tabs = [
  { id: 'database', label: 'Database Browser', icon: Database },
  { id: 'feature-flags', label: 'Feature Flags', icon: Flag },
  { id: 'system-status', label: 'System Status', icon: Activity },
  { id: 'invite-links', label: 'Invite Links', icon: Link }
];

const AdminDeveloperTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState('database');

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold dark:text-white mb-2">Developer Tools</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Advanced tools for development and debugging
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 flex items-center text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-8">
        {activeTab === 'database' && <DatabaseBrowser />}
        {activeTab === 'feature-flags' && <FeatureFlags />}
        {activeTab === 'system-status' && <SystemStatus />}
        {activeTab === 'invite-links' && <InviteLinks />}
      </div>
    </div>
  );
};

export default AdminDeveloperTools;