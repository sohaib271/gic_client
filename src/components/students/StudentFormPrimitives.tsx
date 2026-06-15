import type { ReactNode } from "react";

export const StudentFormField = ({
  label,
  children,
  wide = false,
  col2 = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  col2?: boolean;
}) => (
  <div className={wide || col2 ? "sm:col-span-2" : ""}>
    <label className="mb-1 block text-xs font-medium text-muted-foreground">
      {label}
    </label>
    {children}
  </div>
);
