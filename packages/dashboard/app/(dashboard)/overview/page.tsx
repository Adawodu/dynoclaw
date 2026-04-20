"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VmStatusBadge } from "@/components/vm-status-badge";
import { CostCards } from "@/components/cost-cards";
import { ActionItemsBanner } from "@/components/action-items-banner";
import { ChannelStatusCard } from "@/components/channel-status-card";
import { PluginHealthCard } from "@/components/plugin-health-card";
import { SkillScheduleCard } from "@/components/skill-schedule-card";
import { RecentJobsCard } from "@/components/recent-jobs-card";
import { BotHealthBanner } from "@/components/bot-health-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, CheckCircle2, XCircle, X, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useHealthPoll } from "@/lib/use-health-poll";

export default function OverviewPage() {
  const deployments = useQuery(api.deployments.list);
  const deployment = deployments?.[0];

  const snapshot = useQuery(
    api.costs.latestSnapshot,
    deployment ? {} : "skip"
  );

  const apiKeys = useQuery(
    api.apiKeyRegistry.listByDeployment,
    deployment ? { deploymentId: deployment._id } : "skip"
  );

  const plugins = useQuery(
    api.pluginConfigs.listByDeployment,
    deployment ? { deploymentId: deployment._id } : "skip"
  );

  const skills = useQuery(
    api.skillConfigs.listByDeployment,
    deployment ? { deploymentId: deployment._id } : "skip"
  );

  const jobs = useQuery(
    api.deployJobs.listByDeployment,
    deployment ? { deploymentId: deployment._id } : "skip"
  );

  const { instanceMeta, statusTransition, dismissTransition } = useHealthPoll(deployment, 60_000);

  if (deployments === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Overview</h1>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Overview</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Rocket className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No deployment yet</h2>
            <p className="text-center text-sm text-muted-foreground">
              Deploy your AI teammate to get started. You&apos;ll see status,
              costs, and controls here once it&apos;s running.
            </p>
            <Button asChild>
              <Link href="/deploy">Deploy Now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      {statusTransition && (
        <div
          className={`rounded-lg border p-4 ${
            statusTransition.to === "running"
              ? "border-green-500/30 bg-green-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statusTransition.to === "running" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <p
                className={`text-sm font-medium ${
                  statusTransition.to === "running"
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400"
                }`}
              >
                {statusTransition.to === "running"
                  ? "VM is back online and running"
                  : "VM has stopped"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={dismissTransition}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <BotHealthBanner
        vmStatus={deployment.status}
        bootAgeSec={instanceMeta?.bootAgeSec ?? null}
        deploymentId={deployment._id}
      />

      {apiKeys && plugins && skills && (
        <ActionItemsBanner
          vmStatus={deployment.status}
          apiKeys={apiKeys}
          plugins={plugins}
          skills={skills}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* VM Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">
                {deployment.branding.botName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {deployment.gcpProjectId} / {deployment.vmName}
              </p>
            </div>
            <VmStatusBadge status={deployment.status} />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">Settings</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/logs">Logs</Link>
              </Button>
            </div>
            {instanceMeta?.internalIp && (
              <p className="text-xs text-muted-foreground">
                Internal IP: {instanceMeta.internalIp}
              </p>
            )}
            {instanceMeta?.lastStartTimestamp && (
              <p className="text-xs text-muted-foreground">
                Last started:{" "}
                {new Date(instanceMeta.lastStartTimestamp).toLocaleString()}
              </p>
            )}
            {deployment.lastHealthCheck && (
              <p className="text-xs text-muted-foreground">
                Last checked:{" "}
                {new Date(deployment.lastHealthCheck).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Channel Status Card */}
        {apiKeys && <ChannelStatusCard apiKeys={apiKeys} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Plugin Health Card */}
        {plugins && apiKeys && (
          <PluginHealthCard plugins={plugins} apiKeys={apiKeys} />
        )}

        {/* Skill Schedule Card */}
        {skills && jobs && <SkillScheduleCard skills={skills} jobs={jobs} />}
      </div>

      {/* Recent Jobs Card */}
      {jobs && <RecentJobsCard jobs={jobs} />}

      {/* Value Delivered */}
      {skills && plugins && deployment.status === "running" && (
        <ValueDelivered
          deployedAt={deployment.deployedAt}
          enabledSkills={skills.filter((s: { enabled: boolean }) => s.enabled)}
          enabledPlugins={plugins.filter((p: { enabled: boolean }) => p.enabled)}
        />
      )}

      {/* Cost Cards */}
      {snapshot ? (
        <CostCards snapshot={snapshot} />
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-sm text-muted-foreground">
              Cost data will appear here once your teammate starts running and
              the first cost snapshot is collected.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ValueDelivered({
  deployedAt,
  enabledSkills,
  enabledPlugins,
}: {
  deployedAt: number;
  enabledSkills: { skillId: string; cronOverride?: string }[];
  enabledPlugins: { pluginId: string }[];
}) {
  const daysSinceDeployment = Math.max(1, Math.floor((Date.now() - deployedAt) / 86_400_000));
  const weeksSinceDeployment = Math.max(1, Math.floor(daysSinceDeployment / 7));

  // Estimate scheduled skill runs based on cron frequency
  // Daily skills: 1/day, weekly skills: 1/week, on-demand: estimate 2/week
  const scheduledSkillRuns = enabledSkills.reduce((total, s) => {
    // Simple heuristic based on skill type
    const cronLike = s.cronOverride ?? "";
    if (cronLike.includes("* * *")) return total + daysSinceDeployment; // daily
    if (cronLike.includes("* *")) return total + weeksSinceDeployment; // weekly
    return total + weeksSinceDeployment * 2; // on-demand estimate
  }, 0);

  // Estimate on-demand interactions (conservative: 3/day per plugin)
  const pluginInteractions = enabledPlugins.length * daysSinceDeployment * 3;

  const totalWorkflows = scheduledSkillRuns + pluginInteractions;

  // Conservative estimate: each workflow saves 5-15 minutes of manual work
  const avgMinutesSaved = 8;
  const hoursSaved = Math.round((totalWorkflows * avgMinutesSaved) / 60);

  // Dollar value: $45/hr blended ops rate
  const dollarsSaved = hoursSaved * 45;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Value Delivered</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{totalWorkflows.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Workflows run</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">~{hoursSaved}</p>
            <p className="text-xs text-muted-foreground">Hours saved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">${dollarsSaved.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Estimated savings</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground text-center">
          Based on {daysSinceDeployment} days active, {enabledSkills.length} skills, {enabledPlugins.length} plugins.
          Estimated at $45/hr blended ops rate.
        </p>
      </CardContent>
    </Card>
  );
}
