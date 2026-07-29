import api from './axiosInstance'

const authService = {
  /**
   * POST /api/v1/auth/login
   * Returns { access_token, refresh_token, user }
   */
  login: (email, password, rememberMe = false) =>
    api.post('/api/v1/auth/login', { email, password, remember_me: rememberMe }),

  /**
   * POST /api/v1/auth/register
   * Accepts a flat object with all required + optional researcher fields.
   */
  register: (researcherData) =>
    api.post('/api/v1/auth/register', researcherData),

  /**
   * POST /api/v1/auth/refresh
   */
  refresh: (refreshToken) =>
    api.post('/api/v1/auth/refresh', { refresh_token: refreshToken }),

  /**
   * POST /api/v1/auth/logout
   */
  logout: () =>
    api.post('/api/v1/auth/logout'),

  /**
   * GET /api/v1/auth/me
   */
  getMe: () =>
    api.get('/api/v1/auth/me'),

  /**
   * POST /api/v1/users/{id}/change-password
   * Requires current password for verification
   */
  changePassword: (userId, currentPassword, newPassword) =>
    api.post(`/api/v1/users/${userId}/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  /**
   * PUT /api/v1/users/profile
   */
  updateProfile: (data) =>
    api.put('/api/v1/users/profile', data),
}

export default authService
