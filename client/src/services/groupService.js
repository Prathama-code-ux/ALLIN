import api from '../api/client';

export const groupService = {
  // Create a new group
  async createGroup(name) {
    const response = await api.post('/groups', {
      name: name.trim(),
    });
    return response.data;
  },

  // Get all groups the current user belongs to
  async getMyGroups() {
    const response = await api.get('/groups');
    return response.data;
  },

  // Join a group via invite code
  async joinGroup(inviteCode) {
    const response = await api.post('/groups/join', {
      inviteCode: inviteCode.trim().toUpperCase(),
    });
    return response.data;
  },

  // Get details for a specific group
  async getGroupById(groupId) {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },
};

export default groupService;

