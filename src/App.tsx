import { Outlet } from '@tanstack/react-router'
import { PresentationSessionProvider } from './state/PresentationSession'

export default function App() {
  return (
    <PresentationSessionProvider>
      <Outlet />
    </PresentationSessionProvider>
  )
}
