import crypto from 'crypto';
import {
  DeploymentStatus,
  DeploymentRecordDTO,
  MigrationValidationResultDTO,
  RollbackValidationResultDTO,
} from '@pixmatch/types';
import { prisma } from '@pixmatch/database';
import { logger } from './structured-logger';

export interface CreateDeploymentInput {
  version: string;
  git_commit_sha: string;
  git_branch: string;
  environment?: string;
  deployed_by: string;
  release_notes?: string;
  migration_name?: string;
}

export class DeploymentSafetyService {
  private static instance: DeploymentSafetyService;
  private inMemoryDeployments: Map<string, DeploymentRecordDTO> = new Map();

  private constructor() {
    this.seedDefaultDeployment();
  }

  public static getInstance(): DeploymentSafetyService {
    if (!DeploymentSafetyService.instance) {
      DeploymentSafetyService.instance = new DeploymentSafetyService();
    }
    return DeploymentSafetyService.instance;
  }

  private seedDefaultDeployment(): void {
    const defaultDep: DeploymentRecordDTO = {
      id: 'dep_prod_v2_4_0',
      version: 'v2.4.0',
      git_commit_sha: 'a1b2c3d4e5f678901234567890abcdef12345678',
      git_branch: 'main',
      environment: 'production',
      status: DeploymentStatus.HEALTHY,
      deployed_by: 'ci_github_actions',
      started_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 3500 * 1000).toISOString(),
      duration_seconds: 100,
      migration_applied: '20260915_phase40_admin_operations',
      rollback_available: true,
      health_check_passed: true,
      release_notes: 'Phase 40 Platform Admin Operations & Governance release',
    };

    this.inMemoryDeployments.set(defaultDep.id, defaultDep);
  }

  public validateMigrationSQL(sql: string): {
    isSafe: boolean;
    destructiveOperations: string[];
    warnings: string[];
  } {
    const destructiveOperations: string[] = [];
    const warnings: string[] = [];
    const lower = sql.toLowerCase();

    if (lower.includes('drop table')) {
      destructiveOperations.push('DROP_TABLE');
      warnings.push('Dropping table destroys data irreversibly');
    }
    if (lower.includes('drop column')) {
      destructiveOperations.push('DROP_COLUMN');
      warnings.push('Dropping column destroys column data');
    }
    if (lower.includes('not null') && !lower.includes('default')) {
      destructiveOperations.push('ADD_NOT_NULL_NO_DEFAULT');
      warnings.push('Adding NOT NULL column without DEFAULT blocks row inserts');
    }

    return {
      isSafe: destructiveOperations.length === 0,
      destructiveOperations,
      warnings,
    };
  }

  public validateRollbackReadiness(deploymentId: string): {
    canRollback: boolean;
    blockers: string[];
  } {
    const d = this.inMemoryDeployments.get(deploymentId);
    if (!d) {
      return { canRollback: true, blockers: [] };
    }
    const canRollback = d.rollback_available !== false;
    return {
      canRollback,
      blockers: canRollback ? [] : ['Rollback disabled for this release'],
    };
  }

  /**
   * Validate pending database migrations for breaking changes (e.g. dropped columns, NOT NULL without default)
   */
  public async validateMigrationSafety(migrationSqlOrName: string): Promise<MigrationValidationResultDTO> {
    const warnings: string[] = [];
    let safe = true;
    let rollbackSafe = true;

    const lowerSql = migrationSqlOrName.toLowerCase();

    if (lowerSql.includes('drop column') || lowerSql.includes('drop table')) {
      safe = false;
      rollbackSafe = false;
      warnings.push('CRITICAL: Migration contains destructive DROP statement. Cannot be cleanly rolled back.');
    }

    if (lowerSql.includes('not null') && !lowerSql.includes('default')) {
      safe = false;
      warnings.push('WARNING: Column added with NOT NULL constraint but no DEFAULT value. May block existing rows.');
    }

    if (lowerSql.includes('alter table') && lowerSql.includes('rename column')) {
      warnings.push('NOTICE: Column rename detected. Requires dual-read/write compatibility during rolling deploy.');
    }

    return {
      safe,
      migration_name: migrationSqlOrName,
      warnings,
      has_breaking_changes: !safe,
      rollback_safe: rollbackSafe,
      checked_at: new Date().toISOString(),
    };
  }

  /**
   * Evaluates rollback readiness for a specific deployment
   */
  public async evaluateRollbackReadiness(deploymentId: string): Promise<RollbackValidationResultDTO> {
    const deployment = this.inMemoryDeployments.get(deploymentId);
    if (!deployment) {
      return {
        can_rollback: false,
        deployment_id: deploymentId,
        blockers: [`Deployment '${deploymentId}' not found in registry`],
        safe_previous_version: 'UNKNOWN',
        checked_at: new Date().toISOString(),
      };
    }

    const blockers: string[] = [];
    if (deployment.migration_applied?.includes('destructive') || !deployment.rollback_available) {
      blockers.push('Irreversible schema migration applied in this release');
    }

    const canRollback = blockers.length === 0;

    return {
      can_rollback: canRollback,
      deployment_id: deploymentId,
      blockers,
      safe_previous_version: canRollback ? 'v2.3.9' : undefined,
      checked_at: new Date().toISOString(),
    };
  }

  /**
   * Records a new deployment event
   */
  public async recordDeployment(input: {
    version: string;
    git_commit_sha?: string;
    gitCommitSha?: string;
    git_branch?: string;
    gitBranch?: string;
    environment?: string;
    deployed_by?: string;
    deployedBy?: string;
    release_notes?: string;
    migration_name?: string;
    migrationFile?: string;
    services?: any[];
  }): Promise<DeploymentRecordDTO> {
    const id = `dep_${crypto.randomUUID().substring(0, 10)}`;
    const now = new Date();

    const deployment: DeploymentRecordDTO = {
      id,
      version: input.version,
      git_commit_sha: input.git_commit_sha || input.gitCommitSha || 'a1b2c3d4e5f6',
      git_branch: input.git_branch || input.gitBranch || 'main',
      environment: input.environment || 'production',
      status: DeploymentStatus.IN_PROGRESS,
      deployed_by: input.deployed_by || input.deployedBy || 'CI_DEPLOYER',
      started_at: now.toISOString(),
      migration_applied: input.migration_name || input.migrationFile,
      rollback_available: true,
      health_check_passed: false,
      release_notes: input.release_notes,
    };

    this.inMemoryDeployments.set(id, deployment);

    try {
      if (prisma && prisma.platformDeploymentRecord) {
        await prisma.platformDeploymentRecord.create({
          data: {
            id,
            version: deployment.version,
            git_commit_sha: deployment.git_commit_sha,
            git_branch: deployment.git_branch,
            environment: deployment.environment,
            status: 'IN_PROGRESS',
            deployed_by: deployment.deployed_by,
            started_at: now,
            migration_applied: deployment.migration_applied,
            rollback_available: deployment.rollback_available,
            health_check_passed: deployment.health_check_passed,
            release_notes: deployment.release_notes,
          },
        });
      }
    } catch {
      // Fallback
    }

    logger.info(`Deployment recorded: ${id} (${input.version})`, {
      service: 'DEPLOYMENT_SERVICE',
      metadata: { deployment_id: id, version: input.version, git_commit: deployment.git_commit_sha },
    });

    return deployment;
  }

  public async updateDeploymentStatus(
    deploymentId: string,
    status: DeploymentStatus
  ): Promise<DeploymentRecordDTO | null> {
    return this.finalizeDeployment(deploymentId, status, status === DeploymentStatus.SUCCEEDED || status === DeploymentStatus.HEALTHY);
  }

  /**
   * Finalize deployment status after verification
   */
  public async finalizeDeployment(
    deploymentId: string,
    status: DeploymentStatus,
    healthPassed: boolean
  ): Promise<DeploymentRecordDTO> {
    const deployment = this.inMemoryDeployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment '${deploymentId}' not found`);
    }

    const completedAt = new Date();
    const durationSeconds = Math.round(
      (completedAt.getTime() - new Date(deployment.started_at).getTime()) / 1000
    );

    deployment.status = status;
    deployment.health_check_passed = healthPassed;
    deployment.completed_at = completedAt.toISOString();
    deployment.duration_seconds = durationSeconds;

    this.inMemoryDeployments.set(deploymentId, deployment);

    try {
      if (prisma && prisma.platformDeploymentRecord) {
        await prisma.platformDeploymentRecord.update({
          where: { id: deploymentId },
          data: {
            status: status as any,
            health_check_passed: healthPassed,
            completed_at: completedAt,
            duration_seconds: durationSeconds,
          },
        });
      }
    } catch {
      // Fallback
    }

    return deployment;
  }

  public async getDeployments(): Promise<DeploymentRecordDTO[]> {
    return Array.from(this.inMemoryDeployments.values()).sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }
}

export const deploymentSafety = DeploymentSafetyService.getInstance();
export const deploymentSafetyService = deploymentSafety;

