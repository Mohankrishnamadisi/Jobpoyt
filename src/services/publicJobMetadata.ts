import { companyService, jobService } from './api';
import { createAsyncTtlCache } from '../utils/asyncTtlCache';

const PUBLIC_METADATA_TTL_MS = 2 * 60 * 1000;

export const getPublicPlatformStats = createAsyncTtlCache(async () => {
  const [jobs, companies] = await Promise.all([
    jobService.getJobs({}, 1, 1),
    companyService.getCompanyCount(),
  ]);

  return { activeJobs: jobs.total, companies };
}, PUBLIC_METADATA_TTL_MS);

export const getPublicJobCategories = createAsyncTtlCache(
  () => jobService.getCategories(),
  PUBLIC_METADATA_TTL_MS
);
