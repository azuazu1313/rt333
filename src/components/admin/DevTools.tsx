import React, { useState, useEffect } from 'react';
import { Copy, Loader2, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';
import { format } from 'date-fns';

interface InviteLink {
  id: string;
  code: string;
  role: 'admin' | 'support' | 'driver';
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
  created_by: string;
  creator?: {
    name: string;
    email: string;
  };
}

const DevTools = () => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'support' | 'driver'>('admin');
  const [expiresIn, setExpiresIn] = useState('24');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchInviteLinks = async () => {
    try {
      setIsRefreshing(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('invite_links')
        .select('*, creator:users!invite_links_created_by_fkey(name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInviteLinks(data || []);
    } catch (err) {
      console.error('Error fetching invite links:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch invite links",
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInviteLinks();
  }, []);

  const generateInviteLink = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Not authenticated');
      }

      // Generate a random code
      const code = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);

      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));

      // Insert the invite link
      const { error: insertError } = await supabase
        .from('invite_links')
        .insert({
          code,
          role: selectedRole,
          expires_at: expiresAt.toISOString(),
          created_by: userData.user.id // Add the current user's ID
        });

      if (insertError) throw insertError;

      // Generate the full URL
      const signupUrl = new URL('/customer-signup', window.location.origin);
      signupUrl.searchParams.set('invite', code);
      
      setGeneratedLink(signupUrl.toString());
      
      toast({
        title: "Success",
        description: "Invite link generated successfully!",
      });

      // Refresh the list
      fetchInviteLinks();
    } catch (err) {
      console.error('Error generating invite link:', err);
      setError('Failed to generate invite link. Please try again.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate invite link",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Success",
        description: "Link copied to clipboard!",
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy link",
      });
    }
  };

  const deleteInviteLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invite_links')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invite link deleted successfully",
      });

      // Refresh the list
      fetchInviteLinks();
    } catch (err) {
      console.error('Error deleting invite link:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete invite link",
      });
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Developer Tools</h2>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Sign-Up Link Generator</h3>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 flex items-start">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="ml-2">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'support' | 'driver')}
              className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="admin">Admin</option>
              <option value="support">Support Agent</option>
              <option value="driver">Driver</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires In (hours)
            </label>
            <input
              type="number"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              min="1"
              max="168"
              className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            onClick={generateInviteLink}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : 'Generate Link'}
          </button>

          {generatedLink && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generated Link
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-l-md bg-gray-50"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-md hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This link will expire in {expiresIn} hours and can only be used once.
              </p>
            </div>
          )}
        </div>

        {/* Active Invite Links */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Active Invite Links</h3>
            <button
              onClick={() => fetchInviteLinks()}
              disabled={isRefreshing}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : inviteLinks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No invite links found</p>
          ) : (
            <div className="space-y-4">
              {inviteLinks.map((link) => (
                <div key={link.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Role: <span className="capitalize">{link.role}</span></p>
                      <p className="text-sm text-gray-600">Code: {link.code}</p>
                      <p className="text-sm text-gray-600">
                        Created: {format(new Date(link.created_at), 'PPp')}
                      </p>
                      {link.expires_at && (
                        <p className="text-sm text-gray-600">
                          Expires: {format(new Date(link.expires_at), 'PPp')}
                        </p>
                      )}
                      {link.used_at && (
                        <p className="text-sm text-gray-600">
                          Used: {format(new Date(link.used_at), 'PPp')}
                        </p>
                      )}
                      {link.creator && (
                        <p className="text-sm text-gray-600">
                          Created by: {link.creator.name} ({link.creator.email})
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteInviteLink(link.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete invite link"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevTools;
