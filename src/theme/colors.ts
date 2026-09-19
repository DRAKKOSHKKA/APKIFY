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
	lightColor: string;
	darkColor: string;
	subtleLight: string;
	subtleDark: string;
}

export const ACCENT_PALETTES: Record<
	AccentColor,
	AccentDefinition
> = {
	blue: {
		name: "Синий",
		color: "#007AFF",
		lightColor: "#007AFF",
		darkColor: "#0A84FF",
		subtleLight: "rgba(0, 122, 255, 0.12)",
		subtleDark: "rgba(10, 132, 255, 0.22)",
	},
	purple: {
		name: "Фиолетовый",
		color: "#AF52DE",
		lightColor: "#AF52DE",
		darkColor: "#BF5AF2",
		subtleLight: "rgba(175, 82, 222, 0.12)",
		subtleDark: "rgba(191, 90, 242, 0.22)",
	},
	green: {
		name: "Изумрудный",
		color: "#34C759",
		lightColor: "#34C759",
		darkColor: "#30D158",
		subtleLight: "rgba(52, 199, 89, 0.12)",
		subtleDark: "rgba(48, 209, 88, 0.22)",
	},
	orange: {
		name: "Оранжевый",
		color: "#FF9500",
		lightColor: "#FF9500",
		darkColor: "#FF9F0A",
		subtleLight: "rgba(255, 149, 0, 0.12)",
		subtleDark: "rgba(255, 159, 10, 0.22)",
	},
	pink: {
		name: "Розовый",
		color: "#FF2D55",
		lightColor: "#FF2D55",
		darkColor: "#FF375F",
		subtleLight: "rgba(255, 45, 85, 0.12)",
		subtleDark: "rgba(255, 55, 95, 0.22)",
	},
	teal: {
		name: "Бирюзовый",
		color: "#0097A7",
		lightColor: "#0097A7",
		darkColor: "#64D2FF",
		subtleLight: "rgba(0, 151, 167, 0.12)",
		subtleDark: "rgba(100, 210, 255, 0.22)",
	},
};

/** 1. Светлая тема (чистый Apple HIG Light) */
export const baseLightTheme = {
	isDark: false,
	background: "#F2F2F7",
	card: "#FFFFFF",
	cardSecondary: "#F7F7FA",
	text: "#000000",
	textSecondary: "#6C6C70",
	border: "#E5E5EA",
	separator: "#D1D1D6",
	success: "#34C759",
	successSubtle: "rgba(52, 199, 89, 0.14)",
	warning: "#FF9500",
	warningSubtle: "rgba(255, 149, 0, 0.14)",
	danger: "#FF3B30",
	chipBackground: "#E5E5EA",
	modalBackground: "#F2F2F7",
	searchBarBackground: "#E4E4E8",
	headerBackground: "#FFFFFF",
	tabBarBackground: "rgba(255, 255, 255, 0.90)",
	groupedCell: "#FFFFFF",
	glassCard: "rgba(255, 255, 255, 0.88)",
	glassBorder: "rgba(255, 255, 255, 0.95)",
	glassBar: "rgba(242, 242, 247, 0.85)",
	glassActiveCard: "rgba(52, 199, 89, 0.15)",
	blurTint: "light" as const,
};

/** 2. Серая графитовая тема (Apple Slate Dark) */
export const baseGrayTheme = {
	isDark: true,
	background: "#1C1C1E",
	card: "#2C2C2E",
	cardSecondary: "#3A3A3C",
	text: "#FFFFFF",
	textSecondary: "#AEAEB2",
	border: "#3A3A3C",
	separator: "#48484A",
	success: "#30D158",
	successSubtle: "rgba(48, 209, 88, 0.20)",
	warning: "#FF9F0A",
	warningSubtle: "rgba(255, 159, 10, 0.20)",
	danger: "#FF453A",
	chipBackground: "#3A3A3C",
	modalBackground: "#1C1C1E",
	searchBarBackground: "#3A3A3C",
	headerBackground: "#1C1C1E",
	tabBarBackground: "rgba(28, 28, 30, 0.90)",
	groupedCell: "#2C2C2E",
	glassCard: "rgba(44, 44, 46, 0.85)",
	glassBorder: "rgba(255, 255, 255, 0.18)",
	glassBar: "rgba(28, 28, 30, 0.85)",
	glassActiveCard: "rgba(48, 209, 88, 0.22)",
	blurTint: "dark" as const,
};

/** 3. Тёмная глубокая тема (Midnight Charcoal) */
export const baseDarkTheme = {
	isDark: true,
	background: "#121214",
	card: "#1C1C20",
	cardSecondary: "#24242A",
	text: "#FFFFFF",
	textSecondary: "#98989F",
	border: "#28282E",
	separator: "#34343C",
	success: "#30D158",
	successSubtle: "rgba(48, 209, 88, 0.20)",
	warning: "#FF9F0A",
	warningSubtle: "rgba(255, 159, 10, 0.20)",
	danger: "#FF453A",
	chipBackground: "#24242A",
	modalBackground: "#121214",
	searchBarBackground: "#222228",
	headerBackground: "#121214",
	tabBarBackground: "rgba(18, 18, 20, 0.90)",
	groupedCell: "#1C1C20",
	glassCard: "rgba(28, 28, 32, 0.85)",
	glassBorder: "rgba(255, 255, 255, 0.15)",
	glassBar: "rgba(18, 18, 20, 0.85)",
	glassActiveCard: "rgba(48, 209, 88, 0.22)",
	blurTint: "dark" as const,
};

/** 4. OLED True Black тема (#000000 для Super Retina экранов) */
export const baseOledTheme = {
	isDark: true,
	background: "#000000",
	card: "#0E0E10",
	cardSecondary: "#18181C",
	text: "#FFFFFF",
	textSecondary: "#9CA3AF",
	border: "#1E1E24",
	separator: "#27272E",
	success: "#30D158",
	successSubtle: "rgba(48, 209, 88, 0.20)",
	warning: "#FF9F0A",
	warningSubtle: "rgba(255, 159, 10, 0.20)",
	danger: "#FF453A",
	chipBackground: "#18181C",
	modalBackground: "#000000",
	searchBarBackground: "#18181C",
	headerBackground: "#000000",
	tabBarBackground: "rgba(0, 0, 0, 0.95)",
	groupedCell: "#0E0E10",
	glassCard: "rgba(14, 14, 16, 0.90)",
	glassBorder: "rgba(255, 255, 255, 0.14)",
	glassBar: "rgba(0, 0, 0, 0.92)",
	glassActiveCard: "rgba(48, 209, 88, 0.24)",
	blurTint: "dark" as const,
};

// Экспорты по умолчанию для обратной совместимости
export const lightTheme: ThemeColors = {
	...baseLightTheme,
	themeMode: "light",
	accentColor: "blue",
	accent: ACCENT_PALETTES.blue.lightColor,
	accentSubtle: ACCENT_PALETTES.blue.subtleLight,
	chipSelected: ACCENT_PALETTES.blue.lightColor,
};

export const darkTheme: ThemeColors = {
	...baseDarkTheme,
	themeMode: "dark",
	accentColor: "blue",
	accent: ACCENT_PALETTES.blue.darkColor,
	accentSubtle: ACCENT_PALETTES.blue.subtleDark,
	chipSelected: ACCENT_PALETTES.blue.darkColor,
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

	// Определяем эффективный режим оформления:
	let effectiveMode: "light" | "gray" | "dark" | "oled" =
		"light";

	if (themeMode === "system") {
		effectiveMode =
			systemScheme === "dark" ? "dark" : "light";
	} else if (themeMode === "light") {
		effectiveMode = "light";
	} else if (themeMode === "gray") {
		effectiveMode = "gray";
	} else if (themeMode === "dark") {
		effectiveMode = "dark";
	} else if (themeMode === "oled") {
		effectiveMode = "oled";
	}

	const isDark = effectiveMode !== "light";
	const base =
		effectiveMode === "light"
			? baseLightTheme
			: effectiveMode === "gray"
				? baseGrayTheme
				: effectiveMode === "oled"
					? baseOledTheme
					: baseDarkTheme;

	const accent = isDark ? pal.darkColor : pal.lightColor;
	const accentSubtle = isDark
		? pal.subtleDark
		: pal.subtleLight;

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
