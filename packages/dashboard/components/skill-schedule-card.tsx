"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import Link from "next/link";

interface SkillScheduleCardProps {
  skills: { skillId: string; enabled: boolean; cronOverride?: string }[];
  jobs: {
    action: string;
    status: string;
    createdAt: number;
    completedAt?: number;
  }[];
}

export function SkillScheduleCard({ skills, jobs }: SkillScheduleCardProps) {
  const enabledSkills = skills.filter((s) => s.enabled);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Skill Schedules
        </CardTitle>
      </CardHeader>
      <CardContent>
        {enabledSkills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No skills enabled.{" "}
            <Link href="/skills" className="underline hover:no-underline">
              Configure skills
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {enabledSkills.map((skill) => {
              const cron = skill.cronOverride;
              // Find most recent job for this skill
              const lastJob = jobs.find((j) => j.action === skill.skillId);

              return (
                <div key={skill.skillId} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{skill.skillId}</span>
                    {cron ? (
                      <Badge
                        variant="secondary"
                        className="text-xs font-mono"
                      >
                        {cron}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        On-demand
                      </Badge>
                    )}
                  </div>
                  {lastJob && (
                    <p className="text-xs text-muted-foreground">
                      Last run:{" "}
                      {new Date(lastJob.completedAt ?? lastJob.createdAt).toLocaleString()}{" "}
                      — {lastJob.status}
                    </p>
                  )}
                </div>
              );
            })}
            <Link
              href="/skills"
              className="mt-1 block text-xs text-muted-foreground underline hover:no-underline"
            >
              Manage skills
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
