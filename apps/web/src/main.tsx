import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query'
import { AppShell } from './app/AppShell'
import { HoldProvider } from './features/seats/HoldContext'
import { Toaster, toast } from 'sonner'
import './index.css'
import { EventsList } from './features/events/EventsList'
import { OrdersPage } from './features/orders/OrdersPage'
import { EventDetail } from './features/events/EventDetail'
import { SeatsPage } from './features/seats/SeatsPage'
import { CheckoutPage } from './features/checkout/CheckoutPage'
import { OrganizerEventsList } from './features/organizer/OrganizerEventsList'
import { OrganizerEventForm } from './features/organizer/OrganizerEventForm'
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
      { path: 'events', element: <EventsList /> },
      { path: 'events/:id', element: <EventDetail /> },
      { path: 'events/:id/seats', element: <SeatsPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'organizer/events', element: <OrganizerEventsList /> },
      { path: 'organizer/events/:id/edit', element: <OrganizerEventForm /> },
      { path: 'organizer/events/new', element: <OrganizerEventForm /> },
      { path: 'orders', element: <OrdersPage /> },
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


