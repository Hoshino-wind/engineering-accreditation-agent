import type { paths } from '@engineering-accreditation/api-client';
import createClient from 'openapi-fetch';

import { browserEnv } from '../config/env';

export const apiClient = createClient<paths>({
  baseUrl: browserEnv.VITE_API_BASE_URL,
});
