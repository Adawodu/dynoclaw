"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface Deployment {
  _id: Id<"deployments">;
  gcpProjectId: string;
  gcpZone: string;
  vmName: string;
  status: string;
}

export interface InstanceMeta {
  lastStartTimestamp: string | null;
  lastStopTimestamp: string | null;
  internalIp: string | null;
  creationTimestamp: string | null;
  /** Seconds since VM was created — useful for detecting first-boot grace period */
  bootAgeSec: number | null;
}

const FAST_POLL_MS = 10_000;
const TRANSITIONAL = new Set(["provisioning", "staging", "stopping", "suspending"]);

/**
 * Polls GCP VM status and syncs to Convex.
 * Polls every `intervalMs` normally, but switches to 10s when
 * the VM is in a transitional state (provisioning/staging/stopping).
 * Returns instance metadata and a `statusTransition` when the VM
 * changes between running/stopped (e.g. after a restart).
 */
export function useHealthPoll(
  deployment: Deployment | undefined,
  intervalMs = 60_000
) {
  const updateStatus = useMutation(api.deployments.updateStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [instanceMeta, setInstanceMeta] = useState<InstanceMeta | null>(null);
  const [statusTransition, setStatusTransition] = useState<{
    from: string;
    to: string;
    at: number;
  } | null>(null);
  const prevGcpStatusRef = useRef<string | null>(null);
  const currentIntervalMs = useRef(intervalMs);

  const clearExistingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const dismissTransition = useCallback(() => {
    setStatusTransition(null);
  }, []);

  useEffect(() => {
    if (!deployment) return;

    async function check() {
      if (!deployment) return;
      try {
        const res = await fetch(
          `/api/gcp/status?project=${deployment.gcpProjectId}&zone=${deployment.gcpZone}&vm=${deployment.vmName}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const gcpStatus = data.status?.toLowerCase();
        if (!gcpStatus) return;

        const bootAgeSec = data.lastStartTimestamp
          ? Math.floor((Date.now() - new Date(data.lastStartTimestamp).getTime()) / 1000)
          : null;

        setInstanceMeta({
          lastStartTimestamp: data.lastStartTimestamp,
          lastStopTimestamp: data.lastStopTimestamp,
          internalIp: data.internalIp,
          creationTimestamp: data.creationTimestamp,
          bootAgeSec,
        });

        // Detect status transitions
        const prev = prevGcpStatusRef.current;
        if (prev && prev !== gcpStatus) {
          // Only surface meaningful transitions (not intermediate states)
          const isNowStable = gcpStatus === "running" || gcpStatus === "terminated" || gcpStatus === "stopped";
          if (isNowStable) {
            setStatusTransition({ from: prev, to: gcpStatus, at: Date.now() });
          }
        }
        prevGcpStatusRef.current = gcpStatus;

        // Adjust polling speed based on state
        const shouldFastPoll = TRANSITIONAL.has(gcpStatus);
        const desiredInterval = shouldFastPoll ? FAST_POLL_MS : intervalMs;
        if (desiredInterval !== currentIntervalMs.current) {
          currentIntervalMs.current = desiredInterval;
          clearExistingInterval();
          intervalRef.current = setInterval(check, desiredInterval);
        }

        let mappedStatus = deployment.status;
        if (gcpStatus === "running") mappedStatus = "running";
        else if (gcpStatus === "terminated" || gcpStatus === "stopped")
          mappedStatus = "stopped";
        else if (gcpStatus === "staging" || gcpStatus === "provisioning")
          mappedStatus = "provisioning";

        await updateStatus({
          id: deployment._id,
          status: mappedStatus,
          lastHealthCheck: Date.now(),
          lastHealthStatus: gcpStatus,
        });
      } catch {
        // Silently ignore — next poll will retry
      }
    }

    // Initial check
    check();

    currentIntervalMs.current = intervalMs;
    intervalRef.current = setInterval(check, intervalMs);

    // Pause when tab is hidden, resume when visible
    function onVisibility() {
      if (document.hidden) {
        clearExistingInterval();
      } else {
        check();
        intervalRef.current = setInterval(check, currentIntervalMs.current);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearExistingInterval();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [deployment?._id, intervalMs, updateStatus, clearExistingInterval]);

  return { instanceMeta, statusTransition, dismissTransition };
}
