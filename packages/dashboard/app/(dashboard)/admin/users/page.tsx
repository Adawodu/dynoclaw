"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

interface UserRecord {
  _id: Id<"users">;
  clerkId: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role: string;
  status: string;
  lastSeenAt: number;
  createdAt: number;
  deploymentCount: number;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
}

export default function AdminUsersPage() {
  const adminCheck = useQuery(api.admin.isAdmin, {});
  const users = useQuery(api.users.listAll, adminCheck ? {} : "skip") as
    | UserRecord[]
    | undefined;
  const setRole = useMutation(api.users.setRole);
  const setStatus = useMutation(api.users.setStatus);

  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<UserRecord | null>(null);
  const [confirmRole, setConfirmRole] = useState<{
    user: UserRecord;
    newRole: "user" | "admin";
  } | null>(null);
  const [saving, setSaving] = useState(false);

  if (adminCheck === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin: Users</h1>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!adminCheck) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin: Users</h1>
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

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function relativeTime(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin: Users</h1>
        {users && (
          <Badge variant="secondary">{users.length} users</Badge>
        )}
      </div>

      {users === undefined ? (
        <div className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No users yet. Users will appear here after they sign in.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card
              key={user._id}
              className={user.status === "suspended" ? "opacity-50" : ""}
            >
              <CardContent className="flex items-center gap-4 py-4">
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {(user.name ?? user.email)?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {user.name ?? "—"}
                    </span>
                    {user.role === "admin" && (
                      <Badge className="text-xs">Admin</Badge>
                    )}
                    {user.status === "suspended" && (
                      <Badge variant="destructive" className="text-xs">
                        Suspended
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>

                <div className="hidden gap-6 text-sm sm:flex">
                  <div className="text-center">
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium">
                      {user.subscriptionPlan ?? "—"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Deploys</p>
                    <p className="font-medium">{user.deploymentCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Last seen</p>
                    <p className="font-medium">{relativeTime(user.lastSeenAt)}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(user)}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Manage User Dialog */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                {editing.imageUrl ? (
                  <img
                    src={editing.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-medium">
                    {(editing.name ?? editing.email)?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <p className="font-medium">{editing.name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {editing.email}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{formatDate(editing.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last seen</span>
                  <span>{relativeTime(editing.lastSeenAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subscription</span>
                  <span>
                    {editing.subscriptionPlan ?? "None"}{" "}
                    {editing.subscriptionStatus && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {editing.subscriptionStatus}
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deployments</span>
                  <span>{editing.deploymentCount}</span>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Admin role</p>
                    <p className="text-xs text-muted-foreground">
                      Grants access to admin pages
                    </p>
                  </div>
                  <Switch
                    checked={editing.role === "admin"}
                    onCheckedChange={(checked) => {
                      const newRole = checked ? "admin" : "user";
                      setConfirmRole({ user: editing, newRole });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Account status</p>
                    <p className="text-xs text-muted-foreground">
                      {editing.status === "active"
                        ? "User can access the platform"
                        : "User is blocked from all actions"}
                    </p>
                  </div>
                  <Button
                    variant={
                      editing.status === "active" ? "destructive" : "default"
                    }
                    size="sm"
                    onClick={() => setConfirmSuspend(editing)}
                  >
                    {editing.status === "active" ? "Suspend" : "Unsuspend"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Role Change */}
      <Dialog
        open={confirmRole !== null}
        onOpenChange={(open) => !open && setConfirmRole(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmRole?.newRole === "admin"
              ? `Grant admin access to ${confirmRole?.user.name ?? confirmRole?.user.email}?`
              : `Remove admin access from ${confirmRole?.user.name ?? confirmRole?.user.email}?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRole(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                if (!confirmRole) return;
                setSaving(true);
                try {
                  await setRole({
                    userId: confirmRole.user._id,
                    role: confirmRole.newRole,
                  });
                  setEditing((prev) =>
                    prev?._id === confirmRole.user._id
                      ? { ...prev, role: confirmRole.newRole }
                      : prev
                  );
                  setConfirmRole(null);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Suspend/Unsuspend */}
      <Dialog
        open={confirmSuspend !== null}
        onOpenChange={(open) => !open && setConfirmSuspend(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmSuspend?.status === "active"
                ? "Suspend User"
                : "Unsuspend User"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmSuspend?.status === "active"
              ? `Suspend ${confirmSuspend?.name ?? confirmSuspend?.email}? They will be blocked from all actions.`
              : `Unsuspend ${confirmSuspend?.name ?? confirmSuspend?.email}? They will regain access.`}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmSuspend(null)}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmSuspend?.status === "active" ? "destructive" : "default"
              }
              disabled={saving}
              onClick={async () => {
                if (!confirmSuspend) return;
                const newStatus =
                  confirmSuspend.status === "active" ? "suspended" : "active";
                setSaving(true);
                try {
                  await setStatus({
                    userId: confirmSuspend._id,
                    status: newStatus as "active" | "suspended",
                  });
                  setEditing((prev) =>
                    prev?._id === confirmSuspend._id
                      ? { ...prev, status: newStatus }
                      : prev
                  );
                  setConfirmSuspend(null);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving
                ? "Saving..."
                : confirmSuspend?.status === "active"
                  ? "Suspend"
                  : "Unsuspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
