import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import adminService from '../../services/adminService'

const initialState = {
  admins: [],
  total: 0,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
}

export const fetchAdminsThunk = createAsyncThunk(
  'admin/fetchAdmins',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminService.getAdmins(params)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to fetch admin users.'
      )
    }
  }
)

export const createAdminThunk = createAsyncThunk(
  'admin/createAdmin',
  async (data, { rejectWithValue }) => {
    try {
      const res = await adminService.createAdmin(data)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to create user.'
      )
    }
  }
)

export const updateAdminThunk = createAsyncThunk(
  'admin/updateAdmin',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await adminService.updateAdmin(id, data)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to update user.'
      )
    }
  }
)

export const toggleAdminStatusThunk = createAsyncThunk(
  'admin/toggleAdminStatus',
  async ({ id, isActive }, { rejectWithValue }) => {
    try {
      const res = await adminService.toggleAdminStatus(id, isActive)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to update user status.'
      )
    }
  }
)

export const updateApprovalThunk = createAsyncThunk(
  'admin/updateApproval',
  async ({ id, action }, { rejectWithValue }) => {
    try {
      const res = await adminService.updateApproval(id, action)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || 'Failed to update user approval status.'
      )
    }
  }
)

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAdmins
      .addCase(fetchAdminsThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchAdminsThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.admins = action.payload.items
        state.total = action.payload.total
      })
      .addCase(fetchAdminsThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })

      // createAdmin
      .addCase(createAdminThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.admins.unshift(action.payload)
        state.total += 1
      })

      // updateAdmin
      .addCase(updateAdminThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const idx = state.admins.findIndex((u) => u.id === action.payload.id)
        if (idx !== -1) {
          state.admins[idx] = action.payload
        }
      })

      // toggleAdminStatus
      .addCase(toggleAdminStatusThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const idx = state.admins.findIndex((u) => u.id === action.payload.id)
        if (idx !== -1) {
          state.admins[idx] = action.payload
        }
      })

      // updateApproval
      .addCase(updateApprovalThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const idx = state.admins.findIndex((u) => u.id === action.payload.id)
        if (idx !== -1) {
          state.admins[idx] = action.payload
        }
      })
  },
})

export const { clearAdminError } = adminSlice.actions

export const selectAdmins = (state) => state.admin.admins
export const selectAdminsTotal = (state) => state.admin.total
export const selectAdminStatus = (state) => state.admin.status
export const selectAdminError = (state) => state.admin.error

export default adminSlice.reducer
