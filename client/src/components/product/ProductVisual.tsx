import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Product imagery without external assets.
 *
 * The MVP has no photo library, so each product gets a deterministic
 * illustration: the silhouette comes from its form (tub, bottle, bar, shirt…)
 * and the accent colour from a hash of its slug. The result is stable across
 * reloads and looks intentional rather than like a broken image.
 *
 * When a real photo exists (admin URL or an upload) it is shown instead, and
 * this illustration becomes the error fallback.
 */

type Shape = 'tub' | 'bottle' | 'pills' | 'bar' | 'shaker' | 'shirt' | 'gear';

const ACCENTS = [
  { base: '#C4F82A', deep: '#8FBF0F', tint: '#F3FCDC' },
  { base: '#FF7A45', deep: '#D1541F', tint: '#FFEDE4' },
  { base: '#3B82F6', deep: '#1D4FD7', tint: '#E4EDFF' },
  { base: '#F043A8', deep: '#C01F80', tint: '#FFE6F4' },
  { base: '#14B8A6', deep: '#0C8175', tint: '#DFF7F4' },
  { base: '#FACC15', deep: '#C69A06', tint: '#FEF8DC' },
  { base: '#8B5CF6', deep: '#6633D9', tint: '#EFE7FF' },
  { base: '#EF4444', deep: '#C22626', tint: '#FEE7E7' },
];

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) % 100000;
  }
  return value;
}

function resolveShape(form: string | null, categorySlug: string | null): Shape {
  if (categorySlug === 'shakers') return 'shaker';
  if (categorySlug === 'apparel') return 'shirt';
  if (categorySlug === 'accessories') return 'gear';

  switch (form) {
    case 'Капсули':
    case 'Таблетки':
      return 'pills';
    case 'Рідина':
      return 'bottle';
    case 'Батончик':
      return 'bar';
    case 'Аксесуар':
      return 'gear';
    default:
      return 'tub';
  }
}

type Palette = (typeof ACCENTS)[number];

function Tub({ palette, initials }: { palette: Palette; initials: string }) {
  return (
    <g>
      <rect x="126" y="96" width="148" height="30" rx="10" fill="#1c1c1c" />
      <rect x="132" y="88" width="136" height="16" rx="8" fill="#2c2c2c" />
      <path d="M120 124h160a8 8 0 0 1 8 8v148a20 20 0 0 1-20 20H132a20 20 0 0 1-20-20V132a8 8 0 0 1 8-8z" fill="#191919" />
      <rect x="120" y="168" width="160" height="76" fill={palette.base} />
      <rect x="120" y="168" width="160" height="8" fill={palette.deep} opacity="0.45" />
      <text
        x="200"
        y="214"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="34"
        fontWeight="900"
        fill="#111111"
      >
        {initials}
      </text>
      <rect x="140" y="258" width="54" height="7" rx="3.5" fill="#3a3a3a" />
      <rect x="140" y="272" width="86" height="7" rx="3.5" fill="#2e2e2e" />
      <path d="M120 124h30v176h-18a12 12 0 0 1-12-12V124z" fill="#ffffff" opacity="0.07" />
    </g>
  );
}

function Bottle({ palette, initials }: { palette: Palette; initials: string }) {
  return (
    <g>
      <rect x="182" y="74" width="36" height="26" rx="6" fill={palette.deep} />
      <path d="M186 100h28l14 28v152a20 20 0 0 1-20 20h-16a20 20 0 0 1-20-20V128l14-28z" fill="#191919" />
      <rect x="172" y="166" width="56" height="74" fill={palette.base} />
      <text
        x="200"
        y="212"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="22"
        fontWeight="900"
        fill="#111111"
      >
        {initials}
      </text>
      <path d="M186 100h8v180h-2a6 6 0 0 1-6-6V100z" fill="#ffffff" opacity="0.1" />
    </g>
  );
}

function Pills({ palette, initials }: { palette: Palette; initials: string }) {
  return (
    <g>
      <rect x="156" y="84" width="88" height="24" rx="8" fill={palette.deep} />
      <path d="M150 108h100a10 10 0 0 1 10 10v152a20 20 0 0 1-20 20h-80a20 20 0 0 1-20-20V118a10 10 0 0 1 10-10z" fill="#191919" />
      <rect x="140" y="158" width="120" height="82" rx="4" fill="#f5f5f5" />
      <rect x="140" y="158" width="120" height="14" fill={palette.base} />
      <text
        x="200"
        y="212"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="26"
        fontWeight="900"
        fill="#111111"
      >
        {initials}
      </text>
      <rect x="156" y="252" width="42" height="6" rx="3" fill="#3a3a3a" />
      <ellipse cx="284" cy="268" rx="17" ry="11" fill={palette.base} transform="rotate(-24 284 268)" />
      <ellipse cx="306" cy="288" rx="17" ry="11" fill="#e9e9e9" transform="rotate(16 306 288)" />
    </g>
  );
}

function Bar({ palette, initials }: { palette: Palette; initials: string }) {
  return (
    <g>
      <path d="M84 150h232a14 14 0 0 1 14 14v72a14 14 0 0 1-14 14H84a14 14 0 0 1-14-14v-72a14 14 0 0 1 14-14z" fill="#191919" />
      <path d="M70 178h260v44H70z" fill={palette.base} />
      <text
        x="200"
        y="210"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="28"
        fontWeight="900"
        fill="#111111"
        letterSpacing="1"
      >
        {initials}
      </text>
      <path d="M70 150 48 134v132l22-16z" fill="#232323" />
      <path d="M330 150l22-16v132l-22-16z" fill="#232323" />
      <rect x="96" y="160" width="3" height="12" rx="1.5" fill="#ffffff" opacity="0.25" />
      <rect x="108" y="160" width="3" height="12" rx="1.5" fill="#ffffff" opacity="0.25" />
    </g>
  );
}

function Shaker({ palette, initials }: { palette: Palette; initials: string }) {
  return (
    <g>
      <rect x="158" y="66" width="84" height="22" rx="8" fill="#2c2c2c" />
      <rect x="168" y="56" width="30" height="14" rx="7" fill={palette.deep} />
      <path d="M152 88h96a10 10 0 0 1 10 10v170a20 20 0 0 1-20 20h-76a20 20 0 0 1-20-20V98a10 10 0 0 1 10-10z" fill="#1e1e1e" />
      <rect x="142" y="150" width="116" height="70" fill={palette.base} />
      <text
        x="200"
        y="196"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="24"
        fontWeight="900"
        fill="#111111"
      >
        {initials}
      </text>
      {[240, 256, 272].map((y) => (
        <g key={y}>
          <rect x="160" y={y} width="26" height="4" rx="2" fill="#ffffff" opacity="0.35" />
        </g>
      ))}
      <path d="M152 88h10v190h-2a8 8 0 0 1-8-8V88z" fill="#ffffff" opacity="0.12" />
    </g>
  );
}

function Shirt({ palette, initials }: { palette: Palette; initials: string }) {
  return (
    <g>
      <path
        d="M152 92 108 118l-20 62 40 14 8-22v122a12 12 0 0 0 12 12h104a12 12 0 0 0 12-12V172l8 22 40-14-20-62-44-26-24 20h-28l-24-20z"
        fill="#1c1c1c"
      />
      <path d="M176 92h48l-24 22z" fill="#0d0d0d" />
      <rect x="176" y="176" width="48" height="14" rx="7" fill={palette.base} />
      <text
        x="200"
        y="230"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="22"
        fontWeight="900"
        fill={palette.base}
        letterSpacing="2"
      >
        {initials}
      </text>
    </g>
  );
}

function Gear({ palette, initials }: { palette: Palette; initials: string }) {
  return (
    <g>
      <rect x="82" y="176" width="236" height="46" rx="14" fill="#191919" />
      <rect x="82" y="176" width="236" height="12" rx="6" fill="#ffffff" opacity="0.08" />
      <rect x="238" y="160" width="72" height="78" rx="16" fill="#232323" />
      <rect x="252" y="176" width="44" height="46" rx="8" fill={palette.base} />
      <text
        x="274"
        y="207"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="18"
        fontWeight="900"
        fill="#111111"
      >
        {initials}
      </text>
      {[110, 140, 170, 200].map((x) => (
        <rect key={x} x={x} y="190" width="8" height="18" rx="4" fill="#3a3a3a" />
      ))}
    </g>
  );
}

const SHAPES: Record<Shape, typeof Tub> = {
  tub: Tub,
  bottle: Bottle,
  pills: Pills,
  bar: Bar,
  shaker: Shaker,
  shirt: Shirt,
  gear: Gear,
};

export function ProductVisual({
  name,
  slug,
  form = null,
  categorySlug = null,
  className,
}: {
  name: string;
  slug: string;
  form?: string | null;
  categorySlug?: string | null;
  className?: string;
}) {
  const { palette, Shape, initials, gradientId } = useMemo(() => {
    const seed = hash(slug || name);
    const selected = ACCENTS[seed % ACCENTS.length];
    const shape = resolveShape(form, categorySlug);

    // Two letters from the product name, skipping short filler words.
    const words = name
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);
    const letters = (words.length >= 2
      ? words[0][0] + words[1][0]
      : (words[0] ?? name).slice(0, 2)
    ).toUpperCase();

    return {
      palette: selected,
      Shape: SHAPES[shape],
      initials: letters,
      gradientId: `pv-${seed}-${shape}`,
    };
  }, [name, slug, form, categorySlug]);

  return (
    <svg
      viewBox="0 0 400 400"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={name}
    >
      <defs>
        <radialGradient id={gradientId} cx="0.5" cy="0.3" r="0.85">
          <stop offset="0%" stopColor={palette.tint} />
          <stop offset="100%" stopColor="#ffffff" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#${gradientId})`} />
      <circle cx="200" cy="196" r="122" fill={palette.base} opacity="0.14" />
      <ellipse cx="200" cy="322" rx="104" ry="16" fill="#111111" opacity="0.1" />
      <Shape palette={palette} initials={initials} />
    </svg>
  );
}

/** Photo when one exists, generated illustration otherwise (and on error). */
export function ProductImage({
  src,
  name,
  slug,
  form = null,
  categorySlug = null,
  className,
  imgClassName,
}: {
  src?: string | null;
  name: string;
  slug: string;
  form?: string | null;
  categorySlug?: string | null;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <ProductVisual
        name={name}
        slug={slug}
        form={form}
        categorySlug={categorySlug}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className, imgClassName)}
    />
  );
}
