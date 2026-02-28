/**
 * Circular reputation indicator. Fill % based on received count (cap at 10 = 100%).
 */
interface ReputationRingProps {
  received: number;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const CAP = 10; // 10 vouches = 100% fill

export function ReputationRing({ received, className = "", size = 64, strokeWidth = 6 }: ReputationRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillPercent = Math.min(received / CAP, 1);
  const strokeDashoffset = circumference * (1 - fillPercent);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`reputation-ring ${className}`}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="reputation-ring-bg opacity-20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="reputation-ring-fill transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}
