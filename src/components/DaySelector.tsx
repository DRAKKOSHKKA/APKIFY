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
import { ThemeColors } from "../theme/colors";
import { RADIUS } from "../theme/tokens";

interface DaySelectorProps {
	days: DaySchedule[];
	selectedIndex: number;
	theme: ThemeColors;
	mockDate?: Date | null;
	onSelectIndex: (index: number) => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
	days,
	selectedIndex,
	theme,
	mockDate = null,
	onSelectIndex,
}) => {
	const getShortDay = (dayName: string) => {
		switch (dayName.toLowerCase()) {
			case "понедельник":
				return "ПН";
			case "вторник":
				return "ВТ";
			case "среда":
				return "СР";
			case "четверг":
				return "ЧТ";
			case "пятница":
				return "ПТ";
			case "суббота":
				return "СБ";
			case "воскресенье":
				return "ВС";
			default:
				return dayName.slice(0, 2).toUpperCase();
		}
	};

	const getDayNumber = (dateStr: string) => {
		if (!dateStr) return "";
		const parts = dateStr.split(".");
		return parts[0] ? parseInt(parts[0], 10).toString() : "";
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

					return (
						<TouchableOpacity
							key={`${day.dayName}-${day.dayDate}-${idx}`}
							style={[
								styles.dayChip,
								isSelected
									? [
											styles.dayChipSelected,
											{
												backgroundColor:
													theme.accent,
											},
										]
									: {
											backgroundColor:
												"transparent",
										},
							]}
							activeOpacity={0.7}
							onPress={() => {
								try {
									Haptics.impactAsync(
										Haptics
											.ImpactFeedbackStyle
											.Light
									);
								} catch {}
								onSelectIndex(idx);
							}}
						>
							<Text
								style={[
									styles.dayShortName,
									{
										color: isSelected
											? "rgba(255, 255, 255, 0.8)"
											: theme.textSecondary,
									},
								]}
							>
								{shortName}
							</Text>
							<Text
								style={[
									styles.dayNumber,
									{
										color: isSelected
											? "#FFFFFF"
											: theme.text,
										fontWeight: isSelected
											? "700"
											: "500",
									},
								]}
							>
								{dayNum}
							</Text>

							{/* Точка текущего дня (сегодня или симуляция) */}
							<View style={styles.dotContainer}>
								{(mockDate
									? (mockDate.getDay() === 0
											? 0
											: mockDate.getDay() -
												1) === idx
									: day.isToday) && (
									<View
										style={[
											styles.todayDot,
											{
												backgroundColor:
													isSelected
														? "#FFFFFF"
														: theme.accent,
											},
										]}
									/>
								)}
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
		paddingVertical: 6,
	},
	scrollContent: {
		paddingHorizontal: 16,
		gap: 6,
	},
	dayChip: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: RADIUS.card,
		minWidth: 46,
	},
	dayChipSelected: {
		shadowColor: "#007AFF",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 6,
		elevation: 3,
	},
	dayShortName: {
		fontSize: 10,
		fontWeight: "700",
		letterSpacing: 0.5,
		marginBottom: 4,
	},
	dayNumber: {
		fontSize: 17,
	},
	dotContainer: {
		height: 6,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 3,
	},
	todayDot: {
		width: 4,
		height: 4,
		borderRadius: 2,
	},
});
