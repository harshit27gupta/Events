import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom'

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
  { path: '/', element: <Home /> },
  { path: '/health', element: <Health /> },
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)


