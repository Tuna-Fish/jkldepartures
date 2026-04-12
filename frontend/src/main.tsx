import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import StopPage from './pages/StopPage'
import AlertsPage from './pages/AlertsPage'
import MapPage from './pages/MapPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('4')) return false
        return failureCount < 2
      },
      staleTime: 10_000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/"                element={<HomePage />} />
            <Route path="/stop/:stopId"    element={<StopPage />} />
            <Route path="/alerts"          element={<AlertsPage />} />
            <Route path="/map"             element={<MapPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)