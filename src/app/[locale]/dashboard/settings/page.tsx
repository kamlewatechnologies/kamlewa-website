'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { supabase } from '@/lib/supabase/supabaseClient';
import { HiUser, HiLockClosed, HiMail, HiKey, HiEye, HiEyeOff, HiCheckCircle, HiXCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import DashboardModal from '@/components/DashboardModal';
import Loader from '@/components/Loader';
import { Link } from '@/i18n/routing';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function SettingsPage() {
  const t = useTranslations('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form states
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          email: user.email || '',
          created_at: user.created_at || '',
          last_sign_in_at: user.last_sign_in_at || null,
        });
      }

      // Note: Getting all users requires admin privileges
      // For now, we'll just show the current user
      // In production, you'd need a backend API route with service role key
      setUsers(user ? [{
        id: user.id,
        email: user.email || '',
        created_at: user.created_at || '',
        last_sign_in_at: user.last_sign_in_at || null,
      }] : []);
    } catch {
      toast.error('Failed to load user information');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserForm.email || !newUserForm.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newUserForm.password !== newUserForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newUserForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const loadingToast = toast.loading('Creating user...');

    try {
      // Note: This requires admin privileges
      // In production, you'd call a backend API route
      const { data, error } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/login`,
        },
      });

      if (error) {
        // If user already exists, try to invite them
        if (error.message.includes('already registered')) {
          toast.error('User with this email already exists', { id: loadingToast });
          return;
        }
        throw error;
      }

      if (data.user) {
        toast.success('User created successfully! They will receive an email to confirm their account.', { id: loadingToast });
        setIsModalOpen(false);
        setNewUserForm({ email: '', password: '', confirmPassword: '' });
        await loadUsers();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create user';
      toast.error(message, { id: loadingToast });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const loadingToast = toast.loading('Changing password...');

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser?.email || '',
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) throw updateError;

      toast.success('Password changed successfully!', { id: loadingToast });
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      toast.error(message, { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader size={128} className="mx-auto mb-4" />
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-nourd), sans-serif' }}>
          Settings
        </h1>
        <p className="text-gray-400">Manage your account and user access</p>
      </div>

      {/* Current User Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
            <HiUser className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Your Profile</h2>
            <p className="text-gray-400 text-sm">Manage your account information</p>
          </div>
        </div>

        {currentUser && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Email Address</label>
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded">
                  <HiMail className="w-5 h-5 text-gray-400" />
                  <span className="text-white">{currentUser.email}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Account Created</label>
                <div className="p-3 bg-white/5 border border-white/10 rounded">
                  <span className="text-gray-300">
                    {new Date(currentUser.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
            {currentUser.last_sign_in_at && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Last Sign In</label>
                <div className="p-3 bg-white/5 border border-white/10 rounded">
                  <span className="text-gray-300">
                    {new Date(currentUser.last_sign_in_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            )}
            <div className="pt-4 border-t border-white/10">
              <Button
                onClick={() => setIsPasswordModalOpen(true)}
                variant="outline-yellow"
                className="flex items-center gap-2"
              >
                <HiLockClosed className="w-5 h-5" />
                Change Password
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* User Management lives on the Team & Roles page */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
            <HiUser className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Team members</h2>
            <p className="text-gray-400 text-sm">Add people, give them roles and permissions on the Team &amp; Roles page.</p>
          </div>
        </div>
        <Link href="/dashboard/team" className="inline-flex items-center justify-center px-4 py-2 bg-yellow-400 text-black font-semibold text-sm hover:bg-yellow-300">
          Open Team &amp; Roles
        </Link>
      </motion.div>

      {/* Create User Modal */}
      <DashboardModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewUserForm({ email: '', password: '', confirmPassword: '' });
        }}
        title="Create New User"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiMail className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full pl-12 bg-white/10 border-white/30 placeholder-gray-400"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiLockClosed className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                placeholder="Minimum 8 characters"
                className="w-full pl-12 pr-12 bg-white/10 border-white/30 placeholder-gray-400"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-yellow-400 transition-colors"
              >
                {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiLockClosed className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newUserForm.confirmPassword}
                onChange={(e) => setNewUserForm({ ...newUserForm, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                className="w-full pl-12 bg-white/10 border-white/30 placeholder-gray-400"
                required
              />
            </div>
            {newUserForm.password && newUserForm.confirmPassword && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {newUserForm.password === newUserForm.confirmPassword ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <HiCheckCircle className="w-4 h-4" />
                    Passwords match
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <HiXCircle className="w-4 h-4" />
                    Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-4 pt-4">
            <Button type="submit" variant="primary" className="flex-1">
              Create User
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setNewUserForm({ email: '', password: '', confirmPassword: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DashboardModal>

      {/* Change Password Modal */}
      <DashboardModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }}
        title="Change Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Current Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiLockClosed className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="w-full pl-12 pr-12 bg-white/10 border-white/30 placeholder-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-yellow-400 transition-colors"
              >
                {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiKey className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Minimum 8 characters"
                className="w-full pl-12 pr-12 bg-white/10 border-white/30 placeholder-gray-400"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-yellow-400 transition-colors"
              >
                {showNewPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">Confirm New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiLockClosed className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
                className="w-full pl-12 bg-white/10 border-white/30 placeholder-gray-400"
                required
              />
            </div>
            {passwordForm.newPassword && passwordForm.confirmPassword && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {passwordForm.newPassword === passwordForm.confirmPassword ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <HiCheckCircle className="w-4 h-4" />
                    Passwords match
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <HiXCircle className="w-4 h-4" />
                    Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-4 pt-4">
            <Button type="submit" variant="primary" className="flex-1">
              Change Password
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
}

