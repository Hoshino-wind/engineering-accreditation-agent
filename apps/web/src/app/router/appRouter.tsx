import { createBrowserRouter } from 'react-router';

import { AgentConsolePage } from '../../views/agent';
import { GraphDiagnosticsPage } from '../../views/diagnostics';
import { AttainmentEvaluationPage } from '../../views/evaluations';
import { GraphViewPage } from '../../views/graph';
import { TeachingImprovementPage } from '../../views/improvements';
import { OverviewPage } from '../../views/overview';
import { RecognitionReviewPage } from '../../views/recognition';
import { TeachingResourcesPage } from '../../views/resources';
import { AccreditationSupportPage } from '../../views/support';
import { LoginPage } from '../../views/auth/ui/LoginPage';
import { RegisterPage } from '../../views/auth/ui/RegisterPage';
import { AuthShell } from '../layouts/AuthShell';

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <AuthShell />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: 'agent',
        element: <AgentConsolePage />,
      },
      {
        path: 'graph',
        element: <GraphViewPage />,
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
