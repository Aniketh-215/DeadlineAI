/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Task, SubTask } from '../types';
import { X, Sparkles, Plus, Trash2, Clock, Check, Loader2, ArrowRight } from 'lucide-react';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'completed'> & { id?: string; completed?: boolean }) => void;
  editingTask?: Task | null;
}

export default function TaskForm({ isOpen, onClose, onSubmit, editingTask }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Work' | 'Study' | 'Personal' | 'Other'>('Work');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [deadline, setDeadline] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(60);
  
  // Subtasks list state
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDuration, setNewSubtaskDuration] = useState<number>(15);

  // AI Breakdown Loading State
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  // Reset fields on open or when editingTask changes
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setDeadline(editingTask.deadline);
      setEstimatedDuration(editingTask.estimatedDuration);
      setSubtasks(editingTask.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setCategory('Work');
      setPriority('Medium');
      // Default deadline is tomorrow same time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tzOffset = tomorrow.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(tomorrow.getTime() - tzOffset)).toISOString().slice(0, 16);
      setDeadline(localISOTime);
      setEstimatedDuration(60);
      setSubtasks([]);
    }
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  // Add custom manual subtask
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = {
      id: `sub_${Date.now()}`,
      title: newSubtaskTitle.trim(),
      estimatedDuration: newSubtaskDuration,
      completed: false
    };
    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle('');
    setNewSubtaskDuration(15);

    // Increment overall task duration
    setEstimatedDuration(prev => prev + newSubtaskDuration);
  };

  const handleRemoveSubtask = (id: string, duration: number) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
    setEstimatedDuration(prev => Math.max(15, prev - duration));
  };

  // Feature 5: AI Task Breakdown
  const handleAIBreakdown = async () => {
    if (!title.trim()) return;
    setIsBreakingDown(true);

    try {
      const response = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch breakdown');
      }

      const data = await response.json();
      if (data.subtasks && Array.isArray(data.subtasks)) {
        const mappedSubtasks: SubTask[] = data.subtasks.map((sub: any, index: number) => ({
          id: `ai_sub_${Date.now()}_${index}`,
          title: sub.title,
          estimatedDuration: sub.estimatedDuration || 15,
          completed: false,
        }));

        setSubtasks(mappedSubtasks);
        
        // Calculate total estimated duration based on AI subtasks sum
        const totalMinutes = mappedSubtasks.reduce((acc, curr) => acc + curr.estimatedDuration, 0);
        setEstimatedDuration(totalMinutes);
      }
    } catch (error) {
      console.error("AI Breakdown failed:", error);
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    onSubmit({
      id: editingTask?.id,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      deadline,
      estimatedDuration,
      subtasks,
      completed: editingTask?.completed || false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="bg-white/95 dark:bg-[#070914]/90 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative"
        id="task-form-container"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between relative z-10">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 font-display" id="task-form-title">
            {editingTask ? 'Edit Task' : 'Create New Deadline Task'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            id="close-task-form-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title and AI Breakdown Button */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Task Title</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build AI Hackathon Project, DBMS Exam Revision..."
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-100"
                id="task-title-input"
              />
              <button
                type="button"
                onClick={handleAIBreakdown}
                disabled={!title.trim() || isBreakingDown}
                className="px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                id="ai-breakdown-btn"
              >
                {isBreakingDown ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Breakdown</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, links, or specific targets for this deadline..."
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-100 resize-none"
              id="task-desc-input"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-100"
                id="task-category-select"
              >
                <option value="Work">💼 Work</option>
                <option value="Study">📚 Study</option>
                <option value="Personal">🏡 Personal</option>
                <option value="Other">⚙️ Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Urgency / Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-100"
                id="task-priority-select"
              >
                <option value="Low">🟢 Low</option>
                <option value="Medium">🟡 Medium</option>
                <option value="High">🟠 High</option>
                <option value="Urgent">🔴 Urgent</option>
              </select>
            </div>
          </div>

          {/* Deadline & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Deadline Time</label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-100"
                id="task-deadline-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Est. Duration (mins)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={10}
                  step={5}
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                  className="w-full pl-4 pr-12 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-100"
                  id="task-duration-input"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">min</span>
              </div>
            </div>
          </div>

          {/* Feature 5 Subtasks Management Panel */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                📌 Subtask Breakdown ({subtasks.length})
              </span>
              <span className="text-[10px] text-slate-400">Add milestones to track incrementally</span>
            </div>

            {/* Subtask input bar */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="New subtask title..."
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-100"
                id="subtask-title-input"
              />
              <div className="w-20 relative">
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={newSubtaskDuration}
                  onChange={(e) => setNewSubtaskDuration(Number(e.target.value))}
                  className="w-full pl-2 pr-6 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-100"
                  id="subtask-duration-input"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">m</span>
              </div>
              <button
                type="button"
                onClick={handleAddSubtask}
                className="p-1.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                id="add-subtask-btn"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Subtasks rendering */}
            {subtasks.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center py-2">No subtasks added yet. Try clicking "Breakdown" above to let Gemini do it!</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {subtasks.map((sub, index) => (
                  <div 
                    key={sub.id} 
                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/60 rounded-lg text-xs transition-all hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
                        {sub.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        {sub.estimatedDuration}m
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(sub.id, sub.estimatedDuration)}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 dark:text-rose-400 rounded transition-colors cursor-pointer"
                        id={`delete-subtask-${index}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-end gap-3 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            id="cancel-task-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 hover:scale-[1.02] transition-all cursor-pointer"
            id="save-task-btn"
          >
            <span>{editingTask ? 'Apply Changes' : 'Schedule Task'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
