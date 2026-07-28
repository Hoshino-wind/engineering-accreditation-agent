import { RouterProvider } from 'react-router/dom';

import { appRouter } from './router/appRouter';

export function App() {
  return <RouterProvider router={appRouter} />;
}
