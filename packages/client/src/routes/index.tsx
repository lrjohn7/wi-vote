import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import App from '@/App';

const ElectionMap = lazy(() => import('@/features/election-map'));
const WardExplorer = lazy(() => import('@/features/ward-explorer'));
const Trends = lazy(() => import('@/features/trends'));
const SwingModeler = lazy(() => import('@/features/swing-modeler'));
const SupremeCourt = lazy(() => import('@/features/supreme-court'));
const DataManager = lazy(() => import('@/features/data-manager'));

function Loading() {
  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      Loading...
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/map" replace /> },
      {
        path: 'map',
        element: (
          <Suspense fallback={<Loading />}>
            <ElectionMap />
          </Suspense>
        ),
      },
      {
        path: 'wards',
        element: (
          <Suspense fallback={<Loading />}>
            <WardExplorer />
          </Suspense>
        ),
      },
      {
        path: 'supreme-court',
        element: (
          <Suspense fallback={<Loading />}>
            <SupremeCourt />
          </Suspense>
        ),
      },
      {
        path: 'trends',
        element: (
          <Suspense fallback={<Loading />}>
            <Trends />
          </Suspense>
        ),
      },
      {
        path: 'modeler',
        element: (
          <Suspense fallback={<Loading />}>
            <SwingModeler />
          </Suspense>
        ),
      },
      {
        path: 'data',
        element: (
          <Suspense fallback={<Loading />}>
            <DataManager />
          </Suspense>
        ),
      },
    ],
  },
]);
