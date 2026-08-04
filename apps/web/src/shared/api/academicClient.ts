import { requestJson } from './http';

export interface AcademicProgram {
  id: string;
  code: string;
  name: string;
  discipline: string;
  degree: string;
  owner: string;
  evaluationCycle: string;
  status: string;
}

export interface AcademicCourse {
  id: string;
  programId: string;
  code: string;
  name: string;
  category: string;
  term: string;
  creditHours: number;
  owner: string;
  status: string;
}

export interface GraduationRequirement {
  id: string;
  programId: string;
  code: string;
  title: string;
  description: string;
}

export interface CompetencyIndicator {
  id: string;
  requirementId: string;
  code: string;
  title: string;
  description: string;
}

export interface CourseObjective {
  id: string;
  courseId: string;
  code: string;
  title: string;
  description: string;
}

export interface ExperimentProject {
  id: string;
  courseId: string;
  code: string;
  title: string;
  description: string;
  environment: string;
  sourceMaterialId?: string | null;
}

export interface RubricItem {
  id: string;
  courseId: string;
  experimentId?: string | null;
  indicatorId: string;
  code: string;
  title: string;
  points: number;
}

export interface SourceMaterial {
  id: string;
  courseId: string;
  fileName: string;
  materialType: string;
  sourcePath: string;
  checksum: string;
  status: string;
}

export interface SupportLink {
  id: string;
  sourceType: string;
  sourceId: string;
  targetIndicatorId: string;
  relation: string;
  strength: string;
  evidence: string;
  status: string;
}

export interface AcademicCatalog {
  program: AcademicProgram | null;
  courses: AcademicCourse[];
  graduationRequirements: GraduationRequirement[];
  indicators: CompetencyIndicator[];
  objectives: CourseObjective[];
  experiments: ExperimentProject[];
  rubricItems: RubricItem[];
  sourceMaterials: SourceMaterial[];
  supportLinks: SupportLink[];
}

export interface AcademicProgramPayload {
  code: string;
  name: string;
  discipline: string;
  degree: string;
  owner: string;
  evaluationCycle: string;
  status: string;
}

export interface AcademicCoursePayload {
  programId?: string | null;
  code: string;
  name: string;
  category: string;
  term: string;
  creditHours: number;
  owner: string;
  status: string;
}

export interface GraduationRequirementPayload {
  programId?: string | null;
  code: string;
  title: string;
  description: string;
}

export interface CompetencyIndicatorPayload {
  requirementId: string;
  code: string;
  title: string;
  description: string;
}

export interface CourseObjectivePayload {
  courseId: string;
  code: string;
  title: string;
  description: string;
}

export interface ExperimentProjectPayload {
  courseId: string;
  code: string;
  title: string;
  description: string;
  environment: string;
  sourceMaterialId?: string | null;
}

export interface RubricItemPayload {
  courseId: string;
  experimentId?: string | null;
  indicatorId: string;
  code: string;
  title: string;
  points: number;
}

export async function getAcademicCatalog(): Promise<AcademicCatalog> {
  return requestJson<AcademicCatalog>('/api/v1/academic/catalog');
}

export async function updateAcademicProgram(
  payload: AcademicProgramPayload,
): Promise<AcademicProgram> {
  return requestJson<AcademicProgram>('/api/v1/academic/program', {
    body: JSON.stringify(payload),
    method: 'PATCH',
  });
}

export async function createAcademicCourse(
  payload: AcademicCoursePayload,
): Promise<AcademicCourse> {
  return requestJson<AcademicCourse>('/api/v1/academic/courses', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function updateAcademicCourse(
  courseId: string,
  payload: AcademicCoursePayload,
): Promise<AcademicCourse> {
  return requestJson<AcademicCourse>(`/api/v1/academic/courses/${courseId}`, {
    body: JSON.stringify(payload),
    method: 'PATCH',
  });
}

export async function createGraduationRequirement(
  payload: GraduationRequirementPayload,
): Promise<GraduationRequirement> {
  return requestJson<GraduationRequirement>(
    '/api/v1/academic/graduation-requirements',
    {
      body: JSON.stringify(payload),
      method: 'POST',
    },
  );
}

export async function updateGraduationRequirement(
  requirementId: string,
  payload: GraduationRequirementPayload,
): Promise<GraduationRequirement> {
  return requestJson<GraduationRequirement>(
    `/api/v1/academic/graduation-requirements/${requirementId}`,
    {
      body: JSON.stringify(payload),
      method: 'PATCH',
    },
  );
}

export async function createCompetencyIndicator(
  payload: CompetencyIndicatorPayload,
): Promise<CompetencyIndicator> {
  return requestJson<CompetencyIndicator>('/api/v1/academic/indicators', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function updateCompetencyIndicator(
  indicatorId: string,
  payload: CompetencyIndicatorPayload,
): Promise<CompetencyIndicator> {
  return requestJson<CompetencyIndicator>(
    `/api/v1/academic/indicators/${indicatorId}`,
    {
      body: JSON.stringify(payload),
      method: 'PATCH',
    },
  );
}

export async function createCourseObjective(
  payload: CourseObjectivePayload,
): Promise<CourseObjective> {
  return requestJson<CourseObjective>('/api/v1/academic/objectives', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function updateCourseObjective(
  objectiveId: string,
  payload: CourseObjectivePayload,
): Promise<CourseObjective> {
  return requestJson<CourseObjective>(`/api/v1/academic/objectives/${objectiveId}`, {
    body: JSON.stringify(payload),
    method: 'PATCH',
  });
}

export async function createExperimentProject(
  payload: ExperimentProjectPayload,
): Promise<ExperimentProject> {
  return requestJson<ExperimentProject>('/api/v1/academic/experiments', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function updateExperimentProject(
  experimentId: string,
  payload: ExperimentProjectPayload,
): Promise<ExperimentProject> {
  return requestJson<ExperimentProject>(
    `/api/v1/academic/experiments/${experimentId}`,
    {
      body: JSON.stringify(payload),
      method: 'PATCH',
    },
  );
}

export async function createRubricItem(
  payload: RubricItemPayload,
): Promise<RubricItem> {
  return requestJson<RubricItem>('/api/v1/academic/rubric-items', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function updateRubricItem(
  itemId: string,
  payload: RubricItemPayload,
): Promise<RubricItem> {
  return requestJson<RubricItem>(`/api/v1/academic/rubric-items/${itemId}`, {
    body: JSON.stringify(payload),
    method: 'PATCH',
  });
}
