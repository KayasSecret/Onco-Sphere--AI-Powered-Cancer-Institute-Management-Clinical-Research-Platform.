import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import patientReducer from './slices/patientSlice'
import adminReducer from './slices/adminSlice'
import visitReducer from './slices/visitSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    patients: patientReducer,
    admin: adminReducer,
    visits: visitReducer,
  },
  devTools: import.meta.env.DEV,
})

export default store
