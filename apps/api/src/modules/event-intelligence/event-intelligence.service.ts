/**
 * Event Intelligence Master Service — PIXMatch AI Phase 13
 * 
 * Orchestrates event detection, timeline clustering, chapter management,
 * diversity highlight ranking, and fact-grounded story generation.
 * Enforces strict studio tenant isolation and biometric safety.
 */

import {
  PrismaClient,
  EventType,
  EventIntelligenceStatus,
  StoryStatus,
  StoryTone,
  StoryLength,
  ConfidenceLevel,
  ChapterCategory,
  Photo,
} from '@prisma/client';
import { prisma as defaultPrisma } from '@pixmatch/database';
import {
  EventIntelligenceDTO,
  EventChapterDTO,
  EventHighlightDTO,
  EventStoryDTO,
  EventStoryPublicDTO,
  EventTimelineDTO,
} from '@pixmatch/types';
import { EventDetectorService } from './event-detector.service';
import { TimelineChapterService } from './timeline-chapter.service';
import { HighlightRankerService } from './highlight-ranker.service';
import { StoryGeneratorService } from './story-generator.service';

export interface AnalyzeGalleryOptions {
  forceReanalyze?: boolean;
  minGapMinutes?: number;
  maxGapMinutes?: number;
  targetChapterCount?: number;
  storyTone?: StoryTone;
  storyLength?: StoryLength;
}

export class EventIntelligenceService {
  private prisma: PrismaClient;
  private detector: EventDetectorService;
  private timelineChapter: TimelineChapterService;
  private ranker: HighlightRankerService;
  private storyGen: StoryGeneratorService;

  constructor(customPrisma?: PrismaClient) {
    this.prisma = customPrisma || defaultPrisma;
    this.detector = new EventDetectorService();
    this.timelineChapter = new TimelineChapterService();
    this.ranker = new HighlightRankerService();
    this.storyGen = new StoryGeneratorService();
  }

  /**
   * Complete end-to-end analysis of a gallery for Event Intelligence.
   */
  public async analyzeGallery(
    studioId: string,
    galleryId: string,
    options: AnalyzeGalleryOptions = {}
  ): Promise<EventIntelligenceDTO> {
    const startTime = Date.now();

    // 1. Verify studio isolation & gallery existence
    const gallery = await this.prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      include: {
        photos: {
          orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
        },
      },
    });

    if (!gallery) {
      throw new Error(`Gallery not found or studio mismatch: ${galleryId}`);
    }

    // 2. Find or create EventIntelligence record
    let eventIntel = await this.prisma.eventIntelligence.findUnique({
      where: { gallery_id: galleryId },
    });

    if (!eventIntel) {
      eventIntel = await this.prisma.eventIntelligence.create({
        data: {
          studio_id: studioId,
          gallery_id: galleryId,
          event_type: EventType.UNKNOWN,
          status: EventIntelligenceStatus.PROCESSING,
        },
      });
    } else {
      await this.prisma.eventIntelligence.update({
        where: { id: eventIntel.id },
        data: { status: EventIntelligenceStatus.PROCESSING, error_message: null },
      });
    }

    try {
      const photos = (gallery as any).photos || [];

      if (photos.length === 0) {
        const updated = await this.prisma.eventIntelligence.update({
          where: { id: eventIntel.id },
          data: {
            status: EventIntelligenceStatus.COMPLETED,
            event_type: EventType.UNKNOWN,
            event_confidence: ConfidenceLevel.LOW,
            chapter_count: 0,
            highlight_count: 0,
            photo_count: 0,
          },
          include: {
            chapters: true,
            highlights: { include: { photo: true } },
            story: true,
          },
        });
        return this.mapToDTO(updated, []);
      }

      // 3. Detect event type
      const detectionResult = this.detector.detectEventType({
        galleryName: gallery.title,
        galleryDescription: (gallery as any).description || '',
        photos,
      });

      // 4. Clean up previous chapters/highlights/stories if reanalyzing
      if (options.forceReanalyze) {
        await this.prisma.eventHighlight.deleteMany({ where: { event_intelligence_id: eventIntel.id } });
        await this.prisma.eventStory.deleteMany({ where: { event_intelligence_id: eventIntel.id } });
        await this.prisma.eventChapter.deleteMany({ where: { event_intelligence_id: eventIntel.id } });
      }

      // 5. Cluster photos into chapters
      const chapterDefinitions = this.timelineChapter.clusterPhotosIntoChapters(photos, {
        eventType: detectionResult.detectedType,
        minGapMinutes: options.minGapMinutes,
        maxGapMinutes: options.maxGapMinutes,
        targetChapterCount: options.targetChapterCount,
      });

      // 6. Persist chapters to database
      const savedChapters: (any & { photo_ids: string[] })[] = [];
      for (const chDef of chapterDefinitions) {
        const created = await this.prisma.eventChapter.create({
          data: {
            event_intelligence_id: eventIntel.id,
            studio_id: studioId,
            gallery_id: galleryId,
            title: chDef.title,
            category: chDef.category as any,
            start_time: chDef.startTime,
            end_time: chDef.endTime,
            sequence_index: chDef.orderIndex,
            photo_count: chDef.photoIds.length,
            cover_photo_id: chDef.coverPhotoId,
          },
        });
        savedChapters.push({ ...created, photo_ids: chDef.photoIds });
      }

      // 7. Select & rank highlights
      const highlightResults = this.ranker.selectHighlights(photos, savedChapters, {
        topCount: Math.min(30, Math.max(10, Math.floor(photos.length * 0.15))),
      });

      // Persist highlights
      for (let i = 0; i < highlightResults.rankedCandidates.length; i++) {
        const cand = highlightResults.rankedCandidates[i];
        await this.prisma.eventHighlight.create({
          data: {
            event_intelligence_id: eventIntel.id,
            studio_id: studioId,
            gallery_id: galleryId,
            photo_id: cand.photo.id,
            chapter_id: cand.chapterId,
            score: cand.compositeScore,
            rank: i + 1,
            reason: cand.tags.join(', ') || null,
            is_selected: true,
          },
        });
      }

      // 8. Generate Event Story
      const storyTone = options.storyTone || StoryTone.ELEGANT;
      const storyLength = options.storyLength || StoryLength.MEDIUM;

      const generatedStory = await this.storyGen.generateStory({
        eventName: gallery.title,
        eventType: detectionResult.detectedType,
        galleryDate: gallery.created_at ? gallery.created_at.toISOString() : null,
        totalPhotos: photos.length,
        totalChapters: savedChapters.length,
        chapters: savedChapters,
        topHighlights: highlightResults.rankedCandidates,
        tone: storyTone as any,
        length: storyLength as any,
      });

      await this.prisma.eventStory.create({
        data: {
          event_intelligence_id: eventIntel.id,
          studio_id: studioId,
          gallery_id: galleryId,
          title: generatedStory.headline,
          summary: generatedStory.summary,
          body: generatedStory.body,
          tone: storyTone as any,
          length: storyLength as any,
          status: StoryStatus.DRAFT,
          is_published: true,
        },
      });

      // 9. Update EventIntelligence master record
      const finalIntel = await this.prisma.eventIntelligence.update({
        where: { id: eventIntel.id },
        data: {
          status: EventIntelligenceStatus.COMPLETED,
          event_type: detectionResult.detectedType,
          event_confidence: detectionResult.confidence as any,
          confidence_score: detectionResult.confidenceScore,
          photo_count: photos.length,
          chapter_count: savedChapters.length,
          highlight_count: highlightResults.rankedCandidates.length,
        },
        include: {
          chapters: { orderBy: { sequence_index: 'asc' } },
          highlights: { orderBy: { rank: 'asc' }, include: { photo: true } },
          story: true,
        },
      });

      return this.mapToDTO(finalIntel, photos);
    } catch (err: any) {
      await this.prisma.eventIntelligence.update({
        where: { id: eventIntel.id },
        data: {
          status: EventIntelligenceStatus.FAILED,
          error_message: err?.message || 'Unknown event intelligence analysis error',
        },
      });
      throw err;
    }
  }

  /**
   * Retrieve event intelligence for a gallery.
   */
  public async getEventIntelligence(studioId: string, galleryId: string): Promise<EventIntelligenceDTO | null> {
    const eventIntel = await this.prisma.eventIntelligence.findFirst({
      where: { gallery_id: galleryId, studio_id: studioId },
      include: {
        chapters: { orderBy: { sequence_index: 'asc' } },
        highlights: { orderBy: { rank: 'asc' }, include: { photo: true } },
        story: true,
      },
    });

    if (!eventIntel) return null;    const photos = await this.prisma.photo.findMany({
      where: { gallery_id: galleryId },
      select: { id: true, original_url: true, thumbnail_url: true, created_at: true },
    });

    return this.mapToDTO(eventIntel, photos as any);
  }

  /**
   * Update manual settings or override event type.
   */
  public async updateEventIntelligence(
    studioId: string,
    galleryId: string,
    update: { manual_event_type?: EventType }
  ): Promise<EventIntelligenceDTO> {
    const existing = await this.prisma.eventIntelligence.findFirst({
      where: { gallery_id: galleryId, studio_id: studioId },
    });
    if (!existing) throw new Error('Event intelligence not found for gallery');

    const updated = await this.prisma.eventIntelligence.update({
      where: { id: existing.id },
      data: {
        event_type: update.manual_event_type,
      },
      include: {
        chapters: { orderBy: { sequence_index: 'asc' } },
        highlights: { orderBy: { rank: 'asc' }, include: { photo: true } },
        story: true,
      },
    });

    return this.mapToDTO(updated, []);
  }

  /**
   * Chapter Operations: Update, Merge, Split, Reorder, Delete.
   */
  public async updateChapter(
    studioId: string,
    galleryId: string,
    chapterId: string,
    data: {
      title?: string;
      category?: ChapterCategory;
      cover_photo_id?: string;
      is_visible?: boolean;
      description?: string;
    }
  ): Promise<EventChapterDTO> {
    const chapter = await this.prisma.eventChapter.findFirst({
      where: { id: chapterId, gallery_id: galleryId, studio_id: studioId },
    });
    if (!chapter) throw new Error('Chapter not found');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.cover_photo_id !== undefined) updateData.cover_photo_id = data.cover_photo_id;
    if (data.is_visible !== undefined) updateData.is_hidden = !data.is_visible;
    if (data.description !== undefined) updateData.description = data.description;

    const updated = await this.prisma.eventChapter.update({
      where: { id: chapterId },
      data: updateData,
    });

    return {
      id: updated.id,
      event_intelligence_id: updated.event_intelligence_id,
      gallery_id: updated.gallery_id,
      studio_id: updated.studio_id,
      title: updated.title,
      category: updated.category as any,
      start_time: updated.start_time?.toISOString() || null,
      end_time: updated.end_time?.toISOString() || null,
      sequence_index: updated.sequence_index,
      photo_count: updated.photo_count,
      confidence: updated.confidence as any,
      confidence_score: updated.confidence_score,
      cover_photo_id: updated.cover_photo_id,
      is_hidden: updated.is_hidden,
      description: updated.description,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
    };
  }

  public async mergeChapters(
    studioId: string,
    galleryId: string,
    sourceChapterIds: string[],
    newTitle: string,
    newCategory: ChapterCategory
  ): Promise<EventChapterDTO> {
    if (sourceChapterIds.length < 2) {
      throw new Error('Must specify at least 2 chapters to merge');
    }

    const chapters = await this.prisma.eventChapter.findMany({
      where: {
        id: { in: sourceChapterIds },
        gallery_id: galleryId,
        studio_id: studioId,
      },
      orderBy: { sequence_index: 'asc' },
    });

    if (chapters.length !== sourceChapterIds.length) {
      throw new Error('One or more chapters could not be found');
    }

    const earliestStart = chapters[0].start_time;
    const latestEnd = chapters[chapters.length - 1].end_time;
    const totalCount = chapters.reduce((acc, c) => acc + c.photo_count, 0);
    const firstChapter = chapters[0];

    // Update first chapter into merged chapter
    const merged = await this.prisma.eventChapter.update({
      where: { id: firstChapter.id },
      data: {
        title: newTitle,
        category: newCategory,
        photo_count: totalCount,
        start_time: earliestStart,
        end_time: latestEnd,
      },
    });

    // Delete remaining chapters
    const remainingIds = sourceChapterIds.filter((id) => id !== firstChapter.id);
    await this.prisma.eventChapter.deleteMany({
      where: { id: { in: remainingIds } },
    });

    // Update highlights that referenced the deleted chapters
    await this.prisma.eventHighlight.updateMany({
      where: { chapter_id: { in: remainingIds } },
      data: { chapter_id: firstChapter.id },
    });

    return {
      id: merged.id,
      event_intelligence_id: merged.event_intelligence_id,
      gallery_id: merged.gallery_id,
      studio_id: merged.studio_id,
      title: merged.title,
      category: merged.category as any,
      start_time: merged.start_time?.toISOString() || null,
      end_time: merged.end_time?.toISOString() || null,
      sequence_index: merged.sequence_index,
      photo_count: merged.photo_count,
      confidence: merged.confidence as any,
      confidence_score: merged.confidence_score,
      cover_photo_id: merged.cover_photo_id,
      is_hidden: merged.is_hidden,
      description: merged.description,
      created_at: merged.created_at.toISOString(),
      updated_at: merged.updated_at.toISOString(),
    };
  }

  public async splitChapter(
    studioId: string,
    galleryId: string,
    chapterId: string,
    splitPhotoId: string,
    newChapterTitle: string
  ): Promise<{ originalChapter: EventChapterDTO; newChapter: EventChapterDTO }> {
    const chapter = await this.prisma.eventChapter.findFirst({
      where: { id: chapterId, gallery_id: galleryId, studio_id: studioId },
    });
    if (!chapter) throw new Error('Chapter not found');

    const halfCount = Math.max(1, Math.floor(chapter.photo_count / 2));

    // Update original chapter
    const updatedOrig = await this.prisma.eventChapter.update({
      where: { id: chapter.id },
      data: {
        photo_count: halfCount,
      },
    });

    // Create new chapter
    const createdNew = await this.prisma.eventChapter.create({
      data: {
        event_intelligence_id: chapter.event_intelligence_id,
        studio_id: studioId,
        gallery_id: galleryId,
        title: newChapterTitle,
        category: chapter.category,
        sequence_index: chapter.sequence_index + 1,
        photo_count: Math.max(1, chapter.photo_count - halfCount),
      },
    });

    // Shift later chapters' sequence_index up
    await this.prisma.eventChapter.updateMany({
      where: {
        event_intelligence_id: chapter.event_intelligence_id,
        sequence_index: { gt: chapter.sequence_index },
        id: { not: createdNew.id },
      },
      data: {
        sequence_index: { increment: 1 },
      },
    });

    return {
      originalChapter: {
        id: updatedOrig.id,
        event_intelligence_id: updatedOrig.event_intelligence_id,
        gallery_id: updatedOrig.gallery_id,
        studio_id: updatedOrig.studio_id,
        title: updatedOrig.title,
        category: updatedOrig.category as any,
        start_time: updatedOrig.start_time?.toISOString() || null,
        end_time: updatedOrig.end_time?.toISOString() || null,
        sequence_index: updatedOrig.sequence_index,
        photo_count: updatedOrig.photo_count,
        confidence: updatedOrig.confidence as any,
        confidence_score: updatedOrig.confidence_score,
        cover_photo_id: updatedOrig.cover_photo_id,
        is_hidden: updatedOrig.is_hidden,
        description: updatedOrig.description,
        created_at: updatedOrig.created_at.toISOString(),
        updated_at: updatedOrig.updated_at.toISOString(),
      },
      newChapter: {
        id: createdNew.id,
        event_intelligence_id: createdNew.event_intelligence_id,
        gallery_id: createdNew.gallery_id,
        studio_id: createdNew.studio_id,
        title: createdNew.title,
        category: createdNew.category as any,
        start_time: createdNew.start_time?.toISOString() || null,
        end_time: createdNew.end_time?.toISOString() || null,
        sequence_index: createdNew.sequence_index,
        photo_count: createdNew.photo_count,
        confidence: createdNew.confidence as any,
        confidence_score: createdNew.confidence_score,
        cover_photo_id: createdNew.cover_photo_id,
        is_hidden: createdNew.is_hidden,
        description: createdNew.description,
        created_at: createdNew.created_at.toISOString(),
        updated_at: createdNew.updated_at.toISOString(),
      },
    };
  }

  /**
   * Highlights Curation
   */
  public async toggleHighlightPin(
    studioId: string,
    galleryId: string,
    highlightId: string,
    isPinned: boolean
  ): Promise<EventHighlightDTO> {
    const hl = await this.prisma.eventHighlight.findFirst({
      where: { id: highlightId, gallery_id: galleryId, studio_id: studioId },
      include: { photo: true },
    });
    if (!hl) throw new Error('Highlight not found');

    const updated = await this.prisma.eventHighlight.update({
      where: { id: highlightId },
      data: { is_selected: isPinned, score: isPinned ? 1.0 : hl.score },
      include: { photo: true },
    });

    return this.mapHighlightToDTO(updated);
  }

  public async toggleHighlightSuppression(
    studioId: string,
    galleryId: string,
    highlightId: string,
    isSuppressed: boolean
  ): Promise<EventHighlightDTO> {
    const hl = await this.prisma.eventHighlight.findFirst({
      where: { id: highlightId, gallery_id: galleryId, studio_id: studioId },
      include: { photo: true },
    });
    if (!hl) throw new Error('Highlight not found');

    const updated = await this.prisma.eventHighlight.update({
      where: { id: highlightId },
      data: { is_selected: !isSuppressed },
      include: { photo: true },
    });

    return this.mapHighlightToDTO(updated);
  }

  /**
   * Story Curation & Regeneration
   */
  public async regenerateStory(
    studioId: string,
    galleryId: string,
    options: {
      tone: StoryTone;
      length: StoryLength;
      photographerNotes?: string;
    }
  ): Promise<EventStoryDTO> {
    const eventIntel = await this.prisma.eventIntelligence.findFirst({
      where: { gallery_id: galleryId, studio_id: studioId },
      include: {
        chapters: { orderBy: { sequence_index: 'asc' } },
        highlights: { orderBy: { rank: 'asc' }, include: { photo: true } },
      },
    });
    if (!eventIntel) throw new Error('Event intelligence not found');

    const gallery = await this.prisma.gallery.findUnique({ where: { id: galleryId } });

    const generated = await this.storyGen.generateStory({
      eventName: gallery?.title || 'Event',
      eventType: eventIntel.event_type,
      galleryDate: gallery?.created_at ? gallery.created_at.toISOString() : null,
      totalPhotos: eventIntel.chapters.reduce((acc: number, c: any) => acc + c.photo_count, 0),
      totalChapters: eventIntel.chapters.length,
      chapters: eventIntel.chapters as any,
      topHighlights: eventIntel.highlights as any,
      tone: options.tone as any,
      length: options.length as any,
      photographerNotes: options.photographerNotes,
    });

    const story = await this.prisma.eventStory.create({
      data: {
        event_intelligence_id: eventIntel.id,
        studio_id: studioId,
        gallery_id: galleryId,
        title: generated.headline,
        summary: generated.summary,
        body: generated.body,
        tone: options.tone as any,
        length: options.length as any,
        status: StoryStatus.DRAFT,
        is_published: true,
      },
    });

    return {
      id: story.id,
      gallery_id: story.gallery_id,
      studio_id: story.studio_id,
      event_intelligence_id: story.event_intelligence_id,
      title: story.title,
      summary: story.summary,
      body: story.body,
      tone: story.tone as any,
      length: story.length as any,
      model_version: story.model_version,
      status: story.status as any,
      is_published: story.is_published,
      created_at: story.created_at.toISOString(),
      updated_at: story.updated_at.toISOString(),
    };
  }

  public async updateStory(
    studioId: string,
    galleryId: string,
    storyId: string,
    data: {
      headline?: string;
      summary?: string;
      body?: string;
      status?: StoryStatus;
      is_public?: boolean;
    }
  ): Promise<EventStoryDTO> {
    const story = await this.prisma.eventStory.findFirst({
      where: { id: storyId, gallery_id: galleryId, studio_id: studioId },
    });
    if (!story) throw new Error('Story not found');

    const updated = await this.prisma.eventStory.update({
      where: { id: storyId },
      data: data as any,
    });

    return {
      id: updated.id,
      gallery_id: updated.gallery_id,
      studio_id: updated.studio_id,
      event_intelligence_id: updated.event_intelligence_id,
      title: updated.title,
      summary: updated.summary,
      body: updated.body,
      tone: updated.tone as any,
      length: updated.length as any,
      model_version: updated.model_version,
      status: updated.status as any,
      is_published: updated.is_published,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
    };
  }

  /**
   * Public Client Facing Event Story
   * Strips all internal confidence metrics and biometric data for client safety.
   */
  public async getPublicEventStory(gallerySlug: string): Promise<EventStoryPublicDTO | null> {
    const gallery = await this.prisma.gallery.findFirst({
      where: { slug: gallerySlug, status: 'ACTIVE' },
      include: {
        event_intelligence: {
          include: {
            chapters: { where: { is_hidden: false }, orderBy: { sequence_index: 'asc' } },
            highlights: {
              where: { is_selected: true },
              orderBy: { rank: 'asc' },
              include: { photo: { select: { id: true, original_url: true, thumbnail_url: true } } },
            },
            story: true,
          },
        },
      },
    });

    if (!gallery || !gallery.event_intelligence) {
      return null;
    }

    const intel = gallery.event_intelligence;
    const story = intel.story || null;

    return {
      gallery_id: gallery.id,
      gallery_title: gallery.title,
      galleryTitle: gallery.title,
      event_type: intel.event_type as any,
      story: story && story.is_published ? {
        title: story.title,
        summary: story.summary,
        body: story.body,
        tone: story.tone,
      } : null,
      chapters: intel.chapters.map((ch: any) => ({
        id: ch.id,
        title: ch.title,
        category: ch.category,
        sequence_index: ch.sequence_index,
        photo_count: ch.photo_count,
        cover_photo_url: null,
        description: ch.description,
      })),
      highlights: intel.highlights.map((hl: any) => ({
        id: hl.id,
        photo_id: hl.photo_id,
        thumbnail_url: hl.photo?.thumbnail_url || null,
        original_url: hl.photo?.original_url || '',
        rank: hl.rank,
      })),
    };
  }

  // --- Mappers ---

  private mapToDTO(
    intel: any,
    photos: { id: string; original_url?: string; url?: string; thumbnail_url?: string | null; timestamp?: Date | null }[]
  ): EventIntelligenceDTO {
    const chapters: EventChapterDTO[] = (intel.chapters || []).map((ch: any) => ({
      id: ch.id,
      event_intelligence_id: ch.event_intelligence_id,
      gallery_id: ch.gallery_id,
      studio_id: ch.studio_id,
      title: ch.title,
      category: ch.category,
      start_time: ch.start_time ? ch.start_time.toISOString() : null,
      end_time: ch.end_time ? ch.end_time.toISOString() : null,
      sequence_index: ch.sequence_index,
      photo_count: ch.photo_count,
      confidence: ch.confidence,
      confidence_score: ch.confidence_score,
      cover_photo_id: ch.cover_photo_id,
      cover_photo_url: ch.cover_photo?.thumbnail_url || ch.cover_photo?.original_url || null,
      description: ch.description,
      is_hidden: ch.is_hidden,
      smart_album_id: ch.smart_album_id,
      created_at: ch.created_at.toISOString(),
      updated_at: ch.updated_at.toISOString(),
    }));

    const highlights: EventHighlightDTO[] = (intel.highlights || []).map((hl: any) => this.mapHighlightToDTO(hl));

    const story: EventStoryDTO | null = intel.story ? {
      id: intel.story.id,
      gallery_id: intel.story.gallery_id,
      studio_id: intel.story.studio_id,
      event_intelligence_id: intel.story.event_intelligence_id,
      title: intel.story.title,
      summary: intel.story.summary,
      body: intel.story.body,
      tone: intel.story.tone,
      length: intel.story.length,
      model_version: intel.story.model_version,
      status: intel.story.status,
      is_published: intel.story.is_published,
      created_at: intel.story.created_at.toISOString(),
      updated_at: intel.story.updated_at.toISOString(),
    } : null;

    return {
      id: intel.id,
      studio_id: intel.studio_id,
      gallery_id: intel.gallery_id,
      event_type: intel.detected_event_type,
      event_confidence: intel.confidence || 'MEDIUM',
      confidence_score: intel.confidence_score || 0.85,
      status: intel.status,
      model_version: intel.model_version || 'event-classifier:v1',
      start_time: intel.start_time ? intel.start_time.toISOString() : null,
      end_time: intel.end_time ? intel.end_time.toISOString() : null,
      photo_count: intel.photo_count || 0,
      chapter_count: intel.chapter_count || chapters.length,
      highlight_count: intel.highlight_count || highlights.length,
      is_timeline_enabled: intel.is_timeline_enabled ?? true,
      is_story_enabled: intel.is_story_enabled ?? true,
      is_highlights_enabled: intel.is_highlights_enabled ?? true,
      client_story_visible: intel.client_story_visible ?? true,
      default_highlight_limit: intel.default_highlight_limit || 50,
      story_tone: intel.story_tone || 'ELEGANT',
      story_length: intel.story_length || 'MEDIUM',
      suggested_cover_photo_id: intel.suggested_cover_photo_id,
      error_message: intel.error_message,
      created_at: intel.created_at.toISOString(),
      updated_at: intel.updated_at.toISOString(),
      chapters,
      highlights,
      story,
    };
  }

  private mapHighlightToDTO(hl: any): EventHighlightDTO {
    return {
      id: hl.id,
      event_intelligence_id: hl.event_intelligence_id,
      gallery_id: hl.gallery_id,
      studio_id: hl.studio_id,
      photo_id: hl.photo_id,
      chapter_id: hl.chapter_id,
      chapter_title: hl.chapter?.title || null,
      rank: hl.rank,
      score: hl.score,
      reason: hl.reason,
      is_selected: hl.is_selected,
      created_at: hl.created_at.toISOString(),
      photo: hl.photo ? {
        id: hl.photo.id,
        original_url: hl.photo.original_url || '',
        thumbnail_url: hl.photo.thumbnail_url || null,
        original_filename: hl.photo.original_filename || null,
      } : {
        id: hl.photo_id,
        original_url: '',
      },
    };
  }
}
