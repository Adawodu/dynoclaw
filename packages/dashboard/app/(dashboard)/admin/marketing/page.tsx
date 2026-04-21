"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";

const IMAGE_SLOTS = [
  { slot: "hero-screenshot", label: "Hero Screenshot", description: "Main product screenshot shown on the landing page hero section (recommended: 1200x800)" },
  { slot: "feature-dashboard", label: "Dashboard Preview", description: "Screenshot of the dashboard overview page" },
  { slot: "feature-telegram", label: "Telegram Preview", description: "Screenshot or mockup of the Telegram bot interaction" },
  { slot: "feature-deploy", label: "Deploy Wizard Preview", description: "Screenshot of the deploy wizard" },
  { slot: "testimonial-avatar-1", label: "Testimonial Avatar 1", description: "Customer photo or avatar for testimonial (square, 200x200)" },
  { slot: "testimonial-avatar-2", label: "Testimonial Avatar 2", description: "Customer photo or avatar for testimonial (square, 200x200)" },
];

export default function AdminMarketingPage() {
  const adminCheck = useQuery(api.admin.isAdmin, {});
  const images = useQuery(api.marketingImages.list, adminCheck ? {} : "skip");
  const generateUploadUrl = useMutation(api.marketingImages.generateUploadUrl);
  const upsert = useMutation(api.marketingImages.upsert);
  const remove = useMutation(api.marketingImages.remove);

  if (adminCheck === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin: Marketing Assets</h1>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!adminCheck) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin: Marketing Assets</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Admin access required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imageMap = new Map((images ?? []).map((img) => [img.slot, img]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin: Marketing Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload product screenshots, testimonial avatars, and other images used on the marketing pages.
          Changes appear on the live site immediately.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {IMAGE_SLOTS.map((slot) => (
          <ImageSlotCard
            key={slot.slot}
            slot={slot.slot}
            label={slot.label}
            description={slot.description}
            currentImage={imageMap.get(slot.slot) ?? null}
            onUpload={async (file, alt) => {
              const uploadUrl = await generateUploadUrl();
              const res = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
              });
              const { storageId } = await res.json();
              await upsert({ slot: slot.slot, storageId, alt });
            }}
            onRemove={async () => {
              await remove({ slot: slot.slot });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ImageSlotCard({
  slot,
  label,
  description,
  currentImage,
  onUpload,
  onRemove,
}: {
  slot: string;
  label: string;
  description: string;
  currentImage: { url: string; alt: string } | null;
  onUpload: (file: File, alt: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [alt, setAlt] = useState(currentImage?.alt ?? label);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file, alt);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{label}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentImage ? (
          <div className="relative rounded-md border overflow-hidden">
            <img
              src={currentImage.url}
              alt={currentImage.alt}
              className="w-full h-40 object-cover"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={async () => {
                setUploading(true);
                await onRemove();
                setUploading(false);
              }}
              disabled={uploading}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="mx-auto h-8 w-8 mb-2" />
              <p className="text-xs">No image uploaded</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`alt-${slot}`} className="text-xs">Alt text</Label>
          <Input
            id={`alt-${slot}`}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image"
            className="text-xs h-8"
          />
        </div>

        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-3 w-3 mr-1" />
            {uploading ? "Uploading..." : currentImage ? "Replace" : "Upload"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
