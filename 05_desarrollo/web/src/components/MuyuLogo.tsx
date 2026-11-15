interface MuyuLogoProps {
  size?: number;
  dotColor?: string;
}

export function MuyuLogo({ size = 36, dotColor = "#9CC3D5" }: MuyuLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Logo de MUYU"
      style={{ flexShrink: 0 }}
    >
      <g fill="none" strokeWidth="14" strokeDasharray="70 156.2">
        <circle cx="50" cy="50" r="36" stroke="#A3325F" transform="rotate(-90 50 50)" />
        <circle cx="50" cy="50" r="36" stroke="#2F7D4F" transform="rotate(30 50 50)" />
        <circle cx="50" cy="50" r="36" stroke="#D9A441" transform="rotate(150 50 50)" />
      </g>
      <circle cx="74" cy="8.4" r="4.5" fill={dotColor} />
    </svg>
  );
}
