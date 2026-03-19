"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  ExternalLink,
  Users,
  Monitor,
  Eye,
} from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

const WEBINAR_ID = "catalyst-mar-2026";

type SlideType = "cover" | "content" | "section" | "interactive" | "demo" | "cta";

const TYPE_COLORS: Record<SlideType, string> = {
  cover: "bg-purple-500/20 text-purple-400",
  section: "bg-green-500/20 text-green-400",
  content: "bg-blue-500/20 text-blue-400",
  interactive: "bg-amber-500/20 text-amber-400",
  demo: "bg-red-500/20 text-red-400",
  cta: "bg-pink-500/20 text-pink-400",
};

export default function WebinarAdminPage() {
  const slides = useQuery(api.webinarSlides.listByWebinar, { webinarId: WEBINAR_ID });
  const leads = useQuery(api.webinarLeads.listByWebinar, { webinarId: WEBINAR_ID });
  const updateSlide = useMutation(api.webinarSlides.update);
  const removeSlide = useMutation(api.webinarSlides.remove);
  const createSlide = useMutation(api.webinarSlides.create);

  const [editingId, setEditingId] = useState<Id<"webinarSlides"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editSpeakerNotes, setEditSpeakerNotes] = useState("");
  const [editHighlight, setEditHighlight] = useState("");
  const [editBullets, setEditBullets] = useState("");
  const [editDemoSteps, setEditDemoSteps] = useState("");
  const [editDemoNote, setEditDemoNote] = useState("");
  const [editType, setEditType] = useState<SlideType>("content");
  const [editShowInPublic, setEditShowInPublic] = useState(true);
  const [editShowDynoclawCta, setEditShowDynoclawCta] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<SlideType>("content");

  const [showLeads, setShowLeads] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"webinarSlides"> | null>(null);

  const startEdit = useCallback((slide: NonNullable<typeof slides>[number]) => {
    setEditingId(slide._id);
    setEditTitle(slide.title);
    setEditSubtitle(slide.subtitle ?? "");
    setEditSpeakerNotes(slide.speakerNotes ?? "");
    setEditHighlight(slide.highlightBox ?? "");
    setEditBullets(slide.bullets?.join("\n") ?? "");
    setEditDemoSteps(slide.demoSteps?.join("\n") ?? "");
    setEditDemoNote(slide.demoSpeakerNote ?? "");
    setEditType(slide.type as SlideType);
    setEditShowInPublic(slide.showInPublic);
    setEditShowDynoclawCta(slide.showDynoclawCta);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateSlide({
        id: editingId,
        title: editTitle,
        subtitle: editSubtitle || undefined,
        speakerNotes: editSpeakerNotes || undefined,
        highlightBox: editHighlight || undefined,
        bullets: editBullets.trim() ? editBullets.split("\n").filter(Boolean) : undefined,
        demoSteps: editDemoSteps.trim() ? editDemoSteps.split("\n").filter(Boolean) : undefined,
        demoSpeakerNote: editDemoNote || undefined,
        type: editType,
        showInPublic: editShowInPublic,
        showDynoclawCta: editShowDynoclawCta,
      });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }, [editingId, editTitle, editSubtitle, editSpeakerNotes, editHighlight, editBullets, editDemoSteps, editDemoNote, editType, editShowInPublic, editShowDynoclawCta, updateSlide]);

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    const maxOrder = slides?.reduce((max, s) => Math.max(max, s.order), 0) ?? 0;
    await createSlide({
      webinarId: WEBINAR_ID,
      order: maxOrder + 1,
      type: newType,
      title: newTitle.trim(),
      showInPublic: true,
      showDynoclawCta: false,
    });
    setAddDialogOpen(false);
    setNewTitle("");
    setNewType("content");
  }, [newTitle, newType, slides, createSlide]);

  const handleDelete = useCallback(async (id: Id<"webinarSlides">) => {
    await removeSlide({ id });
    setDeleteConfirm(null);
  }, [removeSlide]);

  if (slides === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Webinar Manager</h1>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Webinar Manager</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLeads(!showLeads)}>
            <Users className="mr-1 h-3 w-3" />
            Leads ({leads?.length ?? 0})
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/webinar/present", "_blank")}>
            <Monitor className="mr-1 h-3 w-3" />
            Present
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/webinar/console", "_blank")}>
            <Eye className="mr-1 h-3 w-3" />
            Console
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/webinar/slides", "_blank")}>
            <ExternalLink className="mr-1 h-3 w-3" />
            Public Link
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Add Slide
          </Button>
        </div>
      </div>

      {/* Leads panel */}
      {showLeads && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Captured Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {(leads?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No leads captured yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Business</th>
                    <th className="pb-2 font-medium">Challenge</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads?.map((lead) => (
                    <tr key={lead._id} className="border-b border-border/50">
                      <td className="py-2">{lead.name}</td>
                      <td className="py-2 font-mono text-xs">{lead.email}</td>
                      <td className="py-2">{lead.businessType ?? "—"}</td>
                      <td className="py-2">{lead.biggestChallenge ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Slides list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Slides ({slides.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {slides.map((slide) => (
            <div
              key={slide._id}
              className="flex items-center gap-3 rounded-md border px-3 py-2 hover:bg-muted/50 group"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground w-6 text-right shrink-0">{slide.order}</span>
              <Badge className={`text-[10px] shrink-0 ${TYPE_COLORS[slide.type as SlideType] ?? "bg-gray-500/20 text-gray-400"}`}>
                {slide.type}
              </Badge>
              <span className="text-sm font-medium flex-1 truncate">{slide.title}</span>
              <div className="flex items-center gap-1 shrink-0">
                {!slide.showInPublic && (
                  <Badge variant="secondary" className="text-[10px]">Presenter only</Badge>
                )}
                {slide.showDynoclawCta && (
                  <Badge className="text-[10px] bg-pink-500/20 text-pink-400">CTA</Badge>
                )}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => startEdit(slide)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => setDeleteConfirm(slide._id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Slide</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Type</label>
                <Select value={editType} onValueChange={(v) => setEditType(v as SlideType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="section">Section</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="interactive">Interactive</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="cta">CTA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Visibility</label>
                <div className="flex gap-3 pt-1">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={editShowInPublic} onChange={(e) => setEditShowInPublic(e.target.checked)} className="rounded" />
                    Public
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={editShowDynoclawCta} onChange={(e) => setEditShowDynoclawCta(e.target.checked)} className="rounded" />
                    DynoClaw CTA
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Subtitle</label>
              <Input value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} />
            </div>
            {(editType === "content" || editType === "interactive") && (
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Bullets / Options (one per line)</label>
                <textarea
                  value={editBullets}
                  onChange={(e) => setEditBullets(e.target.value)}
                  className="w-full min-h-[120px] rounded-md border bg-transparent px-3 py-2 text-sm"
                  placeholder="One item per line..."
                />
              </div>
            )}
            {editType === "demo" && (
              <>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Demo Steps (one per line)</label>
                  <textarea
                    value={editDemoSteps}
                    onChange={(e) => setEditDemoSteps(e.target.value)}
                    className="w-full min-h-[120px] rounded-md border bg-transparent px-3 py-2 text-sm"
                    placeholder="Step 1...\nStep 2..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Demo Speaker Note</label>
                  <textarea
                    value={editDemoNote}
                    onChange={(e) => setEditDemoNote(e.target.value)}
                    className="w-full min-h-[60px] rounded-md border bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Highlight Box</label>
              <textarea
                value={editHighlight}
                onChange={(e) => setEditHighlight(e.target.value)}
                className="w-full min-h-[60px] rounded-md border bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Speaker Notes</label>
              <textarea
                value={editSpeakerNotes}
                onChange={(e) => setEditSpeakerNotes(e.target.value)}
                className="w-full min-h-[100px] rounded-md border bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add slide dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Slide</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Title</label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Slide title..." />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Type</label>
              <Select value={newType} onValueChange={(v) => setNewType(v as SlideType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="interactive">Interactive</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="cta">CTA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newTitle.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete slide?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
