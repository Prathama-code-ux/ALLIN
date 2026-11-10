import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, KeyRound, Search, AlertCircle, RefreshCw } from 'lucide-react';
import groupService from '../services/groupService';
import GroupCard from '../components/groups/GroupCard';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import JoinGroupModal from '../components/groups/JoinGroupModal';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';

export default function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupService.getMyGroups();
      setGroups(data.groups || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    groupService
      .getMyGroups()
      .then((data) => {
        if (!ignore) {
          setGroups(data.groups || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.response?.data?.message || 'Failed to load your groups');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredGroups = groups.filter((g) =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] tracking-tight">
            My Groups
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Manage your collaborative expense groups and members
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            icon={KeyRound}
            onClick={() => setIsJoinOpen(true)}
            className="text-xs"
          >
            Join with Code
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setIsCreateOpen(true)}
            className="text-xs shadow-[0_0_20px_rgba(0,229,212,0.25)]"
          >
            New Group
          </Button>
        </div>
      </div>

      {/* Search and count bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search your groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111719] text-xs text-[#F3F6F6] rounded-xl pl-10 pr-3.5 py-2.5 border border-white/8 focus:border-[#00E5D4]/40 focus:outline-none placeholder:text-[#64748B] transition-colors"
          />
        </div>

        <button
          onClick={fetchGroups}
          title="Refresh"
          className="p-2 rounded-xl text-[#94A3B8] hover:text-[#00E5D4] hover:bg-white/5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchGroups}>
            Try Again
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-[#111719]/60 border border-white/5 animate-pulse p-5"
            />
          ))}
        </div>
      ) : filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group._id || group.id}
              group={group}
              onSelect={(id) => navigate(`/groups/${id}`)}
            />
          ))}
        </div>
      ) : searchQuery ? (
        <EmptyState
          icon={Search}
          title="No groups found"
          description={`No groups matching "${searchQuery}". Check the spelling or clear the search.`}
          actionText="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Groups allow you to split bills, track trip costs, and settle up balances easily with friends."
          actionText="Create Your First Group"
          actionIcon={Plus}
          onAction={() => setIsCreateOpen(true)}
        />
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchGroups}
      />

      <JoinGroupModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onSuccess={fetchGroups}
      />
    </div>
  );
}
