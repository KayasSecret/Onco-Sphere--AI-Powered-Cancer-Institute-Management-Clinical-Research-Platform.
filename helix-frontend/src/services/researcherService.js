/**
 * researcherService.js
 * ─────────────────────────────────────────────────────────────────
 * API calls for the Researcher Application workflow:
 *   - Draft management (save, update, resume)
 *   - OTP request & verification for secure draft access
 *   - Document upload (PDF / JPG / PNG, max 5 MB)
 *
 * All draft endpoints are PUBLIC (no JWT required).
 * ─────────────────────────────────────────────────────────────────
 */
import api from './axiosInstance'

const BASE = '/api/v1/researcher'

const researcherService = {
  /**
   * POST /researcher/save-draft
   * Creates or upserts a draft by email.
   * Returns the draft object including the ID for subsequent updates.
   */
  saveDraft: (email, currentStep, formData) =>
    api.post(`${BASE}/save-draft`, {
      email,
      current_step: currentStep,
      form_data: formData,
    }),

  /**
   * PUT /researcher/update-draft/:id
   * Auto-save or manual-save an existing draft.
   */
  updateDraft: (draftId, currentStep, formData) =>
    api.put(`${BASE}/update-draft/${draftId}`, {
      current_step: currentStep,
      form_data: formData,
    }),

  /**
   * POST /researcher/request-otp
   * Triggers OTP generation for draft resume verification.
   * In dev mode, OTP is printed to backend stdout.
   */
  requestOTP: (email) =>
    api.post(`${BASE}/request-otp`, { email }),

  /**
   * POST /researcher/verify-otp
   * Verifies the OTP and returns the full draft data if valid.
   */
  verifyOTP: (email, otp) =>
    api.post(`${BASE}/verify-otp`, { email, otp }),

  /**
   * POST /upload/researcher-document
   * Uploads an ID proof / document with backend validation:
   *   - Allowed: PDF, JPG, PNG
   *   - Max: 5 MB
   * Returns { url, provider }
   */
  uploadDocument: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/v1/upload/researcher-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default researcherService
