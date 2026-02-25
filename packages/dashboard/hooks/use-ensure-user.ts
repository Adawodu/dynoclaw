"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export function useEnsureUser() {
  const touch = useMutation(api.users.touch);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    touch().catch(() => {
      // Non-critical — user record will be created on next load
    });
  }, [touch]);
}
