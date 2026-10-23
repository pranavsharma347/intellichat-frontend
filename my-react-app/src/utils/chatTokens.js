// Shared look for IntelliChat pages (Home + Chat).
// Orange stays as the brand accent (same as IntelliDocs); the neutrals are a cool ink-blue
// so the two products feel related but not identical.

export const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Hind:wght@400;500;600&display=swap');";

export function getTokens(theme) {
  if (theme === "dark") {
    return {
      "--bg": "#0F1420",
      "--surface": "#161D2D",
      "--surface-2": "#1F2840",
      "--line": "#2B3652",
      "--ink": "#EDF0F7",
      "--muted": "#9AA6BF",
      "--accent": "#FF7B00",
      "--accent-ink": "#101522",
      "--accent-text": "#FF9A3D",
      "--accent-soft": "rgba(255,123,0,0.15)",
      "--danger": "#FF8590",
    };
  }
  return {
    "--bg": "#F5F6FA",
    "--surface": "#FFFFFF",
    "--surface-2": "#EBEEF5",
    "--line": "#DCE0EA",
    "--ink": "#131A2B",
    "--muted": "#5A647B",
    "--accent": "#FF7B00",
    "--accent-ink": "#131A2B",
    "--accent-text": "#B84E00",
    "--accent-soft": "rgba(255,123,0,0.12)",
    "--danger": "#C62F3E",
  };
}
