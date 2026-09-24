/**
 * Automation Workflow Validator — PIXMatch AI Phase 16
 * Validates workflow configuration, step definitions, and DAG dependency graph.
 */

import { AutomationActionType, AutomationWorkflowConfigDTO, AutomationStepConfigDTO } from '@pixmatch/types';

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
}

export class AutomationValidator {
  private static readonly MAX_STEPS = 50;
  private static readonly VALID_ACTIONS = new Set(Object.values(AutomationActionType));

  /**
   * Validates a workflow configuration object against business rules and structural constraints.
   */
  public static validate(config: AutomationWorkflowConfigDTO): WorkflowValidationResult {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      return { isValid: false, errors: ['Workflow configuration must be a valid JSON object'] };
    }

    if (!Array.isArray(config.steps) || config.steps.length === 0) {
      errors.push('Workflow must contain at least one step');
      return { isValid: false, errors };
    }

    if (config.steps.length > this.MAX_STEPS) {
      errors.push(`Workflow exceeds maximum limit of ${this.MAX_STEPS} steps (found ${config.steps.length})`);
    }

    const stepIds = new Set<string>();
    const graph: Map<string, string[]> = new Map();

    // 1. Step structural validation
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      if (!step || typeof step !== 'object') {
        errors.push(`Step at index ${i} is invalid`);
        continue;
      }

      if (!step.id || typeof step.id !== 'string' || step.id.trim() === '') {
        errors.push(`Step at index ${i} is missing a valid id`);
        continue;
      }

      const trimmedId = step.id.trim();

      if (stepIds.has(trimmedId)) {
        errors.push(`Duplicate step ID detected: "${trimmedId}"`);
      }
      stepIds.add(trimmedId);

      if (!step.action || !this.VALID_ACTIONS.has(step.action as AutomationActionType)) {
        errors.push(`Step "${trimmedId}" has invalid or unsupported action: "${step.action}"`);
      }

      const dependencies = Array.isArray(step.dependsOn) ? step.dependsOn : [];
      graph.set(trimmedId, dependencies);
    }

    // 2. Dependency existence validation
    for (const [stepId, deps] of graph.entries()) {
      for (const dep of deps) {
        if (!stepIds.has(dep)) {
          errors.push(`Step "${stepId}" depends on non-existent step "${dep}"`);
        }
        if (dep === stepId) {
          errors.push(`Step "${stepId}" cannot depend on itself`);
        }
      }
    }

    // 3. Cycle / Circular Dependency Detection (DFS with recursion stack)
    if (errors.length === 0) {
      const cycleErrors = this.detectCycles(graph);
      if (cycleErrors.length > 0) {
        errors.push(...cycleErrors);
      }
    }

    // 4. Failure handling validation
    if (config.failureHandling) {
      const maxRetries = config.failureHandling.maxRetries;
      if (maxRetries !== undefined && (typeof maxRetries !== 'number' || maxRetries < 1 || maxRetries > 5)) {
        errors.push('maxRetries must be an integer between 1 and 5');
      }
    }

    // 5. Schedule validation
    if (config.schedule) {
      const cadence = config.schedule.cadence;
      if (!['HOURLY', 'DAILY', 'WEEKLY'].includes(cadence)) {
        errors.push(`Invalid schedule cadence: "${cadence}". Must be HOURLY, DAILY, or WEEKLY.`);
      }
      if (config.schedule.dayOfWeek !== undefined) {
        const dow = config.schedule.dayOfWeek;
        if (typeof dow !== 'number' || dow < 0 || dow > 6) {
          errors.push('Schedule dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday)');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detects cycles in the workflow DAG using depth-first search.
   */
  private static detectCycles(graph: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycleNodes: string[] = [];

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          cycleNodes.push(`${node} -> ${neighbor}`);
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          return [`Circular dependency detected in workflow: ${cycleNodes.join(', ')}`];
        }
      }
    }

    return [];
  }
}
