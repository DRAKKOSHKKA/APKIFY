import { AccentColor, ThemeMode } from "../types/schedule";

export interface ThemeColors {
	isDark: boolean;
	themeMode: ThemeMode;
	accentColor: AccentColor;
	background: string;
	card: string;
	cardSecondary: string;
	text: string;
	textSecondary: string;
	border: string;
	separator: string;
	accent: string;
	accentSubtle: string;
	success: string;
	successSubtle: string;
	warning: string;
	warningSubtle: string;
	danger: string;
	chipBackground: string;
	chipSelected: string;
	modalBackground: string;
	searchBarBackground: string;
	headerBackground: string;
	tabBarBackground: string;
	groupedCell: string;
	// Liquid Glass свойства
	glassCard: string;
	glassBorder: string;
	glassBar: string;
	glassActiveCard: string;
	blurTint: "light" | "dark";
}

export interface AccentDefinition {
	name: string;
	color: string;
	subtleLight: string;
	subtleDark: string;
}

export const ACCENT_PALETTES: Record<AccentColor, AccentDefinition> = {
	blue: {
		name: "Синий",
		color: "#007AFF",
		subtleLight: "#EBF3FF",
		subtleDark: "#0A2540",
	},
	purple: {
		name: "Фиолетовый",
		color: "#AF52DE",
		subtleLight: "#F5EBFC",
		subtleDark: "#2B1138",
	},
	green: {
		name: "Изумрудный",
		color: "#34C759",
		subtleLight: "#E8F8ED",
		subtleDark: "#0E2B16",
	},
	orange: {
		name: "Оранжевый",
		color: "#FF9500",
		subtleLight: "#FFF4E5",
		subtleDark: "#382000",
	},
	pink: {
		name: "Розовый",
		color: "#FF2D55",
		subtleLight: "#FFEBF0",
		subtleDark: "#3B0E18",
	},
	teal: {
		name: "Бирюзовый",
		color: "#30B0C7",
		subtleLight: "#E5F7FA",
		subtleDark: "#092930",
	},
};

export const baseLightTheme = {
	isDark: false,
	background: "#F2F2F7",
	card: "#FFFFFF",
	cardSecondary: "#FAFAFC",
	text: "#000000",
	textSecondary: "#8E8E93",
	border: "#E5E5EA",
	separator: "#C6C6C8",
	success: "#34C759",
	successSubtle: "#E8F8ED",
	warning: "#FF9500",
	warningSubtle: "#FFF8E6",
	danger: "#FF3B30",
	chipBackground: "#E5E5EA",
	modalBackground: "#F2F2F7",
	searchBarBackground: "#EFEFF0",
	headerBackground: "#FFFFFF",
	tabBarBackground: "rgba(255, 255, 255, 0.82)",
	groupedCell: "#FFFFFF",
	glassCard: "rgba(255, 255, 255, 0.85)",
	glassBorder: "rgba(255, 255, 255, 0.95)",
	glassBar: "rgba(242, 242, 247, 0.82)",
	glassActiveCard: "rgba(52, 199, 89, 0.14)",
	blurTint: "light" as const,
};

export const baseGrayTheme = {
	isDark: true,
	background: "#121214",
	card: "#1C1C1E",
	cardSecondary: "#2C2C2E",
	text: "#FFFFFF",
	textSecondary: "#8E8E93",
	border: "#2C2C2E",
	separator: "#38383A",
	success: "#30D158",
	successSubtle: "#0D3318",
	warning: "#FF9F0A",
	warningSubtle: "#3B2600",
	danger: "#FF453A",
	chipBackground: "#2C2C2E",
	modalBackground: "#1C1C1E",
	searchBarBackground: "#2C2C2E",
	headerBackground: "#121214",
	tabBarBackground: "rgba(18, 18, 20, 0.82)",
	groupedCell: "#1C1C1E",
	glassCard: "rgba(28, 28, 30, 0.82)",
	glassBorder: "rgba(255, 255, 255, 0.18)",
	glassBar: "rgba(0, 0, 0, 0.78)",
	glassActiveCard: "rgba(48, 209, 88, 0.20)",
	blurTint: "dark" as const,
};

export const baseOledTheme = {
	isDark: true,
	background: "#000000",
	card: "#0D0D0E",
	cardSecondary: "#161618",
	text: "#FFFFFF",
	textSecondary: "#98989E",
	border: "#222226",
	separator: "#2C2C30",
	success: "#30D158",
	successSubtle: "#0A2612",
	warning: "#FF9F0A",
	warningSubtle: "#301F00",
	danger: "#FF453A",
	chipBackground: "#18181B",
	modalBackground: "#000000",
	searchBarBackground: "#18181B",
	headerBackground: "#000000",
	tabBarBackground: "rgba(0, 0, 0, 0.90)",
	groupedCell: "#0D0D0E",
	glassCard: "rgba(14, 14, 16, 0.88)",
	glassBorder: "rgba(255, 255, 255, 0.14)",
	glassBar: "rgba(0, 0, 0, 0.88)",
	glassActiveCard: "rgba(48, 209, 88, 0.22)",
	blurTint: "dark" as const,
};

// Экспорты по умолчанию для обратной совместимости
export const lightTheme: ThemeColors = {
	...baseLightTheme,
	themeMode: "light",
	accentColor: "blue",
	accent: ACCENT_PALETTES.blue.color,
	accentSubtle: ACCENT_PALETTES.blue.subtleLight,
	chipSelected: ACCENT_PALETTES.blue.color,
};

export const darkTheme: ThemeColors = {
	...baseGrayTheme,
	themeMode: "gray",
	accentColor: "blue",
	accent: ACCENT_PALETTES.blue.color,
	accentSubtle: ACCENT_PALETTES.blue.subtleDark,
	chipSelected: ACCENT_PALETTES.blue.color,
};

/**
 * Получение активной цветовой схемы с учётом режима и акцентного цвета
 */
export function getActiveTheme(
	themeMode: ThemeMode = "system",
	accentColor: AccentColor = "blue",
	systemScheme?: string | null
): ThemeColors {
	const validAccent: AccentColor = ACCENT_PALETTES[accentColor]
		? accentColor
		: "blue";
	const pal = ACCENT_PALETTES[validAccent];

	// Определяем эффективный режим оформления
	let effectiveMode: "light" | "gray" | "oled" = "light";

	if (themeMode === "system") {
		effectiveMode = systemScheme === "dark" ? "gray" : "light";
	} else if (themeMode === "light") {
		effectiveMode = "light";
	} else if (themeMode === "gray" || themeMode === "dark") {
		effectiveMode = "gray";
	} else if (themeMode === "oled") {
		effectiveMode = "oled";
	}

	const isDark = effectiveMode !== "light";
	const base =
		effectiveMode === "light"
			? baseLightTheme
			: effectiveMode === "oled"
				? baseOledTheme
				: baseGrayTheme;

	const accent = pal.color;
	const accentSubtle = isDark ? pal.subtleDark : pal.subtleLight;

	return {
		...base,
		themeMode,
		accentColor: validAccent,
		accent,
		accentSubtle,
		chipSelected: accent,
	};
}

export function getTheme(scheme?: string | null): ThemeColors {
	return getActiveTheme("system", "blue", scheme);
}
