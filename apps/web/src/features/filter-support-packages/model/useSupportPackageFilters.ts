import { useMemo, useState } from 'react';

import type {
  SupportPackage,
  SupportPackageStatus,
  SupportTemplateKind,
} from '../../../entities/support-package';
import { filterSupportPackages } from './filterSupportPackages';

export function useSupportPackageFilters(sourcePackages: SupportPackage[]) {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<
    SupportPackageStatus | 'all'
  >('all');
  const [template, setTemplate] = useState<
    SupportTemplateKind | 'all'
  >('all');
  const packages = useMemo(
    () =>
      filterSupportPackages(sourcePackages, {
        keyword,
        status,
        template,
      }),
    [keyword, sourcePackages, status, template],
  );

  return {
    keyword,
    packages,
    setKeyword,
    setStatus,
    setTemplate,
    status,
    template,
  };
}
