import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { supabase } from '../lib/supabase';

const CustomerSignup = () => {
  const navigate = useNavigate();
  const { signUp, user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateInviteCode = async (code: string) => {
    try {
      const { data: invite, error } = await supabase
        .from('invite_links')
        .select('*')
        .eq('code', code)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      if (!invite) throw new Error('Invalid or expired invite code');

      // Check if invite has expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        // Mark as expired
        await supabase
          .from('invite_links')
          .update({ status: 'expired' })
          .eq('id', invite.id);
          
        throw new Error('Invite link has expired');
      }

      return invite;
    } catch (error: any) {
      console.error('Error validating invite code:', error);
      throw new Error(error.message || 'Invalid invite code');
    }
  };

  const markInviteAsUsed = async (inviteId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('invite_links')
        .update({
          used_at: new Date().toISOString(),
          used_by: userId,
          status: 'used'
        })
        .eq('id', inviteId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking invite as used:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Form validation
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords don't match!");
      }

      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters long!");
      }

      if (formData.name.trim() === '') {
        throw new Error("Please enter your name");
      }

      setIsSubmitting(true);
      
      let userRole = 'customer';
      let inviteData = null;

      // Validate invite code if present
      if (inviteCode) {
        try {
          inviteData = await validateInviteCode(inviteCode);
          userRole = inviteData.role;
        } catch (error: any) {
          throw new Error(error.message);
        }
      }

      // Call signUp from auth context - this will create both the auth.users entry
      // and allow the database trigger to create the public.users entry
      const { data, error: signUpError } = await signUp(
        formData.email, 
        formData.password,
        formData.name,
        formData.phone
      );

      if (signUpError) throw signUpError;

      // Mark invite as used if applicable
      if (inviteCode && inviteData && data?.user) {
        await markInviteAsUsed(inviteData.id, data.user.id);
      }

      // Registration successful, navigate to login
      navigate('/login', { 
        state: { message: 'Registration successful! Please sign in to continue.' } 
      });
    } catch (error: any) {
      console.error('Error during sign up:', error);
      setError(error.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header hideSignIn />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex items-center justify-center mb-8">
              <User className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-center mb-8">Create Account</h1>
            
            {inviteCode && (
              <div className="bg-blue-50 text-blue-600 p-3 rounded-md mb-6 text-sm">
                Using invite code: {inviteCode}
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex justify-center items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : 'Sign Up'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign In
                </Link>
              </p>
            </div>

            {/* Back Link */}
            <div className="mt-8 text-center">
              <Link
                to="/"
                className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>

          {/* Help Link */}
          <div className="text-center mt-6">
            <Link
              to="/contact"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Need Help? Contact Support
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerSignup;
