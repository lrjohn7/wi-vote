import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import App from '@/App';
import { MapPageSkeleton, SidebarPageSkeleton, ContentPageSkeleton } from '@/shared/components/PageSkeleton';

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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/map" replace /> },
      {
        path: 'map',
        element: (
          <Suspense fallback={<MapPageSkeleton />}>
            <ElectionMap />
          </Suspense>
        ),
      },
      {
        path: 'wards',
        element: (
          <Suspense fallback={<SidebarPageSkeleton />}>
            <WardExplorer />
          </Suspense>
        ),
      },
      {
        path: 'supreme-court',
        element: (
          <Suspense fallback={<ContentPageSkeleton />}>
            <SupremeCourt />
          </Suspense>
        ),
      },
      {
        path: 'wards/report',
        element: (
          <Suspense fallback={<ContentPageSkeleton />}>
            <WardReport />
          </Suspense>
        ),
      },
      {
        path: 'wards/:wardId/report',
        element: (
          <Suspense fallback={<ContentPageSkeleton />}>
            <WardReport />
          </Suspense>
        ),
      },
      {
        path: 'trends',
        element: (
          <Suspense fallback={<ContentPageSkeleton />}>
            <Trends />
          </Suspense>
        ),
      },
      {
        path: 'modeler',
        element: (
          <Suspense fallback={<MapPageSkeleton />}>
            <SwingModeler />
          </Suspense>
        ),
      },
      {
        path: 'compare',
        element: (
          <Suspense fallback={<MapPageSkeleton />}>
            <ElectionComparison />
          </Suspense>
        ),
      },
      {
        path: 'live',
        element: (
          <Suspense fallback={<MapPageSkeleton />}>
            <ElectionNight />
          </Suspense>
        ),
      },
      {
        path: 'boundaries',
        element: (
          <Suspense fallback={<MapPageSkeleton />}>
            <BoundaryHistory />
          </Suspense>
        ),
      },
      {
        path: 'data',
        element: (
          <Suspense fallback={<ContentPageSkeleton />}>
            <DataManager />
          </Suspense>
        ),
      },
    ],
  },
]);
