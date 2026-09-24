import { prisma } from '@pixmatch/database';
import * as crypto from 'crypto';
import {
  CreateProjectQuestionnaireDTO,
  SubmitQuestionnaireDTO,
  ProjectQuestionnaireDTO,
  PublicQuestionnairePortalDTO,
} from '@pixmatch/types';

export class QuestionnaireService {
  /**
   * Create a pre-shoot questionnaire with secure cryptographic access token
   */
  static async createQuestionnaire(
    studioId: string,
    projectId: string,
    dto: CreateProjectQuestionnaireDTO
  ): Promise<{ questionnaire: ProjectQuestionnaireDTO; raw_token: string; public_url: string }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const questionnaire = await prisma.projectQuestionnaire.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        title: dto.title,
        description: dto.description || null,
        status: 'SENT',
        public_token_hash: tokenHash,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      },
    });

    // Populate questions based on template
    const templateQuestions = this.getTemplateQuestions(dto.template || 'WEDDING');
    for (let i = 0; i < templateQuestions.length; i++) {
      const q = templateQuestions[i];
      await prisma.projectQuestion.create({
        data: {
          studio_id: studioId,
          questionnaire_id: questionnaire.id,
          question_type: q.question_type,
          question: q.question,
          description: (q as any).description || null,
          required: q.required,
          options: q.options || undefined,
          sort_order: i,
        },
      });
    }

    const created = await this.getQuestionnaireById(studioId, questionnaire.id);

    return {
      questionnaire: created,
      raw_token: rawToken,
      public_url: `/portal/project/${rawToken}/questionnaire`,
    };
  }

  /**
   * Fetch questionnaire by public raw token (verifies SHA-256 hash)
   */
  static async getQuestionnaireByToken(
    rawToken: string
  ): Promise<PublicQuestionnairePortalDTO> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const questionnaire = await prisma.projectQuestionnaire.findFirst({
      where: { public_token_hash: tokenHash },
      include: {
        studio: true,
        project: true,
        questions: {
          include: { answers: true },
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!questionnaire) {
      throw new Error('Invalid or expired questionnaire link.');
    }

    if (questionnaire.expires_at && new Date() > questionnaire.expires_at) {
      throw new Error('This questionnaire has expired.');
    }

    return {
      token_valid: true,
      questionnaire: {
        id: questionnaire.id,
        title: questionnaire.title,
        description: questionnaire.description,
        status: questionnaire.status,
        expires_at: questionnaire.expires_at?.toISOString() || null,
        submitted_at: questionnaire.submitted_at?.toISOString() || null,
      },
      studio: {
        name: questionnaire.studio?.name || 'Studio',
        slug: questionnaire.studio?.slug || 'studio',
        logo_url: questionnaire.studio?.logo_url || null,
      },
      project: {
        name: questionnaire.project?.name || 'Project',
        shoot_date: questionnaire.project?.start_date ? new Date(questionnaire.project.start_date).toISOString() : null,
        location: questionnaire.project?.location || null,
      },
      questions: questionnaire.questions.map((q) => ({
        id: q.id,
        question_type: q.question_type,
        question: q.question,
        description: q.description,
        required: q.required,
        options: q.options,
        sort_order: q.sort_order,
        existing_answer: q.answers[0]?.answer,
      })),
    };
  }

  /**
   * Submit questionnaire answers from public client
   */
  static async submitAnswers(
    rawToken: string,
    dto: SubmitQuestionnaireDTO
  ): Promise<PublicQuestionnairePortalDTO> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const questionnaire = await prisma.projectQuestionnaire.findFirst({
      where: { public_token_hash: tokenHash },
      include: { questions: true },
    });

    if (!questionnaire) {
      throw new Error('Invalid questionnaire token.');
    }

    for (const ans of dto.answers) {
      const q = questionnaire.questions.find((x) => x.id === ans.question_id);
      if (q) {
        const existingAnswer = await prisma.projectQuestionAnswer.findFirst({
          where: { question_id: ans.question_id },
        });

        if (existingAnswer) {
          await prisma.projectQuestionAnswer.update({
            where: { id: existingAnswer.id },
            data: {
              answer: ans.answer,
            },
          });
        } else {
          await prisma.projectQuestionAnswer.create({
            data: {
              studio_id: questionnaire.studio_id,
              question_id: ans.question_id,
              answer: ans.answer,
            },
          });
        }
      }
    }

    await prisma.projectQuestionnaire.update({
      where: { id: questionnaire.id },
      data: {
        status: 'SUBMITTED',
        submitted_at: new Date(),
        updated_at: new Date(),
      },
    });

    return this.getQuestionnaireByToken(rawToken);
  }

  /**
   * Get all questionnaires for a project
   */
  static async getQuestionnairesByProject(
    studioId: string,
    projectId: string
  ): Promise<ProjectQuestionnaireDTO[]> {
    const questionnaires = await prisma.projectQuestionnaire.findMany({
      where: { project_id: projectId, studio_id: studioId },
      include: {
        questions: {
          include: { answers: true },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return questionnaires as unknown as ProjectQuestionnaireDTO[];
  }

  /**
   * Get questionnaire by ID
   */
  static async getQuestionnaireById(
    studioId: string,
    questionnaireId: string
  ): Promise<ProjectQuestionnaireDTO> {
    const questionnaire = await prisma.projectQuestionnaire.findFirst({
      where: { id: questionnaireId, studio_id: studioId },
      include: {
        questions: {
          include: { answers: true },
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!questionnaire) {
      throw new Error(`Questionnaire not found: ${questionnaireId}`);
    }

    return questionnaire as unknown as ProjectQuestionnaireDTO;
  }

  private static getTemplateQuestions(type: string) {
    if (type === 'WEDDING') {
      return [
        { question_type: 'TEXT', question: 'What are the names of both partners and VIP family members?', required: true },
        { question_type: 'TEXTAREA', question: 'What is the most important part of your wedding day to capture?', required: true },
        { question_type: 'SELECT', question: 'Are you doing a First Look prior to the ceremony?', options: ['Yes', 'No', 'Undecided'], required: true },
        { question_type: 'TEXTAREA', question: 'Are there any sensitive family dynamics or restrictions we should be mindful of?', required: false },
        { question_type: 'TEXT', question: 'Who is your day-of wedding planner / coordinator and their contact phone?', required: false },
      ];
    }

    return [
      { question_type: 'TEXT', question: 'What is the primary goal or aesthetic for this shoot?', required: true },
      { question_type: 'TEXTAREA', question: 'List any must-have shots, wardrobe looks, or visual references:', required: true },
      { question_type: 'TEXT', question: 'Any preferred music or vibe you would like during the session?', required: false },
    ];
  }
}
