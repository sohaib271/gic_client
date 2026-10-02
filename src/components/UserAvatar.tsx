import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API } from "@/services/otherService";
import { cn } from "@/lib/utils";

/** Builds a usable src from the `image` field returned by the API.
 * Handles absolute urls, relative paths and empty values. */
export const resolveUserImage = (image?: string | null): string => {
  const value = typeof image === "string" ? image.trim() : "";
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value)) return value;
  return `${API}${value.startsWith("/") ? "" : "/"}${value}`;
};

const getInitials = (name?: string | null, lastName?: string | null) => {
  const initials = `${name?.trim()?.[0] ?? ""}${lastName?.trim()?.[0] ?? ""}`.toUpperCase();
  return initials || "U";
};

type UserAvatarProps = {
  image?: string | null;
  name?: string | null;
  lastName?: string | null;
  className?: string;
  fallbackClassName?: string;
};

/** Teacher/staff photo with automatic initials fallback when no image exists. */
const UserAvatar = ({ image, name, lastName, className, fallbackClassName }: UserAvatarProps) => {
  const [broken, setBroken] = useState(false);
  const src = resolveUserImage(image);

  useEffect(() => setBroken(false), [src]);

  return (
    <Avatar className={cn("h-9 w-9", className)}>
      {src && !broken && (
        <AvatarImage src={src} alt={`${name ?? ""} ${lastName ?? ""}`.trim() || "profile"} onError={() => setBroken(true)} />
      )}
      <AvatarFallback
        className={cn("bg-primary/10 text-xs font-bold uppercase text-primary", fallbackClassName)}
      >
        {getInitials(name, lastName)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
