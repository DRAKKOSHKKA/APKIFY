import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Lesson } from "../types/schedule";
import { getLessonStatus } from "../utils/timeUtils";
import { ThemeColors } from "../theme/colors";

interface LessonCardProps {
	lesson: Lesson;
	isToday: boolean;
	theme: ThemeColors;
}

export const LessonCard: React.FC<LessonCardProps> = ({
	lesson,
	isToday,
	theme,
}) => {
	const { status, badgeText } = getLessonStatus(
		lesson.time,
		isToday
	);

	const isCurrent = status === "current";
	const isUpcoming = status === "upcoming";
	const isCompleted = status === "completed";

	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor: isCurrent
						? theme.successSubtle
						: isCompleted
							? theme.isDark
								? "#151517"
								: "#F7F7F9"
							: theme.card,
					borderColor: isCurrent
						? theme.success
						: theme.border,
				},
				isCurrent && styles.cardCurrent,
				isCompleted && styles.cardCompleted,
			]}
		>
			{/* Левая цветная полоса-индикатор */}
			<View
				style={[
					styles.indicatorBar,
					{
						backgroundColor: isCurrent
							? theme.success
							: isUpcoming
								? theme.accent
								: isCompleted
									? theme.border
									: theme.accent,
					},
				]}
			/>

			<View style={styles.cardContent}>
				{/* Шапка карточки: Номер пары, Время, Бейдж статуса */}
				<View style={styles.topRow}>
					<View style={styles.timeInfo}>
						<View
							style={[
								styles.pairCircle,
								{
									backgroundColor: isCurrent
										? theme.success
										: theme.chipBackground,
								},
							]}
						>
							<Text
								style={[
									styles.pairNumber,
									{
										color: isCurrent
											? "#FFFFFF"
											: theme.accent,
									},
								]}
							>
								{lesson.pairIndex}
							</Text>
						</View>
						<View style={styles.timeTextContainer}>
							<Text
								style={[
									styles.timeLabel,
									{
										color: theme.textSecondary,
									},
								]}
							>
								Пара {lesson.pairIndex}
							</Text>
							<Text
								style={[
									styles.timeValue,
									{ color: theme.text },
								]}
							>
								{lesson.time}
							</Text>
						</View>
					</View>

					{/* Статус бейдж */}
					{badgeText && (
						<View
							style={[
								styles.badge,
								{
									backgroundColor: isCurrent
										? theme.successSubtle
										: theme.accentSubtle,
								},
							]}
						>
							{isCurrent && (
								<View
									style={[
										styles.pulseDot,
										{
											backgroundColor:
												theme.success,
										},
									]}
								/>
							)}
							<Text
								style={[
									styles.badgeText,
									{
										color: isCurrent
											? theme.success
											: theme.accent,
									},
								]}
							>
								{badgeText}
							</Text>
						</View>
					)}

					{isCompleted && (
						<View
							style={[
								styles.badgeCompleted,
								{
									backgroundColor:
										theme.chipBackground,
								},
							]}
						>
							<Text
								style={[
									styles.badgeTextCompleted,
									{
										color: theme.textSecondary,
									},
								]}
							>
								Завершена
							</Text>
						</View>
					)}
				</View>

				{/* Название предмета */}
				<Text
					style={[
						styles.subject,
						{
							color: isCompleted
								? theme.textSecondary
								: theme.text,
						},
					]}
				>
					{lesson.subject}
				</Text>

				{/* Детали: Преподаватель, Кабинет, Подгруппа */}
				<View style={styles.detailsContainer}>
					{/* Преподаватель */}
					{lesson.teacher ? (
						<View style={styles.detailRow}>
							<Ionicons
								name="person-outline"
								size={14}
								color={
									isCompleted
										? theme.textSecondary
										: theme.accent
								}
								style={styles.detailIcon}
							/>
							<Text
								style={[
									styles.detailText,
									{
										color: isCompleted
											? theme.textSecondary
											: theme.text,
									},
								]}
							>
								{lesson.teacher}
							</Text>
						</View>
					) : null}

					{/* Кабинет */}
					{lesson.room ? (
						<View style={styles.detailRow}>
							<Ionicons
								name="location-outline"
								size={14}
								color={
									isCompleted
										? theme.textSecondary
										: theme.success
								}
								style={styles.detailIcon}
							/>
							<View
								style={[
									styles.roomBadge,
									{
										backgroundColor:
											theme.chipBackground,
									},
								]}
							>
								<Text
									style={[
										styles.roomText,
										{ color: theme.text },
									]}
								>
									{lesson.room}
								</Text>
							</View>
						</View>
					) : null}

					{/* Подгруппа / группа */}
					{lesson.group ? (
						<View style={styles.detailRow}>
							<Ionicons
								name="people-outline"
								size={14}
								color={theme.textSecondary}
								style={styles.detailIcon}
							/>
							<Text
								style={[
									styles.groupText,
									{
										color: theme.textSecondary,
									},
								]}
							>
								{lesson.group}
							</Text>
						</View>
					) : null}
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		flexDirection: "row",
		borderRadius: 16,
		marginBottom: 12,
		marginHorizontal: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 2,
		overflow: "hidden",
		borderWidth: StyleSheet.hairlineWidth,
	},
	cardCurrent: {
		shadowColor: "#34C759",
		shadowOpacity: 0.2,
		shadowRadius: 10,
		elevation: 4,
	},
	cardCompleted: {
		opacity: 0.6,
	},
	indicatorBar: {
		width: 5,
	},
	cardContent: {
		flex: 1,
		padding: 14,
	},
	topRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	timeInfo: {
		flexDirection: "row",
		alignItems: "center",
	},
	pairCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	pairNumber: {
		fontSize: 13,
		fontWeight: "700",
	},
	timeTextContainer: {
		justifyContent: "center",
	},
	timeLabel: {
		fontSize: 10,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	timeValue: {
		fontSize: 13,
		fontWeight: "700",
	},
	badge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	badgeCompleted: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	pulseDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 5,
	},
	badgeText: {
		fontSize: 11,
		fontWeight: "700",
	},
	badgeTextCompleted: {
		fontSize: 11,
		fontWeight: "600",
	},
	subject: {
		fontSize: 16,
		fontWeight: "700",
		lineHeight: 22,
		marginBottom: 10,
	},
	detailsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	detailRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	detailIcon: {
		marginRight: 5,
	},
	detailText: {
		fontSize: 13,
		fontWeight: "500",
	},
	roomBadge: {
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 6,
	},
	roomText: {
		fontSize: 12,
		fontWeight: "700",
	},
	groupText: {
		fontSize: 12,
	},
});
