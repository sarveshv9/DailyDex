/**
 * scripts/check-theme-contrast.ts
 *
 * Automated WCAG Contrast Verification Script.
 * Runs in plain Node.js / tsx without React Native or DOM dependencies.
 *
 * Verifies contrast ratios across:
 * 1. All registered Pokémon theme presets (light + dark)
 * 2. An adversarial stress set of extreme colors (white, black, neons, pastels)
 * 3. 200 seeded pseudo-random hex colors simulating arbitrary user-created themes
 *
 * Exits with status 1 on ANY contrast failure.
 */

import { createTheme, GeneratedTheme } from "../constants/themeGenerator";
import { THEME_ACCENTS } from "../constants/themeRegistry";
import { contrastRatio } from "../utils/color";

interface ContrastCheck {
  name: string;
  ratio: number;
  minRequired: number;
  passed: boolean;
  colorA: string;
  colorB: string;
}

interface EvaluationResult {
  source: string;
  accent: string;
  mode: "light" | "dark";
  theme: GeneratedTheme;
  checks: ContrastCheck[];
  passed: boolean;
}

// Seeded PRNG (Mulberry32) for reproducible random color generation
function createPRNG(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createPRNG(1337);

function randomHex(): string {
  const r = Math.floor(random() * 256).toString(16).padStart(2, "0");
  const g = Math.floor(random() * 256).toString(16).padStart(2, "0");
  const b = Math.floor(random() * 256).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`.toUpperCase();
}

function evaluateTheme(source: string, accent: string, mode: "light" | "dark"): EvaluationResult {
  const theme = createTheme(accent, mode);
  const { colors } = theme;

  const checks: ContrastCheck[] = [
    {
      name: "primary vs background (UI element)",
      colorA: colors.primary,
      colorB: colors.background,
      minRequired: 3.0,
      ratio: contrastRatio(colors.primary, colors.background),
      passed: false,
    },
    {
      name: "onPrimary vs primary (button text)",
      colorA: colors.onPrimary,
      colorB: colors.primary,
      minRequired: 4.5,
      ratio: contrastRatio(colors.onPrimary, colors.primary),
      passed: false,
    },
    {
      name: "primaryText vs surface (accent text)",
      colorA: colors.primaryText,
      colorB: colors.surface,
      minRequired: 4.5,
      ratio: contrastRatio(colors.primaryText, colors.surface),
      passed: false,
    },
    {
      name: "primaryText vs primarySoft (active badge/icon)",
      colorA: colors.primaryText,
      colorB: colors.primarySoft,
      minRequired: 4.5,
      ratio: contrastRatio(colors.primaryText, colors.primarySoft),
      passed: false,
    },
    {
      name: "primaryText vs background",
      colorA: colors.primaryText,
      colorB: colors.background,
      minRequired: 4.5,
      ratio: contrastRatio(colors.primaryText, colors.background),
      passed: false,
    },
    {
      name: "text vs background",
      colorA: colors.text,
      colorB: colors.background,
      minRequired: 4.5,
      ratio: contrastRatio(colors.text, colors.background),
      passed: false,
    },
    {
      name: "text vs surface",
      colorA: colors.text,
      colorB: colors.surface,
      minRequired: 4.5,
      ratio: contrastRatio(colors.text, colors.surface),
      passed: false,
    },
    {
      name: "text vs surfaceMuted",
      colorA: colors.text,
      colorB: colors.surfaceMuted,
      minRequired: 4.5,
      ratio: contrastRatio(colors.text, colors.surfaceMuted),
      passed: false,
    },
    {
      name: "textSecondary vs background",
      colorA: colors.textSecondary,
      colorB: colors.background,
      minRequired: 4.5,
      ratio: contrastRatio(colors.textSecondary, colors.background),
      passed: false,
    },
    {
      name: "textSecondary vs surface",
      colorA: colors.textSecondary,
      colorB: colors.surface,
      minRequired: 4.5,
      ratio: contrastRatio(colors.textSecondary, colors.surface),
      passed: false,
    },
    {
      name: "danger vs surface",
      colorA: colors.danger,
      colorB: colors.surface,
      minRequired: 4.5,
      ratio: contrastRatio(colors.danger, colors.surface),
      passed: false,
    },
  ];

  for (const c of checks) {
    c.passed = c.ratio >= c.minRequired - 0.05; // allow small rounding margin
  }

  const passed = checks.every((c) => c.passed);
  return { source, accent, mode, theme, checks, passed };
}

function runVerification() {
  console.log("==================================================================");
  console.log("            ZEN APP THEME CONTRAST & READABILITY SUITE            ");
  console.log("==================================================================\n");

  const results: EvaluationResult[] = [];

  // 1. Preset Accents
  for (const [name, config] of Object.entries(THEME_ACCENTS)) {
    results.push(evaluateTheme(`Preset: ${name}`, config.accent, "light"));
    results.push(evaluateTheme(`Preset: ${name}`, config.accent, "dark"));
  }

  // 2. Stress Set
  const stressAccents: Record<string, string> = {
    "pure-white": "#FFFFFF",
    "near-white": "#F8F9FA",
    "pure-black": "#000000",
    "near-black": "#111111",
    "saturated-yellow": "#FFEE00",
    "neon-green": "#39FF14",
    "mid-gray": "#808080",
    "desaturated-pastel": "#FDE2E4",
    "deep-navy": "#000080",
    "hot-pink": "#FF1493",
  };

  for (const [label, hex] of Object.entries(stressAccents)) {
    results.push(evaluateTheme(`Stress: ${label}`, hex, "light"));
    results.push(evaluateTheme(`Stress: ${label}`, hex, "dark"));
  }

  // 3. 200 Seeded Random Accents (simulating custom user inputs)
  for (let i = 1; i <= 200; i++) {
    const hex = randomHex();
    results.push(evaluateTheme(`Random #${i}`, hex, "light"));
    results.push(evaluateTheme(`Random #${i}`, hex, "dark"));
  }

  let failuresCount = 0;
  const failureReports: string[] = [];

  for (const r of results) {
    if (!r.passed) {
      failuresCount++;
      const failingChecks = r.checks.filter((c) => !c.passed);
      failureReports.push(
        `FAIL: [${r.source}] accent=${r.accent} mode=${r.mode}\n` +
          failingChecks
            .map(
              (c) =>
                `  - ${c.name}: ratio=${c.ratio.toFixed(2)} (required >= ${c.minRequired}) [${c.colorA} on ${c.colorB}]`
            )
            .join("\n")
      );
    }
  }

  // Summary Table for Presets & Stress
  console.log("PRESET & STRESS SUITE RESULTS:");
  console.log("------------------------------------------------------------------");
  const headlineResults = results.slice(0, Object.keys(THEME_ACCENTS).length * 2 + Object.keys(stressAccents).length * 2);

  for (const r of headlineResults) {
    const icon = r.passed ? "✓ PASS" : "✗ FAIL";
    const status = r.theme.wasAdjusted ? "(adjusted)" : "(original)";
    console.log(
      `${icon.padEnd(8)} | ${r.source.padEnd(25)} | ${r.mode.padEnd(6)} | input: ${r.accent} -> primary: ${r.theme.colors.primary} ${status}`
    );
  }

  console.log("\nRANDOM SIMULATION SUITE (200 random colors x 2 modes = 400 themes):");
  console.log("------------------------------------------------------------------");
  const randomResults = results.slice(headlineResults.length);
  const randomPassCount = randomResults.filter((r) => r.passed).length;
  console.log(`Passed: ${randomPassCount} / ${randomResults.length}`);

  console.log("\n==================================================================");
  console.log(`TOTAL THEMES TESTED: ${results.length}`);
  console.log(`TOTAL PASSES:        ${results.length - failuresCount}`);
  console.log(`TOTAL FAILURES:      ${failuresCount}`);
  console.log("==================================================================\n");

  if (failuresCount > 0) {
    console.error("FAILURES DETECTED:\n");
    console.error(failureReports.slice(0, 20).join("\n\n"));
    if (failureReports.length > 20) {
      console.error(`\n... and ${failureReports.length - 20} more failures.`);
    }
    process.exit(1);
  } else {
    console.log("All contrast and readability checks passed successfully! 🎉\n");
    process.exit(0);
  }
}

runVerification();
