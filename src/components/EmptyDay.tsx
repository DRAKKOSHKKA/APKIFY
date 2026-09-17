import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../theme/colors";

interface EmptyDayProps {
	dayName: string;
	dayDate: string;
	theme: ThemeColors;
}

export const EmptyDay: React.FC<EmptyDayProps> = ({
	dayName,
	dayDate,
	theme,
}) => {
	return (
		<View style={styles.container}>
			<View
				style={[
					styles.iconCircle,
					{ backgroundColor: theme.warningSubtle },
				]}
			>
				<Ionicons
					name="sunny-outline"
					size={48}
					color={theme.warning}
				/>
			</View>
			<Text style={[styles.title, { color: theme.text }]}>
				В этот день пар нет!
			</Text>
			<Text
				style={[
					styles.subtitle,
					{ color: theme.textSecondary },
				]}
			>
				{dayName} {dayDate ? `(${dayDate})` : ""} — в
				расписании ничего не запланировано. Отличный
				повод отдохнуть! 🎉
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 70,
		paddingHorizontal: 30,
	},
	iconCircle: {
		width: 88,
		height: 88,
		borderRadius: 44,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
});
