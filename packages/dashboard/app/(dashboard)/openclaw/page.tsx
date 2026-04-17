"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Terminal, ExternalLink, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface TunnelInfo {
  deploymentId: string;
  gcpProjectId: string;
  gcpZone: string;
  vmName: string;
  dashboardPort: number;
  iapTunnelCommand: string;
  localDashboardUrl: string;
  brokerUrl: string | null;
  brokerToken: string | null;
  brokerReady: boolean;
  error?: string;
}

export default function OpenClawConsolePage() {
  const deployments = useQuery(api.deployments.list);
  const deployment = deployments?.[0];
  const [tunnelInfo, setTunnelInfo] = useState<TunnelInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchTunnelInfo() {
    if (!deployment) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gcp/tunnel-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId: deployment._id }),
      });
      const data = await res.json();
      setTunnelInfo(data);
    } catch (err) {
      setTunnelInfo({
        deploymentId: "",
        gcpProjectId: "",
        gcpZone: "",
        vmName: "",
        dashboardPort: 18789,
        iapTunnelCommand: "",
        localDashboardUrl: "",
        brokerUrl: null,
        brokerToken: null,
        brokerReady: false,
        error: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (deployment) fetchTunnelInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployment?._id]);

  function copyCommand() {
    if (!tunnelInfo?.iapTunnelCommand) return;
    navigator.clipboard.writeText(tunnelInfo.iapTunnelCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Loading skeleton
  if (deployments === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">OpenClaw Console</h1>
        <Skeleton className="h-48" />
      </div>
    );
  }

  // No deployment
  if (!deployment) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">OpenClaw Console</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Terminal className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Deploy your AI teammate first to access the OpenClaw console.
            </p>
            <Button asChild className="mt-4">
              <Link href="/deploy">Deploy Now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isManaged = deployment.gcpProjectId === "dynoclaw-managed";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">OpenClaw Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access your AI teammate&apos;s full OpenClaw interface — chat, skills marketplace, memory, plugins, and more.
        </p>
      </div>

      {/* Not-ready warning for self-hosted */}
      {!isManaged && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex gap-3 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Self-hosted deployments: coming soon</p>
              <p className="text-muted-foreground">
                The OpenClaw console proxy currently only supports DynoClaw Managed deployments. Self-hosted support is in active development.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Broker-ready UI (Phase 2 - placeholder for when Cloud Run broker is live) */}
      {tunnelInfo?.brokerReady && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Console</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              src={`${tunnelInfo.brokerUrl}/app/${tunnelInfo.deploymentId}?token=${tunnelInfo.brokerToken}`}
              className="h-[800px] w-full rounded-md border"
              title="OpenClaw Console"
            />
          </CardContent>
        </Card>
      )}

      {/* Phase 1: manual IAP tunnel instructions */}
      {isManaged && tunnelInfo && !tunnelInfo.brokerReady && !tunnelInfo.error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connect via IAP Tunnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Phase 1: run the command below from your terminal to open a secure IAP tunnel to your VM&apos;s OpenClaw console. The tunnel stays open until you close your terminal.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Step 1: Run this in your terminal
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-xs font-mono">
                  {tunnelInfo.iapTunnelCommand}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2"
                  onClick={copyCommand}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Requires <code className="rounded bg-muted px-1 py-0.5">gcloud</code> CLI installed and authenticated.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Step 2: Open the dashboard
              </p>
              <Button asChild variant="outline" className="w-full justify-start">
                <a
                  href={tunnelInfo.localDashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {tunnelInfo.localDashboardUrl}
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                Once the tunnel is running, click above to open the OpenClaw console in a new tab. Use the gateway token (below) to authenticate.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Step 3: Your VM details
              </p>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-md border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">GCP Project</p>
                  <p className="font-mono">{tunnelInfo.gcpProjectId}</p>
                </div>
                <div className="rounded-md border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">Zone</p>
                  <p className="font-mono">{tunnelInfo.gcpZone}</p>
                </div>
                <div className="rounded-md border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">VM Name</p>
                  <p className="font-mono">{tunnelInfo.vmName}</p>
                </div>
                <div className="rounded-md border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">Dashboard Port</p>
                  <p className="font-mono">{tunnelInfo.dashboardPort}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {tunnelInfo?.error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{tunnelInfo.error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={fetchTunnelInfo}
              disabled={loading}
            >
              {loading ? "Retrying…" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info about what's coming */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="py-4">
          <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-1">
            Coming soon
          </p>
          <p className="text-sm text-muted-foreground">
            Phase 2 will embed the OpenClaw console directly in DynoClaw — no terminal required. A Cloud Run tunnel broker will handle the IAP connection transparently.
          </p>
        </CardContent>
      </Card>

      {/* Warning about updates */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-4">
          <p className="text-xs font-medium text-yellow-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Important: Do not update OpenClaw from its console
          </p>
          <p className="text-sm text-muted-foreground">
            The OpenClaw console may show &quot;update available&quot; — ignore it. DynoClaw pins the OpenClaw version to keep your deployment stable. To upgrade, use the <Link href="/settings" className="text-foreground underline">Settings page</Link> &quot;Upgrade VM&quot; button, which coordinates the version change across the startup script and VM state.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
