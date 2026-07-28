import { createBrowserRouter } from 'react-router';

import { GraphDiagnosticsPage } from '../../views/diagnostics';
import { AttainmentEvaluationPage } from '../../views/evaluations';
import { TeachingImprovementPage } from '../../views/improvements';
import { OverviewPage } from '../../views/overview';
import { RecognitionReviewPage } from '../../views/recognition';
import { TeachingResourcesPage } from '../../views/resources';
import { AccreditationSupportPage } from '../../views/support';
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
      {
        path: 'resources',
        element: <TeachingResourcesPage />,
      },
      {
        path: 'recognition',
        element: <RecognitionReviewPage />,
      },
      {
        path: 'diagnostics',
        element: <GraphDiagnosticsPage />,
      },
      {
        path: 'evaluations',
        element: <AttainmentEvaluationPage />,
      },
      {
        path: 'improvements',
        element: <TeachingImprovementPage />,
      },
      {
        path: 'support',
        element: <AccreditationSupportPage />,
      },
    ],
  },
]);
