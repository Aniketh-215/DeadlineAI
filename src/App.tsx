/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Task, SubTask, PlannerSlot, AISuggestion } from './types';
import Dashboard from './components/Dashboard';
import TaskForm from './components/TaskForm';
import AIAssistant from './components/AIAssistant';

// Initial preloaded mock tasks for pristine high fidelity immediately on launch
const INITIAL_MOCK_TASKS = (): Task[] => {
  const now = new Date();
  
  // DBMS Assignment due in 3 hours
  const dbmsDeadline = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const dbmsDeadlineStr = dbmsDeadline.toISOString().slice(0, 16);

  // AI Hackathon Project due in 18 hours
  const aiDeadline = new Date(now.getTime() + 18 * 60 * 60 * 1000);
  const aiDeadlineStr = aiDeadline.toISOString().slice(0, 16);

  // Cardio Gym Workout due in 25 hours
  const workoutDeadline = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const workoutDeadlineStr = workoutDeadline.toISOString().slice(0, 16);

  return [
    {
      id: "task_1",
      title: "DBMS Assignment Submissions",
      description: "Complete relational normalization exercises and compile into submission PDF.",
      category: "Study",
      priority: "Urgent",
      deadline: dbmsDeadlineStr,
      estimatedDuration: 45,
      completed: false,
      whyExplanation: "You should complete your DBMS assignment first because it is due in less than three hours. Completing it now gives you peace of mind to focus on deeper code mockups later.",
      subtasks: [
        { id: "sub_1", title: "Normalize schema to 3NF", estimatedDuration: 15, completed: false },
        { id: "sub_2", title: "Draw relational diagrams", estimatedDuration: 15, completed: false },
        { id: "sub_3", title: "Compile final PDF and submit", estimatedDuration: 15, completed: false }
      ]
    },
    {
      id: "task_2",
      title: "Design AI Hackathon Slides",
      description: "Craft UI mockups and standard slides outlining user journeys and Gemini capabilities.",
      category: "Work",
      priority: "High",
      deadline: aiDeadlineStr,
      estimatedDuration: 90,
      completed: false,
      whyExplanation: "This design takes significant focus. By starting it right after your DBMS assignment, you'll utilize high-energy morning hours efficiently.",
      subtasks: [
        { id: "sub_4", title: "Draft high-fidelity landing page wireframes", estimatedDuration: 45, completed: false },
        { id: "sub_5", title: "Assemble presentation slides", estimatedDuration: 45, completed: false }
      ]
    },
    {
      id: "task_3",
      title: "Cardio Gym Workout",
      description: "Complete HIIT cardio block to clear cognitive load and restore physical energy.",
      category: "Personal",
      priority: "Medium",
      deadline: workoutDeadlineStr,
      estimatedDuration: 60,
      completed: false,
      whyExplanation: "Strategically scheduled towards evening as a physical recharge after demanding mental blocks.",
      subtasks: []
    }
  ];
};

const INITIAL_SUGGESTIONS: AISuggestion[] = [
  {
    id: "s_init_1",
    title: "Impending Deadline Alert",
    type: "warning",
    explanation: "DBMS Assignment deadline is closing in. Clear all notification noise and begin immediately."
  },
  {
    id: "s_init_2",
    title: "Cognitive Break Strategy",
    type: "tip",
    explanation: "You have scheduled two heavy conceptual study & design blocks. Plan a 15-minute screen-free gap between them."
  }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('deadlineai_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading tasks", e);
      }
    }
    return INITIAL_MOCK_TASKS();
  });

  const [plannerSlots, setPlannerSlots] = useState<PlannerSlot[]>(() => {
    const saved = localStorage.getItem('deadlineai_planner');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Preload an initial day plan matching mock tasks
    return [
      { id: "p1", startTime: "09:00", endTime: "10:00", title: "DBMS Assignment Submissions", category: "Study", completed: false, taskId: "task_1" },
      { id: "p2", startTime: "10:15", endTime: "12:00", title: "Design AI Hackathon Slides", category: "Work", completed: false, taskId: "task_2" },
      { id: "p3", startTime: "12:00", endTime: "13:00", title: "Lunch Break", category: "Other", completed: false },
      { id: "p4", startTime: "17:00", endTime: "18:00", title: "Cardio Gym Workout", category: "Personal", completed: false, taskId: "task_3" }
    ];
  });

  const [plannerExplanation, setPlannerExplanation] = useState<string>(() => {
    return localStorage.getItem('deadlineai_explanation') || "Optimized morning focus sessions paired with flexible evening recovery.";
  });

  const [suggestions, setSuggestions] = useState<AISuggestion[]>(() => {
    const saved = localStorage.getItem('deadlineai_suggestions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_SUGGESTIONS;
  });

  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);

  // Task form modal triggers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Theme support
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('deadlineai_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Persist values
  useEffect(() => {
    localStorage.setItem('deadlineai_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('deadlineai_planner', JSON.stringify(plannerSlots));
  }, [plannerSlots]);

  useEffect(() => {
    localStorage.setItem('deadlineai_explanation', plannerExplanation);
  }, [plannerExplanation]);

  useEffect(() => {
    localStorage.setItem('deadlineai_suggestions', JSON.stringify(suggestions));
  }, [suggestions]);

  useEffect(() => {
    localStorage.setItem('deadlineai_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Handle task prioritisation with Gemini
  const handlePrioritizeTasks = async (currentTasksList: Task[]) => {
    setIsPrioritizing(true);
    try {
      const response = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: currentTasksList }),
      });

      if (!response.ok) throw new Error("Prioritize API failed");

      const data = await response.json();
      if (data.prioritizedTasks && Array.isArray(data.prioritizedTasks)) {
        setTasks(prev => prev.map(t => {
          const match = data.prioritizedTasks.find((pt: any) => pt.id === t.id);
          return match ? { ...t, whyExplanation: match.whyExplanation } : t;
        }));
      }
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPrioritizing(false);
    }
  };

  // Feature 3 - Generate Daily Timetable Hourly Planner
  const handleGeneratePlanner = async () => {
    setIsPlanning(true);
    try {
      const response = await fetch('/api/ai/plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });

      if (!response.ok) throw new Error("Planner API failed");

      const data = await response.json();
      if (data.timetable && Array.isArray(data.timetable)) {
        setPlannerSlots(data.timetable);
      }
      if (data.explanation) {
        setPlannerExplanation(data.explanation);
      }

      // Also fetch custom priority suggestions
      await handlePrioritizeTasks(tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlanning(false);
    }
  };

  // Feature 4: Dynamic Rescheduling when a task is marked Incomplete
  const handleReschedule = async (taskId: string, currentTasksList: Task[]) => {
    setIsPlanning(true);
    try {
      const response = await fetch('/api/ai/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: currentTasksList, uncompletedTaskId: taskId }),
      });

      if (!response.ok) throw new Error("Reschedule API failed");

      const data = await response.json();
      
      // Update explanations of tasks
      if (data.rescheduledTasks && Array.isArray(data.rescheduledTasks)) {
        setTasks(prev => prev.map(t => {
          const match = data.rescheduledTasks.find((rt: any) => rt.id === t.id);
          return match ? { ...t, whyExplanation: match.whyExplanation } : t;
        }));
      }

      // Display the central reschedule explanation
      if (data.explanation) {
        setPlannerExplanation(data.explanation);
        
        // Push a custom real-time alert/suggestion
        const alertSug: AISuggestion = {
          id: `alert_${Date.now()}`,
          title: "Dynamic Reschedule Complete",
          type: "action",
          explanation: data.explanation,
          affectedTaskId: taskId
        };
        setSuggestions(prev => [alertSug, ...prev]);
      }

      // Automatically re-generate hourly slots to reflect the new dynamic order
      const planResponse = await fetch('/api/ai/plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: currentTasksList }),
      });
      if (planResponse.ok) {
        const planData = await planResponse.json();
        if (planData.timetable) setPlannerSlots(planData.timetable);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsPlanning(false);
    }
  };

  // Add / Edit form submit handler
  const handleFormSubmit = async (formData: Omit<Task, 'id' | 'completed'> & { id?: string; completed?: boolean }) => {
    let updatedTasks: Task[];

    if (formData.id) {
      // Edit mode
      updatedTasks = tasks.map(t => t.id === formData.id ? { 
        ...t, 
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        deadline: formData.deadline,
        estimatedDuration: formData.estimatedDuration,
        subtasks: formData.subtasks,
        completed: formData.completed || false
      } : t);
      setTasks(updatedTasks);
    } else {
      // Create mode
      const newTask: Task = {
        ...formData,
        id: `task_${Date.now()}`,
        completed: false,
      };
      updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
    }

    // Trigger AI prioritization automatically for seamless sass feel
    await handlePrioritizeTasks(updatedTasks);
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    setPlannerSlots(prev => prev.filter(p => p.taskId !== id));
    await handlePrioritizeTasks(updated);
  };

  // Complete / Incomplete toggle
  const handleToggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isMarkedIncomplete = task.completed; // was completed, now moving to incomplete

    const updatedTasks = tasks.map(t => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        // Mark all subtasks matching the state if complete
        const updatedSubtasks = t.subtasks?.map(s => ({ ...s, completed: nextCompleted }));
        return { ...t, completed: nextCompleted, subtasks: updatedSubtasks };
      }
      return t;
    });

    setTasks(updatedTasks);

    // Update state of slots matching the task
    setPlannerSlots(prev => prev.map(p => p.taskId === id ? { ...p, completed: !task.completed } : p));

    if (isMarkedIncomplete) {
      // Feature 4: Dynamic rescheduling trigger automatically!
      await handleReschedule(id, updatedTasks);
    } else {
      // Re-prioritize sequential ordering
      await handlePrioritizeTasks(updatedTasks);
    }
  };

  // Toggle checklist subtasks individually
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId && t.subtasks) {
        const nextSubs = t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
        // If all subtasks completed, auto-complete parent task optionally
        const allDone = nextSubs.every(s => s.completed);
        return { 
          ...t, 
          subtasks: nextSubs,
          completed: allDone ? true : t.completed
        };
      }
      return t;
    });

    setTasks(updatedTasks);

    // If parent task is fully marked done, toggle state of slots too
    const updatedTask = updatedTasks.find(t => t.id === taskId);
    if (updatedTask && updatedTask.completed) {
      setPlannerSlots(prev => prev.map(p => p.taskId === taskId ? { ...p, completed: true } : p));
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7ff] dark:bg-[#05060f] text-slate-800 dark:text-slate-100 transition-colors duration-300 pb-20 relative overflow-hidden">
      
      {/* Background Decorative Mesh Glows / Neon Orbs */}
      <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-600/15 dark:to-purple-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-fuchsia-500/15 to-rose-500/15 dark:from-fuchsia-600/10 dark:to-rose-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-5%] w-[450px] h-[450px] bg-gradient-to-br from-cyan-500/15 to-blue-500/15 dark:from-cyan-600/10 dark:to-blue-600/10 rounded-full blur-[110px] pointer-events-none" />

      {/* Main Container Wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        <Dashboard
          tasks={tasks}
          onAddTask={() => { setEditingTask(null); setIsFormOpen(true); }}
          onEditTask={(task) => { setEditingTask(task); setIsFormOpen(true); }}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
          onToggleSubtask={handleToggleSubtask}
          onGeneratePlanner={handleGeneratePlanner}
          onReschedule={(id) => handleReschedule(id, tasks)}
          plannerSlots={plannerSlots}
          plannerExplanation={plannerExplanation}
          suggestions={suggestions}
          isPrioritizing={isPrioritizing}
          isPlanning={isPlanning}
          theme={theme}
          onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        />
      </main>

      {/* Interactive Modal Form */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingTask(null); }}
        onSubmit={handleFormSubmit}
        editingTask={editingTask}
      />

      {/* Floating Interactive Copilot Assistant */}
      <AIAssistant tasks={tasks} />

    </div>
  );
}
