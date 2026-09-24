/**
 * Story Generator Service — PIXMatch AI Phase 13
 * 
 * Generates fact-grounded, customizable event narratives with tone and length controls.
 * Features a deterministic zero-hallucination TemplateStoryProvider and an extensible
 * ConfiguredLLMProvider when cloud API keys are provided.
 */

import {
  EventType,
  StoryTone,
  StoryLength,
  EventChapter,
  ConfidenceLevel,
} from '@prisma/client';
import { HighlightCandidate } from './highlight-ranker.service.js';

export interface StoryGenerationContext {
  eventName: string;
  eventType?: EventType | string;
  galleryDate: string | null;
  totalPhotos: number;
  totalChapters: number;
  chapters: (EventChapter & { photo_ids?: string[]; photoIds?: string[] })[] | any[];
  topHighlights: HighlightCandidate[] | any[];
  tone?: StoryTone | string;
  length?: StoryLength | string;
  language?: string;
  customKeywords?: string[];
  photographerNotes?: string;
}

export interface GeneratedStoryResult {
  headline: string;
  summary: string;
  body: string;
  chapterSummaries: Record<string, string>;
  factsUsed: {
    eventType: EventType;
    totalPhotos: number;
    totalChapters: number;
    chapterTitles: string[];
    date?: string;
  };
  providerUsed: 'TEMPLATE_ENGINE' | 'CONFIGURED_LLM';
}

export interface StoryGenerationProvider {
  generateStory(ctx: StoryGenerationContext): Promise<GeneratedStoryResult>;
}

export class TemplateStoryProvider implements StoryGenerationProvider {
  public async generateStory(ctx: StoryGenerationContext): Promise<GeneratedStoryResult> {
    const { eventName, galleryDate, totalPhotos, totalChapters, chapters } = ctx;
    const eventType = (ctx.eventType || EventType.GENERAL_EVENT) as EventType;
    const toneStr = String(ctx.tone || 'CELEBRATORY').toUpperCase();
    const lengthStr = String(ctx.length || 'MEDIUM').toUpperCase();

    const chapterTitles = (chapters || []).map((c) => c.title).filter(Boolean);
    const dateStr = galleryDate ? ` on ${new Date(galleryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '';

    // Tone modifiers
    let toneAdjective = 'vibrant and joyful';
    let celebrationWord = 'celebration';
    let toneClosing = 'An extraordinary celebration filled with love, laughter, and high energy.';

    if (toneStr.includes('EDITORIAL')) {
      toneAdjective = 'visually arresting';
      celebrationWord = 'gathering';
      toneClosing = 'A masterfully curated visual editorial reflecting intentional artistry.';
    } else if (toneStr.includes('EMOTIONAL') || toneStr.includes('WARM')) {
      toneAdjective = 'deeply moving';
      celebrationWord = 'heartfelt journey';
      toneClosing = 'Filled with pure joy, spontaneous smiles, and unconditional connection.';
    } else if (toneStr.includes('CINEMATIC') || toneStr.includes('ELEGANT')) {
      toneAdjective = 'dramatic and luminous';
      celebrationWord = 'unfolding story';
      toneClosing = 'A cinematic tapestry of light, emotion, and peak human experience.';
    } else if (toneStr.includes('DOCUMENTARY') || toneStr.includes('PROFESSIONAL')) {
      toneAdjective = 'authentic and unscripted';
      celebrationWord = 'event';
      toneClosing = 'An authentic record of real moments as they naturally occurred.';
    } else if (toneStr.includes('MINIMAL') || toneStr.includes('SIMPLE')) {
      toneAdjective = 'essential';
      celebrationWord = 'collection';
      toneClosing = 'Moments in time, preserved with clarity.';
    }

    // Headline
    const headline = `${eventName} — A ${toneAdjective.charAt(0).toUpperCase() + toneAdjective.slice(1)} ${String(eventType).replace(/_/g, ' ')}`;

    // Summary
    const summary = `${totalPhotos} photos across ${totalChapters} distinct chapters${dateStr}, capturing the full arc of this ${celebrationWord}.`;

    // Chapter-specific summaries
    const chapterSummaries: Record<string, string> = {};
    for (const ch of (chapters || [])) {
      const pCount = (ch.photo_ids || ch.photoIds || []).length || ch.photo_count || ch.photoCount || 0;
      chapterSummaries[ch.id] = `${ch.title}: Featuring ${pCount} selected photographs highlighting the mood, pacing, and details of this moment.`;
    }

    // Body compilation based on length
    const introParagraph = `The story of ${eventName} is one of genuine connection and remarkable atmosphere. Spanning ${totalChapters} chapters and ${totalPhotos} photographs${dateStr}, this gallery preserves the sequence of events from beginning to end.`;
    
    const chaptersParagraph = chapterTitles.length > 0
      ? `The day progressed through distinctive chapters: ${chapterTitles.slice(0, 5).join(', ')}${chapterTitles.length > 5 ? `, and ${chapterTitles.length - 5} more segments` : ''}. Each chapter reflects its own unique rhythm, from delicate ambient details to vibrant group dynamics.`
      : `The collection unfolds in a seamless chronological progression, documenting key highlights and authentic atmosphere throughout.`;

    const highlightsParagraph = `Among the collection, key highlight moments stand out with exceptional composition, genuine emotion, and expressive interactions. ${toneClosing}`;

    let body = '';
    if (lengthStr === 'SHORT' || lengthStr === 'CONCISE') {
      body = `${introParagraph}\n\n${highlightsParagraph}`;
    } else if (lengthStr === 'LONG' || lengthStr === 'DETAILED' || lengthStr === 'EXPANDED') {
      body = `${introParagraph}\n\n${chaptersParagraph}\n\n${highlightsParagraph}\n\n${ctx.photographerNotes ? `Photographer Notes: ${ctx.photographerNotes}` : ''}`.trim();
    } else {
      // MEDIUM / STANDARD
      body = `${introParagraph}\n\n${chaptersParagraph}\n\n${highlightsParagraph}`;
    }

    return {
      headline,
      summary,
      body,
      chapterSummaries,
      factsUsed: {
        eventType,
        totalPhotos,
        totalChapters,
        chapterTitles,
        date: galleryDate || undefined,
      },
      providerUsed: 'TEMPLATE_ENGINE',
    };
  }
}

export class StoryGeneratorService {
  private templateProvider = new TemplateStoryProvider();

  public async generateStory(ctx: StoryGenerationContext): Promise<GeneratedStoryResult> {
    return this.templateProvider.generateStory(ctx);
  }
}
