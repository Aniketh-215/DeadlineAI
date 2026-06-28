/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubTask {
  id: string;
  title: string;
  estimatedDuration: number; // in minutes
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'Work' | 'Study' | 'Personal' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  deadline: string; // YYYY-MM-DDTHH:mm
  estimatedDuration: number; // in minutes
  completed: boolean;
  subtasks?: SubTask[];
  whyExplanation?: string; // Reason from Gemini API
  scheduledStart?: string; // "HH:MM"
  scheduledEnd?: string; // "HH:MM"
}

export interface PlannerSlot {
  id: string;
  taskId?: string; // Reference to a Task
  title: string;
  startTime: string; // "09:00"
  endTime: string; // "10:15"
  category?: string;
  completed?: boolean;
}

export interface AISuggestion {
  id: string;
  title: string;
  type: 'warning' | 'tip' | 'action';
  explanation: string;
  affectedTaskId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ProductivityStats {
  score: number;
  completedCount: number;
  pendingCount: number;
  completionRate: number; // percentage
  averageCompletionTime: number; // minutes
  mostProductiveDay: string; // e.g., "Tuesday"
  weeklyProgress: { day: string; completed: number; pending: number }[];
}
