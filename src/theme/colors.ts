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
}

export const lightTheme: ThemeColors = {
	isDark: false,
	background: "#F2F2F7",
	card: "#FFFFFF",
	cardSecondary: "#FAFAFC",
	text: "#000000",
	textSecondary: "#8E8E93",
	border: "#E5E5EA",
	separator: "#D1D1D6",
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
};

export function getTheme(scheme?: string | null): ThemeColors {
	return scheme === "dark" ? darkTheme : lightTheme;
}
