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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, X, Package } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

type BillingType = "subscription" | "one_time" | "subscription_plus_setup";

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  subscription: "Subscription",
  one_time: "One-Time",
  subscription_plus_setup: "Subscription + Setup",
};

const BILLING_TYPE_COLORS: Record<BillingType, string> = {
  subscription: "bg-blue-500/20 text-blue-400",
  one_time: "bg-green-500/20 text-green-400",
  subscription_plus_setup: "bg-purple-500/20 text-purple-400",
};

interface PlanForm {
  id?: Id<"pricingPlans">;
  slug: string;
  name: string;
  billingType: BillingType;
  priceAmountCents: number;
  setupFeeCents: number;
  stripePriceId: string;
  stripeSetupPriceId: string;
  description: string;
  features: string[];
  deliverables: string[];
  ctaText: string;
  highlighted: boolean;
  sortOrder: number;
  active: boolean;
}

const emptyPlan: PlanForm = {
  slug: "",
  name: "",
  billingType: "subscription",
  priceAmountCents: 0,
  setupFeeCents: 0,
  stripePriceId: "",
  stripeSetupPriceId: "",
  description: "",
  features: [],
  deliverables: [],
  ctaText: "",
  highlighted: false,
  sortOrder: 0,
  active: true,
};

export default function AdminPricingPage() {
  const adminCheck = useQuery(api.admin.isAdmin, {});
  const plans = useQuery(api.pricingPlans.listAll, adminCheck ? {} : "skip");
  const serviceOrders = useQuery(api.serviceOrders.listAll, adminCheck ? {} : "skip");
  const upsertPlan = useMutation(api.pricingPlans.upsert);
  const removePlan = useMutation(api.pricingPlans.remove);
  const updateOrderStatus = useMutation(api.serviceOrders.updateStatus);

  const [editing, setEditing] = useState<PlanForm | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const [newDeliverable, setNewDeliverable] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Id<"pricingPlans"> | null>(null);
  const [showOrders, setShowOrders] = useState(false);

  const openCreate = useCallback(() => {
    setEditing({ ...emptyPlan, sortOrder: (plans?.length ?? 0) + 1 });
  }, [plans]);

  const openEdit = useCallback(
    (plan: NonNullable<typeof plans>[number]) => {
      setEditing({
        id: plan._id,
        slug: plan.slug,
        name: plan.name,
        billingType: (plan.billingType ?? "subscription") as BillingType,
        priceAmountCents: plan.priceAmountCents,
        setupFeeCents: plan.setupFeeCents ?? 0,
        stripePriceId: plan.stripePriceId ?? "",
        stripeSetupPriceId: plan.stripeSetupPriceId ?? "",
        description: plan.description,
        features: [...plan.features],
        deliverables: [...(plan.deliverables ?? [])],
        ctaText: plan.ctaText ?? "",
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
        billingType: editing.billingType,
        priceAmountCents: editing.priceAmountCents,
        setupFeeCents: editing.setupFeeCents || undefined,
        stripePriceId: editing.stripePriceId || undefined,
        stripeSetupPriceId: editing.stripeSetupPriceId || undefined,
        description: editing.description,
        features: editing.features,
        deliverables: editing.deliverables.length > 0 ? editing.deliverables : undefined,
        ctaText: editing.ctaText || undefined,
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
      setEditing({ ...editing, features: editing.features.filter((_, i) => i !== index) });
    },
    [editing]
  );

  const addDeliverable = useCallback(() => {
    if (!newDeliverable.trim() || !editing) return;
    setEditing({ ...editing, deliverables: [...editing.deliverables, newDeliverable.trim()] });
    setNewDeliverable("");
  }, [newDeliverable, editing]);

  const removeDeliverable = useCallback(
    (index: number) => {
      if (!editing) return;
      setEditing({ ...editing, deliverables: editing.deliverables.filter((_, i) => i !== index) });
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

  function formatPrice(cents: number): string {
    if (cents === 0) return "Custom";
    return `$${(cents / 100).toFixed(0)}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin: Pricing Plans</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowOrders(!showOrders)}>
            <Package className="mr-1 h-3 w-3" />
            Service Orders ({serviceOrders?.length ?? 0})
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-3 w-3" />
            Add Plan
          </Button>
        </div>
      </div>

      {/* Service Orders */}
      {showOrders && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {(serviceOrders?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No service orders yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Plan</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceOrders?.map((order) => (
                    <tr key={order._id} className="border-b border-border/50">
                      <td className="py-2 font-mono text-xs">{order.planSlug}</td>
                      <td className="py-2">{formatPrice(order.amountCents)}</td>
                      <td className="py-2">
                        <Badge
                          className={
                            order.status === "delivered"
                              ? "bg-green-500/20 text-green-400"
                              : order.status === "in_progress"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-blue-500/20 text-blue-400"
                          }
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-right">
                        <Select
                          value={order.status}
                          onValueChange={(v) =>
                            updateOrderStatus({
                              id: order._id,
                              status: v as "paid" | "in_progress" | "delivered",
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans list */}
      {plans === undefined ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No pricing plans configured. Click &quot;Add Plan&quot; to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan._id} className={!plan.active ? "opacity-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs">{plan.slug}</Badge>
                  <Badge className={`text-[10px] ${BILLING_TYPE_COLORS[(plan.billingType ?? "subscription") as BillingType]}`}>
                    {BILLING_TYPE_LABELS[(plan.billingType ?? "subscription") as BillingType]}
                  </Badge>
                  {plan.highlighted && <Badge className="text-xs">Highlighted</Badge>}
                  {!plan.active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(plan)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setConfirmDelete(plan._id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-5 text-sm">
                  <div>
                    <span className="text-muted-foreground">Price</span>
                    <p className="font-medium">
                      {plan.priceAmountCents === 0 ? "Custom" : `$${(plan.priceAmountCents / 100).toFixed(0)}${(plan.billingType ?? "subscription") !== "one_time" ? "/mo" : ""}`}
                    </p>
                  </div>
                  {plan.setupFeeCents ? (
                    <div>
                      <span className="text-muted-foreground">Setup Fee</span>
                      <p className="font-medium">${(plan.setupFeeCents / 100).toFixed(0)}</p>
                    </div>
                  ) : null}
                  <div>
                    <span className="text-muted-foreground">Stripe Price ID</span>
                    <p className="font-mono text-xs">{plan.stripePriceId || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Features</span>
                    <p>{plan.features.length} items</p>
                  </div>
                  {plan.deliverables && plan.deliverables.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Deliverables</span>
                      <p>{plan.deliverables.length} items</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Name</label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Launchpad" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Slug</label>
                  <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="e.g. launchpad" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Billing Type</label>
                <Select value={editing.billingType} onValueChange={(v) => setEditing({ ...editing, billingType: v as BillingType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription (recurring)</SelectItem>
                    <SelectItem value="one_time">One-Time Payment</SelectItem>
                    <SelectItem value="subscription_plus_setup">Subscription + Setup Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    {editing.billingType === "one_time" ? "Price (cents)" : "Monthly Price (cents)"}
                  </label>
                  <Input
                    type="number"
                    value={editing.priceAmountCents}
                    onChange={(e) => setEditing({ ...editing, priceAmountCents: parseInt(e.target.value) || 0 })}
                    placeholder="4900"
                  />
                  <p className="text-xs text-muted-foreground">
                    ${(editing.priceAmountCents / 100).toFixed(2)}{editing.billingType !== "one_time" ? "/mo" : " one-time"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Stripe Price ID</label>
                  <Input value={editing.stripePriceId} onChange={(e) => setEditing({ ...editing, stripePriceId: e.target.value })} placeholder="price_..." />
                </div>
              </div>

              {(editing.billingType === "one_time" || editing.billingType === "subscription_plus_setup") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Setup Fee (cents)</label>
                    <Input
                      type="number"
                      value={editing.setupFeeCents}
                      onChange={(e) => setEditing({ ...editing, setupFeeCents: parseInt(e.target.value) || 0 })}
                      placeholder="29900"
                    />
                    <p className="text-xs text-muted-foreground">${(editing.setupFeeCents / 100).toFixed(2)} one-time</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Stripe Setup Price ID</label>
                    <Input value={editing.stripeSetupPriceId} onChange={(e) => setEditing({ ...editing, stripeSetupPriceId: e.target.value })} placeholder="price_..." />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Description</label>
                <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="For small businesses that want..." />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">CTA Button Text</label>
                <Input value={editing.ctaText} onChange={(e) => setEditing({ ...editing, ctaText: e.target.value })} placeholder="Leave empty for default (Start Free Trial / Get Started)" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Sort Order</label>
                  <Input type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={editing.highlighted} onCheckedChange={(v) => setEditing({ ...editing, highlighted: v })} />
                    Highlighted
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                    Active
                  </label>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Features (shown on pricing card)</label>
                {editing.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="flex-1 rounded border px-2 py-1 text-sm">{f}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeFeature(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-1">
                  <Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Add feature..." onKeyDown={(e) => e.key === "Enter" && addFeature()} />
                  <Button variant="outline" size="sm" onClick={addFeature} disabled={!newFeature.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Deliverables (for service plans) */}
              {editing.billingType !== "subscription" && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Deliverables (fulfillment checklist)</label>
                  {editing.deliverables.map((d, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="flex-1 rounded border px-2 py-1 text-sm">{d}</span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeDeliverable(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-1">
                    <Input value={newDeliverable} onChange={(e) => setNewDeliverable(e.target.value)} placeholder="Add deliverable..." onKeyDown={(e) => e.key === "Enter" && addDeliverable()} />
                    <Button variant="outline" size="sm" onClick={addDeliverable} disabled={!newDeliverable.trim()}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure? This will permanently remove this pricing plan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
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
