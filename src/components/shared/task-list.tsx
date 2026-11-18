"use client";

import { useOptimistic, useTransition, useState } from "react";
import { Check, CalendarClock, User, MessageSquare } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { Progress } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea, Alert } from "@/components/ui/form";
import { toggleTask, updateTask } from "@/app/(app)/incidencias/actions";
import { fecha, fechaHora } from "@/lib/format";

export type TaskRow = {
  id: string; title: string; done: boolean; done_at: string | null; due_on: string | null; notes: string | null;
  assignee_id: string | null; assignee?: { short_name: string } | null; done_by_staff?: { short_name: string } | null;
};

export function TaskList({ tasks, staff, canEdit, meId, today }: { tasks: TaskRow[]; staff: { id: string; full_name: string }[]; canEdit: boolean; meId: string; today: string }) {
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, change: { id: string; done: boolean }) =>
    state.map((t) => (t.id === change.id ? { ...t, done: change.done } : t)));
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const done = optimistic.filter((t) => t.done).length;

  function toggle(t: TaskRow) {
    setError(null);
    start(async () => {
      setOptimistic({ id: t.id, done: !t.done });
      const r = await toggleTask(t.id, !t.done);
      if (!r.ok) setError(r.error ?? "No se pudo actualizar la tarea.");
    });
  }

  return (
    <div className="space-y-3">
      {optimistic.length > 0 && <Progress value={done} total={optimistic.length} />}
      {done === optimistic.length && optimistic.length > 0 && (
        <Alert tone="azul">Todas las tareas están completadas. Revise el resultado y, si procede, cierre la incidencia manualmente.</Alert>
      )}
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-line rounded-lg border border-line">
        {optimistic.map((t) => {
          const editable = canEdit || t.assignee_id === meId;
          const overdue = !t.done && t.due_on && t.due_on < today;
          return (
            <li key={t.id} className="flex items-start gap-3 px-3 py-2.5">
              <button
                type="button"
                onClick={() => editable && toggle(t)}
                disabled={!editable}
                aria-label={t.done ? `Marcar "${t.title}" como pendiente` : `Completar "${t.title}"`}
                className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  t.done ? "border-[var(--verde-dot)] bg-[var(--verde-dot)] text-white" : "border-line-strong bg-surface hover:border-brand",
                  !editable && "cursor-not-allowed opacity-60")}
              >
                {t.done && <Check size={14} strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cx("text-sm", t.done ? "text-ink-3 line-through" : "text-ink")}>{t.title}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-3">
                  {t.assignee?.short_name && <span className="inline-flex items-center gap-1"><User size={12} />{t.assignee.short_name}</span>}
                  {t.due_on && <span className={cx("inline-flex items-center gap-1", overdue && "font-medium text-[var(--rojo-fg)]")}><CalendarClock size={12} />{overdue ? "Atrasada · " : ""}{fecha(t.due_on)}</span>}
                  {t.done && t.done_at && <span>Completada por {t.done_by_staff?.short_name ?? "—"} el {fechaHora(t.done_at)}</span>}
                  {t.notes && <span className="inline-flex items-center gap-1"><MessageSquare size={12} />{t.notes}</span>}
                </div>
              </div>
              {editable && (
                <Modal trigger="Editar" triggerVariant="ghost" triggerSize="sm" title="Editar tarea" size="sm">
                  {(close) => (
                    <ActionForm action={updateTask.bind(null, t.id)} onSuccess={close} className="space-y-3">
                      <Field label="Tarea" htmlFor={`t-${t.id}`} required><Input id={`t-${t.id}`} name="title" defaultValue={t.title} required /></Field>
                      <Field label="Responsable" htmlFor={`a-${t.id}`}>
                        <Select id={`a-${t.id}`} name="assignee_id" defaultValue={t.assignee_id ?? ""}>
                          <option value="">Sin asignar</option>
                          {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </Select>
                      </Field>
                      <Field label="Fecha límite" htmlFor={`d-${t.id}`}><Input id={`d-${t.id}`} name="due_on" type="date" defaultValue={t.due_on ?? ""} /></Field>
                      <Field label="Comentarios" htmlFor={`n-${t.id}`}><Textarea id={`n-${t.id}`} name="notes" rows={2} defaultValue={t.notes ?? ""} /></Field>
                    </ActionForm>
                  )}
                </Modal>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
