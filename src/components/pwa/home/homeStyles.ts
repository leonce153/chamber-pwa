/** Assistant ("Ask the Mule") avatar. index.php points this at the copy saved on this server. */
const CHAMBER = (typeof window !== 'undefined' ? (window as unknown as { __CHAMBER__?: { assistantImage?: string } }).__CHAMBER__ : undefined) ?? {};
export const MULE_IMG = CHAMBER.assistantImage || 'https://base44.app/api/apps/6a8c85d1bf3d91ec40ae059d/files/mp/public/6a8c85d1bf3d91ec40ae059d/da7544186_MuleAIConcciergeLogo.png';
export const DISPLAY_FONT = "'Playfair Display', Georgia, serif";
export const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C6E73]';

/** Home card colors for light and dark mode (unchanged from the original Home). */
export function homePalette(isDark: boolean) {
  return {
    card: isDark ?
    { backgroundColor: '#1C2026', border: '1px solid #2A3037' } :
    { backgroundColor: '#FFFFFF', border: '1px solid #DCE3E7' },
    lineColor: isDark ? '#2A3037' : '#DCE3E7',
    muted: isDark ? '#A3ACB5' : '#5B6670'
  };
}
