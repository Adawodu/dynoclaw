import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

export function LogoIcon({ className, size = 24 }: LogoProps) {
  return (
    <Image
      src="/dynoclaw-icon.svg"
      alt="DynoClaw"
      width={size}
      height={size}
      className={cn("inline-block", className)}
    />
  );
}

export function LogoFull({
  className,
  variant = "white",
  height = 28,
}: LogoProps & { variant?: "white" | "dark" | "brand"; height?: number }) {
  const src =
    variant === "brand"
      ? "/dynoclaw-brand.svg"
      : variant === "dark"
        ? "/dynoclaw-dark.svg"
        : "/dynoclaw-white.svg";

  return (
    <Image
      src={src}
      alt="DynoClaw"
      width={height * 4}
      height={height}
      className={cn("inline-block", className)}
    />
  );
}
