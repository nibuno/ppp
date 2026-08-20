import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import App from './App'
import { AudiencePage } from './pages/AudiencePage'
import { PresenterPage } from './pages/PresenterPage'
import { NotFound, RouteError } from './pages/RouteMessages'
import { SetupPage } from './pages/SetupPage'

const rootRoute = createRootRoute({
  component: App,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/setup' })
  },
})

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: SetupPage,
})

const presenterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/presenter',
  component: PresenterPage,
})

const audienceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audience',
  component: AudiencePage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  setupRoute,
  presenterRoute,
  audienceRoute,
])

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
