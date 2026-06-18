import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
    return {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        ...props,
    };
}

export const BriefcaseIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
);

export const NotesIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M4 4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
    </svg>
);

export const ScaleIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 3v18M5 7h14" />
        <path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
        <path d="M7 21h10" />
    </svg>
);

export const SettingsIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 3.5l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
);

export const LayoutIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
    </svg>
);

export const SunIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
);

export const MoonIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
);

export const PlusIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 5v14M5 12h14" />
    </svg>
);

export const TrashIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </svg>
);

export const PencilIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
);

export const SearchIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
    </svg>
);

export const XIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);

export const CheckIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

export const TrophyIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
        <path d="M7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3" />
    </svg>
);

export const SparklesIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
    </svg>
);

export const TrendingUpIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 17l6-6 4 4 7-7" />
        <path d="M14 8h6v6" />
    </svg>
);

export const CalendarIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
);

export const CreditCardIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
    </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
);

export const MenuIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

export const ExternalLinkIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
);

export const LockIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
);

export const DownloadIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M5 21h14" />
    </svg>
);

export const FilterIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" />
    </svg>
);

export const SortIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M11 5h10M11 9h7M11 13h4" />
        <path d="M3 8l3-3 3 3M6 5v14" />
    </svg>
);

export const SlidersIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
        <path d="M2 14h4M10 8h4M18 16h4" />
    </svg>
);

export const ExportIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 15V3M8 7l4-4 4 4" />
        <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="m6 9 6 6 6-6" />
    </svg>
);

export const MailIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
    </svg>
);

export const GlobeIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
    </svg>
);

export const ShieldIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    </svg>
);

export const HelpIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
    </svg>
);

export const MapPinIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

export const BuildingIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <rect x="4" y="3" width="16" height="18" rx="1.5" />
        <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" />
    </svg>
);

export const LinkIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
);

export const WalletIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H5" />
        <path d="M16 13h.01" />
    </svg>
);

export const ClockIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
    </svg>
);

export const ActivityIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

export const UserIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
);

export const PaletteIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 3a9 9 0 0 0 0 18c1.7 0 2-1.3 1.2-2.2-.8-.9-.2-2.3 1-2.3H17a4 4 0 0 0 4-4c0-4.7-4-9.5-9-9.5z" />
        <circle cx="7.5" cy="10.5" r="1" />
        <circle cx="12" cy="7.5" r="1" />
        <circle cx="16.5" cy="10.5" r="1" />
    </svg>
);

export const AlertTriangleIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
    </svg>
);

export const BrainIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 5a3 3 0 0 0-5.5-1.7A2.5 2.5 0 0 0 4 7.5a2.5 2.5 0 0 0-.5 4.8A2.5 2.5 0 0 0 5 17a2.5 2.5 0 0 0 4.5 1.5A2.5 2.5 0 0 0 12 19z" />
        <path d="M12 5a3 3 0 0 1 5.5-1.7A2.5 2.5 0 0 1 20 7.5a2.5 2.5 0 0 1 .5 4.8A2.5 2.5 0 0 1 19 17a2.5 2.5 0 0 1-4.5 1.5A2.5 2.5 0 0 1 12 19z" />
        <path d="M12 5v14" />
    </svg>
);

export const TargetIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
    </svg>
);

export const BookOpenIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 7c-1.5-1.2-3.5-2-6-2H4v13h2c2.5 0 4.5.8 6 2" />
        <path d="M12 7c1.5-1.2 3.5-2 6-2h2v13h-2c-2.5 0-4.5.8-6 2z" />
        <path d="M12 7v14" />
    </svg>
);

export const FlameIcon = (p: IconProps) => (
    <svg {...base(p)}>
        <path d="M12 2c1 3-1 4-2 6-1 2 0 4 2 4s3-2 2-4c2 1 4 3 4 6a6 6 0 0 1-12 0c0-4 4-6 6-8z" />
    </svg>
);
