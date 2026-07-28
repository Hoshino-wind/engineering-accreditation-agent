import { useMemo, useState } from 'react';

import {
  prototypeOnlySupportPackages,
  type SupportPackage,
  type SupportPackageSection,
} from '../../../entities/support-package';
import { useSupportExportDrafts } from '../../../features/configure-support-export';
import { useSupportPackageFilters } from '../../../features/filter-support-packages';
import { SupportEvidenceDrawer } from '../../../features/inspect-support-evidence';
import { validateSupportPackage } from '../../../features/validate-support-package';
import { SupportPackageContentPanel } from './SupportPackageContentPanel';
import { SupportPackageQueue } from './SupportPackageQueue';
import { SupportValidationPanel } from './SupportValidationPanel';

import './supportWorkbench.css';

export function SupportWorkbench() {
  const filters = useSupportPackageFilters(prototypeOnlySupportPackages);
  const exportDrafts = useSupportExportDrafts();
  const [selectedPackageId, setSelectedPackageId] = useState(
    prototypeOnlySupportPackages[0]?.id,
  );
  const [selectedSectionId, setSelectedSectionId] = useState(
    prototypeOnlySupportPackages[0]?.sections[0]?.id,
  );
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const selectedPackage =
    filters.packages.find(
      (supportPackage) => supportPackage.id === selectedPackageId,
    ) ??
    filters.packages[0] ??
    null;
  const selectedSection =
    selectedPackage?.sections.find(
      (section) => section.id === selectedSectionId,
    ) ??
    selectedPackage?.sections[0] ??
    null;
  const selectedDraft = selectedPackage
    ? exportDrafts.getDraft(selectedPackage.id)
    : { format: 'pdf' as const, purpose: '' };
  const validation = useMemo(
    () =>
      selectedPackage
        ? validateSupportPackage(selectedPackage)
        : null,
    [selectedPackage],
  );

  const handlePackageSelect = (supportPackage: SupportPackage) => {
    setSelectedPackageId(supportPackage.id);
    setSelectedSectionId(supportPackage.sections[0]?.id);
  };

  const handleSectionSelect = (section: SupportPackageSection) => {
    setSelectedSectionId(section.id);
  };

  return (
    <>
      <section className="support-workbench">
        <SupportPackageQueue
          keyword={filters.keyword}
          onKeywordChange={filters.setKeyword}
          onSelect={handlePackageSelect}
          onStatusChange={filters.setStatus}
          onTemplateChange={filters.setTemplate}
          packages={filters.packages}
          selectedPackageId={selectedPackage?.id}
          status={filters.status}
          template={filters.template}
        />
        <SupportPackageContentPanel
          onInspectEvidence={() => setEvidenceDrawerOpen(true)}
          onSectionSelect={handleSectionSelect}
          selectedSection={selectedSection}
          supportPackage={selectedPackage}
        />
        <SupportValidationPanel
          draft={selectedDraft}
          onFormatChange={(format) => {
            if (selectedPackage) {
              exportDrafts.setFormat(selectedPackage.id, format);
            }
          }}
          onPurposeChange={(purpose) => {
            if (selectedPackage) {
              exportDrafts.setPurpose(selectedPackage.id, purpose);
            }
          }}
          supportPackage={selectedPackage}
          validation={validation}
        />
      </section>
      <SupportEvidenceDrawer
        onClose={() => setEvidenceDrawerOpen(false)}
        open={evidenceDrawerOpen}
        section={selectedSection}
        supportPackage={selectedPackage}
      />
    </>
  );
}
