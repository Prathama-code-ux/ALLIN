import api from '../api/client';

export const groupService = {
  async getMyGroups() {
    const response = await api.get('/groups');
    return response.data;
  },

  async createGroup({ name, description, targetAmount }) {
    const response = await api.post('/groups', {
      name,
      description,
      targetAmount,
    });
    return response.data;
  },

  async joinGroup(inviteCode) {
    const response = await api.post('/groups/join', { inviteCode });
    return response.data;
  },

  async getGroupById(id) {
    const response = await api.get(`/groups/${id}`);
    return response.data;
  },

  async getGroupContributions(id) {
    const response = await api.get(`/groups/${id}/contributions`);
    return response.data;
  },

  async closeGroup(id) {
    const response = await api.patch(`/groups/${id}/close`);
    return response.data;
  },

  async deleteGroup(id) {
    const response = await api.delete(`/groups/${id}`);
    return response.data;
  },
};

export default groupService;