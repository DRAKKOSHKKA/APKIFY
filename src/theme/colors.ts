import { ThemeMode } from "../types/schedule";

export interface ThemeColors {
	isDark: boolean;
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

export const lightTheme: ThemeColors = {
	isDark: false,
	background: "#F2F2F7",
	card: "#FFFFFF",
	cardSecondary: "#FAFAFC",
	text: "#000000",
	textSecondary: "#8E8E93",
	border: "#E5E5EA",
	separator: "#C6C6C8",
	accent: "#007AFF",
	accentSubtle: "#E5F1FF",
	success: "#34C759",
	successSubtle: "#E8F8ED",
	warning: "#FF9500",
	warningSubtle: "#FFF8E6",
	danger: "#FF3B30",
	chipBackground: "#E5E5EA",
	chipSelected: "#007AFF",
	modalBackground: "#F2F2F7",
	searchBarBackground: "#EFEFF0",
	headerBackground: "#FFFFFF",
	tabBarBackground: "rgba(255, 255, 255, 0.82)",
	groupedCell: "#FFFFFF",
	// Liquid Glass (iOS 27 Tinted Glass)
	glassCard: "rgba(255, 255, 255, 0.85)",
	glassBorder: "rgba(255, 255, 255, 0.95)",
	glassBar: "rgba(242, 242, 247, 0.82)",
	glassActiveCard: "rgba(52, 199, 89, 0.14)",
	blurTint: "light",
};

export const darkTheme: ThemeColors = {
	isDark: true,
	background: "#000000",
	card: "#1C1C1E",
	cardSecondary: "#2C2C2E",
	text: "#FFFFFF",
	textSecondary: "#8E8E93",
	border: "#2C2C2E",
	separator: "#38383A",
	accent: "#0A84FF",
	accentSubtle: "#0A2540",
	success: "#30D158",
	successSubtle: "#0D3318",
	warning: "#FF9F0A",
	warningSubtle: "#3B2600",
	danger: "#FF453A",
	chipBackground: "#2C2C2E",
	chipSelected: "#0A84FF",
	modalBackground: "#1C1C1E",
	searchBarBackground: "#2C2C2E",
	headerBackground: "#121214",
	tabBarBackground: "rgba(18, 18, 20, 0.82)",
	groupedCell: "#1C1C1E",
	// Liquid Glass (iOS 27 Tinted Glass)
	glassCard: "rgba(28, 28, 30, 0.82)",
	glassBorder: "rgba(255, 255, 255, 0.18)",
	glassBar: "rgba(0, 0, 0, 0.78)",
	glassActiveCard: "rgba(48, 209, 88, 0.20)",
	blurTint: "dark",
};

export function getActiveTheme(
	themeMode: ThemeMode = "system",
	systemScheme?: string | null
): ThemeColors {
	if (themeMode === "light") return lightTheme;
	if (themeMode === "dark") return darkTheme;
	return systemScheme === "dark" ? darkTheme : lightTheme;
}

export function getTheme(scheme?: string | null): ThemeColors {
	return scheme === "dark" ? darkTheme : lightTheme;
}
