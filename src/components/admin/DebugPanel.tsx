import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const DebugPanel = () => {
  const [jwtData, setJwtData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showJwt, setShowJwt] = useState(false);
  const { userData, refreshSession } = useAuth();
  
  const fetchJwtData = async () => {
    setLoading(true);
    try {
      // Get the current session
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Get the JWT claims using the debug function
      const { data, error } = await supabase
        .rpc('debug_jwt');
        
      if (error) throw error;
      
      setJwtData({
        session: sessionData.session,
        claims: data,
        userData
      });
    } catch (error) {
      console.error('Error fetching JWT data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefreshSession = async () => {
    setLoading(true);
    try {
      await refreshSession();
      await fetchJwtData();
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchJwtData();
  }, []);
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
        <span>JWT Debug Panel</span>
        <button
          onClick={() => setShowJwt(!showJwt)}
          className="p-1 rounded-md hover:bg-gray-100"
          title={showJwt ? "Hide JWT Data" : "Show JWT Data"}
        >
          {showJwt ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </h3>
      
      {loading ? (
        <div className="flex justify-center items-center h-20">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {showJwt && jwtData ? (
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">User Data from Database</h4>
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(jwtData.userData, null, 2)}
                </pre>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">JWT Claims</h4>
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(jwtData.claims, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">JWT data {showJwt ? "not available" : "hidden"}. Click the refresh button to update.</p>
          )}
          
          <div className="flex justify-end mt-4">
            <button 
              onClick={handleRefreshSession} 
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 inline-block animate-spin" />
                  Refreshing...
                </>
              ) : "Refresh JWT Claims"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DebugPanel;