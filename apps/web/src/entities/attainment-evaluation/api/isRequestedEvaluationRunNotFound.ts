export function isRequestedEvaluationRunNotFound(
  error: unknown,
  runId: string,
): boolean {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('detail' in error)
  ) {
    return false;
  }

  const detail = error.detail;
  return (
    typeof detail === 'object' &&
    detail !== null &&
    'code' in detail &&
    detail.code === 'evaluation_run_not_found' &&
    'runId' in detail &&
    detail.runId === runId
  );
}
