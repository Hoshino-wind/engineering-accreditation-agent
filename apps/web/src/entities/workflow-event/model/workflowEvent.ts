import { useEffect, useState } from 'react';

export type WorkflowModule =
  | 'M1'
  | 'M2'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'M6'
  | 'M7'
  | 'M8'
  | 'M9';

export type WorkflowEventStatus =
  | 'success'
  | 'pending'
  | 'warning'
  | 'blocked';

export interface WorkflowEvent {
  id: string;
  module: WorkflowModule;
  action: string;
  objectId: string;
  summary: string;
  actor: string;
  status: WorkflowEventStatus;
  timestamp: string;
}

const storageKey = 'engineering-accreditation.workflow-events.v1';
const updateEventName = 'engineering-accreditation:workflow-events-updated';

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function readWorkflowEvents(): WorkflowEvent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as WorkflowEvent[]) : [];
  } catch {
    return [];
  }
}

export function recordWorkflowEvent(
  event: Omit<WorkflowEvent, 'id' | 'timestamp'>,
): WorkflowEvent {
  const nextEvent: WorkflowEvent = {
    ...event,
    id: createId(),
    timestamp: new Date().toISOString(),
  };
  const events = [nextEvent, ...readWorkflowEvents()].slice(0, 200);
  window.localStorage.setItem(storageKey, JSON.stringify(events));
  window.dispatchEvent(new Event(updateEventName));
  return nextEvent;
}

export function clearWorkflowEvents() {
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(new Event(updateEventName));
}

export function useWorkflowEvents() {
  const [events, setEvents] = useState<WorkflowEvent[]>(readWorkflowEvents);

  useEffect(() => {
    const refresh = () => setEvents(readWorkflowEvents());
    window.addEventListener(updateEventName, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(updateEventName, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return events;
}
