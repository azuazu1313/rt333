import React, { useState, useEffect, useRef } from 'react';
import { Loader2, RefreshCw, Copy, Trash2, Download, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../ui/use-toast';

// Define log entry interface
interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  userAgent?: string;
  url?: string;
  sessionId?: string;
  additionalData?: object;
}

// Create sample logs for demonstration
const generateSampleLogs = (): LogEntry[] => {
  const now = new Date();
  const logs: LogEntry[] = [];

  const messages = [
    { level: 'info', message: 'User logged in successfully' },
    { level: 'info', message: 'Booking created for user' },
    { level: 'warn', message: 'User attempted to access unauthorized resource' },
    { level: 'error', message: 'Failed to fetch user data: Network error' },
    { level: 'error', message: 'Payment processing failed: Card declined' },
    { level: 'debug', message: 'Rendering component with props' },
    { level: 'info', message: 'Email notification sent to user' },
    { level: 'warn', message: 'API rate limit approaching threshold' },
    { level: 'error', message: 'Uncaught TypeError: Cannot read property of undefined' },
    { level: 'debug', message: 'State updated: {"isLoading":false,"data":[]}' },
    { level: 'info', message: 'New user registered: johndoe@example.com' },
    { level: 'warn', message: 'Legacy API endpoint used, consider upgrading' },
    { level: 'error', message: 'Database query timeout after 30s' },
    { level: 'debug', message: 'Auth token refresh attempted' },
    { level: 'info', message: 'User logged out' },
  ];

  const userNames = ['John Doe', 'Jane Smith', 'Robert Johnson', 'Maria Garcia', 'Anonymous'];
  const userIds = ['usr_123456', 'usr_234567', 'usr_345678', 'usr_456789', null];
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 12; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36',
  ];
  
  const urls = [
    '/admin/dashboard',
    '/admin/users',
    '/partner/trips',
    '/login',
    '/admin/bookings',
  ];

  // Generate random logs
  for (let i = 0; i < 50; i++) {
    const msgIndex = Math.floor(Math.random() * messages.length);
    const userIndex = Math.floor(Math.random() * userNames.length);
    const uaIndex = Math.floor(Math.random() * userAgents.length);
    const urlIndex = Math.floor(Math.random() * urls.length);
    
    // Create log with random timestamp within the last 24 hours
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    
    // Create some additional data for certain logs
    let additionalData = undefined;
    if (Math.random() > 0.7) {
      additionalData = {
        component: ['Dashboard', 'UserTable', 'LoginForm', 'BookingModal'][Math.floor(Math.random() * 4)],
        duration: Math.floor(Math.random() * 1000),
        status: [200, 400, 500, 201, 403][Math.floor(Math.random() * 5)]
      };
    }

    logs.push({
      id: `log_${i}_${Date.now()}`,
      level: messages[msgIndex].level as 'info' | 'warn' | 'error' | 'debug',
      message: messages[msgIndex].message,
      timestamp: timestamp.toISOString(),
      userId: userIds[userIndex],
      userName: userNames[userIndex],
      userAgent: userAgents[uaIndex],
      url: urls[urlIndex],
      sessionId: `sess_${Math.random().toString(36).substring(2, 10)}`,
      additionalData
    });
  }

  // Sort by timestamp (newest first)
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const ConsoleLogStream: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [isParsingLogs, setIsParsingLogs] = useState(false);
  const [uploadedLogs, setUploadedLogs] = useState<string | null>(null);
  
  const liveModeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate initial log fetch
    fetchLogs();

    return () => {
      if (liveModeIntervalRef.current) {
        clearInterval(liveModeIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Filter logs when search or level filter changes
    filterLogs();
  }, [logs, searchQuery, selectedLevel]);

  useEffect(() => {
    // Handle live mode
    if (liveMode) {
      if (liveModeIntervalRef.current) {
        clearInterval(liveModeIntervalRef.current);
      }
      
      // Add a new log every 3 seconds
      liveModeIntervalRef.current = setInterval(() => {
        const randomLogEntry = generateRandomLogEntry();
        setLogs(prevLogs => [randomLogEntry, ...prevLogs]);
        
        // Keep the latest 100 logs only
        if (logs.length > 100) {
          setLogs(prevLogs => prevLogs.slice(0, 100));
        }
        
        // Auto-scroll to top if container exists
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = 0;
        }
      }, 3000);
    } else if (liveModeIntervalRef.current) {
      clearInterval(liveModeIntervalRef.current);
    }
    
    return () => {
      if (liveModeIntervalRef.current) {
        clearInterval(liveModeIntervalRef.current);
      }
    };
  }, [liveMode, logs.length]);

  const fetchLogs = () => {
    setLoading(true);
    setRefreshing(true);
    
    // Simulate API fetch delay
    setTimeout(() => {
      const sampleLogs = generateSampleLogs();
      setLogs(sampleLogs);
      setLoading(false);
      setRefreshing(false);
    }, 1000);
  };

  const filterLogs = () => {
    let filtered = [...logs];
    
    // Apply level filter
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.userName?.toLowerCase().includes(query) ||
        log.userId?.toLowerCase().includes(query) ||
        log.url?.toLowerCase().includes(query) ||
        (log.additionalData && JSON.stringify(log.additionalData).toLowerCase().includes(query))
      );
    }
    
    setFilteredLogs(filtered);
  };

  const generateRandomLogEntry = (): LogEntry => {
    const levels = ['info', 'warn', 'error', 'debug'] as const;
    const level = levels[Math.floor(Math.random() * levels.length)];
    
    const messages = {
      info: ['User action completed', 'Page loaded successfully', 'Data fetched', 'Cache updated'],
      warn: ['Slow response time detected', 'Deprecated method used', 'Network latency high', 'Cache miss'],
      error: ['Failed to load resource', 'API request failed', 'Uncaught exception', 'Authentication failed'],
      debug: ['Component rendered', 'State updated', 'Effect triggered', 'Event handler fired']
    };
    
    const message = messages[level][Math.floor(Math.random() * messages[level].length)];
    
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      level,
      message,
      timestamp: new Date().toISOString(),
      userId: Math.random() > 0.3 ? `user_${Math.random().toString(36).substring(2, 9)}` : undefined,
      userName: Math.random() > 0.3 ? ['John', 'Jane', 'Alice', 'Bob'][Math.floor(Math.random() * 4)] + ' ' + 
                                    ['Smith', 'Johnson', 'Williams', 'Brown'][Math.floor(Math.random() * 4)] : undefined,
      url: Math.random() > 0.2 ? ['/admin', '/partner', '/login', '/dashboard'][Math.floor(Math.random() * 4)] : undefined,
      additionalData: Math.random() > 0.7 ? { 
        timestamp: Date.now(),
        component: ['Header', 'Sidebar', 'Table', 'Form'][Math.floor(Math.random() * 4)]
      } : undefined
    };
  };

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
    toast({
      title: "Logs Cleared",
      description: "All logs have been cleared from the view.",
    });
  };

  const toggleExpandLog = (id: string) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
  };

  const handleCopyLog = async (log: LogEntry) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      toast({
        title: "Copied to Clipboard",
        description: "Log entry copied to clipboard",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy log to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsParsingLogs(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setUploadedLogs(content);
        
        // Try to parse as JSON
        try {
          const parsedLogs = JSON.parse(content);
          if (Array.isArray(parsedLogs)) {
            // Validate and convert to our log format
            const validLogs = parsedLogs
              .filter((log) => log && typeof log === 'object' && log.message)
              .map((log) => ({
                id: log.id || `imported_${Math.random().toString(36).substring(2)}`,
                level: (log.level || 'info') as 'info' | 'warn' | 'error' | 'debug',
                message: log.message || 'Unknown message',
                timestamp: log.timestamp || new Date().toISOString(),
                userId: log.userId,
                userName: log.userName,
                userAgent: log.userAgent,
                url: log.url,
                sessionId: log.sessionId,
                additionalData: log.additionalData
              }));
              
            if (validLogs.length > 0) {
              setLogs(validLogs);
              toast({
                title: "Logs Imported",
                description: `Successfully imported ${validLogs.length} log entries`,
                variant: "success",
              });
            } else {
              throw new Error("No valid logs found in the file");
            }
          } else {
            throw new Error("Uploaded file does not contain a valid array of logs");
          }
        } catch (jsonError) {
          // If not valid JSON, try to parse as console logs
          const lines = content.split('\n').filter(line => line.trim());
          
          if (lines.length > 0) {
            // Extract logs from console format (simple heuristics)
            const parsedLogs = lines.map((line, index) => {
              // Try to detect log level
              let level: 'info' | 'warn' | 'error' | 'debug' = 'info';
              if (line.includes('[ERROR]') || line.toLowerCase().includes('error')) level = 'error';
              else if (line.includes('[WARN]') || line.toLowerCase().includes('warn')) level = 'warn';
              else if (line.includes('[DEBUG]') || line.toLowerCase().includes('debug')) level = 'debug';
              
              return {
                id: `imported_${index}_${Math.random().toString(36).substring(2)}`,
                level,
                message: line,
                timestamp: new Date().toISOString(),
                additionalData: { rawLog: line }
              };
            });
            
            setLogs(parsedLogs);
            toast({
              title: "Text Logs Imported",
              description: `Imported ${parsedLogs.length} log entries from text format`,
              variant: "success",
            });
          } else {
            throw new Error("No valid log lines found in the file");
          }
        }
      } catch (error: any) {
        toast({
          title: "Import Failed",
          description: error.message || "Failed to parse log file",
          variant: "destructive",
        });
      } finally {
        setIsParsingLogs(false);
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Import Failed",
        description: "Error reading the file",
        variant: "destructive",
      });
      setIsParsingLogs(false);
    };
    
    reader.readAsText(file);
  };

  const exportLogs = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : logs;
    
    // Create JSON file
    const blob = new Blob([JSON.stringify(logsToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Logs Exported",
      description: `Exported ${logsToExport.length} log entries to JSON file`,
      variant: "success",
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'debug':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
      case 'info':
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm:ss.SSS');
    } catch {
      return 'Invalid date';
    }
  };

  const toggleLiveMode = () => {
    setLiveMode(!liveMode);
    
    if (!liveMode) {
      toast({
        title: "Live Mode Activated",
        description: "New logs will be generated every few seconds",
        variant: "success",
      });
    } else {
      toast({
        title: "Live Mode Deactivated",
        description: "Log generation stopped",
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold dark:text-white">Console Log Stream</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and analyze frontend console logs from users
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center">
          <div className="relative flex-1 mr-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLogs}
            disabled={refreshing || loading}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={clearLogs}
            disabled={logs.length === 0 || loading}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Clear
          </button>
          
          <button
            onClick={toggleLiveMode}
            className={`px-3 py-2 rounded-md flex items-center ${
              liveMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <span className={`relative flex h-3 w-3 mr-2 ${liveMode ? 'opacity-100' : 'opacity-40'}`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${liveMode ? 'bg-green-400 opacity-75' : 'bg-gray-400 opacity-50'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${liveMode ? 'bg-green-500' : 'bg-gray-500'}`}></span>
            </span>
            {liveMode ? 'Live (On)' : 'Live Mode'}
          </button>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Import/Export</h3>
            <div className="flex items-center space-x-2">
              <label className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Import Logs
                <input
                  type="file"
                  accept=".json,.txt,.log"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={exportLogs}
                disabled={logs.length === 0}
                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center disabled:opacity-50"
              >
                <Download className="w-5 h-5 mr-2" />
                Export Logs
              </button>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {filteredLogs.length} logs displayed (of {logs.length} total)
            </p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-700">
        <div className="overflow-x-auto" ref={logContainerRef} style={{ maxHeight: '600px' }}>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Filter className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No logs found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {logs.length > 0 
                  ? 'Try changing your search criteria or filters'
                  : 'Enable live mode or import logs to get started'}
              </p>
              {logs.length === 0 && (
                <button
                  onClick={toggleLiveMode}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Start Live Mode
                </button>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">
                    Level
                  </th>
                  <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Message
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="relative px-6 py-3 w-10">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      onClick={() => toggleExpandLog(log.id)}
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        expandedLogId === log.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="px-2 py-4 whitespace-nowrap">
                        <span className={`uppercase text-xs font-medium px-2 py-1 rounded-full ${getLevelColor(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {formatTime(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white break-all">
                        <div className="max-w-lg truncate">{log.message}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.userName ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{log.userName}</div>
                            {log.userId && <div className="text-xs">{log.userId}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLog(log);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          <Copy className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded row */}
                    {expandedLogId === log.id && (
                      <tr className="bg-blue-50 dark:bg-blue-900/20">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-blue-100 dark:border-blue-800 overflow-hidden">
                            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800 flex justify-between">
                              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Log Details</h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyLog(log);
                                }}
                                className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 text-sm"
                              >
                                <Copy className="h-4 w-4 inline-block mr-1" />
                                Copy JSON
                              </button>
                            </div>
                            <div className="p-4 space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Timestamp (ISO)</p>
                                  <p className="text-sm text-gray-900 dark:text-white font-mono">{log.timestamp}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Session ID</p>
                                  <p className="text-sm text-gray-900 dark:text-white font-mono">{log.sessionId || 'N/A'}</p>
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">URL</p>
                                <p className="text-sm text-gray-900 dark:text-white">{log.url || 'N/A'}</p>
                              </div>
                              
                              {log.userAgent && (
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">User Agent</p>
                                  <p className="text-sm text-gray-900 dark:text-white break-all">{log.userAgent}</p>
                                </div>
                              )}
                              
                              {log.additionalData && (
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Additional Data</p>
                                  <pre className="text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-2 rounded-md overflow-x-auto mt-1">
                                    {JSON.stringify(log.additionalData, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">How to use Console Log Stream</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              This tool simulates streaming console logs from your users' browsers. In a real implementation, 
              you would need to add a client-side logger to capture and send logs to your server.
              Consider adding logger libraries like winston or pino on the server side, and a browser SDK to capture and transmit client-side logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Upload component that's missing in the imports
const Upload = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
};

const Info = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
};

export default ConsoleLogStream;