import React, { useState } from "react";
import {
  Users,
  Plus,
  Key,
  Copy,
  Check,
  Target,
  ArrowRight,
} from "lucide-react";
import groupService from "../../services/groupService";

export default function GroupsView({
  groups = [],
  activeGroup,
  poolData,
  currentUserId,
  onSelectGroup,
  onCloseGroup,
  onGroupUpdated,
  onRefresh,
  onDeleteGroup,
}) {
  const [tab, setTab] = useState("list");
  const [copiedCode, setCopiedCode] = useState(null);

  const [closingGroupId, setClosingGroupId] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    targetAmount: "200",
  });

  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Copy invite code
  const handleCopyCode = (code) => {
    if (!code) return;

    navigator.clipboard.writeText(code);
    setCopiedCode(code);

    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Close group
  const handleCloseGroup = async (group) => {
    if (!onCloseGroup) return;

    const confirmed = window.confirm(
      `Are you sure you want to close "${group.name}"?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setClosingGroupId(group._id);

    try {
      await onCloseGroup(group._id);
      setSuccess(`"${group.name}" has been closed successfully.`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to close this group.",
      );
    } finally {
      setClosingGroupId(null);
    }
  };

  // Delete group
  const handleDeleteGroup = async (group) => {
    if (!onDeleteGroup) {
      setError("Group deletion is currently unavailable.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${group.name}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingGroupId(group._id);

    try {
      await onDeleteGroup(group._id);

      if (onRefresh) {
        await onRefresh();
      }

      setSuccess(`"${group.name}" has been deleted successfully.`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to delete this group.",
      );
    } finally {
      setDeletingGroupId(null);
    }
  };

  // Create group
  const handleCreateGroup = async (e) => {
    e.preventDefault();

    if (!createForm.name.trim()) {
      setError("Please enter a group name.");
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

      setSuccess(
        `Group "${res.group?.name || createForm.name}" created successfully!`,
      );

      setCreateForm({
        name: "",
        description: "",
        targetAmount: "200",
      });

      if (onGroupUpdated) {
        await onGroupUpdated(res.group);
      }

      setTimeout(() => {
        setTab("list");
        setSuccess("");
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to create group.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Join group
  const handleJoinGroup = async (e) => {
    e.preventDefault();

    if (!joinCode.trim()) {
      setError("Please provide an invite code.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await groupService.joinGroup(joinCode.trim().toUpperCase());

      setSuccess(`Successfully joined "${res.group?.name || "group"}"!`);

      setJoinCode("");

      if (onGroupUpdated) {
        await onGroupUpdated(res.group);
      }

      setTimeout(() => {
        setTab("list");
        setSuccess("");
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Invalid or expired invite code.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-[#171426] via-[#151224] to-[#0d0b17] border border-white/5 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#a66bff]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <span className="text-[11px] font-bold tracking-widest text-[#a66bff] uppercase">
            CREW MANAGEMENT
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F3F6F6] mt-1 font-['Plus_Jakarta_Sans']">
            My Groups & Squads
          </h1>

          <p className="text-sm text-[#94A3B8] mt-1 max-w-xl">
            Create or join collaborative groups, pool funds together with
            friends, and manage joint targets effortlessly.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setError("");
              setTab("create");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              tab === "create"
                ? "bg-gradient-to-r from-[#a66bff] to-[#8b43f6] text-white shadow-[0_0_15px_rgba(166,107,255,0.4)]"
                : "bg-[#1b172e] hover:bg-[#231e3d] text-[#c49cff] border border-[#a66bff]/30"
            }`}
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setTab("join");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              tab === "join"
                ? "bg-gradient-to-r from-[#a66bff] to-[#8b43f6] text-white shadow-[0_0_15px_rgba(166,107,255,0.4)]"
                : "bg-[#1b172e] hover:bg-[#231e3d] text-[#c49cff] border border-[#a66bff]/30"
            }`}
          >
            <Key className="w-4 h-4" />
            Join with Code
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create Group Form */}
      {tab === "create" && (
        <div className="p-6 rounded-3xl bg-[#171426] border border-[#a66bff]/30 backdrop-blur-xl shadow-2xl max-w-xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
            <h2 className="text-base font-bold text-[#F3F6F6]">
              Create New Group
            </h2>

            <button
              type="button"
              onClick={() => setTab("list")}
              className="text-xs text-[#7E8B99] hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                Group Name *
              </label>

              <input
                type="text"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    name: e.target.value,
                  })
                }
                placeholder="e.g. NYC Summer Trip, Goa Getaway"
                className="w-full px-4 py-2.5 rounded-xl bg-[#090810] border border-white/10 focus:border-[#a66bff] text-sm text-[#F3F6F6] focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                Target Pool Amount (INR)
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#7E8B99]">
                  ₹
                </span>

                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={createForm.targetAmount}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      targetAmount: e.target.value,
                    })
                  }
                  placeholder="200.00"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#090810] border border-white/10 focus:border-[#a66bff] text-sm text-[#F3F6F6] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                Description / Purpose
              </label>

              <textarea
                rows={3}
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    description: e.target.value,
                  })
                }
                placeholder="Briefly describe what this group is pooling funds for..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#090810] border border-white/10 focus:border-[#a66bff] text-sm text-[#F3F6F6] focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTab("list")}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#7E8B99] hover:text-white hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#a66bff] to-[#8b43f6] hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {submitting ? "Creating Group..." : "Create Group"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join Group Form */}
      {tab === "join" && (
        <div className="p-6 rounded-3xl bg-[#171426] border border-[#a66bff]/30 backdrop-blur-xl shadow-2xl max-w-md mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
            <h2 className="text-base font-bold text-[#F3F6F6]">Join a Crew</h2>

            <button
              type="button"
              onClick={() => setTab("list")}
              className="text-xs text-[#7E8B99] hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleJoinGroup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                Invite Code *
              </label>

              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ALLIN892"
                maxLength={12}
                className="w-full px-4 py-3 rounded-xl bg-[#090810] border border-white/10 focus:border-[#a66bff] text-base text-[#c49cff] font-mono tracking-widest text-center uppercase focus:outline-none transition-colors"
                required
              />

              <p className="text-[11px] text-[#7E8B99] mt-2">
                Ask a crew member or admin for their unique invite code.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTab("list")}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#7E8B99] hover:text-white hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#a66bff] to-[#8b43f6] hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {submitting ? "Verifying Code..." : "Join Group"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups Grid */}
      {tab === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const isSelected = activeGroup?._id === group._id;
            const memberCount = group.members?.length || 1;
            const target = group.targetAmount || 200;

            const groupCreatorId =
              typeof group.createdBy === "object"
                ? group.createdBy?._id
                : group.createdBy;

            const isAdmin =
              Boolean(currentUserId) &&
              String(groupCreatorId) === String(currentUserId);

            const isClosed = group.status === "closed";

            return (
              <div
                key={group._id}
                className={`p-5 rounded-3xl transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#1b172e] border-2 border-[#a66bff] shadow-[0_10px_30px_rgba(166,107,255,0.2)]"
                    : "bg-[#171426] border border-white/5 hover:border-white/20"
                }`}
              >
                <div>
                  {/* Group name and status */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8b43f6]/30 to-[#6125c8]/30 border border-[#a66bff]/30 flex items-center justify-center text-sm font-bold text-[#c49cff]">
                      {group.name?.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[#F3F6F6] truncate">
                        {group.name}
                      </h3>

                      <p className="text-[11px] text-[#7E8B99] flex items-center gap-1.5 mt-0.5">
                        <Users className="w-3 h-3 text-[#a66bff]" />
                        {memberCount} member{memberCount > 1 ? "s" : ""}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isClosed
                          ? "bg-rose-500/10 border border-rose-500/25 text-rose-400"
                          : "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
                      }`}
                    >
                      {isClosed ? "Closed" : "Active"}
                    </span>
                  </div>

                  {/* Description */}
                  {group.description && (
                    <p className="text-xs text-[#94A3B8] line-clamp-2 mb-4 leading-relaxed">
                      {group.description}
                    </p>
                  )}

                  {/* Target amount */}
                  <div className="p-3 rounded-2xl bg-[#090810]/60 border border-white/5 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#a66bff]" />
                      <span className="text-xs text-[#7E8B99]">
                        Target Goal
                      </span>
                    </div>

                    <span className="text-sm font-bold text-[#F3F6F6] font-mono">
                      ₹{Number(target).toFixed(2)}
                    </span>
                  </div>

                  {/* Invite code */}
                  {group.inviteCode && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#12101e] border border-white/5 mb-4">
                      <span className="text-[10px] text-[#7E8B99] font-medium uppercase tracking-wider">
                        Invite Code:
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(group.inviteCode)}
                        className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#c49cff] hover:text-white transition-colors"
                        title="Click to copy code"
                      >
                        <span>{group.inviteCode}</span>

                        {copiedCode === group.inviteCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#7E8B99]" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                  {/* Select group */}
                  <button
                    type="button"
                    onClick={() => onSelectGroup(group)}
                    disabled={isClosed}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isClosed
                        ? "bg-white/5 text-[#7E8B99] border border-white/5 cursor-not-allowed"
                        : isSelected
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-[#090810] hover:bg-[#a66bff] hover:text-white text-[#F3F6F6] border border-white/10 cursor-pointer"
                    }`}
                  >
                    {isClosed ? (
                      "Group Closed"
                    ) : isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Current Workspace
                      </>
                    ) : (
                      <>
                        Switch to this Squad
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  {/* Close group: creator/admin only */}
                  {isAdmin && !isClosed && (
                    <button
                      type="button"
                      onClick={() => handleCloseGroup(group)}
                      disabled={closingGroupId === group._id}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {closingGroupId === group._id
                        ? "Closing Group..."
                        : "Close Group"}
                    </button>
                  )}

                  {/* Delete group: creator/admin only */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group)}
                      disabled={deletingGroupId === group._id}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-rose-300 bg-rose-600/15 border border-rose-500/30 hover:bg-rose-600/30 hover:border-rose-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {deletingGroupId === group._id
                        ? "Deleting Group..."
                        : "Delete Group"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {tab === "list" && groups.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-[#171426] border border-dashed border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-[#a66bff]/10 border border-[#a66bff]/30 flex items-center justify-center text-[#a66bff] mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-[#F3F6F6]">
            No Groups Found
          </h3>

          <p className="text-xs text-[#7E8B99] max-w-sm mx-auto mt-1 mb-5">
            You are not part of any group yet. Create your first crew or join
            one using an invite code.
          </p>

          <button
            type="button"
            onClick={() => setTab("create")}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#a66bff] to-[#8b43f6] shadow-[0_0_15px_rgba(166,107,255,0.4)] cursor-pointer"
          >
            Create Your First Group
          </button>
        </div>
      )}
    </div>
  );
}
