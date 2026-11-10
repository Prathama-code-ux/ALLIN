import React, { useState } from 'react';
import { Users, Plus, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import groupService from '../../services/groupService';

export default function CreateGroupModal({ isOpen, onClose, onSuccess }) {
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Please provide a group name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await groupService.createGroup(groupName.trim());
      setGroupName('');
      onClose();
      if (onSuccess) {
        onSuccess(data.group);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-[#94A3B8]">
          Create a group to organize shared trips, apartments, events, or dinner outings with friends.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Group Name"
          placeholder="e.g. Summer Vacation, Flat 402, Hackathon"
          value={groupName}
          onChange={(e) => {
            setGroupName(e.target.value);
            if (error) setError(null);
          }}
          icon={Users}
          autoFocus
          required
        />

        <div className="p-3 rounded-xl bg-[#080B0D] border border-white/5 text-[11px] text-[#94A3B8] space-y-1">
          <div className="font-semibold text-[#F3F6F6]">What happens next:</div>
          <div>• You will become the group administrator.</div>
          <div>• A unique 8-character invite code will be generated instantly.</div>
          <div>• You can start logging expenses and splitting costs immediately.</div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={Plus}
          >
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}

