import { cn } from "@/lib/utils";
import { badgeVariants, type BadgeProps } from "@/components/ui/badge-variants";

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
