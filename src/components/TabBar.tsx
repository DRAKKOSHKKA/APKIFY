import React from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "../theme/colors";

export type TabType = "schedule" | "grades" | "profile";

interface TabBarProps {
	currentTab: TabType;
	theme: ThemeColors;
	glassEffect?: boolean;
	onSelectTab: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
	currentTab,
	theme,
	glassEffect = true,
	onSelectTab,
}) => {
	const insets = useSafeAreaInsets();

	const tabs: {
		key: TabType;
		label: string;
		activeIcon: any;
		inactiveIcon: any;
	}[] = [
		{
			key: "schedule",
			label: "Расписание",
			activeIcon: "calendar",
			inactiveIcon: "calendar-outline",
		},
		{
			key: "grades",
			label: "Оценки",
			activeIcon: "school",
			inactiveIcon: "school-outline",
		},
		{
			key: "profile",
			label: "Настройки",
			activeIcon: "settings",
			inactiveIcon: "settings-outline",
		},
	];

	const content = (
		<View
			style={[
				styles.innerContainer,
				{
					paddingBottom: Math.max(insets.bottom, 14),
					backgroundColor: glassEffect
						? "transparent"
						: theme.tabBarBackground,
					borderTopColor: theme.border,
				},
			]}
		>
			{tabs.map((tab) => {
				const isActive = currentTab === tab.key;
				const color = isActive
					? theme.accent
					: theme.textSecondary;

				return (
					<TouchableOpacity
						key={tab.key}
						style={styles.tabButton}
						activeOpacity={0.7}
						onPress={() => {
							if (!isActive) {
								try {
									Haptics.selectionAsync();
								} catch {}
								onSelectTab(tab.key);
							}
						}}
					>
						<View
							style={[
								styles.iconPill,
								isActive && {
									backgroundColor: theme.isDark
										? "rgba(255, 255, 255, 0.10)"
										: "rgba(0, 122, 255, 0.08)",
								},
							]}
						>
							<Ionicons
								name={
									isActive
										? tab.activeIcon
										: tab.inactiveIcon
								}
								size={22}
								color={color}
							/>
						</View>
						<Text
							style={[
								styles.tabLabel,
								{
									color,
									fontWeight: isActive
										? "600"
										: "500",
								},
							]}
							numberOfLines={1}
						>
							{tab.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);

	if (glassEffect && Platform.OS === "ios") {
		return (
			<BlurView
				intensity={theme.isDark ? 55 : 85}
				tint={theme.blurTint}
				style={styles.blurWrapper}
			>
				{content}
			</BlurView>
		);
	}

	return <View style={styles.solidWrapper}>{content}</View>;
};

const styles = StyleSheet.create({
	blurWrapper: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255, 255, 255, 0.15)",
	},
	solidWrapper: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
	},
	innerContainer: {
		flexDirection: "row",
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: 8,
		maxWidth: 600,
		width: "100%",
		alignSelf: "center",
	},
	tabButton: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	iconPill: {
		paddingHorizontal: 16,
		paddingVertical: 3,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	tabLabel: {
		fontSize: 10,
		marginTop: 3,
		letterSpacing: -0.2,
	},
});
