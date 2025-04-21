// Edge function to fetch logs from various Supabase services
// Since this accesses admin-only resources, it needs Service Role permissions

import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface FetchLogsRequest {
  source: string;
  timeRange: '15m' | '1h' | '6h' | '24h' | '7d';
  limit: number;
}

// Map time ranges to milliseconds
const timeRangeToMs = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000
};

// Create Supabase admin client with service role
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  {
    auth: {
      persistSession: false,
    }
  }
);

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Extract authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header is required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify JWT and check admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the user is an admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("user_role")
      .eq("id", user.id)
      .single();
      
    if (userError || userData?.user_role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin permissions required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { source = 'all', timeRange = '1h', limit = 100 }: FetchLogsRequest = await req.json();

    // Calculate time range for log retrieval
    const startTime = new Date(Date.now() - timeRangeToMs[timeRange]).toISOString();
    
    // Mock logs for demonstration
    // In a real implementation, you would:
    // 1. Use the Supabase API to fetch logs
    // 2. Format them according to the expected structure
    // 3. Return them to the client
    
    // Generate mock logs for the requested source/service
    let logs = [];
    let totalCount = 0;
    
    // Different log types based on the service
    const generateMockLogs = (service: string, count: number) => {
      const levels = ['info', 'warn', 'error', 'debug'];
      const now = Date.now();
      
      const timeWindow = timeRangeToMs[timeRange];
      
      // Service-specific log templates
      const messageTemplates: Record<string, string[]> = {
        'edge': [
          'Request processed successfully',
          'Rate limit approaching for IP: 192.168.1.{0-255}',
          'Request blocked due to rate limiting',
          'Response sent with status {200-500}',
          'Invalid request format received'
        ],
        'postgres': [
          'Query executed in {0.001-2.500}s',
          'Slow query detected: SELECT * FROM {table}',
          'Connection pool at {50-100}% capacity',
          'Database vacuum completed',
          'Transaction rolled back after timeout'
        ],
        'postgrest': [
          'API request to {endpoint} completed',
          'Auth request processed',
          'Invalid JWT token in request',
          'Table {table} queried successfully',
          'Request parsing error'
        ],
        'pooler': [
          'New connection established',
          'Connection closed after {10-600}s idle',
          'Connection limit reached',
          'Client connection terminated unexpectedly',
          'Connection pool statistics updated'
        ],
        'auth': [
          'User {id} successfully authenticated',
          'Failed login attempt for {email}',
          'Password reset requested',
          'New user registered',
          'JWT token refreshed'
        ],
        'storage': [
          'File {filename} uploaded successfully',
          'Unauthorized access attempt to bucket {bucket}',
          'File {filename} deleted',
          'Storage quota at {60-95}%',
          'Bucket {bucket} created'
        ],
        'realtime': [
          'New client connected to channel {channel}',
          'Client disconnected from channel {channel}',
          'Broadcast to {5-50} clients',
          'Subscription established',
          'Channel capacity warning'
        ],
        'edge-functions': [
          'Function {name} invoked',
          'Function {name} completed in {50-2000}ms',
          'Function {name} exceeded timeout',
          'Memory usage warning for function {name}',
          'Function {name} error: {message}'
        ],
        'pgcron': [
          'Job {name} started at {timestamp}',
          'Job {name} completed successfully',
          'Job {name} failed with error',
          'Job schedule modified',
          'New cron job registered'
        ]
      };
      
      // Default messages for 'all' or unknown services
      const defaultMessages = [
        'System event logged',
        'Service health check',
        'Configuration updated',
        'Resource usage statistics updated',
        'Maintenance operation completed'
      ];
      
      const randomLogs = [];
      
      for (let i = 0; i < count; i++) {
        const level = levels[Math.floor(Math.random() * levels.length)];
        const templateService = service === 'all' 
          ? Object.keys(messageTemplates)[Math.floor(Math.random() * Object.keys(messageTemplates).length)]
          : service;
          
        const messages = messageTemplates[templateService] || defaultMessages;
        const messageTemplate = messages[Math.floor(Math.random() * messages.length)];
        
        // Replace placeholders in the message template
        const message = messageTemplate.replace(/\{([^}]+)\}/g, (match, p1) => {
          if (p1.includes('-')) {
            // Range like {0-100}
            const [min, max] = p1.split('-').map(Number);
            return Math.floor(Math.random() * (max - min + 1) + min).toString();
          }
          // For simplicity, other placeholders become random values
          if (p1 === 'id') return `usr_${Math.random().toString(36).substring(2, 10)}`;
          if (p1 === 'email') return `user${Math.floor(Math.random() * 100)}@example.com`;
          if (p1 === 'table') return ['users', 'posts', 'products', 'orders'][Math.floor(Math.random() * 4)];
          if (p1 === 'endpoint') return ['/auth', '/rest/v1/users', '/rest/v1/items', '/storage/v1/object'][Math.floor(Math.random() * 4)];
          if (p1 === 'filename') return [`file${Math.floor(Math.random() * 100)}.jpg`, `document${Math.floor(Math.random() * 100)}.pdf`][Math.floor(Math.random() * 2)];
          if (p1 === 'bucket') return ['public', 'private', 'uploads', 'assets'][Math.floor(Math.random() * 4)];
          if (p1 === 'channel') return ['presence', 'updates', 'notifications', 'chat'][Math.floor(Math.random() * 4)];
          if (p1 === 'name') return [`function${Math.floor(Math.random() * 10)}`, 'auth-webhook', 'process-uploads', 'send-email'][Math.floor(Math.random() * 4)];
          if (p1 === 'timestamp') return new Date(now - Math.random() * timeWindow).toISOString();
          if (p1 === 'message') return ['Timeout exceeded', 'Memory limit reached', 'Invalid input', 'Access denied'][Math.floor(Math.random() * 4)];
          return p1;
        });
        
        const timestamp = new Date(now - Math.random() * timeWindow).toISOString();
        const actualService = service === 'all' ? templateService : service;
        
        randomLogs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          level,
          message,
          timestamp,
          service: actualService,
          sessionId: `sess_${Math.random().toString(36).substring(2, 10)}`,
          userId: Math.random() > 0.7 ? `usr_${Math.random().toString(36).substring(2, 10)}` : undefined
        });
      }
      
      return randomLogs;
    };
    
    if (source === 'all') {
      // Generate logs for all services
      const services = Object.keys(timeRangeToMs);
      const logsPerService = Math.ceil(limit / services.length);
      totalCount = 1000 + Math.floor(Math.random() * 5000); // Random large number for total
      
      for (const svc of Object.keys(timeRangeToMs)) {
        logs = logs.concat(generateMockLogs(svc, logsPerService));
      }
      
      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Limit to requested amount
      logs = logs.slice(0, limit);
    } else {
      // Generate logs for just the requested service
      totalCount = 200 + Math.floor(Math.random() * 800); // Random medium number for total
      logs = generateMockLogs(source, limit);
      
      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return new Response(
      JSON.stringify({ 
        logs,
        total: totalCount,
        source,
        timeRange
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error handling request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while fetching logs",
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});