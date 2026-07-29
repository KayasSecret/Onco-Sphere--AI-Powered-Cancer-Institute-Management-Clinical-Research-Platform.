import { createSlice } from '@reduxjs/toolkit'

/**
 * uiSlice — global UI state
 *
 * Tracks:
 * - sidebarOpen: collapsible sidebar state (persisted to localStorage)
 * - toasts: managed by Sonner, referenced here for programmatic control
 */

const initialState = {
  // Sidebar: default open on desktop, read from localStorage for persistence
  sidebarOpen: localStorage.getItem('helix_sidebar') !== 'closed',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
      localStorage.setItem('helix_sidebar', state.sidebarOpen ? 'open' : 'closed')
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload
      localStorage.setItem('helix_sidebar', action.payload ? 'open' : 'closed')
    },
  },
})

export const { toggleSidebar, setSidebarOpen } = uiSlice.actions

// Selectors
export const selectSidebarOpen = (state) => state.ui.sidebarOpen

export default uiSlice.reducer
