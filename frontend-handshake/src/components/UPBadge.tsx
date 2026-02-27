/**
 * Badge component indicating Universal Profile address.
 */

export function UPBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-theme-accent-soft px-2 py-0.5 text-xs font-medium text-theme-accent ${className}`}
      title="Universal Profile"
    >
      UP
    </span>
  );
}
