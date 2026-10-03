import api from './axiosInstance'

const visitService = {
  /**
   * GET /api/v1/visits
   */
  getVisits: (params = {}) =>
    api.get('/api/v1/visits', { params }),

  /**
   * GET /api/v1/visits/patient/{patientId}
   */
  getPatientVisits: (patientId, params = {}) =>
    api.get(`/api/v1/visits/patient/${patientId}`, { params }),

  /**
   * GET /api/v1/visits/{visitId}
   */
  getVisitDetail: (visitId) =>
    api.get(`/api/v1/visits/${visitId}`),

  /**
   * POST /api/v1/visits
   */
  createVisit: (data) =>
    api.post('/api/v1/visits', data),

  /**
   * PATCH /api/v1/visits/{visitId}/status
   */
  updateVisitStatus: (visitId, status) =>
    api.patch(`/api/v1/visits/${visitId}/status`, { status }),

  /**
   * POST /api/v1/visits/{visitId}/check-in
   */
  checkIn: (visitId) =>
    api.post(`/api/v1/visits/${visitId}/check-in`),

  /**
   * GET /api/v1/visits/{visitId}/symptoms
   */
  getSymptoms: (visitId) =>
    api.get(`/api/v1/visits/${visitId}/symptoms`),

  /**
   * POST /api/v1/visits/{visitId}/symptoms
   */
  addSymptom: (visitId, data) =>
    api.post(`/api/v1/visits/${visitId}/symptoms`, data),

  /**
   * GET /api/v1/visits/{visitId}/investigations
   */
  getInvestigations: (visitId) =>
    api.get(`/api/v1/visits/${visitId}/investigations`),

  /**
   * POST /api/v1/visits/{visitId}/investigations
   */
  addInvestigation: (visitId, data) =>
    api.post(`/api/v1/visits/${visitId}/investigations`, data),

  /**
   * GET /api/v1/visits/{visitId}/prescriptions
   */
  getPrescriptions: (visitId) =>
    api.get(`/api/v1/visits/${visitId}/prescriptions`),

  /**
   * POST /api/v1/visits/{visitId}/prescriptions
   */
  addPrescription: (visitId, data) =>
    api.post(`/api/v1/visits/${visitId}/prescriptions`, data),

  /**
   * GET /api/v1/visits/{visitId}/treatments
   */
  getTreatments: (visitId) =>
    api.get(`/api/v1/visits/${visitId}/treatments`),

  /**
   * POST /api/v1/visits/{visitId}/treatments
   */
  addTreatment: (visitId, data) =>
    api.post(`/api/v1/visits/${visitId}/treatments`, data),

  /**
   * GET /api/v1/visits/{visitId}/followup
   */
  getFollowUp: (visitId) =>
    api.get(`/api/v1/visits/${visitId}/followup`),

  /**
   * POST /api/v1/visits/{visitId}/followup
   */
  setFollowUp: (visitId, data) =>
    api.post(`/api/v1/visits/${visitId}/followup`, data),

  /**
   * DELETE /api/v1/visits/{visitId}
   */
  deleteVisit: (visitId) =>
    api.delete(`/api/v1/visits/${visitId}`),
}

export default visitService
