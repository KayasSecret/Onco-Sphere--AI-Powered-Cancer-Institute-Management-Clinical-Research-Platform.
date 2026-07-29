import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import patientService from '../../services/patientService'

const initialState = {
  patients: [],
  total: 0,
  selectedPatient: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
}

// Async thunks
export const fetchPatientsThunk = createAsyncThunk(
  'patients/fetchPatients',
  async (params, { rejectWithValue }) => {
    try {
      const res = await patientService.getPatients(params)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to fetch patients.'
      )
    }
  }
)

export const fetchPatientDetailThunk = createAsyncThunk(
  'patients/fetchPatientDetail',
  async (id, { rejectWithValue }) => {
    try {
      const res = await patientService.getPatientDetail(id)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to fetch patient details.'
      )
    }
  }
)

export const createPatientThunk = createAsyncThunk(
  'patients/createPatient',
  async (data, { rejectWithValue }) => {
    try {
      const res = await patientService.createPatient(data)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to register patient.'
      )
    }
  }
)

export const updatePatientThunk = createAsyncThunk(
  'patients/updatePatient',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await patientService.updatePatient(id, data)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to update patient.'
      )
    }
  }
)

export const deletePatientThunk = createAsyncThunk(
  'patients/deletePatient',
  async (id, { rejectWithValue }) => {
    try {
      await patientService.deletePatient(id)
      return id
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to delete patient.'
      )
    }
  }
)

const patientSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {
    clearSelectedPatient: (state) => {
      state.selectedPatient = null
    },
    clearPatientError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPatients
      .addCase(fetchPatientsThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchPatientsThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.patients = action.payload.items
        state.total = action.payload.total
      })
      .addCase(fetchPatientsThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // fetchPatientDetail
      .addCase(fetchPatientDetailThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchPatientDetailThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.selectedPatient = action.payload
      })
      .addCase(fetchPatientDetailThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // createPatient
      .addCase(createPatientThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(createPatientThunk.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(createPatientThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // updatePatient
      .addCase(updatePatientThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(updatePatientThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.selectedPatient = action.payload
      })
      .addCase(updatePatientThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // deletePatient
      .addCase(deletePatientThunk.fulfilled, (state, action) => {
        state.patients = state.patients.filter((p) => p.id !== action.payload)
        state.total = Math.max(0, state.total - 1)
      })
  },
})

export const { clearSelectedPatient, clearPatientError } = patientSlice.actions

export const selectPatients = (state) => state.patients.patients
export const selectPatientsTotal = (state) => state.patients.total
export const selectSelectedPatient = (state) => state.patients.selectedPatient
export const selectPatientStatus = (state) => state.patients.status
export const selectPatientError = (state) => state.patients.error

export default patientSlice.reducer
