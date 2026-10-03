import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import visitService from '../../services/visitService'

const initialState = {
  visits: [],
  total: 0,
  page: 1,
  selectedVisit: null,
  patientVisits: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  checkInStatus: 'idle',
}

// ── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchVisitsThunk = createAsyncThunk(
  'visits/fetchVisits',
  async (params, { rejectWithValue }) => {
    try {
      const res = await visitService.getVisits(params)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to fetch visits.'
      )
    }
  }
)

export const fetchPatientVisitsThunk = createAsyncThunk(
  'visits/fetchPatientVisits',
  async ({ patientId, params }, { rejectWithValue }) => {
    try {
      const res = await visitService.getPatientVisits(patientId, params)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to fetch patient visits.'
      )
    }
  }
)

export const fetchVisitDetailThunk = createAsyncThunk(
  'visits/fetchVisitDetail',
  async (visitId, { rejectWithValue }) => {
    try {
      const res = await visitService.getVisitDetail(visitId)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to fetch visit details.'
      )
    }
  }
)

export const createVisitThunk = createAsyncThunk(
  'visits/createVisit',
  async (data, { rejectWithValue }) => {
    try {
      const res = await visitService.createVisit(data)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to create visit.'
      )
    }
  }
)

export const updateVisitStatusThunk = createAsyncThunk(
  'visits/updateVisitStatus',
  async ({ visitId, status }, { rejectWithValue }) => {
    try {
      const res = await visitService.updateVisitStatus(visitId, status)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to update visit status.'
      )
    }
  }
)

export const checkInThunk = createAsyncThunk(
  'visits/checkIn',
  async (visitId, { rejectWithValue }) => {
    try {
      const res = await visitService.checkIn(visitId)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to check in patient.'
      )
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const visitSlice = createSlice({
  name: 'visits',
  initialState,
  reducers: {
    clearSelectedVisit: (state) => {
      state.selectedVisit = null
    },
    clearVisitError: (state) => {
      state.error = null
    },
    resetCheckInStatus: (state) => {
      state.checkInStatus = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchVisits
      .addCase(fetchVisitsThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchVisitsThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.visits = action.payload.items
        state.total = action.payload.total
        state.page = action.payload.page ?? 1
      })
      .addCase(fetchVisitsThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // fetchPatientVisits
      .addCase(fetchPatientVisitsThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchPatientVisitsThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.patientVisits = action.payload.items ?? action.payload
      })
      .addCase(fetchPatientVisitsThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // fetchVisitDetail
      .addCase(fetchVisitDetailThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchVisitDetailThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.selectedVisit = action.payload
      })
      .addCase(fetchVisitDetailThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // createVisit
      .addCase(createVisitThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(createVisitThunk.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(createVisitThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // updateVisitStatus
      .addCase(updateVisitStatusThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(updateVisitStatusThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        // Patch the visit in-list if present
        const updated = action.payload
        const idx = state.visits.findIndex((v) => v.id === updated?.id)
        if (idx !== -1) state.visits[idx] = updated
        if (state.selectedVisit?.id === updated?.id) {
          state.selectedVisit = updated
        }
      })
      .addCase(updateVisitStatusThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // checkIn
      .addCase(checkInThunk.pending, (state) => {
        state.checkInStatus = 'loading'
        state.error = null
      })
      .addCase(checkInThunk.fulfilled, (state, action) => {
        state.checkInStatus = 'succeeded'
        const updated = action.payload
        const idx = state.visits.findIndex((v) => v.id === updated?.id)
        if (idx !== -1) state.visits[idx] = updated
        if (state.selectedVisit?.id === updated?.id) {
          state.selectedVisit = updated
        }
      })
      .addCase(checkInThunk.rejected, (state, action) => {
        state.checkInStatus = 'failed'
        state.error = action.payload
      })
  },
})

export const { clearSelectedVisit, clearVisitError, resetCheckInStatus } =
  visitSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectVisits = (state) => state.visits.visits
export const selectVisitsTotal = (state) => state.visits.total
export const selectSelectedVisit = (state) => state.visits.selectedVisit
export const selectPatientVisits = (state) => state.visits.patientVisits
export const selectVisitStatus = (state) => state.visits.status
export const selectVisitError = (state) => state.visits.error
export const selectCheckInStatus = (state) => state.visits.checkInStatus

export default visitSlice.reducer
