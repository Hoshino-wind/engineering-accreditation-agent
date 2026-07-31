import type { SupportExportFormat } from '../../../entities/support-package';
import { useLocalStorageState } from '../../../shared/lib';

export interface SupportExportDraft {
  format: SupportExportFormat;
  purpose: string;
}

const emptyDraft: SupportExportDraft = {
  format: 'pdf',
  purpose: '',
};

export function useSupportExportDrafts() {
  const [drafts, setDrafts] = useLocalStorageState<
    Record<string, SupportExportDraft>
  >('engineering-accreditation.m8-export-drafts.v1', {});

  const getDraft = (packageId: string) =>
    drafts[packageId] ?? emptyDraft;

  const setFormat = (
    packageId: string,
    format: SupportExportFormat,
  ) => {
    setDrafts((current) => ({
      ...current,
      [packageId]: {
        ...(current[packageId] ?? emptyDraft),
        format,
      },
    }));
  };

  const setPurpose = (packageId: string, purpose: string) => {
    setDrafts((current) => ({
      ...current,
      [packageId]: {
        ...(current[packageId] ?? emptyDraft),
        purpose,
      },
    }));
  };

  return {
    getDraft,
    setFormat,
    setPurpose,
  };
}
