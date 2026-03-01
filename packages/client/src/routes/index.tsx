import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import App from '@/App';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { NotFoundPage } from '@/shared/components/NotFoundPage';
import { MapPageSkeleton, SidebarPageSkeleton, ContentPageSkeleton } from '@/shared/components/PageSkeleton';

const ElectionMap = lazy(() => import('@/features/election-map'));
const WardExplorer = lazy(() => import('@/features/ward-explorer'));
const Trends = lazy(() => import('@/features/trends'));
const SwingModeler = lazy(() => import('@/features/swing-modeler'));
const SupremeCourt = lazy(() => import('@/features/supreme-court'));
const WardReport = lazy(() => import('@/features/ward-report'));
const ElectionComparison = lazy(() => import('@/features/election-comparison'));
const DataManager = lazy(() => import('@/features/data-manager'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/map" replace /> },
      {
        path: 'map',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<MapPageSkeleton />}>
              <ElectionMap />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'wards',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<SidebarPageSkeleton />}>
              <WardExplorer />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'supreme-court',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<ContentPageSkeleton />}>
              <SupremeCourt />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'wards/report',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<ContentPageSkeleton />}>
              <WardReport />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'wards/:wardId/report',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<ContentPageSkeleton />}>
              <WardReport />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'trends',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<ContentPageSkeleton />}>
              <Trends />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'modeler',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<MapPageSkeleton />}>
              <SwingModeler />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'compare',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<MapPageSkeleton />}>
              <ElectionComparison />
            </Suspense>
          </ErrorBoundary>
        ),
      },
      {
        path: 'data',
        element: (
          <ErrorBoundary>
            <Suspense fallback={<ContentPageSkeleton />}>
              <DataManager />
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
