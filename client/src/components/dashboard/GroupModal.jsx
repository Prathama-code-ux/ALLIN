import React, { useState, useEffect } from "react";
import { X, Users } from "lucide-react";
import groupService from "../../services/groupService";

export default function GroupModal({
  isOpen,
  onClose,
  groups = [],
  activeGroup,
  onSelectGroup,
  onGroupUpdated,
  initialTab = "switch",
  onGroupCreated,
}) {
  const [activeTab, setActiveTab] = useState("switch"); // 'switch' | 'create' | 'join'
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    targetAmount: "200",
  });
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setError("Please provide a group name");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await groupService.createGroup({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        targetAmount: Number(createForm.targetAmount) || 200,
      });
      await onGroupUpdated(res.group);
      await onGroupCreated?.(res.group);

      setSuccess(`Group "${res.group.name}" created!`);
      setCreateForm({ name: "", description: "", targetAmount: "200" });
      await onGroupUpdated(res.group);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to create group",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError("Please provide an invite code");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await groupService.joinGroup(joinCode.trim().toUpperCase());
      setSuccess(`Joined "${res.group.name}" successfully!`);
      setJoinCode("");
      await onGroupUpdated(res.group);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Invalid or expired invite code",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="expense-modal-backdrop" onClick={onClose}>
      <div
        className="expense-modal-card max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="expense-modal-header">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#a66bff]" />
            <h3 className="text-base font-bold text-[#F3F6F6]">
              Crew & Groups
            </h3>
          </div>
          <button
            type="button"
            className="close-modal-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-black/40 border border-white/5 mb-4">
          <button
            type="button"
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "switch"
                ? "bg-[#a66bff] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#F3F6F6]"
            }`}
            onClick={() => {
              setActiveTab("switch");
              setError("");
              setSuccess("");
            }}
          >
            My Crews ({groups.length})
          </button>

          <button
            type="button"
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "create"
                ? "bg-[#a66bff] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#F3F6F6]"
            }`}
            onClick={() => {
              setActiveTab("create");
              setError("");
              setSuccess("");
            }}
          >
            + New Crew
          </button>

          <button
            type="button"
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "join"
                ? "bg-[#a66bff] text-white shadow-sm"
                : "text-[#94A3B8] hover:text-[#F3F6F6]"
            }`}
            onClick={() => {
              setActiveTab("join");
              setError("");
              setSuccess("");
            }}
          >
            Join Crew
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
            {success}
          </div>
        )}

        {/* Tab 1: Switch between existing groups */}
        {activeTab === "switch" && (
          <div className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-xs text-[#7E8B99] py-4 text-center">
                You have not joined any crews yet.
              </p>
            ) : (
              groups.map((grp) => {
                const isSelected =
                  activeGroup &&
                  (activeGroup._id === grp._id || activeGroup.id === grp._id);
                return (
                  <div
                    key={grp._id || grp.id}
                    onClick={() => {
                      onSelectGroup(grp);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-[#a66bff]/15 border-[#a66bff]/60 shadow-[0_0_15px_rgba(166,107,255,0.2)]"
                        : "bg-[#171426] border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-[#F3F6F6]">
                        {grp.name}
                      </div>
                      <div className="text-[11px] text-[#7E8B99]">
                        {grp.members?.length || 1} member(s) • Target: $
                        {grp.targetAmount || 200}
                      </div>
                      {grp.inviteCode && (
                        <div className="text-[10px] text-[#a66bff] font-mono mt-0.5">
                          Invite Code: {grp.inviteCode}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-xs font-bold text-[#a66bff]">
                        Active
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Create a new group */}
        {activeTab === "create" && (
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="form-group">
              <label htmlFor="group-name">Crew / Group Name *</label>
              <input
                id="group-name"
                type="text"
                required
                placeholder="e.g. Goa Trip Crew"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="group-target">Target Pool Amount ($) *</label>
              <input
                id="group-target"
                type="number"
                min="10"
                step="1"
                required
                placeholder="200"
                value={createForm.targetAmount}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, targetAmount: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="group-desc">Description (Optional)</label>
              <textarea
                id="group-desc"
                rows={2}
                placeholder="What is this payment crew for?"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            <div className="form-actions mt-4">
              <button
                type="button"
                className="cancel-expense-button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="add-expense-button"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Crew"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Join group via Invite Code */}
        {activeTab === "join" && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="form-group">
              <label htmlFor="invite-code">8-Character Invite Code *</label>
              <input
                id="invite-code"
                type="text"
                required
                maxLength={10}
                placeholder="e.g. 8A3F1B2C"
                className="uppercase font-mono tracking-widest text-center text-lg"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <p className="text-[11px] text-[#7E8B99] mt-1">
                Enter the invite code shared by the crew admin to collaborate.
              </p>
            </div>

            <div className="form-actions mt-4">
              <button
                type="button"
                className="cancel-expense-button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="add-expense-button"
                disabled={submitting}
              >
                {submitting ? "Joining..." : "Join Crew"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
