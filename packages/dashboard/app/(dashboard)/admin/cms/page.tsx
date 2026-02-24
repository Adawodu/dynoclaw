"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, Sprout } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

// ── Page form ────────────────────────────────────────────────────────

interface PageForm {
  id?: Id<"cmsPages">;
  slug: string;
  title: string;
  body: string;
  published: boolean;
  sortOrder: number;
}

const emptyPage: PageForm = {
  slug: "",
  title: "",
  body: "",
  published: false,
  sortOrder: 0,
};

// ── Nav link form ────────────────────────────────────────────────────

interface LinkForm {
  id?: Id<"navLinks">;
  label: string;
  href: string;
  section: string;
  placement: string[];
  sortOrder: number;
  visible: boolean;
  isExternal: boolean;
}

const emptyLink: LinkForm = {
  label: "",
  href: "",
  section: "product",
  placement: ["footer"],
  sortOrder: 0,
  visible: true,
  isExternal: false,
};

const SECTIONS = ["product", "company", "legal", "connect"] as const;

// ── Component ────────────────────────────────────────────────────────

export default function AdminCmsPage() {
  const adminCheck = useQuery(api.admin.isAdmin, {});
  const pages = useQuery(api.cmsPages.listAll, adminCheck ? {} : "skip");
  const links = useQuery(api.navLinks.listAll, adminCheck ? {} : "skip");

  const upsertPage = useMutation(api.cmsPages.upsert);
  const removePage = useMutation(api.cmsPages.remove);
  const upsertLink = useMutation(api.navLinks.upsert);
  const removeLink = useMutation(api.navLinks.remove);
  const seedLinks = useMutation(api.navLinks.seed);

  // Page state
  const [editingPage, setEditingPage] = useState<PageForm | null>(null);
  const [confirmDeletePage, setConfirmDeletePage] =
    useState<Id<"cmsPages"> | null>(null);

  // Link state
  const [editingLink, setEditingLink] = useState<LinkForm | null>(null);
  const [confirmDeleteLink, setConfirmDeleteLink] =
    useState<Id<"navLinks"> | null>(null);

  const [saving, setSaving] = useState(false);

  // ── Page handlers ──────────────────────────────────────────────────

  const openCreatePage = useCallback(() => {
    setEditingPage({ ...emptyPage, sortOrder: (pages?.length ?? 0) + 1 });
  }, [pages]);

  const openEditPage = useCallback(
    (page: NonNullable<typeof pages>[number]) => {
      setEditingPage({
        id: page._id,
        slug: page.slug,
        title: page.title,
        body: page.body,
        published: page.published,
        sortOrder: page.sortOrder,
      });
    },
    []
  );

  const savePage = useCallback(async () => {
    if (!editingPage) return;
    setSaving(true);
    try {
      await upsertPage({
        id: editingPage.id,
        slug: editingPage.slug,
        title: editingPage.title,
        body: editingPage.body,
        published: editingPage.published,
        sortOrder: editingPage.sortOrder,
      });
      setEditingPage(null);
    } finally {
      setSaving(false);
    }
  }, [editingPage, upsertPage]);

  // ── Link handlers ──────────────────────────────────────────────────

  const openCreateLink = useCallback(() => {
    setEditingLink({ ...emptyLink, sortOrder: (links?.length ?? 0) + 1 });
  }, [links]);

  const openEditLink = useCallback(
    (link: NonNullable<typeof links>[number]) => {
      setEditingLink({
        id: link._id,
        label: link.label,
        href: link.href,
        section: link.section,
        placement: [...link.placement],
        sortOrder: link.sortOrder,
        visible: link.visible,
        isExternal: link.isExternal,
      });
    },
    []
  );

  const saveLink = useCallback(async () => {
    if (!editingLink) return;
    setSaving(true);
    try {
      await upsertLink({
        id: editingLink.id,
        label: editingLink.label,
        href: editingLink.href,
        section: editingLink.section,
        placement: editingLink.placement,
        sortOrder: editingLink.sortOrder,
        visible: editingLink.visible,
        isExternal: editingLink.isExternal,
      });
      setEditingLink(null);
    } finally {
      setSaving(false);
    }
  }, [editingLink, upsertLink]);

  const togglePlacement = useCallback(
    (value: string) => {
      if (!editingLink) return;
      const has = editingLink.placement.includes(value);
      setEditingLink({
        ...editingLink,
        placement: has
          ? editingLink.placement.filter((p) => p !== value)
          : [...editingLink.placement, value],
      });
    },
    [editingLink]
  );

  // ── Guards ─────────────────────────────────────────────────────────

  if (adminCheck === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin: CMS</h1>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!adminCheck) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin: CMS</h1>
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

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin: CMS</h1>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="links">Nav Links</TabsTrigger>
        </TabsList>

        {/* ── Pages tab ───────────────────────────────────────────── */}
        <TabsContent value="pages" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreatePage}>
              <Plus className="mr-1 h-3 w-3" />
              Add Page
            </Button>
          </div>

          {pages === undefined ? (
            <Skeleton className="h-32" />
          ) : pages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No pages yet. Click &quot;Add Page&quot; to create one.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pages.map((page) => (
                <Card key={page._id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">
                        {page.title}
                      </CardTitle>
                      <Badge variant="secondary" className="font-mono text-xs">
                        /{page.slug}
                      </Badge>
                      {page.published ? (
                        <Badge className="text-xs">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditPage(page)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => setConfirmDeletePage(page._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Nav Links tab ───────────────────────────────────────── */}
        <TabsContent value="links" className="space-y-4">
          <div className="flex justify-end gap-2">
            {links !== undefined && links.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await seedLinks({});
                }}
              >
                <Sprout className="mr-1 h-3 w-3" />
                Seed Default Links
              </Button>
            )}
            <Button size="sm" onClick={openCreateLink}>
              <Plus className="mr-1 h-3 w-3" />
              Add Link
            </Button>
          </div>

          {links === undefined ? (
            <Skeleton className="h-32" />
          ) : links.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No nav links yet. Seed defaults or add manually.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {SECTIONS.map((section) => {
                const sectionLinks = links.filter(
                  (l) => l.section === section
                );
                if (sectionLinks.length === 0) return null;
                return (
                  <div key={section}>
                    <h3 className="mb-2 text-sm font-semibold capitalize">
                      {section}
                    </h3>
                    <div className="space-y-2">
                      {sectionLinks.map((link) => (
                        <Card
                          key={link._id}
                          className={!link.visible ? "opacity-50" : ""}
                        >
                          <CardHeader className="flex flex-row items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {link.label}
                              </span>
                              <Badge
                                variant="secondary"
                                className="font-mono text-xs"
                              >
                                {link.href}
                              </Badge>
                              {link.placement.map((p) => (
                                <Badge
                                  key={p}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {p}
                                </Badge>
                              ))}
                              {link.isExternal && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  external
                                </Badge>
                              )}
                              {!link.visible && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  hidden
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditLink(link)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => setConfirmDeleteLink(link._id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Page Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={editingPage !== null}
        onOpenChange={(open) => !open && setEditingPage(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPage?.id ? "Edit Page" : "Create Page"}
            </DialogTitle>
          </DialogHeader>
          {editingPage && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Title</label>
                  <Input
                    value={editingPage.title}
                    onChange={(e) =>
                      setEditingPage({ ...editingPage, title: e.target.value })
                    }
                    placeholder="Privacy Policy"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Slug</label>
                  <Input
                    value={editingPage.slug}
                    onChange={(e) =>
                      setEditingPage({ ...editingPage, slug: e.target.value })
                    }
                    placeholder="privacy"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">
                  Body (Markdown)
                </label>
                <Textarea
                  value={editingPage.body}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, body: e.target.value })
                  }
                  placeholder="# Privacy Policy&#10;&#10;Your privacy matters..."
                  rows={12}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    value={editingPage.sortOrder}
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch
                    checked={editingPage.published}
                    onCheckedChange={(v) =>
                      setEditingPage({ ...editingPage, published: v })
                    }
                  />
                  <label className="text-sm">Published</label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPage(null)}>
              Cancel
            </Button>
            <Button onClick={savePage} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Link Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={editingLink !== null}
        onOpenChange={(open) => !open && setEditingLink(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLink?.id ? "Edit Link" : "Create Link"}
            </DialogTitle>
          </DialogHeader>
          {editingLink && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Label</label>
                  <Input
                    value={editingLink.label}
                    onChange={(e) =>
                      setEditingLink({ ...editingLink, label: e.target.value })
                    }
                    placeholder="About"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">URL</label>
                  <Input
                    value={editingLink.href}
                    onChange={(e) =>
                      setEditingLink({ ...editingLink, href: e.target.value })
                    }
                    placeholder="/about or https://..."
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    Section
                  </label>
                  <Select
                    value={editingLink.section}
                    onValueChange={(v) =>
                      setEditingLink({ ...editingLink, section: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    value={editingLink.sortOrder}
                    onChange={(e) =>
                      setEditingLink({
                        ...editingLink,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Placement
                </label>
                <div className="flex gap-4">
                  {["footer", "nav"].map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editingLink.placement.includes(p)}
                        onChange={() => togglePlacement(p)}
                        className="rounded border-input"
                      />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editingLink.visible}
                    onCheckedChange={(v) =>
                      setEditingLink({ ...editingLink, visible: v })
                    }
                  />
                  Visible
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editingLink.isExternal}
                    onCheckedChange={(v) =>
                      setEditingLink({ ...editingLink, isExternal: v })
                    }
                  />
                  External
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLink(null)}>
              Cancel
            </Button>
            <Button onClick={saveLink} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Page Confirmation ──────────────────────────────── */}
      <Dialog
        open={confirmDeletePage !== null}
        onOpenChange={(open) => !open && setConfirmDeletePage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure? This will permanently remove this page.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeletePage(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirmDeletePage) {
                  await removePage({ id: confirmDeletePage });
                  setConfirmDeletePage(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Link Confirmation ──────────────────────────────── */}
      <Dialog
        open={confirmDeleteLink !== null}
        onOpenChange={(open) => !open && setConfirmDeleteLink(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Link</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure? This will permanently remove this nav link.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteLink(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirmDeleteLink) {
                  await removeLink({ id: confirmDeleteLink });
                  setConfirmDeleteLink(null);
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
