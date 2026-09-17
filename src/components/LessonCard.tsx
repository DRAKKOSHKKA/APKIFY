import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Lesson } from "../types/schedule";
import { getLessonStatus } from "../utils/timeUtils";

interface LessonCardProps {
	lesson: Lesson;
	isToday: boolean;
}

export const LessonCard: React.FC<LessonCardProps> = ({
	lesson,
	isToday,
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
				isCurrent && styles.cardCurrent,
				isCompleted && styles.cardCompleted,
			]}
		>
			{/* Левая цветная полоса-индикатор */}
			<View
				style={[
					styles.indicatorBar,
					isCurrent && styles.indicatorCurrent,
					isUpcoming && styles.indicatorUpcoming,
					isCompleted && styles.indicatorCompleted,
				]}
			/>

			<View style={styles.cardContent}>
				{/* Шапка карточки: Номер пары, Время, Бейдж статуса */}
				<View style={styles.topRow}>
					<View style={styles.timeInfo}>
						<View
							style={[
								styles.pairCircle,
								isCurrent &&
									styles.pairCircleCurrent,
							]}
						>
							<Text
								style={[
									styles.pairNumber,
									isCurrent &&
										styles.pairNumberCurrent,
								]}
							>
								{lesson.pairIndex}
							</Text>
						</View>
						<View style={styles.timeTextContainer}>
							<Text style={styles.timeLabel}>
								Пара {lesson.pairIndex}
							</Text>
							<Text style={styles.timeValue}>
								{lesson.time}
							</Text>
						</View>
					</View>

					{/* Статус бейдж */}
					{badgeText && (
						<View
							style={[
								styles.badge,
								isCurrent && styles.badgeCurrent,
								isUpcoming &&
									styles.badgeUpcoming,
							]}
						>
							{isCurrent && (
								<View style={styles.pulseDot} />
							)}
							<Text
								style={[
									styles.badgeText,
									isCurrent &&
										styles.badgeTextCurrent,
									isUpcoming &&
										styles.badgeTextUpcoming,
								]}
							>
								{badgeText}
							</Text>
						</View>
					)}

					{isCompleted && (
						<View style={styles.badgeCompleted}>
							<Text
								style={styles.badgeTextCompleted}
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
						isCompleted && styles.textMuted,
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
										? "#8E8E93"
										: "#007AFF"
								}
								style={styles.detailIcon}
							/>
							<Text
								style={[
									styles.detailText,
									isCompleted &&
										styles.textMuted,
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
										? "#8E8E93"
										: "#34C759"
								}
								style={styles.detailIcon}
							/>
							<View style={styles.roomBadge}>
								<Text style={styles.roomText}>
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
								color="#8E8E93"
								style={styles.detailIcon}
							/>
							<Text style={styles.groupText}>
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
		backgroundColor: "#FFFFFF",
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
		borderColor: "#E5E5EA",
	},
	cardCurrent: {
		borderColor: "#34C759",
		backgroundColor: "#F7FCF8",
		shadowColor: "#34C759",
		shadowOpacity: 0.15,
		shadowRadius: 10,
		elevation: 4,
	},
	cardCompleted: {
		opacity: 0.65,
		backgroundColor: "#FAFAFA",
	},
	indicatorBar: {
		width: 5,
		backgroundColor: "#007AFF",
	},
	indicatorCurrent: {
		backgroundColor: "#34C759",
	},
	indicatorUpcoming: {
		backgroundColor: "#007AFF",
	},
	indicatorCompleted: {
		backgroundColor: "#C7C7CC",
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
		backgroundColor: "#F2F2F7",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 8,
	},
	pairCircleCurrent: {
		backgroundColor: "#34C759",
	},
	pairNumber: {
		fontSize: 13,
		fontWeight: "700",
		color: "#007AFF",
	},
	pairNumberCurrent: {
		color: "#FFFFFF",
	},
	timeTextContainer: {
		justifyContent: "center",
	},
	timeLabel: {
		fontSize: 10,
		fontWeight: "600",
		color: "#8E8E93",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	timeValue: {
		fontSize: 13,
		fontWeight: "700",
		color: "#1C1C1E",
	},
	badge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	badgeCurrent: {
		backgroundColor: "#E8F8ED",
	},
	badgeUpcoming: {
		backgroundColor: "#E5F1FF",
	},
	badgeCompleted: {
		backgroundColor: "#F2F2F7",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	pulseDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: "#34C759",
		marginRight: 5,
	},
	badgeText: {
		fontSize: 11,
		fontWeight: "700",
	},
	badgeTextCurrent: {
		color: "#34C759",
	},
	badgeTextUpcoming: {
		color: "#007AFF",
	},
	badgeTextCompleted: {
		fontSize: 11,
		fontWeight: "600",
		color: "#8E8E93",
	},
	subject: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000000",
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
		color: "#3A3A3C",
		fontWeight: "500",
	},
	roomBadge: {
		backgroundColor: "#F2F2F7",
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 6,
	},
	roomText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#1C1C1E",
	},
	groupText: {
		fontSize: 12,
		color: "#8E8E93",
	},
	textMuted: {
		color: "#8E8E93",
	},
});
