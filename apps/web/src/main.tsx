import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query'
import { AppShell } from './app/AppShell'
import { HoldProvider } from './features/seats/HoldContext'
import { Toaster, toast } from 'sonner'
import './index.css'
const EventsList = React.lazy(() => import('./features/events/EventsList').then(m => ({ default: m.EventsList })))
const OrdersPage = React.lazy(() => import('./features/orders/OrdersPage').then(m => ({ default: m.OrdersPage })))
const EventDetail = React.lazy(() => import('./features/events/EventDetail').then(m => ({ default: m.EventDetail })))
const SeatsPage = React.lazy(() => import('./features/seats/SeatsPage').then(m => ({ default: m.SeatsPage })))
const CheckoutPage = React.lazy(() => import('./features/checkout/CheckoutPage').then(m => ({ default: m.CheckoutPage })))
const OrganizerEventsList = React.lazy(() => import('./features/organizer/OrganizerEventsList').then(m => ({ default: m.OrganizerEventsList })))
const OrganizerEventForm = React.lazy(() => import('./features/organizer/OrganizerEventForm').then(m => ({ default: m.OrganizerEventForm })))
import { RouteError } from './app/RouteError'

const Home = () => (
  <div style={{ padding: 24 }}>
    <h1>Events Platform</h1>
    <ul>
      <li><Link to="/health">Check Health</Link></li>
    </ul>
  </div>
)

const Health = () => {
  const [data, setData] = React.useState<any>(null);
  React.useEffect(() => {
    const url = (import.meta as any).env.VITE_API_URL || 'http://localhost:8080';
    fetch(`${url}/health`).then(r => r.json()).then(setData).catch(console.error)
  }, [])
  return <pre style={{ padding: 24 }}>{JSON.stringify(data, null, 2)}</pre>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <HoldProvider>
        <AppShell />
      </HoldProvider>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'health', element: <Health /> },
      { path: 'events', element: <React.Suspense fallback={<div className='glass p-6 animate-pulse'>Loading…</div>}><EventsList /></React.Suspense> },
      { path: 'events/:id', element: <React.Suspense fallback={<div className='glass p-6 animate-pulse'>Loading…</div>}><EventDetail /></React.Suspense> },
      { path: 'events/:id/seats', element: <React.Suspense fallback={<div className='glass p-6 animate-pulse'>Loading…</div>}><SeatsPage /></React.Suspense> },
      { path: 'checkout', element: <React.Suspense fallback={<div className='glass p-6 animate-pulse'>Loading…</div>}><CheckoutPage /></React.Suspense> },
      { path: 'organizer/events', element: <React.Suspense fallback={<div className='glass p-6 animate-pulse'>Loading…</div>}><OrganizerEventsList /></React.Suspense> },
      { path: 'organizer/events/:id/edit', element: <React.Suspense fallback={<div className='glass p-6 animate-pulse'>Loading…</div>}><OrganizerEventForm /></React.Suspense> },
      { path: 'organizer/events/new', element: <React.Suspense fallback={<div className='glass p-6 animate-pulse'>Loading…</div>}><OrganizerEventForm /></React.Suspense> },
      { path: 'orders', element: <React.Suspense fallback={<div className='glass p-6 animate-pulse'>Loading…</div>}><OrdersPage /></React.Suspense> },
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors theme="dark" />
    </QueryClientProvider>
  </React.StrictMode>
)


