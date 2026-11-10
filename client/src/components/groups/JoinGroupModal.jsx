import React, { useState } from 'react';
import { KeyRound, LogIn, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import groupService from '../../services/groupService';

export default function JoinGroupModal({ isOpen, onClose, onSuccess }) {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await groupService.joinGroup(cleanCode);
      setInviteCode('');
      onClose();
      if (onSuccess) {
        onSuccess(data.group);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group. Check the invite code.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Join Group with Code">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-[#94A3B8]">
          Enter the 8-character invite code shared by your friend or group creator.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Invite Code"
          placeholder="e.g. 7A8B9C0D"
          value={inviteCode}
          onChange={(e) => {
            setInviteCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          icon={KeyRound}
          autoFocus
          required
          maxLength={12}
          className="font-mono tracking-widest uppercase"
        />

        <div className="p-3 rounded-xl bg-[#080B0D] border border-white/5 text-[11px] text-[#94A3B8]">
          <span className="text-[#00E5D4] font-medium">Tip:</span> Ask any existing group member for their group's invite code shown on their group details screen.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={LogIn}
          >
            Join Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
