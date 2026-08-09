interface VitalLineProps {
  className?: string;
  strokeWidth?: number;
}

export function VitalLine({ className = "", strokeWidth = 2 }: VitalLineProps) {
  return (
    <svg
      viewBox="0 0 400 60"
      fill="none"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 30 H120 L145 30 L160 8 L178 52 L196 18 L210 30 H400"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}