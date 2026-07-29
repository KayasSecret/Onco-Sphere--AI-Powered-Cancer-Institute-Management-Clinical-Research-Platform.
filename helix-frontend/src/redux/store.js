import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import patientReducer from './slices/patientSlice'
import adminReducer from './slices/adminSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    patients: patientReducer,
    admin: adminReducer,
  },
  devTools: import.meta.env.DEV,
})

export default store
