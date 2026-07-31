import {
  appShellRoutes,
  defaultAppShellRoute,
  type AppShellRouteDefinition,
} from '../config/appShellRoutes';

const routeByPath = new Map(
  appShellRoutes.map((route) => [route.path, route] as const),
);

export function resolveAppShellRoute(
  pathname: string,
): AppShellRouteDefinition {
  return routeByPath.get(pathname) ?? defaultAppShellRoute;
}

export function getAppShellContentClassName(pathname: string) {
  return resolveAppShellRoute(pathname).contentMode === 'workbench'
    ? 'app-content app-content--workbench'
    : 'app-content';
}
