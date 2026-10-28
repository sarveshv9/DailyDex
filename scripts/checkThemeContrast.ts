/**
 * scripts/checkThemeContrast.ts
 *
 * Automated WCAG Contrast Verification & Vibrant Palette Check.
 * Runs in plain Node.js / tsx without React Native or DOM dependencies.
 *
 * Usage: npx tsx scripts/checkThemeContrast.ts
 */

import { createTheme } from "../constants/themeGenerator";
import { THEME_ACCENTS } from "../constants/themeRegistry";
import {
  blendOpaque,
  clampForContrast,
  contrastRatio,
  scaleChroma,
} from "../utils/color";

interface ContrastCheck {
  name: string;
  ratio: number;
  minRequired: number;
  passed: boolean;
  colorA: string;
  colorB: string;
}

interface PresetResult {
  name: string;
  mode: "light" | "dark";
  inputAccent: string;
  primary: string;
  wasAdjusted: boolean;
  onPrimary: string;
  primaryText: string;
  checks: ContrastCheck[];
  passed: boolean;
}

function runVerification() {
  console.log("================================================================================");
  console.log("             ZEN APP THEME CONTRAST & READABILITY VERIFICATION                  ");
  console.log("================================================================================\n");

  const results: PresetResult[] = [];
  let totalFailures = 0;

  for (const [name, config] of Object.entries(THEME_ACCENTS)) {
    for (const mode of ["light", "dark"] as const) {
      const isDark = mode === "dark";
      const theme = createTheme(config.accent, mode);
      const { colors } = theme;

      // Soft fills for status colors
      const warningSoft = blendOpaque(colors.warning, colors.surface, isDark ? 0.2 : 0.14);
      const successSoft = blendOpaque(colors.success, colors.surface, isDark ? 0.2 : 0.14);
      const infoSoft = blendOpaque(colors.info, colors.surface, isDark ? 0.2 : 0.14);

      const fillMinRequired = isDark ? 3.0 : 2.0;

      const checks: ContrastCheck[] = [
        {
          name: "primary vs background",
          colorA: colors.primary,
          colorB: colors.background,
          minRequired: fillMinRequired,
          ratio: contrastRatio(colors.primary, colors.background),
          passed: false,
        },
        {
          name: "onPrimary vs primary",
          colorA: colors.onPrimary,
          colorB: colors.primary,
          minRequired: 4.5,
          ratio: contrastRatio(colors.onPrimary, colors.primary),
          passed: false,
        },
        {
          name: "primaryText vs surface",
          colorA: colors.primaryText,
          colorB: colors.surface,
          minRequired: 4.5,
          ratio: contrastRatio(colors.primaryText, colors.surface),
          passed: false,
        },
        {
          name: "primaryText vs primarySoft",
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
          name: "dangerText vs surface",
          colorA: colors.dangerText,
          colorB: colors.surface,
          minRequired: 4.5,
          ratio: contrastRatio(colors.dangerText, colors.surface),
          passed: false,
        },
        {
          name: "dangerText vs dangerSoft",
          colorA: colors.dangerText,
          colorB: colors.dangerSoft,
          minRequired: 4.5,
          ratio: contrastRatio(colors.dangerText, colors.dangerSoft),
          passed: false,
        },
        {
          name: "warningText vs surface",
          colorA: colors.warningText,
          colorB: colors.surface,
          minRequired: 4.5,
          ratio: contrastRatio(colors.warningText, colors.surface),
          passed: false,
        },
        {
          name: "warningText vs warningSoft",
          colorA: colors.warningText,
          colorB: warningSoft,
          minRequired: 4.5,
          ratio: contrastRatio(colors.warningText, warningSoft),
          passed: false,
        },
        {
          name: "successText vs surface",
          colorA: colors.successText,
          colorB: colors.surface,
          minRequired: 4.5,
          ratio: contrastRatio(colors.successText, colors.surface),
          passed: false,
        },
        {
          name: "successText vs successSoft",
          colorA: colors.successText,
          colorB: successSoft,
          minRequired: 4.5,
          ratio: contrastRatio(colors.successText, successSoft),
          passed: false,
        },
        {
          name: "infoText vs surface",
          colorA: colors.infoText,
          colorB: colors.surface,
          minRequired: 4.5,
          ratio: contrastRatio(colors.infoText, colors.surface),
          passed: false,
        },
        {
          name: "infoText vs infoSoft",
          colorA: colors.infoText,
          colorB: infoSoft,
          minRequired: 4.5,
          ratio: contrastRatio(colors.infoText, infoSoft),
          passed: false,
        },
      ];

      for (const c of checks) {
        c.passed = c.ratio >= c.minRequired - 0.05;
        if (!c.passed) totalFailures++;
      }

      results.push({
        name,
        mode,
        inputAccent: config.accent,
        primary: colors.primary,
        wasAdjusted: theme.wasAdjusted,
        onPrimary: colors.onPrimary,
        primaryText: colors.primaryText,
        checks,
        passed: checks.every((c) => c.passed),
      });
    }
  }

  // Print results
  for (const r of results) {
    const statusIcon = r.passed ? "✓ PASS" : "✗ FAIL";
    const adjStatus = r.wasAdjusted ? "(adjusted)" : "(original)";
    console.log(`[${statusIcon}] ${r.name.padEnd(10)} | ${r.mode.padEnd(5)} | input: ${r.inputAccent} -> primary: ${r.primary} ${adjStatus}`);
    console.log(`       onPrimary: ${r.onPrimary} | primaryText: ${r.primaryText}`);
    const ratiosSummary = r.checks
      .slice(0, 5)
      .map((c) => `${c.name.split(" ")[0]}: ${c.ratio.toFixed(2)}:1`)
      .join(" | ");
    console.log(`       ratios: ${ratiosSummary}`);

    const failingChecks = r.checks.filter((c) => !c.passed);
    if (failingChecks.length > 0) {
      console.log("       FAILURES:");
      for (const fc of failingChecks) {
        console.log(`         - ${fc.name}: ${fc.ratio.toFixed(2)}:1 (req >= ${fc.minRequired}) [${fc.colorA} on ${fc.colorB}]`);
      }
    }
    console.log("");
  }

  // Before vs After Comparison for Pikachu, Bulbasaur, Charizard in Light Mode
  console.log("================================================================================");
  console.log("       BEFORE / AFTER COMPARISON: LIGHT MODE VIBRANCY (MUDDINESS CHECK)         ");
  console.log("================================================================================\n");

  const highlightPresets = ["pikachu", "bulbasaur", "charizard"];
  for (const key of highlightPresets) {
    const config = THEME_ACCENTS[key];
    if (!config) continue;

    // Previous approach: 3.0:1 on pure white #FFFFFF without gamut mapping
    const prevOld = clampForContrast(config.accent, "#FFFFFF", 3.0, "light");
    const prevRatio = contrastRatio(prevOld.hex, "#FFFFFF");

    // Current approach: 2.0:1 on white #FFFFFF with gamut mapping
    const curTheme = createTheme(config.accent, "light");
    const curRatio = contrastRatio(curTheme.colors.primary, curTheme.colors.background);

    console.log(`• ${config.label.padEnd(12)} (${config.accent}):`);
    console.log(`    BEFORE: primary: ${prevOld.hex} | contrast: ${prevRatio.toFixed(2)}:1 | adjusted: ${prevOld.wasAdjusted ? "YES (darkened into mustard/muddy)" : "NO"}`);
    console.log(`    AFTER:  primary: ${curTheme.colors.primary} | contrast: ${curRatio.toFixed(2)}:1 | adjusted: ${curTheme.wasAdjusted ? "YES" : "NO (kept vibrant)"}`);
    console.log("");
  }

  console.log("================================================================================");
  console.log(`TOTAL THEMES EVALUATED: ${results.length}`);
  console.log(`TOTAL FAILURES:         ${totalFailures}`);
  console.log("================================================================================\n");

  if (totalFailures > 0) {
    process.exit(1);
  } else {
    console.log("All contrast targets satisfied! 🎉\n");
    process.exit(0);
  }
}

runVerification();
