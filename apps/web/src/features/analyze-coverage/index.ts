export {
  analyzeCoverage,
  type CompetencyCoverage,
  type CoverageReport,
  type CoverageStatus,
  type RequirementCoverage,
} from './model/analyzeCoverage';

export {
  explainCompetencyGap,
  explainRequirementGap,
  type GapExplanation,
  type GapReason,
  type BrokenPath,
  type SupportFact,
} from './model/generateExplanation';
