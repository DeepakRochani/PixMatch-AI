import { EventType, ConfidenceLevel } from '@prisma/client';

export interface EventDetectionResult {
  detectedType: EventType;
  event_type: EventType;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  confidence_score: number;
  signals: string[];
  detected_signals: string[];
}

export interface GalleryDetectionContext {
  galleryName?: string;
  galleryDescription?: string;
  title?: string;
  slug?: string;
  description?: string;
  photos?: any[];
  scene_distribution?: Record<string, number>;
  moment_distribution?: Record<string, number>;
  people_counts?: number[];
  total_photos?: number;
}

export class EventDetectorService {
  /**
   * Instance method wrapper for EventDetectorService.
   */
  public detectEventType(context: GalleryDetectionContext): EventDetectionResult {
    return EventDetectorService.detectEventType(context);
  }

  /**
   * Detects event type and confidence from gallery title, description, photos, and Phase 12 scene/moment signals.
   */
  static detectEventType(context: GalleryDetectionContext): EventDetectionResult {
    const rawTitle = context.galleryName || context.title || '';
    const rawDesc = context.galleryDescription || context.description || '';
    const rawSlug = context.slug || '';
    const photoTags = (context.photos || [])
      .flatMap((p: any) => p.metadata?.tags || p.tags || [])
      .join(' ');
    const text = `${rawTitle} ${rawSlug} ${rawDesc} ${photoTags}`.toLowerCase();
    const signals: string[] = [];

    // 1. Text Keyword Matching
    const keywordWeights: Array<{ type: EventType; keywords: string[]; weight: number }> = [
      {
        type: EventType.WEDDING,
        keywords: ['wedding', 'marriage', 'shaadi', 'vivah', 'matrimony', 'bride', 'groom', 'nuptials', 'vows', 'altar'],
        weight: 0.55,
      },
      {
        type: EventType.ENGAGEMENT,
        keywords: ['reception', 'sangeet', 'mehendi', 'walima', 'cocktail', 'afterparty', 'engagement', 'ring ceremony', 'roka'],
        weight: 0.50,
      },
      {
        type: EventType.BIRTHDAY,
        keywords: ['birthday', 'bday', 'turning', 'sweet 16', 'first year', 'cake smash', 'candles'],
        weight: 0.55,
      },
      {
        type: EventType.CORPORATE,
        keywords: ['corporate', 'annual summit', 'gala', 'hackathon', 'board meeting', 'offsite', 'symposium', 'conference', 'keynote', 'summit', 'convention', 'expo', 'seminar'],
        weight: 0.50,
      },
      {
        type: EventType.CONFERENCE,
        keywords: ['concert', 'live music', 'gig', 'festival', 'band', 'stage performance'],
        weight: 0.50,
      },
      {
        type: EventType.GENERAL_EVENT,
        keywords: ['sports', 'tournament', 'match', 'game', 'marathon', 'championship', 'athletic'],
        weight: 0.50,
      },
      {
        type: EventType.FAMILY,
        keywords: ['family', 'reunion', 'vacation', 'trip', 'holiday', 'gathering', 'get-together'],
        weight: 0.45,
      },
      {
        type: EventType.PORTRAIT,
        keywords: ['portrait', 'headshot', 'modeling', 'fashion', 'portfolio', 'solo', 'photoshoot'],
        weight: 0.50,
      },
      {
        type: EventType.PRODUCT,
        keywords: ['product', 'fashion', 'runway', 'couture', 'lookbook', 'model'],
        weight: 0.50,
      },
      {
        type: EventType.ANNIVERSARY,
        keywords: ['graduation', 'commencement', 'convocation', 'diploma', 'degree', 'anniversary'],
        weight: 0.55,
      },
    ];

    const scores: Partial<Record<EventType, number>> = {};
    for (const kw of keywordWeights) {
      for (const word of kw.keywords) {
        if (text.includes(word)) {
          scores[kw.type] = (scores[kw.type] || 0) + kw.weight;
          if (!signals.includes('GALLERY_TITLE_MATCH')) signals.push('GALLERY_TITLE_MATCH');
          signals.push(`Text matched "${word}"`);
        }
      }
    }

    // 2. Temporal Analysis (duration & dispersion)
    const photos = context.photos || [];
    const validTimestamps = photos
      .map((p) => p.timestamp ? new Date(p.timestamp).getTime() : null)
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);

    if (validTimestamps.length >= 2) {
      const durationHours = (validTimestamps[validTimestamps.length - 1] - validTimestamps[0]) / (1000 * 60 * 60);
      signals.push(`Temporal duration: ${durationHours.toFixed(1)} hours`);

      if (durationHours >= 5 && durationHours <= 14) {
        // High likelihood of wedding/all-day event
        scores[EventType.WEDDING] = (scores[EventType.WEDDING] || 0) + 0.30;
      } else if (durationHours < 3) {
        // Short session -> portrait / birthday
        scores[EventType.PORTRAIT] = (scores[EventType.PORTRAIT] || 0) + 0.20;
        scores[EventType.BIRTHDAY] = (scores[EventType.BIRTHDAY] || 0) + 0.15;
      }
    }

    // 3. Scene and Moment Category Aggregations
    let ceremonyCount = 0;
    let receptionCount = 0;
    let portraitCount = 0;
    let totalScenes = 0;

    for (const p of photos) {
      const sceneCat = (p as any).scene_category || ((p as any).metadata && (p as any).metadata.scene_category);
      const momentCat = (p as any).moment_category || ((p as any).metadata && (p as any).metadata.moment_category);

      if (sceneCat || momentCat) totalScenes++;

      if (sceneCat === 'CEREMONY' || momentCat === 'CEREMONY') ceremonyCount++;
      if (sceneCat === 'RECEPTION' || momentCat === 'RECEPTION') receptionCount++;
      if (sceneCat === 'PORTRAIT' || momentCat === 'PORTRAIT') portraitCount++;
    }

    if (ceremonyCount > 0) {
      const cerRatio = ceremonyCount / (totalScenes || 1);
      scores[EventType.WEDDING] = (scores[EventType.WEDDING] || 0) + cerRatio * 0.40;
      signals.push(`Ceremony moments detected (${ceremonyCount} photos)`);
    }

    if (receptionCount > 0 && ceremonyCount > 0) {
      scores[EventType.WEDDING] = (scores[EventType.WEDDING] || 0) + 0.25;
      signals.push('Multi-phase Ceremony + Reception pattern');
    }

    // 4. Find Highest Scoring Type
    let bestType: EventType = EventType.UNKNOWN;
    let maxScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      if (score && score > maxScore) {
        maxScore = score;
        bestType = type as EventType;
      }
    }

    if (maxScore >= 0.70) {
      const confScore = Math.min(0.98, Math.round(maxScore * 100) / 100);
      return {
        detectedType: bestType,
        event_type: bestType,
        confidence: ConfidenceLevel.HIGH,
        confidenceScore: confScore,
        confidence_score: confScore,
        signals,
        detected_signals: signals,
      };
    } else if (maxScore >= 0.35) {
      const confScore = Math.round(maxScore * 100) / 100;
      return {
        detectedType: bestType,
        event_type: bestType,
        confidence: ConfidenceLevel.MEDIUM,
        confidenceScore: confScore,
        confidence_score: confScore,
        signals,
        detected_signals: signals,
      };
    } else {
      return {
        detectedType: EventType.UNKNOWN,
        event_type: EventType.UNKNOWN,
        confidence: ConfidenceLevel.LOW,
        confidenceScore: 0.15,
        confidence_score: 0.15,
        signals: signals.length > 0 ? signals : ['BASELINE_EVENT_DETECTION'],
        detected_signals: signals.length > 0 ? signals : ['BASELINE_EVENT_DETECTION'],
      };
    }
  }
}
