import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyDayProps {
	dayName: string;
	dayDate: string;
}

export const EmptyDay: React.FC<EmptyDayProps> = ({
	dayName,
	dayDate,
}) => {
	return (
		<View style={styles.container}>
			<View style={styles.iconCircle}>
				<Ionicons
					name="sunny-outline"
					size={48}
					color="#FF9500"
				/>
			</View>
			<Text style={styles.title}>
				В этот день пар нет!
			</Text>
			<Text style={styles.subtitle}>
				{dayName} {dayDate ? `(${dayDate})` : ""} —
				занятий в расписании не найдено. Можно отдохнуть!
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
		backgroundColor: "#FFF8E6",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		color: "#1C1C1E",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		color: "#8E8E93",
		textAlign: "center",
		lineHeight: 20,
	},
});
