import { createBrowserRouter } from 'react-router';

import { OverviewPage } from '../../views/overview';
import { AppShell } from '../layouts/AppShell';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
    ],
  },
]);
