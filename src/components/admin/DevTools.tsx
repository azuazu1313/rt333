import React, { useState } from 'react';
import { Copy, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';

const DevTools = () => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'support' | 'driver'>('admin');
  const [expiresIn, setExpiresIn] = useState('24'); // hours
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateInviteLink = async () => {
    try {
      setIsGenerating(true);
      setError(null);

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
          expires_at: expiresAt.toISOString()
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
      </div>
    </div>
  );
};

export default DevTools;