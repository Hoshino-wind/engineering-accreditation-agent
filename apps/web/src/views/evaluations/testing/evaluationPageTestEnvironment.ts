import { vi } from 'vitest';

export function installAttainmentEvaluationPageTestEnvironment() {
  const getComputedStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    try {
      return getComputedStyle(element);
    } catch {
      return {
        display: 'block',
        getPropertyValue: () => '',
        visibility: 'visible',
      } as unknown as CSSStyleDeclaration;
    }
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

export function restoreAttainmentEvaluationPageTestEnvironment() {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
}
