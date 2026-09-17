import React from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SearchResultItem } from "../types/schedule";
import { ThemeColors } from "../theme/colors";

interface HeaderProps {
	entity: SearchResultItem;
	weekNum: string;
	theme: ThemeColors;
	onOpenSearch: () => void;
	onOpenWeeks: () => void;
}

export const Header: React.FC<HeaderProps> = ({
	entity,
	weekNum,
	theme,
	onOpenSearch,
	onOpenWeeks,
}) => {
	return (
		<View
			style={[
				styles.container,
				{ borderBottomColor: theme.border },
			]}
		>
			{/* Левая часть: название группы / преподавателя */}
			<TouchableOpacity
				style={styles.entityRow}
				activeOpacity={0.7}
				onPress={() => {
					try {
						Haptics.impactAsync(
							Haptics.ImpactFeedbackStyle.Light
						);
					} catch {}
					onOpenSearch();
				}}
			>
				<Text
					style={[styles.title, { color: theme.text }]}
					numberOfLines={1}
				>
					{entity.SearchContent}
				</Text>
				<Ionicons
					name="chevron-down-circle"
					size={18}
					color={theme.accent}
					style={styles.chevronIcon}
				/>
			</TouchableOpacity>

			{/* Правая часть: кнопка недели (поиск открывается по тапу на название со стрелочкой) */}
			<View style={styles.rightActions}>
				{/* Кнопка недели */}
				<TouchableOpacity
					style={[
						styles.weekPill,
						{
							backgroundColor:
								theme.chipBackground,
						},
					]}
					activeOpacity={0.7}
					onPress={() => {
						try {
							Haptics.impactAsync(
								Haptics.ImpactFeedbackStyle.Light
							);
						} catch {}
						onOpenWeeks();
					}}
				>
					<Text
						style={[
							styles.weekPillText,
							{ color: theme.text },
						]}
					>
						{weekNum ? `${weekNum} нед.` : "Неделя"}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 18,
		paddingTop: 8,
		paddingBottom: 10,
	},
	entityRow: {
		flexDirection: "row",
		alignItems: "center",
		maxWidth: "75%",
	},
	title: {
		fontSize: 26,
		fontWeight: "800",
		letterSpacing: -0.6,
	},
	chevronIcon: {
		marginLeft: 6,
		opacity: 0.9,
	},
	rightActions: {
		flexDirection: "row",
		alignItems: "center",
	},
	weekPill: {
		paddingHorizontal: 13,
		paddingVertical: 7,
		borderRadius: 18,
	},
	weekPillText: {
		fontSize: 13,
		fontWeight: "600",
	},
});
