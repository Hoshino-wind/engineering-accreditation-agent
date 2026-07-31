import { Empty, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import {
  getAbilityGraphCapabilityProfiles,
  type AbilityGraphState,
} from '../../../entities/ability-graph';

import './capabilityStructureWorkspace.css';
import './capabilityStructureWorkspaceResponsive.css';
import { CapabilityCarryPanel } from './CapabilityCarryPanel';
import { CapabilityEvaluationPanel } from './CapabilityEvaluationPanel';
import { capabilityStatusMeta } from './capabilityStructureMeta';

const { Text, Title } = Typography;

interface CapabilityStructureWorkspaceProps {
  graph: AbilityGraphState;
  onInspectCourseOutcome: (courseOutcomeId: string) => void;
  onInspectEvaluationStructure: (courseOutcomeId: string) => void;
  onSelectCapability: (capabilityId: string) => void;
  selectedCapabilityId?: string;
}

export function CapabilityStructureWorkspace({
  graph,
  onInspectCourseOutcome,
  onInspectEvaluationStructure,
  onSelectCapability,
  selectedCapabilityId,
}: CapabilityStructureWorkspaceProps) {
  const profiles = useMemo(
    () => getAbilityGraphCapabilityProfiles(graph),
    [graph],
  );
  const selectedProfile =
    profiles.find(
      (profile) => profile.capability.id === selectedCapabilityId,
    ) ?? profiles[0];

  if (!selectedProfile) {
    return (
      <section className="capability-structure-empty">
        <Empty description="尚未定义正式能力节点" />
      </section>
    );
  }

  const totalPaths = selectedProfile.paths.length;

  return (
    <section className="capability-structure-workspace">
      <header className="capability-structure-intro">
        <div>
          <Title level={4}>先定义能力，再核对培养与评价闭环</Title>
          <Text type="secondary">
            从独立能力节点出发，核对指标点、课程目标、实验活动和评分项是否形成闭环。
          </Text>
        </div>
        <div className="capability-structure-overview">
          <Text strong>
            {selectedProfile.closedLoopCount} / {totalPaths} 条培养路径已闭环
          </Text>
          <Text type="secondary">
            行为覆盖 {selectedProfile.behaviorCoveragePercent}%
          </Text>
        </div>
      </header>

      <div className="capability-structure-grid">
        <nav
          aria-label="能力节点列表"
          className="capability-structure-rail"
        >
          <div className="capability-section-heading">
            <span>1</span>
            <div>
              <Text strong>能力结构</Text>
              <Text type="secondary">指标点期待的正式能力</Text>
            </div>
          </div>
          <div className="capability-profile-list">
            {profiles.map((profile) => {
              const profileMeta = capabilityStatusMeta[profile.status];
              const selected =
                profile.capability.id === selectedProfile.capability.id;
              return (
                <button
                  aria-pressed={selected}
                  className={`capability-profile-button${
                    selected ? ' capability-profile-button--selected' : ''
                  }`}
                  key={profile.capability.id}
                  onClick={() =>
                    onSelectCapability(profile.capability.id)
                  }
                  type="button"
                >
                  <span className="capability-profile-parent">
                    {profile.parentOutcome?.code ?? '未挂接毕业要求'}
                  </span>
                  <span className="capability-profile-title">
                    <code>{profile.capability.code}</code>
                    <strong>{profile.capability.name}</strong>
                  </span>
                  <span className="capability-profile-meta">
                    <span>
                      {profile.capability.capability?.domain ??
                        '能力领域待定义'}
                    </span>
                    <Tag color={profileMeta.color}>
                      {profileMeta.label}
                    </Tag>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <CapabilityCarryPanel
          onInspectCourseOutcome={onInspectCourseOutcome}
          profile={selectedProfile}
        />
        <CapabilityEvaluationPanel
          onInspectEvaluationStructure={
            onInspectEvaluationStructure
          }
          profile={selectedProfile}
        />
      </div>
    </section>
  );
}
