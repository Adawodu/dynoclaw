"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, X } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

interface PlanForm {
  id?: Id<"pricingPlans">;
  slug: string;
  name: string;
  priceAmountCents: number;
  stripePriceId: string;
  description: string;
  features: string[];
  highlighted: boolean;
  sortOrder: number;
  active: boolean;
}

const emptyPlan: PlanForm = {
  slug: "",
  name: "",
  priceAmountCents: 0,
  stripePriceId: "",
  description: "",
  features: [],
  highlighted: false,
  sortOrder: 0,
  active: true,
};

export default function AdminPricingPage() {
  const adminCheck = useQuery(api.admin.isAdmin, {});
  const plans = useQuery(api.pricingPlans.listAll, adminCheck ? {} : "skip");
  const upsertPlan = useMutation(api.pricingPlans.upsert);
  const removePlan = useMutation(api.pricingPlans.remove);

  const [editing, setEditing] = useState<PlanForm | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Id<"pricingPlans"> | null>(
    null
  );

  const openCreate = useCallback(() => {
    setEditing({ ...emptyPlan, sortOrder: (plans?.length ?? 0) + 1 });
  }, [plans]);

  const openEdit = useCallback(
    (plan: (typeof plans extends (infer T)[] | undefined ? T : never)) => {
      if (!plan) return;
      setEditing({
        id: plan._id,
        slug: plan.slug,
        name: plan.name,
        priceAmountCents: plan.priceAmountCents,
        stripePriceId: plan.stripePriceId ?? "",
        description: plan.description,
        features: [...plan.features],
        highlighted: plan.highlighted,
        sortOrder: plan.sortOrder,
        active: plan.active,
      });
    },
    []
  );

  const save = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await upsertPlan({
        id: editing.id,
        slug: editing.slug,
        name: editing.name,
        priceAmountCents: editing.priceAmountCents,
        stripePriceId: editing.stripePriceId || undefined,
        description: editing.description,
        features: editing.features,
        highlighted: editing.highlighted,
        sortOrder: editing.sortOrder,
        active: editing.active,
      });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }, [editing, upsertPlan]);

  const addFeature = useCallback(() => {
    if (!newFeature.trim() || !editing) return;
    setEditing({ ...editing, features: [...editing.features, newFeature.trim()] });
    setNewFeature("");
  }, [newFeature, editing]);

  const removeFeature = useCallback(
    (index: number) => {
      if (!editing) return;
      setEditing({
        ...editing,
        features: editing.features.filter((_, i) => i !== index),
      });
    },
    [editing]
  );

  if (adminCheck === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin: Pricing</h1>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!adminCheck) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin: Pricing</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              You don&apos;t have admin access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin: Pricing Plans</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-3 w-3" />
          Add Plan
        </Button>
      </div>

      {plans === undefined ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No pricing plans configured. Click &quot;Add Plan&quot; to create
              one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card
              key={plan._id}
              className={!plan.active ? "opacity-50" : ""}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {plan.slug}
                  </Badge>
                  {plan.highlighted && (
                    <Badge className="text-xs">Highlighted</Badge>
                  )}
                  {!plan.active && (
                    <Badge variant="outline" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => openEdit(plan)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => setConfirmDelete(plan._id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Price</span>
                    <p className="font-medium">
                      {plan.priceAmountCents === 0
                        ? "Custom"
                        : `$${(plan.priceAmountCents / 100).toFixed(0)}/mo`}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stripe Price ID</span>
                    <p className="font-mono text-xs">
                      {plan.stripePriceId || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sort Order</span>
                    <p>{plan.sortOrder}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Features</span>
                    <p>{plan.features.length} items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit Plan" : "Create Plan"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Name</label>
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    placeholder="e.g. Starter"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Slug</label>
                  <Input
                    value={editing.slug}
                    onChange={(e) =>
                      setEditing({ ...editing, slug: e.target.value })
                    }
                    placeholder="e.g. starter"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    Price (cents)
                  </label>
                  <Input
                    type="number"
                    value={editing.priceAmountCents}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        priceAmountCents: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="4900"
                  />
                  <p className="text-xs text-muted-foreground">
                    ${(editing.priceAmountCents / 100).toFixed(2)}/mo
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    Stripe Price ID
                  </label>
                  <Input
                    value={editing.stripePriceId}
                    onChange={(e) =>
                      setEditing({ ...editing, stripePriceId: e.target.value })
                    }
                    placeholder="price_..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">
                  Description
                </label>
                <Input
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  placeholder="For individuals getting started..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    value={editing.sortOrder}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={editing.highlighted}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, highlighted: v })
                      }
                    />
                    Highlighted
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={editing.active}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, active: v })
                      }
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Features
                </label>
                {editing.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="flex-1 rounded border px-2 py-1 text-sm">
                      {f}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => removeFeature(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-1">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add feature..."
                    onKeyDown={(e) => e.key === "Enter" && addFeature()}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addFeature}
                    disabled={!newFeature.trim()}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure? This will permanently remove this pricing plan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirmDelete) {
                  await removePlan({ id: confirmDelete });
                  setConfirmDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
