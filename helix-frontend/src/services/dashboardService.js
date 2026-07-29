import api from './axiosInstance'

const dashboardService = {
  getStats: () => api.get('/api/v1/dashboard/stats'),
}

export default dashboardService
