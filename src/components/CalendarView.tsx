/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onSelectDate: (dateStr: string) => void;
  selectedDate: string; // YYYY-MM-DD
}

export default function CalendarView({ tasks, onSelectDate, selectedDate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  // Fill empty spaces for days of the week offset
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Fill actual month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Find if a specific date has tasks due
  const getTasksForDate = (dateStr: string) => {
    return tasks.filter(t => t.deadline.startsWith(dateStr));
  };

  return (
    <div className="artistic-glass rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-400" id="calendar-view-icon" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display" id="calendar-view-title">
            {monthNames[month]} {year}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            id="calendar-prev-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            id="calendar-next-btn"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2 font-mono uppercase tracking-wider">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="aspect-square"></div>;
          }

          const dateStr = formatDateString(day);
          const dayTasks = getTasksForDate(dateStr);
          const isSelected = dateStr === selectedDate;
          const isToday = formatDateString(new Date()) === dateStr;

          // Check if any of these tasks are high/urgent and pending
          const hasUrgent = dayTasks.some(t => !t.completed && (t.priority === 'Urgent' || t.priority === 'High'));
          const hasPending = dayTasks.some(t => !t.completed);

          let bgClass = "bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/30";
          let textClass = "text-slate-700 dark:text-slate-300";

          if (isToday) {
            bgClass = "bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-400/40";
            textClass = "text-indigo-600 dark:text-indigo-400 font-bold";
          }
          if (isSelected) {
            bgClass = "bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 shadow-indigo-500/20 shadow-lg text-white font-semibold";
            textClass = "text-white";
          }

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square flex flex-col items-center justify-between p-1 rounded-xl transition-all relative ${bgClass} cursor-pointer`}
              id={`calendar-day-${day.getDate()}`}
            >
              <span className={`text-xs ${textClass}`}>{day.getDate()}</span>
              
              {/* Task indicators */}
              <div className="flex gap-1 justify-center mt-1">
                {dayTasks.length > 0 && (
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    hasUrgent ? 'bg-rose-500 animate-pulse' : hasPending ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Agenda */}
      <div className="mt-6 border-t border-slate-200/50 dark:border-slate-800/60 pt-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-3 font-mono">
          Due on {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </h4>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {getTasksForDate(selectedDate).length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No tasks due this day.</p>
          ) : (
            getTasksForDate(selectedDate).map(t => (
              <div 
                key={t.id} 
                className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  t.completed 
                    ? 'bg-slate-100/30 dark:bg-[#0c0d1e]/10 border-slate-200/50 dark:border-slate-800/40 opacity-55' 
                    : t.priority === 'Urgent' 
                      ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/25 dark:border-rose-900/30' 
                      : 'bg-white/40 dark:bg-slate-800/20 border-slate-200/40 dark:border-slate-700/50'
                }`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className={`text-xs font-semibold truncate ${t.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {t.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">
                    <span className={`px-1.5 py-0.5 rounded-full ${
                      t.category === 'Work' ? 'bg-blue-500/10 text-blue-500' :
                      t.category === 'Study' ? 'bg-indigo-500/10 text-indigo-500' :
                      t.category === 'Personal' ? 'bg-teal-500/10 text-teal-500' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {t.category}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      {t.estimatedDuration}m
                    </span>
                  </div>
                </div>
                {!t.completed && (
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                    t.priority === 'Urgent' ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' :
                    t.priority === 'High' ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' :
                    t.priority === 'Medium' ? 'text-indigo-400 bg-indigo-400/10 border border-indigo-400/20' :
                    'text-slate-400 bg-slate-400/10'
                  }`}>
                    {t.priority}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
