import React from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { DaySchedule } from "../types/schedule";

interface DaySelectorProps {
	days: DaySchedule[];
	selectedIndex: number;
	onSelectIndex: (index: number) => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
	days,
	selectedIndex,
	onSelectIndex,
}) => {
	const getShortDay = (dayName: string) => {
		switch (dayName.toLowerCase()) {
			case "понедельник":
				return "Пн";
			case "вторник":
				return "Вт";
			case "среда":
				return "Ср";
			case "четверг":
				return "Чт";
			case "пятница":
				return "Пт";
			case "суббота":
				return "Сб";
			case "воскресенье":
				return "Вс";
			default:
				return dayName.slice(0, 2);
		}
	};

	const getDayNumber = (dateStr: string) => {
		if (!dateStr) return "";
		const parts = dateStr.split(".");
		return parts[0] || "";
	};

	return (
		<View style={styles.container}>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{days.map((day, idx) => {
					const isSelected = selectedIndex === idx;
					const shortName = getShortDay(day.dayName);
					const dayNum = getDayNumber(day.dayDate);
					const lessonCount = day.lessons.length;

					return (
						<TouchableOpacity
							key={`${day.dayName}-${day.dayDate}-${idx}`}
							style={[
								styles.dayChip,
								isSelected &&
									styles.dayChipSelected,
								day.isToday &&
									!isSelected &&
									styles.dayChipToday,
							]}
							activeOpacity={0.75}
							onPress={() => {
								try {
									Haptics.selectionAsync();
								} catch {}
								onSelectIndex(idx);
							}}
						>
							{day.isToday && (
								<View
									style={[
										styles.todayDot,
										isSelected
											? styles.todayDotSelected
											: styles.todayDotNormal,
									]}
								/>
							)}
							<Text
								style={[
									styles.dayShortName,
									isSelected &&
										styles.textSelected,
								]}
							>
								{shortName}
							</Text>
							<Text
								style={[
									styles.dayNumber,
									isSelected &&
										styles.textSelected,
								]}
							>
								{dayNum}
							</Text>
							<View
								style={[
									styles.countBadge,
									isSelected &&
										styles.countBadgeSelected,
								]}
							>
								<Text
									style={[
										styles.countText,
										isSelected &&
											styles.countTextSelected,
									]}
								>
									{lessonCount > 0
										? `${lessonCount}`
										: "—"}
								</Text>
							</View>
						</TouchableOpacity>
					);
				})}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "#FFFFFF",
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#E5E5EA",
		paddingVertical: 8,
	},
	scrollContent: {
		paddingHorizontal: 12,
		gap: 8,
	},
	dayChip: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 16,
		backgroundColor: "#F2F2F7",
		minWidth: 54,
		position: "relative",
	},
	dayChipSelected: {
		backgroundColor: "#007AFF",
		shadowColor: "#007AFF",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
		elevation: 3,
	},
	dayChipToday: {
		borderWidth: 1.5,
		borderColor: "#007AFF",
		backgroundColor: "#F0F8FF",
	},
	todayDot: {
		position: "absolute",
		top: 4,
		width: 5,
		height: 5,
		borderRadius: 2.5,
	},
	todayDotSelected: {
		backgroundColor: "#FFFFFF",
	},
	todayDotNormal: {
		backgroundColor: "#007AFF",
	},
	dayShortName: {
		fontSize: 12,
		fontWeight: "600",
		color: "#8E8E93",
		marginBottom: 2,
	},
	dayNumber: {
		fontSize: 16,
		fontWeight: "700",
		color: "#1C1C1E",
	},
	countBadge: {
		marginTop: 4,
		paddingHorizontal: 5,
		paddingVertical: 1,
		borderRadius: 8,
		backgroundColor: "#E5E5EA",
	},
	countBadgeSelected: {
		backgroundColor: "rgba(255, 255, 255, 0.25)",
	},
	countText: {
		fontSize: 10,
		fontWeight: "700",
		color: "#8E8E93",
	},
	countTextSelected: {
		color: "#FFFFFF",
	},
	textSelected: {
		color: "#FFFFFF",
	},
});
