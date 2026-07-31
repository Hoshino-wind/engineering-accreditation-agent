import { useCallback, useMemo } from 'react';

import { prototypeOnlySupportPackages } from '../../../entities/support-package';
import { recordWorkflowEvent } from '../../../entities/workflow-event';
import { useLocalStorageState } from '../../../shared/lib';
import {
  createPrototypeOnlySupportPackageRecord,
  toSupportPackage,
  type CreateSupportPackageInput,
  type PrototypeOnlySupportPackageRecord,
} from './prototypeOnlySupportPackage';

const prototypeOnlySupportPackageStorageKey =
  'engineering-accreditation.m8-local-packages.v1';

export function usePrototypeOnlySupportPackages() {
  const [localPackages, setLocalPackages] = useLocalStorageState<
    PrototypeOnlySupportPackageRecord[]
  >(prototypeOnlySupportPackageStorageKey, []);
  const packages = useMemo(
    () => [
      ...localPackages.map(toSupportPackage),
      ...prototypeOnlySupportPackages,
    ],
    [localPackages],
  );

  const createPackage = useCallback(
    (input: CreateSupportPackageInput) => {
      const nextPackage =
        createPrototypeOnlySupportPackageRecord(input);

      setLocalPackages((current) => [nextPackage, ...current]);
      recordWorkflowEvent({
        action: '新建认证支撑包',
        actor: '当前用户',
        module: 'M8',
        objectId: nextPackage.id,
        status: 'pending',
        summary: `${nextPackage.title} · ${nextPackage.course}`,
      });

      return nextPackage;
    },
    [setLocalPackages],
  );

  return {
    createPackage,
    localPackageCount: localPackages.length,
    packages,
  };
}
