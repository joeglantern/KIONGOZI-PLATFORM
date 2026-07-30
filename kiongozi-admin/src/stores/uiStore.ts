import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface UiState {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  theme: Theme
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setMobileSidebarOpen: (v: boolean) => void
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

function applyTheme(t: Theme) {
  document.documentElement.className = t
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      theme: 'dark',
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: v => set({ sidebarCollapsed: v }),
      setMobileSidebarOpen: v => set({ mobileSidebarOpen: v }),
      setTheme: t => { applyTheme(t); set({ theme: t }) },
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },
    }),
    {
      name: 'kiongozi-admin-ui',
      partialize: s => ({ sidebarCollapsed: s.sidebarCollapsed, theme: s.theme }),
      onRehydrateStorage: () => state => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)
