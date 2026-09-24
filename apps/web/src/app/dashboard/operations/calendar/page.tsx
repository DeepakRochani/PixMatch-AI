'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  User,
  List,
  Grid,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { OperationsNavTabs } from '@/components/dashboard/OperationsNavTabs';
import {
  OperationsCalendarEventDTO,
  OperationsCalendarResponseDTO,
} from '@pixmatch/types';

export default function OperationsCalendarPage() {
  const { token, studio } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eventsData, setEventsData] = useState<OperationsCalendarResponseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Month navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  // Fetch events for current month range
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Extend window slightly to show adjacent days in month view
      const rangeStart = new Date(year, month, -6);
      const rangeEnd = new Date(year, month + 1, 7);

      let url = `/api/v1/operations/calendar?start_date=${rangeStart.toISOString()}&end_date=${rangeEnd.toISOString()}`;
      if (eventTypeFilter !== 'ALL') {
        url += `&event_type=${eventTypeFilter}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-studio-id': studio?.id || '',
        },
      });

      if (!res.ok) throw new Error('Failed to load calendar events');
      const json = await res.json();
      setEventsData(json.data || json);
    } catch (err: any) {
      setError(err.message || 'Error loading calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEvents();
    }
  }, [token, studio?.id, year, month, eventTypeFilter]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build 35 or 42 cell Month Grid
  const getDaysInMonthGrid = () => {
    const firstDayIndex = startOfMonth.getDay(); // 0 is Sunday
    const daysInCurrentMonth = endOfMonth.getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dateString: string;
      events: OperationsCalendarEventDTO[];
    }> = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = d.toISOString().split('T')[0];
      const matchingEvents =
        eventsData?.events.filter((e) => (e.start_date || (e.start as string) || '').startsWith(dateStr)) || [];
      days.push({
        date: d,
        isCurrentMonth: false,
        dateString: dateStr,
        events: matchingEvents,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      const matchingEvents =
        eventsData?.events.filter((e) => (e.start_date || (e.start as string) || '').startsWith(dateStr)) || [];
      days.push({
        date: d,
        isCurrentMonth: true,
        dateString: dateStr,
        events: matchingEvents,
      });
    }

    // Next month filler days to complete grid rows
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split('T')[0];
      const matchingEvents =
        eventsData?.events.filter((e) => (e.start_date || (e.start as string) || '').startsWith(dateStr)) || [];
      days.push({
        date: d,
        isCurrentMonth: false,
        dateString: dateStr,
        events: matchingEvents,
      });
    }

    return days;
  };

  const daysGrid = getDaysInMonthGrid();
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Studio Operations Calendar
          </h1>
          <p className="text-sm text-muted">
            Aggregated schedule for shoots, delivery deadlines, follow-ups, and operational tasks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-card rounded-lg border border-card-border p-0.5">
            <button
              onClick={() => setViewMode('month')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'month' ? 'bg-primary text-white' : 'text-muted hover:text-white'
              }`}
              title="Month View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'list' ? 'bg-primary text-white' : 'text-muted hover:text-white'
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <OperationsNavTabs />

      {/* Calendar Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card border border-card-border rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-card-border/40 hover:bg-card-border text-white transition"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-card-border/40 hover:bg-card-border text-white transition"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-base font-bold text-white min-w-[160px]">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>

          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-card-border/40 hover:bg-card-border text-white transition"
          >
            Today
          </button>
        </div>

        {/* Filter by Event Type */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Category:</span>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="bg-card-border/40 border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Event Types</option>
              <option value="SHOOT">Shoots Only</option>
              <option value="DELIVERY">Delivery Deadlines</option>
              <option value="TASK">Operational Tasks</option>
              <option value="MILESTONE">Milestones</option>
              <option value="LEAD_FOLLOW_UP">Lead Follow-ups</option>
            </select>
          </div>

          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-1.5 text-muted hover:text-white bg-card-border/40 hover:bg-card-border rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Month Grid View */}
      {viewMode === 'month' && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-card-border bg-card-border/20 text-center text-[11px] font-bold text-muted uppercase tracking-wider py-2.5">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-card-border/40">
            {daysGrid.map((day, idx) => {
              const isToday = day.dateString === todayStr;
              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition ${
                    day.isCurrentMonth ? 'bg-card' : 'bg-card/40 text-muted/50'
                  } ${isToday ? 'ring-1 ring-inset ring-primary' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isToday
                          ? 'bg-primary text-white font-bold'
                          : day.isCurrentMonth
                          ? 'text-white'
                          : 'text-muted'
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {day.events.length > 0 && (
                      <span className="text-[10px] text-muted font-bold">
                        {day.events.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1.5 overflow-y-auto max-h-[80px] scrollbar-none">
                    {day.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate text-white border"
                        style={{
                          backgroundColor: `${ev.color || '#3b82f6'}20`,
                          borderColor: `${ev.color || '#3b82f6'}40`,
                        }}
                        title={`${ev.title} (${ev.event_type})`}
                      >
                        {ev.project_id ? (
                          <Link
                            href={`/dashboard/operations/projects/${ev.project_id}`}
                            className="hover:underline"
                          >
                            {ev.title}
                          </Link>
                        ) : (
                          <span>{ev.title}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Chronological Agenda</h3>

          {!eventsData?.events?.length ? (
            <div className="py-12 text-center text-xs text-muted border border-dashed border-card-border rounded-xl">
              No events scheduled in the current period.
            </div>
          ) : (
            <div className="space-y-2.5">
              {eventsData.events.map((ev) => {
                const date = new Date(ev.start_date || (ev.start as string) || Date.now());
                const eventTypeName = ev.event_type || ev.type || 'EVENT';
                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-lg bg-card-border/30 border border-card-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ev.color || '#3b82f6' }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{ev.title}</span>
                          <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-card-border text-muted">
                            {eventTypeName.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-3 mt-1">
                          {ev.client_name && <span>Client: {ev.client_name}</span>}
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:self-center flex items-center sm:flex-col justify-between sm:justify-center">
                      <span className="text-xs font-semibold text-white">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {!ev.is_all_day && (
                        <span className="text-[10px] text-muted">
                          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
