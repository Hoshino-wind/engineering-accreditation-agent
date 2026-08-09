import { Empty } from 'antd';
import { useMemo, useState } from 'react';

import type {
  SupportPackage,
  SupportPackageSection,
} from '../../../entities/support-package';
import { useSupportExportDrafts } from '../../../features/configure-support-export';
import { useSupportPackageFilters } from '../../../features/filter-support-packages';
import { SupportEvidenceDrawer } from '../../../features/inspect-support-evidence';
import { validateSupportPackage } from '../../../features/validate-support-package';
import { SupportPackageContentPanel } from './SupportPackageContentPanel';
import { SupportPackageQueue } from './SupportPackageQueue';
import { SupportValidationPanel } from './SupportValidationPanel';

import './supportWorkbench.css';

interface SupportWorkbenchProps {
  /** 由实时报告章节与图谱快照组装出的支撑包 */
  packages: SupportPackage[];
}

export function SupportWorkbench({ packages }: SupportWorkbenchProps) {
  const filters = useSupportPackageFilters(packages);
  const exportDrafts = useSupportExportDrafts();
  const [selectedPackageId, setSelectedPackageId] = useState<
    string | undefined
  >(packages[0]?.id);
  const [selectedSectionId, setSelectedSectionId] = useState<
    string | undefined
  >(packages[0]?.sections[0]?.id);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const selectedPackage =
    filters.packages.find(
      (supportPackage) => supportPackage.id === selectedPackageId,
    ) ??
    filters.packages[0] ??
    packages[0] ??
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

  if (packages.length === 0) {
    return (
      <section className="support-workbench">
        <Empty
          description="自评报告章节生成后，支撑包会基于实时图谱与报告自动组装"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </section>
    );
  }

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
          total={packages.length}
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
