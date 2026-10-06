import api from './axiosInstance'

const patientService = {
  /**
   * GET /api/v1/patients
   */
  getPatients: (params = {}) =>
    api.get('/api/v1/patients', { params }),

  /**
   * GET /api/v1/patients/{id}
   */
  getPatientDetail: (id) =>
    api.get(`/api/v1/patients/${id}`),

  /**
   * POST /api/v1/patients
   */
  createPatient: (data) =>
    api.post('/api/v1/patients', data),

  /**
   * PUT /api/v1/patients/{id}
   */
  updatePatient: (id, data) =>
    api.put(`/api/v1/patients/${id}`, data),

  /**
   * DELETE /api/v1/patients/{id}
   */
  deletePatient: (id) =>
    api.delete(`/api/v1/patients/${id}`),

  /**
   * POST /api/v1/upload/image
   */
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/v1/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * POST /api/v1/upload/document
   */
  uploadDocument: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/v1/upload/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * GET /api/v1/patients/{id}/reports
   */
  getPatientReports: (id) =>
    api.get(`/api/v1/patients/${id}/reports`),

  /**
   * POST /api/v1/patients/{id}/reports
   */
  createPatientReport: (id, data) =>
    api.post(`/api/v1/patients/${id}/reports`, data),

  /**
   * GET /api/v1/patients/{id}/cancer-images
   */
  getPatientCancerImages: (id) =>
    api.get(`/api/v1/patients/${id}/cancer-images`),

  /**
   * POST /api/v1/patients/{id}/cancer-images
   */
  createPatientCancerImage: (id, data) =>
    api.post(`/api/v1/patients/${id}/cancer-images`, data),

  /**
   * DELETE /api/v1/patients/{id}/reports/{reportId}
   */
  deletePatientReport: (id, reportId) =>
    api.delete(`/api/v1/patients/${id}/reports/${reportId}`),

  /**
   * DELETE /api/v1/patients/{id}/cancer-images/{imageId}
   */
  deleteCancerImage: (patientId, imageId) =>
    api.delete(`/api/v1/patients/${patientId}/cancer-images/${imageId}`),

  /**
   * PATCH /api/v1/patients/{id}/cancer-images/{imageId}  — rename title
   */
  renameCancerImage: (patientId, imageId, title) =>
    api.patch(`/api/v1/patients/${patientId}/cancer-images/${imageId}`, { title }),

  /**
   * Stream/Fetch Report file blob (disposition: 'inline' or 'attachment')
   */
  fetchReportBlob: (patientId, reportId, disposition = 'inline') =>
    api.get(`/api/v1/patients/${patientId}/reports/${reportId}/download`, {
      params: { disposition },
      responseType: 'blob',
    }),

  /**
   * Stream/Fetch Cancer Image blob (disposition: 'inline' or 'attachment')
   */
  fetchCancerImageBlob: (patientId, imageId, disposition = 'inline') =>
    api.get(`/api/v1/patients/${patientId}/cancer-images/${imageId}/download`, {
      params: { disposition },
      responseType: 'blob',
    }),
}

export default patientService

