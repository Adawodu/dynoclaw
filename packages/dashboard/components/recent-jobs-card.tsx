"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

interface RecentJobsCardProps {
  jobs: {
    _id: string;
    action: string;
    status: string;
    createdAt: number;
    completedAt?: number;
    error?: string;
  }[];
}

function statusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "running":
      return "secondary" as const;
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function RecentJobsCard({ jobs }: RecentJobsCardProps) {
  const recent = jobs.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Recent Jobs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No job history yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((job) => (
              <div
                key={job._id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(job.status)} className="text-xs">
                    {job.status}
                  </Badge>
                  <span>{job.action}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(job.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
