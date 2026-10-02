import type { Animal } from '../three/iceCharacter';

interface Props {
  species: Animal;
  size?: number;
  className?: string;
}

export function CharacterFace({ species, size = 52, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
    >
      {/* ─── EARS / HORNS ─── */}
      {species === 'rabbit' && (
        <>
          <ellipse cx="32" cy="18" rx="8" ry="24" fill="#fbf8f5" stroke="#3a2622" strokeWidth="4" transform="rotate(-8 32 18)" />
          <ellipse cx="32" cy="20" rx="4.5" ry="18" fill="#ffb6c8" transform="rotate(-8 32 20)" />
          <ellipse cx="68" cy="18" rx="8" ry="24" fill="#fbf8f5" stroke="#3a2622" strokeWidth="4" transform="rotate(8 68 18)" />
          <ellipse cx="68" cy="20" rx="4.5" ry="18" fill="#ffb6c8" transform="rotate(8 68 20)" />
        </>
      )}

      {species === 'cat' && (
        <>
          <polygon points="18,48 26,14 46,36" fill="#f6ae63" stroke="#3a2622" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="23,44 28,22 42,36" fill="#ffb9c4" />
          <polygon points="82,48 74,14 54,36" fill="#f6ae63" stroke="#3a2622" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="77,44 72,22 58,36" fill="#ffb9c4" />
        </>
      )}

      {species === 'dog' && (
        <>
          <ellipse cx="18" cy="54" rx="10" ry="22" fill="#a8733f" stroke="#3a2622" strokeWidth="4" transform="rotate(18 18 54)" />
          <ellipse cx="82" cy="54" rx="10" ry="22" fill="#a8733f" stroke="#3a2622" strokeWidth="4" transform="rotate(-18 82 54)" />
        </>
      )}

      {species === 'bear' && (
        <>
          <circle cx="24" cy="28" r="14" fill="#a8763f" stroke="#3a2622" strokeWidth="4" />
          <circle cx="24" cy="28" r="7" fill="#7a5230" />
          <circle cx="76" cy="28" r="14" fill="#a8763f" stroke="#3a2622" strokeWidth="4" />
          <circle cx="76" cy="28" r="7" fill="#7a5230" />
        </>
      )}

      {species === 'fox' && (
        <>
          <polygon points="16,50 24,10 46,36" fill="#f0873a" stroke="#3a2622" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="22,46 26,18 40,36" fill="#ffd9c0" />
          <polygon points="24,10 21,22 30,19" fill="#3b2a22" />
          <polygon points="84,50 76,10 54,36" fill="#f0873a" stroke="#3a2622" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="78,46 74,18 60,36" fill="#ffd9c0" />
          <polygon points="76,10 79,22 70,19" fill="#3b2a22" />
        </>
      )}

      {species === 'penguin' && (
        <>
          <ellipse cx="50" cy="22" rx="4" ry="10" fill="#34466b" />
          <ellipse cx="44" cy="24" rx="3" ry="8" fill="#34466b" transform="rotate(-18 44 24)" />
          <ellipse cx="56" cy="24" rx="3" ry="8" fill="#34466b" transform="rotate(18 56 24)" />
        </>
      )}

      {species === 'deer' && (
        <>
          <ellipse cx="16" cy="56" rx="8" ry="16" fill="#cc955a" stroke="#3a2622" strokeWidth="3.5" transform="rotate(50 16 56)" />
          <ellipse cx="84" cy="56" rx="8" ry="16" fill="#cc955a" stroke="#3a2622" strokeWidth="3.5" transform="rotate(-50 84 56)" />
          {/* antlers */}
          <path d="M 32 30 Q 24 16 20 8 M 24 18 Q 16 16 14 12" stroke="#8a6038" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M 68 30 Q 76 16 80 8 M 76 18 Q 84 16 86 12" stroke="#8a6038" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
      )}

      {species === 'hamster' && (
        <>
          <circle cx="26" cy="30" r="11" fill="#f6c56e" stroke="#3a2622" strokeWidth="4" />
          <circle cx="26" cy="30" r="5.5" fill="#ffc2cf" />
          <circle cx="74" cy="30" r="11" fill="#f6c56e" stroke="#3a2622" strokeWidth="4" />
          <circle cx="74" cy="30" r="5.5" fill="#ffc2cf" />
        </>
      )}

      {species === 'tanuki' && (
        <>
          <circle cx="26" cy="28" r="13" fill="#9c8872" stroke="#3a2622" strokeWidth="4" />
          <circle cx="26" cy="28" r="6.5" fill="#5a4a3c" />
          <circle cx="74" cy="28" r="13" fill="#9c8872" stroke="#3a2622" strokeWidth="4" />
          <circle cx="74" cy="28" r="6.5" fill="#5a4a3c" />
        </>
      )}

      {species === 'panda' && (
        <>
          <circle cx="24" cy="28" r="14" fill="#26262b" stroke="#3a2622" strokeWidth="4" />
          <circle cx="76" cy="28" r="14" fill="#26262b" stroke="#3a2622" strokeWidth="4" />
        </>
      )}

      {/* ─── HEAD BASE ─── */}
      <circle
        cx="50"
        cy="58"
        r="36"
        fill={
          species === 'dog'
            ? '#f0cf9a'
            : species === 'cat'
            ? '#f6ae63'
            : species === 'rabbit'
            ? '#fbf8f5'
            : species === 'bear'
            ? '#a8763f'
            : species === 'fox'
            ? '#f0873a'
            : species === 'penguin'
            ? '#34466b'
            : species === 'deer'
            ? '#cc955a'
            : species === 'hamster'
            ? '#f6c56e'
            : species === 'tanuki'
            ? '#9c8872'
            : '#fbfbfb'
        }
        stroke="#3a2622"
        strokeWidth="4"
      />

      {/* ─── SPECIAL FACE PATCHES ─── */}
      {species === 'penguin' && (
        <>
          <ellipse cx="40" cy="58" rx="14" ry="18" fill="#ffffff" />
          <ellipse cx="60" cy="58" rx="14" ry="18" fill="#ffffff" />
        </>
      )}

      {species === 'panda' && (
        <>
          <ellipse cx="36" cy="54" rx="11" ry="14" fill="#26262b" transform="rotate(-15 36 54)" />
          <ellipse cx="64" cy="54" rx="11" ry="14" fill="#26262b" transform="rotate(15 64 54)" />
        </>
      )}

      {species === 'tanuki' && (
        <>
          <ellipse cx="36" cy="56" rx="12" ry="10" fill="#3e3129" transform="rotate(10 36 56)" />
          <ellipse cx="64" cy="56" rx="12" ry="10" fill="#3e3129" transform="rotate(-10 64 56)" />
        </>
      )}

      {species === 'dog' && (
        <ellipse cx="64" cy="50" rx="10" ry="12" fill="#a8733f" />
      )}

      {species === 'cat' && (
        <>
          {/* forehead stripes */}
          <line x1="50" y1="32" x2="50" y2="40" stroke="#d97d33" strokeWidth="3" strokeLinecap="round" />
          <line x1="43" y1="34" x2="44" y2="41" stroke="#d97d33" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="57" y1="34" x2="56" y2="41" stroke="#d97d33" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* ─── MUZZLE ─── */}
      {species !== 'penguin' && (
        <ellipse
          cx="50"
          cy={species === 'fox' ? '70' : '67'}
          rx={species === 'hamster' ? '22' : '18'}
          ry={species === 'hamster' ? '14' : '12'}
          fill={
            species === 'dog'
              ? '#fff6e6'
              : species === 'cat'
              ? '#fff1de'
              : species === 'bear'
              ? '#efd2a6'
              : species === 'fox'
              ? '#fff8ee'
              : species === 'deer'
              ? '#f8e8d2'
              : species === 'hamster'
              ? '#fff4de'
              : species === 'tanuki'
              ? '#f5e8d4'
              : '#ffffff'
          }
        />
      )}

      {/* ─── BLUSH ─── */}
      <ellipse cx="26" cy="65" rx="6" ry="3.5" fill="#ff8fa3" opacity="0.65" />
      <ellipse cx="74" cy="65" rx="6" ry="3.5" fill="#ff8fa3" opacity="0.65" />

      {/* ─── EYES ─── */}
      {species === 'panda' ? (
        <>
          <circle cx="37" cy="54" r="5" fill="#ffffff" />
          <circle cx="37" cy="54" r="3.5" fill="#1d1614" />
          <circle cx="38" cy="53" r="1.3" fill="#ffffff" />
          <circle cx="63" cy="54" r="5" fill="#ffffff" />
          <circle cx="63" cy="54" r="3.5" fill="#1d1614" />
          <circle cx="64" cy="53" r="1.3" fill="#ffffff" />
        </>
      ) : (
        <>
          <circle cx="36" cy="54" r="5" fill="#1d1614" />
          <circle cx="37.5" cy="52.5" r="1.8" fill="#ffffff" />
          <circle cx="35" cy="55.5" r="0.9" fill="#ffffff" />
          <circle cx="64" cy="54" r="5" fill="#1d1614" />
          <circle cx="65.5" cy="52.5" r="1.8" fill="#ffffff" />
          <circle cx="63" cy="55.5" r="0.9" fill="#ffffff" />
        </>
      )}

      {/* ─── NOSE / BEAK ─── */}
      {species === 'penguin' ? (
        <polygon points="50,72 43,62 57,62" fill="#ffb13b" stroke="#3a2622" strokeWidth="2.5" strokeLinejoin="round" />
      ) : (
        <>
          <ellipse
            cx="50"
            cy="64"
            rx="4.5"
            ry="3"
            fill={species === 'rabbit' || species === 'hamster' ? '#ff8fab' : '#2b1f1c'}
          />
          <path d="M 50 67 L 50 71 M 47 72 Q 50 74 53 72" stroke="#3a2622" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {(species === 'rabbit' || species === 'hamster') && (
            <rect x="48" y="72" width="4" height="4" fill="#ffffff" stroke="#3a2622" strokeWidth="1.5" rx="1" />
          )}
        </>
      )}

      {/* ─── WHISKERS ─── */}
      {(species === 'cat' || species === 'fox') && (
        <>
          <line x1="26" y1="64" x2="14" y2="61" stroke="#5a4a44" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="67" x2="14" y2="69" stroke="#5a4a44" strokeWidth="2" strokeLinecap="round" />
          <line x1="74" y1="64" x2="86" y2="61" stroke="#5a4a44" strokeWidth="2" strokeLinecap="round" />
          <line x1="74" y1="67" x2="86" y2="69" stroke="#5a4a44" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
