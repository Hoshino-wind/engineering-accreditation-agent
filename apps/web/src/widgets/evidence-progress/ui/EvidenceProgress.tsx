import { Card, Steps } from 'antd';

import { prototypeOnlyEvidenceProgress } from '../model/prototypeOnlyEvidenceProgress';

export function EvidenceProgress() {
  return (
    <Card size="small" title="证据链建设进度">
      <Steps
        current={2}
        items={prototypeOnlyEvidenceProgress.map((item) => ({ ...item }))}
        responsive={false}
      />
    </Card>
  );
}
