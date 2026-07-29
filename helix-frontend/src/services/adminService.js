import api from './axiosInstance'

const adminService = {
  getAdmins: (params = {}) =>
    api.get('/api/v1/users', { params }),

  createAdmin: (data) =>
    api.post('/api/v1/users', data),

  updateAdmin: (id, data) =>
    api.put(`/api/v1/users/${id}`, data),

  toggleAdminStatus: (id, isActive) =>
    api.patch(`/api/v1/users/${id}/status`, { is_active: isActive }),

  deleteAdmin: (id) =>
    api.delete(`/api/v1/users/${id}`),

  updateApproval: (id, action) =>
    api.patch(`/api/v1/users/${id}/approval`, { action }),
}

export default adminService
