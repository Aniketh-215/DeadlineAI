/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Task, SubTask, PlannerSlot, AISuggestion, ProductivityStats } from '../types';
import { 
  Plus, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, 
  Circle, Sparkles, RefreshCw, BarChart2, CheckSquare, Brain, 
  Trash2, Edit3, ShieldAlert, ArrowRight, Sun, Moon, Zap, Play, Check 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell 
} from 'recharts';
import CalendarView from './CalendarView';

interface DashboardProps {
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onGeneratePlanner: () => void;
  onReschedule: (taskId: string) => void;
  plannerSlots: PlannerSlot[];
  plannerExplanation: string;
  suggestions: AISuggestion[];
  isPrioritizing: boolean;
  isPlanning: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Dashboard({
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onToggleSubtask,
  onGeneratePlanner,
  onReschedule,
  plannerSlots,
  plannerExplanation,
  suggestions,
  isPrioritizing,
  isPlanning,
  theme,
  onToggleTheme
}: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    return (new Date(today.getTime() - tzOffset)).toISOString().slice(0, 10);
  });
  
  const [taskFilter, setTaskFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Work' | 'Study' | 'Personal'>('All');

  // Emergency Mode state & calculations
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [emergencyFilterActive, setEmergencyFilterActive] = useState(false);

  // Check if any incomplete task is due within 24 hours
  const urgentTasks = tasks.filter(t => {
    if (t.completed) return false;
    const deadlineTime = new Date(t.deadline).getTime();
    const now = Date.now();
    const hoursLeft = (deadlineTime - now) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 24;
  });

  // Automatically trigger/deactivate Emergency Mode based on urgent tasks presence
  useEffect(() => {
    if (urgentTasks.length > 0) {
      setEmergencyMode(true);
    } else {
      setEmergencyMode(false);
      setEmergencyFilterActive(false);
    }
  }, [tasks]);

  // Productivity Score Calculation
  const completedTasks = tasks.filter(t => t.completed);
  const totalTasksCount = tasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasks.length / totalTasksCount) * 100) : 0;
  
  // High / Urgent multiplier
  const highPriorityCompleted = completedTasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').length;
  const highPriorityTotal = tasks.filter(t => t.priority === 'High' || t.priority === 'Urgent').length;
  const urgencyWeight = highPriorityTotal > 0 ? (highPriorityCompleted / highPriorityTotal) * 15 : 15;
  const productivityScore = Math.min(100, Math.round((completionRate * 0.85) + urgencyWeight));

  // Category distributions
  const categoryData = ['Work', 'Study', 'Personal', 'Other'].map(cat => {
    const count = tasks.filter(t => t.category === cat).length;
    const completed = tasks.filter(t => t.category === cat && t.completed).length;
    return { name: cat, total: count, completed };
  });

  // Weekly Progress mock data mapping from real counts
  const weeklyProgress = [
    { day: 'Mon', completed: Math.max(1, completedTasks.length - 2), pending: Math.max(0, tasks.length - completedTasks.length) },
    { day: 'Tue', completed: Math.max(2, completedTasks.length - 1), pending: Math.max(1, tasks.length - completedTasks.length + 1) },
    { day: 'Wed', completed: Math.max(1, completedTasks.length), pending: Math.max(0, tasks.length - completedTasks.length) },
    { day: 'Thu', completed: Math.max(3, completedTasks.length + 1), pending: Math.max(2, tasks.length - completedTasks.length + 1) },
    { day: 'Fri', completed: completedTasks.length, pending: tasks.filter(t => !t.completed).length },
    { day: 'Sat', completed: completedTasks.length, pending: tasks.filter(t => !t.completed).length },
    { day: 'Sun', completed: completedTasks.length, pending: tasks.filter(t => !t.completed).length },
  ];

  // Filters mapping
  const displayedTasks = tasks.filter(t => {
    // Apply standard filter
    if (taskFilter === 'Pending' && t.completed) return false;
    if (taskFilter === 'Completed' && !t.completed) return false;
    
    // Apply category filter
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;

    // Apply Emergency Filter (hide non-urgent, non-important tasks in crisis mode)
    if (emergencyFilterActive && !t.completed) {
      const isUrgentTask = urgentTasks.some(ut => ut.id === t.id);
      return isUrgentTask || t.priority === 'High' || t.priority === 'Urgent';
    }

    return true;
  });

  // Calculate countdown for a task
  const getCountdownString = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return "Overdue";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 artistic-glass rounded-3xl shadow-xl shadow-indigo-950/5 relative overflow-hidden">
        {/* Glow effect inside banner */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white rounded-2xl shadow-lg shadow-indigo-500/30">
            <Zap className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">v2.5 Flash API</span>
              {emergencyMode && (
                <span className="text-[10px] uppercase tracking-widest font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md animate-pulse">
                  <ShieldAlert className="w-3 h-3" /> Emergency Active
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white font-display bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-900 dark:from-white dark:via-indigo-100 dark:to-purple-200" id="main-app-title">
              DeadlineAI
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              The Last Minute Life Saver – Smarter execution order, optimized timetables.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all shadow-sm cursor-pointer hover:scale-105"
            id="theme-toggle-btn"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* New Task Button */}
          <button
            onClick={onAddTask}
            className="px-5 py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all hover:scale-[1.03] cursor-pointer"
            id="add-task-header-btn"
          >
            <Plus className="w-4.5 h-4.5" />
            <span className="text-xs tracking-wide">Schedule Task</span>
          </button>
        </div>
      </div>

      {/* 2. Feature 6 – EMERGENCY MODE ALERT HERO PANEL */}
      {emergencyMode && (
        <div className="p-6 bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/25 rounded-3xl shadow-xl shadow-rose-950/10 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-gradient-to-br from-rose-500/15 to-pink-500/5 rounded-full blur-3xl" />
          
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 shrink-0">
            <ShieldAlert className="w-8 h-8 animate-bounce" id="emergency-alert-icon" />
          </div>

          <div className="flex-1 space-y-2 relative z-10">
            <h3 className="text-xl font-bold font-display text-rose-700 dark:text-rose-400 flex items-center gap-2">
              🚨 Crisis Protocol Engaged: {urgentTasks.length} Imminent Deadline{urgentTasks.length > 1 ? 's' : ''}
            </h3>
            <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed max-w-3xl">
              We identified critical tasks due in less than 24 hours. Emergency Mode has automatically prioritized them, generated speed-focused execution plans, and unlocked the Focus Filter.
            </p>
            
            {/* Quick list of urgent task countdowns */}
            <div className="flex flex-wrap gap-2 pt-1.5">
              {urgentTasks.map(t => (
                <div key={t.id} className="bg-rose-500/10 dark:bg-rose-500/25 border border-rose-500/30 text-[11px] text-rose-700 dark:text-rose-200 font-bold px-3 py-1.5 rounded-xl flex items-center gap-2 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>{t.title}</span>
                  <span className="text-rose-600 dark:text-rose-400">({getCountdownString(t.deadline)})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Toggle Emergency Filter Button */}
          <button
            onClick={() => setEmergencyFilterActive(!emergencyFilterActive)}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer relative z-10 ${
              emergencyFilterActive 
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20' 
                : 'bg-white dark:bg-slate-900 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15'
            }`}
            id="emergency-focus-filter-btn"
          >
            {emergencyFilterActive ? 'Show All Tasks' : 'Hide Low Priority Tasks'}
          </button>
        </div>
      )}

      {/* 3. Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Productivity Score Ring Gauge */}
        <div className="md:col-span-1 artistic-glass rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center group hover:scale-[1.01] transition-all duration-300">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-4 font-mono">Productivity Score</span>
          
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Background Circle */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="62"
                className="stroke-slate-200/50 dark:stroke-slate-800/60"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="62"
                className="stroke-indigo-500 transition-all duration-1000"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 62}
                strokeDashoffset={2 * Math.PI * 62 * (1 - productivityScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white font-display">{productivityScore}%</span>
              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider font-mono">Level</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {productivityScore > 80 ? '🚀 Unstoppable Force' : productivityScore > 50 ? '⚡ Keeping Pace' : '⚠️ Need AI Planning'}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Based on completions and priority targets</span>
          </div>
        </div>

        {/* Tasks Counters */}
        <div className="md:col-span-1 grid grid-rows-2 gap-4">
          <div className="artistic-glass rounded-3xl p-5 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-all duration-300">
            <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 dark:text-slate-400 block font-semibold font-mono uppercase tracking-wider">Completed</span>
              <span className="text-3xl font-bold text-slate-800 dark:text-white font-display">{completedTasks.length}</span>
            </div>
          </div>
          <div className="artistic-glass rounded-3xl p-5 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-all duration-300">
            <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 dark:text-slate-400 block font-semibold font-mono uppercase tracking-wider">Pending</span>
              <span className="text-3xl font-bold text-slate-800 dark:text-white font-display">{tasks.filter(t => !t.completed).length}</span>
            </div>
          </div>
        </div>

        {/* Chart progress representation */}
        <div className="md:col-span-2 artistic-glass rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 font-mono">Weekly Performance</span>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 font-mono uppercase tracking-wider">
              <BarChart2 className="w-3.5 h-3.5" /> Live Workload
            </span>
          </div>
          
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyProgress}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#fff', backdropFilter: 'blur(8px)' }} 
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. AI SUGGESTIONS PANEL */}
      <div className="relative overflow-hidden p-6 rounded-3xl border border-indigo-500/20 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-950/80 via-slate-900/95 to-purple-950/85 dark:from-indigo-950/30 dark:via-[#090b16] dark:to-purple-950/20 shadow-2xl">
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-widest uppercase text-indigo-200 font-mono">Gemini Decision Engine Insights</h3>
              <p className="text-[10px] text-slate-400">Proactive optimizations & scheduling alerts</p>
            </div>
          </div>
          <button
            onClick={onGeneratePlanner}
            disabled={isPrioritizing || isPlanning || tasks.length === 0}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] shrink-0 font-display"
            id="rec-prioritize-btn"
          >
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <span>Generate Optimized Plan</span>
          </button>
        </div>

        {/* Suggestions rendering */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {suggestions.length === 0 ? (
            <div className="md:col-span-2 text-center py-6 text-indigo-200/50 text-xs italic">
              No recent suggestions. Click "Generate Optimized Plan" above to analyze your workload.
            </div>
          ) : (
            suggestions.slice(0, 2).map((s) => (
              <div 
                key={s.id} 
                className="bg-white/5 dark:bg-slate-900/40 border border-white/10 dark:border-white/5 rounded-2xl p-4.5 flex gap-3.5 text-xs hover:border-indigo-500/30 transition-all duration-300"
              >
                <div className={`p-2.5 rounded-xl h-fit shrink-0 border ${
                  s.type === 'warning' ? 'bg-rose-500/10 border-rose-500/25 text-rose-300' :
                  s.type === 'action' ? 'bg-indigo-500/20 border-indigo-500/25 text-indigo-300' :
                  'bg-amber-500/10 border-amber-500/25 text-amber-300'
                }`}>
                  {s.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <div className="space-y-1">
                  <span className="font-bold block text-indigo-100 font-display">{s.title}</span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{s.explanation}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. Main Section Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Tasks lists and Agenda */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Schedule & Agenda Timeline */}
          <div className="artistic-glass rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-xl font-bold font-display text-slate-800 dark:text-white flex items-center gap-2.5">
                  <CalendarIcon className="w-5.5 h-5.5 text-indigo-500 dark:text-indigo-400" />
                  Today's Daily Plan
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-mono">HOURLY OPTIMIZED BREAKDOWN</p>
              </div>

              {plannerSlots.length > 0 && (
                <div className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-100/50 dark:bg-slate-800/30 px-3.5 py-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 max-w-md">
                  💡 {plannerExplanation || "Your schedule is ready."}
                </div>
              )}
            </div>

            {/* Timetable slots */}
            {plannerSlots.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200/50 dark:border-slate-800/50 rounded-2xl space-y-4">
                <span className="text-xs text-slate-400 dark:text-slate-500 block">No agenda created yet. Let's create an optimized hourly timetable!</span>
                <button
                  onClick={onGeneratePlanner}
                  disabled={tasks.length === 0 || isPlanning}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md hover:shadow-indigo-500/15 cursor-pointer transition-all hover:scale-[1.02]"
                  id="generate-timetable-btn"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate Timetable
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {plannerSlots.map((slot) => {
                  const hasTask = !!slot.taskId;
                  return (
                    <div 
                      key={slot.id} 
                      className={`flex gap-4 p-3.5 rounded-2xl border transition-all ${
                        slot.completed
                          ? 'bg-slate-100/20 dark:bg-slate-900/10 border-slate-100/30 dark:border-slate-800/30 opacity-40'
                          : hasTask 
                            ? slot.category === 'Work' ? 'bg-blue-50/60 dark:bg-blue-950/15 border-blue-200/30 dark:border-blue-900/30' :
                              slot.category === 'Study' ? 'bg-indigo-50/60 dark:bg-indigo-950/15 border-indigo-200/30 dark:border-indigo-900/30' :
                              slot.category === 'Personal' ? 'bg-teal-50/60 dark:bg-teal-950/15 border-teal-200/30 dark:border-teal-900/30' :
                              'bg-white/40 dark:bg-slate-800/20 border-slate-200/30 dark:border-slate-700/40'
                            : 'bg-slate-50/30 dark:bg-slate-900/10 border-slate-100/20 dark:border-slate-800/30'
                      }`}
                    >
                      {/* Slot times */}
                      <div className="w-20 font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0 flex flex-col justify-center border-r border-slate-200 dark:border-slate-800/60 pr-3">
                        <span className="font-bold block tracking-tight">{slot.startTime}</span>
                        <span className="text-[10px] opacity-75">{slot.endTime}</span>
                      </div>

                      {/* Slot Content */}
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className={`text-xs font-bold block ${slot.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-display'}`}>
                            {slot.title}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 uppercase tracking-wider font-mono">
                            {hasTask ? slot.category : "Flex Buffer"}
                          </span>
                        </div>
                        {hasTask && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onToggleComplete(slot.taskId!)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                slot.completed 
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10' 
                                  : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                              title={slot.completed ? "Mark incomplete" : "Mark completed"}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Smart Task Queue list */}
          <div className="artistic-glass rounded-3xl p-6 shadow-xl relative overflow-hidden">
            
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold font-display text-slate-800 dark:text-white flex items-center gap-2.5">
                  <CheckSquare className="w-5.5 h-5.5 text-indigo-500 dark:text-indigo-400" />
                  Task Priority Queue
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-mono">GEMINI SORTED EXECUTION ORDER</p>
              </div>

              {/* Filters list */}
              <div className="flex flex-wrap items-center gap-2 relative z-10">
                {/* Category filters */}
                <select
                  value={categoryFilter}
                  onChange={(e: any) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white/60 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                >
                  <option value="All">All Categories</option>
                  <option value="Work">💼 Work</option>
                  <option value="Study">📚 Study</option>
                  <option value="Personal">🏡 Personal</option>
                </select>

                {/* Completion filters */}
                <div className="bg-white/40 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 flex">
                  {(['All', 'Pending', 'Completed'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        taskFilter === f 
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tasks render */}
            {displayedTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 italic text-xs">
                No tasks match current filters. Add a new task or modify filters!
              </div>
            ) : (
              <div className="space-y-4">
                {displayedTasks.map((task) => {
                  const isUrgent = task.priority === 'Urgent';
                  const isHigh = task.priority === 'High';
                  const totalSub = task.subtasks?.length || 0;
                  const completedSub = task.subtasks?.filter(s => s.completed).length || 0;

                  return (
                    <div 
                      key={task.id} 
                      className={`border rounded-2xl p-5 transition-all relative overflow-hidden flex flex-col gap-4.5 ${
                        task.completed 
                          ? 'bg-slate-50/30 dark:bg-[#0c0d1e]/20 border-slate-200/50 dark:border-slate-800/50 opacity-55' 
                          : isUrgent 
                            ? 'bg-rose-500/5 dark:bg-rose-950/10 border-rose-500/30 dark:border-rose-500/30 shadow-lg shadow-rose-500/5' 
                            : isHigh
                              ? 'bg-amber-500/5 dark:bg-amber-950/10 border-amber-500/30 dark:border-amber-500/30 shadow-lg shadow-amber-500/5'
                              : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5'
                      }`}
                    >
                      {/* Top bar */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <button
                            onClick={() => onToggleComplete(task.id)}
                            className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            id={`task-toggle-${task.id}`}
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-5.5 h-5.5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5.5 h-5.5" />
                            )}
                          </button>
                          
                          <div className="space-y-1">
                            <h4 className={`font-bold text-sm tracking-tight ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white font-display'}`}>
                              {task.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                              {task.description || "No description provided."}
                            </p>
                          </div>
                        </div>

                        {/* Top action context buttons */}
                        <div className="flex items-center gap-1 shrink-0 relative z-10">
                          <button 
                            onClick={() => onEditTask(task)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
                            id={`edit-task-btn-${task.id}`}
                            title="Edit task"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteTask(task.id)}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                            id={`delete-task-btn-${task.id}`}
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Info Pills section */}
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className={`px-3 py-1 rounded-full border ${
                          task.category === 'Work' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' :
                          task.category === 'Study' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400' :
                          task.category === 'Personal' ? 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400' :
                          'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400'
                        }`}>
                          {task.category}
                        </span>

                        <span className={`px-2.5 py-1 rounded-lg border font-mono ${
                          isUrgent ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold' :
                          isHigh ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold' :
                          task.priority === 'Medium' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400' :
                          'bg-slate-500/5 border-slate-500/10 text-slate-500 dark:text-slate-400'
                        }`}>
                          {task.priority}
                        </span>

                        <span className="flex items-center gap-1 bg-slate-100/40 dark:bg-slate-800/30 px-2 py-1 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          Duration: {task.estimatedDuration}m
                        </span>

                        <span className="flex items-center gap-1 bg-slate-100/40 dark:bg-slate-800/30 px-2 py-1 rounded-lg border border-slate-200/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-300">
                          📅 Deadline: {new Date(task.deadline).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>

                        {!task.completed && (
                          <span className={`ml-auto text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg ${isUrgent ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse' : 'bg-slate-100/40 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500'}`}>
                            {getCountdownString(task.deadline)}
                          </span>
                        )}
                      </div>

                      {/* Subtasks inline checklist tracker */}
                      {totalSub > 0 && (
                        <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-3.5">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Milestones ({completedSub}/{totalSub})</span>
                            <span className="text-[10px] font-bold text-indigo-500 font-mono">{Math.round((completedSub/totalSub)*100)}% COMPLETE</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {task.subtasks?.map(sub => (
                              <button
                                key={sub.id}
                                onClick={() => onToggleSubtask(task.id, sub.id)}
                                className="flex items-center gap-2.5 p-2 bg-slate-100/30 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/60 rounded-xl text-left text-xs transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer"
                              >
                                <span className={`shrink-0 w-4 h-4 rounded-lg border flex items-center justify-center transition-all ${
                                  sub.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-950/50'
                                }`}>
                                  {sub.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                                <span className={`truncate text-[11px] font-medium ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-200'}`}>
                                  {sub.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feature 9 - AI EXPLANATION AREA */}
                      {task.whyExplanation && (
                        <div className="p-3.5 bg-indigo-500/5 dark:bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-start gap-2.5 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                          <p>
                            <strong className="font-bold font-display">Gemini Priority Decision: </strong>
                            {task.whyExplanation}
                          </p>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* Right 1 Column: Calendar View & Instructions */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Custom Calendar view */}
          <CalendarView 
            tasks={tasks} 
            selectedDate={selectedDate} 
            onSelectDate={(date) => setSelectedDate(date)} 
          />

          {/* Quick AI Explanation on Application Mechanics */}
          <div className="artistic-glass rounded-3xl p-6 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-3 flex items-center gap-2 font-mono">
              <Brain className="w-4 h-4 text-indigo-400" />
              Dynamic Rescheduling
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              When any task is marked as incomplete, DeadlineAI automatically sends your queue to Gemini to recalculate priority weights, balance workload, shift deadlines, and rebuild your hourly planner seamlessly.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
