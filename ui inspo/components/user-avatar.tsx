"use client";

import Image from "next/image";
import { displayInitials } from "@/lib/profile/initials";

export function UserAvatar({
  src,
  displayName,
  walletAddress,
  size = 44,
  className = "",
}: {
  src?: string | null;
  displayName?: string | null;
  walletAddress: string;
  size?: number;
  className?: string;
}) {
  const initials = displayInitials(displayName ?? "", walletAddress);

  if (src) {
    return (
      <span
        className={`relative shrink-0 overflow-hidden rounded-full border border-border-low bg-bg2 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-border-low bg-cream text-sm font-bold text-foreground ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
