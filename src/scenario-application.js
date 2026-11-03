/** Transactional scenario application. Both the next and the rollback states are prepared
 *  before any UI write; a failed commit restores the previous snapshot, and a failed
 *  restoration reports both errors instead of claiming the previous state was retained. */
export function applyScenarioTransaction(next, { snapshot, prepare, commit, onRollbackFailure } = {}) {
  if (!next || typeof next !== 'object' || Array.isArray(next)) throw new TypeError('Scenario application needs a scenario object');
  for (const [name, fn] of [['snapshot', snapshot], ['prepare', prepare], ['commit', commit]]) {
    if (typeof fn !== 'function') throw new TypeError(`Scenario application needs a ${name} function`);
  }
  if (onRollbackFailure !== undefined && typeof onRollbackFailure !== 'function') throw new TypeError('onRollbackFailure must be a function');
  const preparedNext = prepare(next);
  const preparedPrevious = prepare(snapshot());
  try {
    commit(preparedNext);
    return { applied: true, rollback: preparedPrevious };
  } catch (error) {
    try {
      commit(preparedPrevious);
    } catch (rollbackError) {
      const failure = new Error(`Scenario could not be applied and the previous state could not be fully restored. Application error: ${error.message}. Restoration error: ${rollbackError.message}`);
      failure.rollbackFailed = true;
      failure.cause = error;
      failure.rollbackError = rollbackError;
      onRollbackFailure?.(failure);
      throw failure;
    }
    throw error;
  }
}