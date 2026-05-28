// logo.jsx — four logo glyph options, cycleable via Tweaks.
// All draw on currentColor so they pick up the amber accent.

const LogoShield = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" style={{ display: 'block' }}>
    <path d="M20 5 L31 9 L31 19 C31 26.5 20 32.5 20 32.5 C20 32.5 9 26.5 9 19 L9 9 Z"/>
  </svg>
);

const LogoRune = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <path d="M20 5 L29 14 L20 23 L11 14 Z"/>
    <path d="M20 23 L20 35"/>
    <path d="M14 29 L20 35 L26 29"/>
  </svg>
);

const LogoCrosshair = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ display: 'block' }}>
    <circle cx="20" cy="20" r="12"/>
    <path d="M20 4 L20 36 M4 20 L36 20"/>
    <circle cx="20" cy="20" r="3" fill="currentColor" stroke="none"/>
  </svg>
);

const LogoHexShield = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" style={{ display: 'block' }}>
    <path d="M20 4 L33 11 L33 25 L20 32 L7 25 L7 11 Z"/>
    <path d="M20 12 L27 16 L27 22 L20 26 L13 22 L13 16 Z" fill="currentColor" fillOpacity="0.35" stroke="none"/>
  </svg>
);

const LOGOS = [LogoShield, LogoRune, LogoCrosshair, LogoHexShield];
Object.assign(window, { LOGOS });
