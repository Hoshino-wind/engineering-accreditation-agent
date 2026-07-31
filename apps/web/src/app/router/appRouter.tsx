import { createBrowserRouter } from 'react-router';

import { AppShell } from '../layouts/app-shell';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    hydrateFallbackElement: (
      <div className="route-loading" role="status">
        正在加载工作台…
      </div>
    ),
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('../../views/overview')).OverviewPage,
        }),
      },
      {
        path: 'graph',
        lazy: async () => ({
          Component: (await import('../../views/graph')).AbilityGraphPage,
        }),
      },
      {
        path: 'resources',
        lazy: async () => ({
          Component: (await import('../../views/resources'))
            .TeachingResourcesPage,
        }),
      },
      {
        path: 'recognition',
        lazy: async () => ({
          Component: (await import('../../views/recognition'))
            .RecognitionReviewPage,
        }),
      },
      {
        path: 'diagnostics',
        lazy: async () => ({
          Component: (await import('../../views/diagnostics'))
            .GraphDiagnosticsPage,
        }),
      },
      {
        path: 'evaluations',
        lazy: async () => ({
          Component: (await import('../../views/evaluations'))
            .AttainmentEvaluationPage,
        }),
      },
      {
        path: 'improvements',
        lazy: async () => ({
          Component: (await import('../../views/improvements'))
            .TeachingImprovementPage,
        }),
      },
      {
        path: 'governance',
        lazy: async () => ({
          Component: (await import('../../views/governance'))
            .GovernancePage,
        }),
      },
      {
        path: 'support',
        lazy: async () => ({
          Component: (await import('../../views/support'))
            .AccreditationSupportPage,
        }),
      },
    ],
  },
]);
