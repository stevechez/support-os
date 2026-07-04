"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  CONDITION_FIELDS,
  STEP_TYPES,
  TRIGGER_EVENTS,
  defaultStep,
  type Condition,
  type Step,
  type StepType,
  type Trigger,
} from "@/lib/automations/types";
import { PRIORITIES, STATUSES } from "@/lib/ticket-ui";
import { saveAutomation } from "../actions";

type Draft = {
  name: string;
  enabled: boolean;
  trigger: Trigger;
  steps: Step[];
};

export function Builder({
  initial,
  automationId,
  members,
}: {
  initial: Draft;
  automationId?: string;
  members: { id: string; display_name: string | null }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateTrigger(patch: Partial<Trigger>) {
    setDraft((d) => ({ ...d, trigger: { ...d.trigger, ...patch } }));
  }

  function updateCondition(index: number, patch: Partial<Condition>) {
    setDraft((d) => {
      const conditions = d.trigger.conditions.map((c, i) =>
        i === index ? { ...c, ...patch } : c
      );
      return { ...d, trigger: { ...d.trigger, conditions } };
    });
  }

  function updateStep(index: number, step: Step) {
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s, i) => (i === index ? step : s)),
    }));
  }

  function moveStep(index: number, delta: -1 | 1) {
    setDraft((d) => {
      const steps = [...d.steps];
      const target = index + delta;
      if (target < 0 || target >= steps.length) return d;
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...d, steps };
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveAutomation({
        id: automationId,
        ...draft,
        trigger: {
          ...draft.trigger,
          conditions: draft.trigger.conditions.filter((c) => c.value.trim()),
        },
      });
      if (res.error) {
        setError(res.error);
      } else {
        router.push("/automations");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <Link
        href="/automations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Automations
      </Link>

      <div className="flex items-end justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={draft.name}
            onChange={(e) =>
              setDraft((d) => ({ ...d, name: e.target.value }))
            }
            placeholder="Refund request review"
          />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) =>
              setDraft((d) => ({ ...d, enabled: e.target.checked }))
            }
            className="size-4 accent-primary"
          />
          Enabled
        </label>
      </div>

      {/* Trigger */}
      <div>
        <Card className="border-primary/20">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4" /> When
            </div>
            <NativeSelect
              value={draft.trigger.event}
              onChange={(e) =>
                updateTrigger({
                  event: e.target.value as Trigger["event"],
                })
              }
            >
              {TRIGGER_EVENTS.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.label}
                </option>
              ))}
            </NativeSelect>

            {draft.trigger.conditions.map((condition, i) => (
              <div key={i} className="flex items-center gap-2">
                <NativeSelect
                  className="w-44 shrink-0"
                  value={condition.field}
                  onChange={(e) =>
                    updateCondition(i, {
                      field: e.target.value as Condition["field"],
                      value: "",
                    })
                  }
                >
                  {CONDITION_FIELDS.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </NativeSelect>

                {condition.field === "priority_is" ? (
                  <NativeSelect
                    className="flex-1"
                    value={condition.value}
                    onChange={(e) =>
                      updateCondition(i, { value: e.target.value })
                    }
                  >
                    <option value="">Choose…</option>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </NativeSelect>
                ) : condition.field === "sentiment_is" ? (
                  <NativeSelect
                    className="flex-1"
                    value={condition.value}
                    onChange={(e) =>
                      updateCondition(i, { value: e.target.value })
                    }
                  >
                    <option value="">Choose…</option>
                    <option value="positive">positive</option>
                    <option value="neutral">neutral</option>
                    <option value="negative">negative</option>
                  </NativeSelect>
                ) : (
                  <Input
                    className="flex-1"
                    value={condition.value}
                    onChange={(e) =>
                      updateCondition(i, { value: e.target.value })
                    }
                    placeholder={
                      condition.field === "subject_contains"
                        ? "refund"
                        : "billing"
                    }
                  />
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    updateTrigger({
                      conditions: draft.trigger.conditions.filter(
                        (_, j) => j !== i
                      ),
                    })
                  }
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() =>
                updateTrigger({
                  conditions: [
                    ...draft.trigger.conditions,
                    { field: "subject_contains", value: "" },
                  ],
                })
              }
            >
              <Plus className="size-3.5" /> Add condition
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Steps */}
      {draft.steps.map((step, i) => (
        <div key={i}>
          <div className="flex justify-center py-1">
            <ArrowDown className="size-4 text-muted-foreground/50" />
          </div>
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {STEP_TYPES.find((t) => t.id === step.type)?.needsAi && (
                    <Sparkles className="size-4" />
                  )}
                  Step {i + 1}
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={i === 0}
                    onClick={() => moveStep(i, -1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={i === draft.steps.length - 1}
                    onClick={() => moveStep(i, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        steps: d.steps.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <NativeSelect
                value={step.type}
                onChange={(e) =>
                  updateStep(i, defaultStep(e.target.value as StepType))
                }
              >
                {STEP_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                {STEP_TYPES.find((t) => t.id === step.type)?.description}
              </p>

              {step.type === "set_priority" && (
                <NativeSelect
                  value={step.priority}
                  onChange={(e) =>
                    updateStep(i, {
                      type: "set_priority",
                      priority: e.target.value as typeof step.priority,
                    })
                  }
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </NativeSelect>
              )}

              {step.type === "set_status" && (
                <NativeSelect
                  value={step.status}
                  onChange={(e) =>
                    updateStep(i, {
                      type: "set_status",
                      status: e.target.value as typeof step.status,
                    })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </NativeSelect>
              )}

              {step.type === "add_tag" && (
                <Input
                  value={step.tag}
                  onChange={(e) =>
                    updateStep(i, { type: "add_tag", tag: e.target.value })
                  }
                  placeholder="billing"
                />
              )}

              {step.type === "assign" && (
                <NativeSelect
                  value={step.memberId}
                  onChange={(e) =>
                    updateStep(i, {
                      type: "assign",
                      memberId: e.target.value,
                    })
                  }
                >
                  <option value="">Choose member…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name ?? "Member"}
                    </option>
                  ))}
                </NativeSelect>
              )}

              {(step.type === "notify" || step.type === "slack_notify") && (
                <Input
                  value={step.message}
                  onChange={(e) =>
                    updateStep(i, {
                      type: step.type,
                      message: e.target.value,
                    })
                  }
                  placeholder={
                    step.type === "slack_notify"
                      ? "🚨 Urgent ticket needs attention"
                      : "Needs human review"
                  }
                />
              )}

              {step.type === "ai_auto_reply" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={step.resolve ?? false}
                    onChange={(e) =>
                      updateStep(i, {
                        type: "ai_auto_reply",
                        resolve: e.target.checked,
                      })
                    }
                    className="size-4 accent-primary"
                  />
                  Mark ticket resolved after replying
                </label>
              )}
            </CardContent>
          </Card>
        </div>
      ))}

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              steps: [...d.steps, defaultStep("ai_classify")],
            }))
          }
        >
          <Plus className="size-4" /> Add step
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-6">
        <Button variant="ghost" asChild>
          <Link href="/automations">Cancel</Link>
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Saving…" : "Save automation"}
        </Button>
      </div>
    </div>
  );
}
