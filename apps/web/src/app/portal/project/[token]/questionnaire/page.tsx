'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FileQuestion,
  CheckCircle2,
  Clock,
  Sparkles,
  Camera,
  Heart,
  Send,
  Save,
  AlertCircle,
} from 'lucide-react';
import { PublicQuestionnairePortalDTO } from '@pixmatch/types';

export default function PublicClientQuestionnairePortal() {
  const params = useParams();
  const token = params?.token as string;

  const [portalData, setPortalData] = useState<PublicQuestionnairePortalDTO | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestionnaire = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/public/questionnaire/${token}`);
      if (!res.ok) {
        throw new Error('Questionnaire link expired or invalid');
      }
      const json = await res.json();
      const data: PublicQuestionnairePortalDTO = json.data;
      setPortalData(data);

      // Pre-fill answers
      const initialAnswers: Record<string, string> = {};
      data.questions?.forEach((q) => {
        if (q.existing_answer?.answer_text || q.existing_answer) {
          initialAnswers[q.id] =
            typeof q.existing_answer === 'string'
              ? q.existing_answer
              : q.existing_answer?.answer_text || JSON.stringify(q.existing_answer);
        }
      });
      setAnswers(initialAnswers);
      if (data.questionnaire?.status === 'SUBMITTED') {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading questionnaire');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionnaire();
  }, [token]);

  const handleAnswerChange = (questionId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const answerList = Object.entries(answers).map(([question_id, answer_text]) => ({
        question_id,
        answer_text,
      }));

      const res = await fetch(`/api/public/questionnaire/${token}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerList, is_final: true }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit questionnaire');
      }

      setSubmitted(true);
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A0F] text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted">Loading your pre-shoot questionnaire...</p>
        </div>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-[#070A0F] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0E1422] border border-red-500/30 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Invalid or Expired Link</h2>
          <p className="text-xs text-muted leading-relaxed">
            This questionnaire link is either invalid or has reached its expiration time. Please contact your photographer for an updated link.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#070A0F] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0E1422] border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4 shadow-2xl shadow-emerald-500/10">
          <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Questionnaire Completed!</h2>
          <p className="text-xs text-muted leading-relaxed">
            Thank you for completing your pre-shoot details. Your photographer has received your preferences and will use them to build your customized shoot day schedule and shot list.
          </p>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim()).length;
  const totalCount = portalData.questions?.length || 1;
  const progressPercent = Math.round((answeredCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-[#070A0F] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Client Pre-Shoot Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {portalData.questionnaire?.title || 'Pre-Shoot Questionnaire'}
          </h1>
          <p className="text-xs text-muted max-w-lg mx-auto">
            {portalData.questionnaire?.description ||
              'Please answer the questions below to ensure your photo session is seamless, personalized, and perfectly aligned with your vision.'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#0E1422] border border-card-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted font-medium">Completion Progress</span>
            <span className="text-primary font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-card-border/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Form Questions */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {portalData.questions?.map((q, idx) => (
            <div
              key={q.id}
              className="bg-[#0E1422] border border-card-border hover:border-primary/40 transition-all rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <label className="text-sm font-semibold text-white leading-snug">
                  <span className="text-primary font-bold mr-1.5">{idx + 1}.</span>
                  {q.question}
                  {q.required && <span className="text-red-400 ml-1">*</span>}
                </label>
              </div>

              {q.question_type === 'TEXTAREA' ? (
                <textarea
                  rows={3}
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full bg-[#070A0F] border border-card-border focus:border-primary rounded-lg p-3 text-xs text-white placeholder-muted focus:outline-none transition"
                  required={q.required}
                />
              ) : q.question_type === 'DATE' ? (
                <input
                  type="date"
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="bg-[#070A0F] border border-card-border focus:border-primary rounded-lg p-2.5 text-xs text-white focus:outline-none transition"
                  required={q.required}
                />
              ) : (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Your answer..."
                  className="w-full bg-[#070A0F] border border-card-border focus:border-primary rounded-lg p-3 text-xs text-white placeholder-muted focus:outline-none transition"
                  required={q.required}
                />
              )}
            </div>
          ))}

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold text-xs shadow-lg shadow-primary/20 transition-all"
            >
              <Send className="h-4 w-4" />
              {saving ? 'Submitting Responses...' : 'Submit Completed Questionnaire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
