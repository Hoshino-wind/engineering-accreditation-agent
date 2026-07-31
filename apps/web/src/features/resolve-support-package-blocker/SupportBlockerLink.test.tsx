import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createMemoryRouter,
  RouterProvider,
} from 'react-router';

import { SupportBlockerLink } from './index';

afterEach(cleanup);

function renderLink(
  module: 'M6' | 'M7',
  objectId?: string,
) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <SupportBlockerLink
            module={module}
            objectId={objectId}
          />
        ),
      },
    ],
    { initialEntries: ['/support'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('SupportBlockerLink public behavior', () => {
  it('opens the exact M7 improvement case when the source ID is aligned', async () => {
    const router = renderLink('M7', 'qi-2026-017');

    fireEvent.click(
      screen.getByRole('button', { name: '返回 M7' }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/improvements');
      expect(router.state.location.search).toBe(
        '?case=qi-2026-017',
      );
    });
  });

  it('keeps the module-level route when an object mapping is not safe', async () => {
    const router = renderLink('M6', 'eval-2026-071');

    fireEvent.click(
      screen.getByRole('button', { name: '返回 M6' }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/evaluations');
      expect(router.state.location.search).toBe('');
    });
  });
});
