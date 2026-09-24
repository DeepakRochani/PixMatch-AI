import { prisma } from '@pixmatch/database';
import {
  ProductionHealthDTO,
  ProductionHealthDimensionScore,
  ProductionHealthStatus,
  ProductionStage,
} from '@pixmatch/types';

export class ProductionHealthService {
  /**
   * Compute comprehensive 8-dimension Production Health Score (0-100)
   * Dimensions:
   * 1. Booking Readiness (15%)
   * 2. Client Information & Questionnaire (15%)
   * 3. Timeline & Schedule (15%)
   * 4. Crew Assignment (10%)
   * 5. Equipment Readiness (15%)
   * 6. Shot List Readiness (10%)
   * 7. Location & Logistics (10%)
   * 8. Payment & Contract Readiness (10%)
   */
  static async computeHealthScore(
    studioId: string,
    projectId: string
  ): Promise<ProductionHealthDTO> {
    const project = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId },
      include: {
        production: {
          include: {
            shoot_sessions: {
              include: {
                crew_assignments: true,
                equipment_checklists: true,
              },
            },
          },
        },
        crew_assignments: true,
        equipment_checklists: true,
        production_checklists: true,
        questionnaires: {
          include: {
            questions: {
              include: { answers: true },
            },
          },
        },
        shot_lists: {
          include: { items: true },
        },
        production_timelines: true,
        contracts: true,
        transactions: true,
        calendar_events: true,
        client: true,
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const production = project.production;
    const dimensions: ProductionHealthDimensionScore[] = [];
    const missingItems: string[] = [];
    const warnings: string[] = [];
    const blockers: string[] = [];

    // 1. Booking Readiness (15%)
    let bookingScore = 0;
    const isProjectActive = (project.status as string) !== 'CANCELLED';
    const hasSessions =
      (production?.shoot_sessions?.length ?? 0) > 0 ||
      (project.calendar_events?.length ?? 0) > 0 ||
      Boolean(project.start_date);

    if (isProjectActive) bookingScore += 50;
    if (hasSessions) bookingScore += 50;

    if (bookingScore < 100) {
      missingItems.push('Shoot session date/time not fully confirmed.');
      warnings.push('Schedule at least one confirmed shoot session.');
    }
    dimensions.push({
      dimension: 'BOOKING_READINESS',
      weight: 15,
      score: bookingScore,
      max_score: 100,
      status: bookingScore >= 80 ? 'PASS' : bookingScore >= 50 ? 'WARN' : 'FAIL',
      detail: `Project status: ${project.status}; Active shoot sessions: ${production?.shoot_sessions?.length ?? 0}.`,
    });

    // 2. Client Info & Questionnaire (15%)
    let clientScore = 0;
    const questionnaires = project.questionnaires || [];
    const submittedQuestionnaires = questionnaires.filter((q: any) => q.status === 'SUBMITTED' || q.submitted_at);
    if (questionnaires.length === 0) {
      clientScore = project.client?.email || project.client?.phone ? 50 : 20;
      warnings.push('No pre-shoot questionnaire created.');
    } else if (submittedQuestionnaires.length > 0) {
      clientScore = 100;
    } else {
      clientScore = 50;
      warnings.push('Pre-shoot questionnaire is pending client submission.');
    }
    dimensions.push({
      dimension: 'CLIENT_INFO_READINESS',
      weight: 15,
      score: clientScore,
      max_score: 100,
      status: clientScore >= 80 ? 'PASS' : clientScore >= 50 ? 'WARN' : 'FAIL',
      detail: `${submittedQuestionnaires.length}/${questionnaires.length} questionnaires completed.`,
    });

    // 3. Timeline & Schedule (15%)
    let timelineScore = 0;
    const timelines = project.production_timelines || [];
    if (timelines.length >= 3) {
      timelineScore = 100;
    } else if (timelines.length > 0) {
      timelineScore = 60;
      warnings.push('Shoot-day timeline has fewer than 3 scheduled events.');
    } else {
      timelineScore = 10;
      missingItems.push('Shoot-day timeline/run of show is missing.');
    }
    dimensions.push({
      dimension: 'TIMELINE_READINESS',
      weight: 15,
      score: timelineScore,
      max_score: 100,
      status: timelineScore >= 80 ? 'PASS' : timelineScore >= 50 ? 'WARN' : 'FAIL',
      detail: `${timelines.length} timeline milestones planned.`,
    });

    // 4. Crew Assignment (10%)
    let crewScore = 0;
    const crew = project.crew_assignments || [];
    const hasLead = Boolean(
      (production as any)?.primary_photographer_id ||
      (production as any)?.lead_photographer_id ||
      crew.some((c: any) => c.role.toLowerCase().includes('lead') || c.role.toLowerCase().includes('primary'))
    );
    const confirmedCrew = crew.filter((c: any) => c.status === 'CONFIRMED');

    if (hasLead && confirmedCrew.length > 0) {
      crewScore = 100;
    } else if (hasLead || crew.length > 0) {
      crewScore = 60;
      warnings.push('Crew assigned but not all members are confirmed.');
    } else {
      crewScore = 0;
      blockers.push('No primary photographer or crew member assigned to shoot.');
    }
    dimensions.push({
      dimension: 'CREW_ASSIGNMENT',
      weight: 10,
      score: crewScore,
      max_score: 100,
      status: crewScore >= 80 ? 'PASS' : crewScore >= 50 ? 'WARN' : 'FAIL',
      detail: `${confirmedCrew.length}/${crew.length} crew confirmed. Lead designated: ${hasLead ? 'Yes' : 'No'}.`,
    });

    // 5. Equipment Readiness (15%)
    let equipScore = 0;
    const eqList = project.equipment_checklists || [];
    if (eqList.length > 0) {
      const checked = eqList.filter((e: any) => e.status === 'COMPLETED' || e.checked_at);
      equipScore = Math.round((checked.length / eqList.length) * 100);
      if (equipScore < 100) {
        warnings.push(`${eqList.length - checked.length} equipment items pending check-out.`);
      }
    } else {
      equipScore = 40;
      warnings.push('No equipment checklist items logged for shoot day.');
    }
    dimensions.push({
      dimension: 'EQUIPMENT_READINESS',
      weight: 15,
      score: equipScore,
      max_score: 100,
      status: equipScore >= 80 ? 'PASS' : equipScore >= 50 ? 'WARN' : 'FAIL',
      detail: `${eqList.filter((e: any) => e.status === 'COMPLETED').length}/${eqList.length} equipment items verified.`,
    });

    // 6. Shot List Readiness (10%)
    let shotScore = 0;
    const shotLists = project.shot_lists || [];
    const totalShots = shotLists.reduce((acc: number, l: any) => acc + (l.items?.length || 0), 0);
    if (totalShots >= 5) {
      shotScore = 100;
    } else if (totalShots > 0) {
      shotScore = 60;
      warnings.push('Shot list has fewer than 5 items.');
    } else {
      shotScore = 20;
      missingItems.push('Shot list not yet created.');
    }
    dimensions.push({
      dimension: 'SHOT_LIST_READINESS',
      weight: 10,
      score: shotScore,
      max_score: 100,
      status: shotScore >= 80 ? 'PASS' : shotScore >= 50 ? 'WARN' : 'FAIL',
      detail: `${shotLists.length} lists with ${totalShots} planned shots.`,
    });

    // 7. Location & Logistics (10%)
    let locationScore = 0;
    const hasLocation = Boolean(project.location || production?.location);
    const hasNotes = Boolean(project.description || production?.location_details || production?.travel_notes);
    if (hasLocation && hasNotes) {
      locationScore = 100;
    } else if (hasLocation) {
      locationScore = 80;
    } else {
      locationScore = 20;
      warnings.push('Shoot venue location / address is missing.');
    }
    dimensions.push({
      dimension: 'LOCATION_LOGISTICS',
      weight: 10,
      score: locationScore,
      max_score: 100,
      status: locationScore >= 80 ? 'PASS' : locationScore >= 50 ? 'WARN' : 'FAIL',
      detail: `Location specified: ${hasLocation ? 'Yes' : 'No'}; Logistics notes: ${hasNotes ? 'Yes' : 'No'}.`,
    });

    // 8. Payment & Contract Readiness (10%)
    let paymentScore = 0;
    const contracts = project.contracts || [];
    const signedContracts = contracts.filter((c: any) => c.status === 'SIGNED' || c.status === 'EXECUTED');
    const transactions = project.transactions || [];
    const paidTransactions = transactions.filter((i: any) => i.status === 'RECORDED' || i.status === 'CLEARED');

    if (signedContracts.length > 0 && (paidTransactions.length > 0 || transactions.length === 0)) {
      paymentScore = 100;
    } else if (signedContracts.length > 0) {
      paymentScore = 80;
    } else if (contracts.length > 0) {
      paymentScore = 50;
      warnings.push('Contract sent but pending signature.');
    } else {
      paymentScore = 30;
      warnings.push('No signed contract attached to project.');
    }
    dimensions.push({
      dimension: 'PAYMENT_CONTRACT_READINESS',
      weight: 10,
      score: paymentScore,
      max_score: 100,
      status: paymentScore >= 80 ? 'PASS' : paymentScore >= 50 ? 'WARN' : 'FAIL',
      detail: `${signedContracts.length}/${contracts.length} signed contracts; ${paidTransactions.length}/${transactions.length} recorded payments.`,
    });

    // Total Weighted Score (0 - 100)
    const overallScore = Math.round(
      dimensions.reduce((acc, dim) => acc + (dim.score * dim.weight) / 100, 0)
    );

    const overallStatus: ProductionHealthStatus =
      blockers.length > 0 || overallScore < 50
        ? ProductionHealthStatus.BLOCKED
        : overallScore < 80
        ? ProductionHealthStatus.ATTENTION
        : ProductionHealthStatus.READY;

    // Update ProjectProduction record in DB
    if (production) {
      await prisma.projectProduction.update({
        where: { id: production.id },
        data: {
          production_health_score: overallScore,
          production_health_status: overallStatus,
          updated_at: new Date(),
        },
      });
    }

    return {
      project_id: projectId,
      production_id: production?.id || '',
      score: overallScore,
      status: overallStatus,
      dimensions,
      missing_items: missingItems,
      warnings,
      blockers,
      updated_at: new Date().toISOString(),
    };
  }
}
