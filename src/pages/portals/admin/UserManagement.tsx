import { useState, useEffect } from 'react';
import { Users, Search, Filter, Edit2, Trash2, Shield, Mail, Phone, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  useEffect(() => {
    loadUsers();
  }, []);
  
  async function loadUsers() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-green-500/20 text-green-500';
      case 'team_manager': return 'bg-yellow-500/20 text-yellow-500';
      case 'media': return 'bg-purple-500/20 text-purple-500';
      default: return 'bg-blue-500/20 text-blue-500';
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-green font-bold uppercase">Loading Users...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0B0E13] p-8">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black italic uppercase mb-2">User Management</h1>
          <p className="text-white/40">Manage all users, roles, and permissions</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-brand-green">{users.length}</p>
          <p className="text-xs text-white/40 uppercase">Total Users</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="glass rounded-2xl p-6 mb-8 border border-white/10">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username or email..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-green/50"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-white/40" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-green/50"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="team_manager">Team Manager</option>
                <option value="media">Media</option>
                <option value="fan">Fan</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Users Table */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
                  <th className="px-6 py-4 text-left">User</th>
                  <th className="px-6 py-4 text-left">Email</th>
                  <th className="px-6 py-4 text-left">Phone</th>
                  <th className="px-6 py-4 text-center">Role</th>
                  <th className="px-6 py-4 text-left">Joined</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green font-black">
                          {user.username?.[0] || user.email?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{user.username || 'User'}</p>
                          {user.phone && (
                            <p className="text-xs text-white/40 flex items-center gap-1">
                              <Phone size={10} /> {user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={14} className="text-white/40" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${getRoleColor(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Calendar size={14} />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-brand-blue">
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-brand-red">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users size={64} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/30 font-bold uppercase tracking-widest">No users found</p>
              <p className="text-white/40 text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
