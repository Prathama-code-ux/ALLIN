import api from '../api/client';

export const settlementService = {
  async getMySettlements(params = {}) {
    const response = await api.get('/settlements', { params });
    return response.data;
  },

  async getSettlementById(id) {
    const response = await api.get(`/settlements/${id}`);
    return response.data;
  },
};

export default settlementService;
