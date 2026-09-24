import {
  ChapterCategory,
  ConfidenceLevel,
  EventType,
  Photo,
} from '@prisma/client';

export interface TimelineChapterDefinition {
  title: string;
  category: ChapterCategory;
  startTime: Date | null;
  endTime: Date | null;
  orderIndex: number;
  photoIds: string[];
  photoCount: number;
  coverPhotoId: string | null;
  start_time?: Date | null;
  end_time?: Date | null;
  sequence_index?: number;
  photo_ids?: string[];
  confidence?: ConfidenceLevel;
  confidence_score?: number;
}

export interface TimelineClusterOptions {
  eventType?: EventType;
  minGapMinutes?: number;
  maxGapMinutes?: number;
  targetChapterCount?: number;
  timeGapThresholdMinutes?: number;
  minPhotosPerChapter?: number;
  maxChapters?: number;
}

export class TimelineChapterService {
  /**
   * Instance method wrapper
   */
  public clusterPhotosIntoChapters(
    photos: Photo[] | any[],
    optionsOrEventType?: TimelineClusterOptions | EventType,
    legacyOptions?: TimelineClusterOptions
  ): TimelineChapterDefinition[] {
    return TimelineChapterService.clusterPhotosIntoChapters(photos, optionsOrEventType, legacyOptions);
  }

  /**
   * Static implementation for timeline clustering
   */
  static clusterPhotosIntoChapters(
    photos: Photo[] | any[],
    optionsOrEventType?: TimelineClusterOptions | EventType,
    legacyOptions?: TimelineClusterOptions
  ): TimelineChapterDefinition[] {
    if (!photos || photos.length === 0) {
      return [];
    }

    let eventType: EventType = EventType.UNKNOWN;
    let minGapMinutes = 45;
    let targetChapterCount = 4;

    if (typeof optionsOrEventType === 'string') {
      eventType = optionsOrEventType as EventType;
      if (legacyOptions) {
        if (legacyOptions.minGapMinutes) minGapMinutes = legacyOptions.minGapMinutes;
        if (legacyOptions.timeGapThresholdMinutes) minGapMinutes = legacyOptions.timeGapThresholdMinutes;
        if (legacyOptions.targetChapterCount) targetChapterCount = legacyOptions.targetChapterCount;
      }
    } else if (typeof optionsOrEventType === 'object' && optionsOrEventType !== null) {
      if (optionsOrEventType.eventType) eventType = optionsOrEventType.eventType;
      if (optionsOrEventType.minGapMinutes) minGapMinutes = optionsOrEventType.minGapMinutes;
      if (optionsOrEventType.timeGapThresholdMinutes) minGapMinutes = optionsOrEventType.timeGapThresholdMinutes;
      if (optionsOrEventType.targetChapterCount) targetChapterCount = optionsOrEventType.targetChapterCount;
    }

    // 1. Sort photos chronologically (timestamp, then filename/sort_order)
    const sorted = [...photos].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) return timeA - timeB;
      const sortA = a.sort_order ?? 0;
      const sortB = b.sort_order ?? 0;
      if (sortA !== sortB) return sortA - sortB;
      const nameA = a.original_filename || '';
      const nameB = b.original_filename || '';
      return nameA.localeCompare(nameB);
    });

    // Check if we have valid timestamps
    const hasTimestamps = sorted.filter((p) => p.timestamp !== null && p.timestamp !== undefined).length >= 2;

    const clusters: Array<{ photos: any[]; startTime: Date | null; endTime: Date | null }> = [];
    const gapThresholdMs = minGapMinutes * 60 * 1000;

    if (hasTimestamps) {
      let currentCluster: any[] = [sorted[0]];
      let prevTime = sorted[0].timestamp ? new Date(sorted[0].timestamp).getTime() : 0;

      for (let i = 1; i < sorted.length; i++) {
        const photo = sorted[i];
        const currentTime = photo.timestamp ? new Date(photo.timestamp).getTime() : 0;

        if (prevTime && currentTime && (currentTime - prevTime) >= gapThresholdMs) {
          // Time gap detected -> push current cluster and start new one
          clusters.push({
            photos: currentCluster,
            startTime: currentCluster[0].timestamp ? new Date(currentCluster[0].timestamp) : null,
            endTime: currentCluster[currentCluster.length - 1].timestamp ? new Date(currentCluster[currentCluster.length - 1].timestamp) : null,
          });
          currentCluster = [photo];
        } else {
          currentCluster.push(photo);
        }

        if (currentTime) prevTime = currentTime;
      }

      if (currentCluster.length > 0) {
        clusters.push({
          photos: currentCluster,
          startTime: currentCluster[0].timestamp ? new Date(currentCluster[0].timestamp) : null,
          endTime: currentCluster[currentCluster.length - 1].timestamp ? new Date(currentCluster[currentCluster.length - 1].timestamp) : null,
        });
      }
    } else {
      // Sequence-based batching when no EXIF timestamps exist
      const chunkSize = Math.max(1, Math.ceil(sorted.length / targetChapterCount));
      for (let i = 0; i < sorted.length; i += chunkSize) {
        const chunk = sorted.slice(i, i + chunkSize);
        clusters.push({
          photos: chunk,
          startTime: null,
          endTime: null,
        });
      }
    }

    // 2. Map clusters to chapter definitions
    const chapters: TimelineChapterDefinition[] = clusters.map((cluster, index) => {
      const clusterPhotos = cluster.photos;
      const first = clusterPhotos[0];
      const last = clusterPhotos[clusterPhotos.length - 1];
      const startTime = first.captured_at ? new Date(first.captured_at) : (first.created_at ? new Date(first.created_at) : null);
      const endTime = last.captured_at ? new Date(last.captured_at) : (last.created_at ? new Date(last.created_at) : null);

      // Best cover candidate: highest aesthetic/sharpness or middle photo
      let bestCover = clusterPhotos[Math.floor(clusterPhotos.length / 2)];
      let maxScore = -1;
      for (const p of clusterPhotos) {
        const meta = p.metadata || {};
        const score = (meta.aesthetic_score || 0) + (meta.sharpness_score || 0);
        if (score > maxScore) {
          maxScore = score;
          bestCover = p;
        }
      }

      const category = TimelineChapterService.heuristicCategory(eventType, index, clusters.length);
      const title = TimelineChapterService.generateChapterTitle(eventType, category, index, startTime);
      const photoIds = clusterPhotos.map((p: any) => p.id);

      return {
        title,
        category,
        startTime,
        endTime,
        orderIndex: index,
        photoIds,
        photoCount: clusterPhotos.length,
        coverPhotoId: bestCover ? bestCover.id : null,
        start_time: startTime,
        end_time: endTime,
        sequence_index: index,
        photo_ids: photoIds,
        confidence: ConfidenceLevel.HIGH,
        confidence_score: 0.92,
      };
    });

    return chapters;
  }

  static heuristicCategory(
    eventType: EventType,
    index: number,
    total: number
  ): ChapterCategory {
    if (eventType === EventType.WEDDING || eventType === EventType.ENGAGEMENT) {
      if (total <= 2) {
        return index === 0 ? ChapterCategory.CEREMONY : ChapterCategory.RECEPTION;
      } else if (total === 3) {
        if (index === 0) return ChapterCategory.PREPARATION;
        if (index === 1) return ChapterCategory.CEREMONY;
        return ChapterCategory.RECEPTION;
      } else {
        if (index === 0) return ChapterCategory.PREPARATION;
        if (index === 1) return ChapterCategory.CEREMONY;
        if (index === 2) return ChapterCategory.PORTRAIT;
        if (index === 3) return ChapterCategory.RECEPTION;
        return ChapterCategory.CELEBRATION;
      }
    }

    if (eventType === EventType.BIRTHDAY) {
      if (index === 0) return ChapterCategory.PREPARATION;
      if (index === 1) return ChapterCategory.CEREMONY;
      return ChapterCategory.CELEBRATION;
    }

    if (eventType === EventType.CORPORATE) {
      if (index === 0) return ChapterCategory.ARRIVAL;
      if (index === 1) return ChapterCategory.SPEECH;
      return ChapterCategory.RECEPTION;
    }

    if (index === 0) return ChapterCategory.ARRIVAL;
    if (index === total - 1) return ChapterCategory.CELEBRATION;
    return ChapterCategory.OTHER;
  }

  static classifyChapterCategory(
    eventType: EventType,
    index: number,
    total: number
  ): ChapterCategory {
    return TimelineChapterService.heuristicCategory(eventType, index, total);
  }

  static generateChapterTitle(
    eventType: EventType,
    category: ChapterCategory,
    index: number,
    startTime: Date | null
  ): string {
    const timeStr = startTime
      ? ` (${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
      : '';

    switch (category) {
      case ChapterCategory.PREPARATION:
        return `Getting Ready & Details${timeStr}`;
      case ChapterCategory.CEREMONY:
        return `The Ceremony & Vows${timeStr}`;
      case ChapterCategory.PORTRAIT:
        return `Portraits & Couple Session${timeStr}`;
      case ChapterCategory.RECEPTION:
        return `Reception & Speeches${timeStr}`;
      case ChapterCategory.CELEBRATION:
        return `Party, Dancing & Celebration${timeStr}`;
      case ChapterCategory.ARRIVAL:
        return `Arrival & Welcome${timeStr}`;
      case ChapterCategory.SPEECH:
        return `Key Highlights & Speeches${timeStr}`;
      case ChapterCategory.OTHER:
      default:
        return `Chapter ${index + 1}${timeStr}`;
    }
  }
}
