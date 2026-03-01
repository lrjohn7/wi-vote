import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import App from '@/App';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { NotFoundPage } from '@/shared/components/NotFoundPage';
import { MapPageSkeleton, SidebarPageSkeleton, ContentPageSkeleton } from '@/shared/components/PageSkeleton';

const LandingPage = lazy(() => import('@/features/landing'));
const ElectionMap = lazy(() => import('@/features/election-map'));
const WardExplorer = lazy(() => import('@/features/ward-explorer'));
const Trends = lazy(() => import('@/features/trends'));
const SwingModeler = lazy(() => import('@/features/swing-modeler'));
const SupremeCourt = lazy(() => import('@/features/supreme-court'));
const WardReport = lazy(() => import('@/features/ward-report'));
const ElectionComparison = lazy(() => import('@/features/election-comparison'));
const ElectionNight = lazy(() => import('@/features/election-night'));
const BoundaryHistory = lazy(() => import('@/features/boundary-history'));
const DataManager = lazy(() => import('@/features/data-manager'));
const AnalyticsDashboard = lazy(() => import('@/features/analytics-dashboard'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: (
          <ErrorBoundary featureName="Home">
            <Suspense fallback={<ContentPageSkeleton />}>
              <LandingPage />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'map',
        element: (
          <ErrorBoundary featureName="Election Map">
            <Suspense fallback={<MapPageSkeleton />}>
              <ElectionMap />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'wards',
        element: (
          <ErrorBoundary featureName="Ward Explorer">
            <Suspense fallback={<SidebarPageSkeleton />}>
              <WardExplorer />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'supreme-court',
        element: (
          <ErrorBoundary featureName="Supreme Court">
            <Suspense fallback={<ContentPageSkeleton />}>
              <SupremeCourt />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'wards/report',
        element: (
          <ErrorBoundary featureName="Ward Report">
            <Suspense fallback={<ContentPageSkeleton />}>
              <WardReport />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'wards/:wardId/report',
        element: (
          <ErrorBoundary featureName="Ward Report">
            <Suspense fallback={<ContentPageSkeleton />}>
              <WardReport />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'trends',
        element: (
          <ErrorBoundary featureName="Trends">
            <Suspense fallback={<ContentPageSkeleton />}>
              <Trends />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'modeler',
        element: (
          <ErrorBoundary featureName="Swing Modeler">
            <Suspense fallback={<MapPageSkeleton />}>
              <SwingModeler />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'compare',
        element: (
          <ErrorBoundary featureName="Election Comparison">
            <Suspense fallback={<MapPageSkeleton />}>
              <ElectionComparison />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'live',
        element: (
          <ErrorBoundary featureName="Election Night">
            <Suspense fallback={<MapPageSkeleton />}>
              <ElectionNight />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'boundaries',
        element: (
          <ErrorBoundary featureName="Boundary History">
            <Suspense fallback={<MapPageSkeleton />}>
              <BoundaryHistory />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'data',
        element: (
          <ErrorBoundary featureName="Data Manager">
            <Suspense fallback={<ContentPageSkeleton />}>
              <DataManager />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'admin/analytics',
        element: (
          <ErrorBoundary featureName="Analytics">
            <Suspense fallback={<ContentPageSkeleton />}>
              <AnalyticsDashboard />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
