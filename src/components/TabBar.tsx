import React from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "../theme/colors";

export type TabType = "schedule" | "profile";

interface TabBarProps {
	currentTab: TabType;
	theme: ThemeColors;
	onSelectTab: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
	currentTab,
	theme,
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
			key: "profile",
			label: "Профиль",
			activeIcon: "person-circle",
			inactiveIcon: "person-circle-outline",
		},
	];

	return (
		<View
			style={[
				styles.bar,
				{
					backgroundColor: theme.tabBarBackground,
					borderTopColor: theme.border,
					paddingBottom: Math.max(insets.bottom, 12),
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
						<Ionicons
							name={
								isActive
									? tab.activeIcon
									: tab.inactiveIcon
							}
							size={24}
							color={color}
						/>
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
						>
							{tab.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
};

const styles = StyleSheet.create({
	bar: {
		flexDirection: "row",
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: 8,
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		elevation: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
	},
	tabButton: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	tabLabel: {
		fontSize: 10,
		marginTop: 3,
		letterSpacing: -0.2,
	},
});
