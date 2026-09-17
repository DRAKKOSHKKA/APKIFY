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

interface DaySelectorProps {
	days: DaySchedule[];
	selectedIndex: number;
	theme: ThemeColors;
	onSelectIndex: (index: number) => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
	days,
	selectedIndex,
	theme,
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
		<View
			style={[
				styles.container,
				{
					backgroundColor: theme.headerBackground,
					borderBottomColor: theme.border,
				},
			]}
		>
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
								{
									backgroundColor:
										theme.chipBackground,
								},
								isSelected && {
									backgroundColor:
										theme.accent,
								},
								day.isToday &&
									!isSelected && {
										borderColor:
											theme.accent,
										borderWidth: 1.5,
										backgroundColor:
											theme.accentSubtle,
									},
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
										{
											backgroundColor:
												isSelected
													? "#FFFFFF"
													: theme.accent,
										},
									]}
								/>
							)}
							<Text
								style={[
									styles.dayShortName,
									{
										color: isSelected
											? "#FFFFFF"
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
									},
								]}
							>
								{dayNum}
							</Text>
							<View
								style={[
									styles.countBadge,
									{
										backgroundColor:
											isSelected
												? "rgba(255, 255, 255, 0.25)"
												: theme.isDark
													? "#3A3A3C"
													: "#D1D1D6",
									},
								]}
							>
								<Text
									style={[
										styles.countText,
										{
											color: isSelected
												? "#FFFFFF"
												: theme.textSecondary,
										},
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
		borderBottomWidth: StyleSheet.hairlineWidth,
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
		minWidth: 54,
		position: "relative",
	},
	todayDot: {
		position: "absolute",
		top: 4,
		width: 5,
		height: 5,
		borderRadius: 2.5,
	},
	dayShortName: {
		fontSize: 12,
		fontWeight: "600",
		marginBottom: 2,
	},
	dayNumber: {
		fontSize: 16,
		fontWeight: "700",
	},
	countBadge: {
		marginTop: 4,
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 8,
	},
	countText: {
		fontSize: 10,
		fontWeight: "700",
	},
});
