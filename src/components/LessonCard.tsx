import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Lesson } from "../types/schedule";
import { getLessonStatus } from "../utils/timeUtils";
import { ThemeColors } from "../theme/colors";
import { RADIUS } from "../theme/tokens";

interface LessonCardProps {
	lesson: Lesson;
	isToday: boolean;
	theme: ThemeColors;
	glassEffect?: boolean;
	mockDate?: Date | null;
}

export const LessonCard: React.FC<LessonCardProps> = ({
	lesson,
	isToday,
	theme,
	glassEffect = true,
	mockDate = null,
}) => {
	const { status, badgeText } = getLessonStatus(
		lesson.time,
		isToday,
		mockDate
	);

	const isCurrent = status === "current";
	const isCompleted = status === "completed";

	// Разделяем время "08:00 - 09:20" на начало и конец
	const timeParts = lesson.time
		.split(/[-—]/)
		.map((t) => t.trim());
	const startTime = timeParts[0] || lesson.time;
	const endTime = timeParts[1] || "";

	const cardBg = isCurrent
		? glassEffect
			? theme.glassActiveCard
			: theme.successSubtle
		: glassEffect
			? theme.glassCard
			: theme.card;

	const cardBorder = isCurrent
		? theme.success
		: glassEffect
			? theme.glassBorder
			: "transparent";

	// Нормализуем номер кабинета
	const formattedRoom = lesson.room
		? lesson.room.toLowerCase().startsWith("каб")
			? lesson.room
			: `каб. ${lesson.room}`
		: "";

	// Отображаем подгруппу ТОЛЬКО если предмет поделен на подгруппы (название группы не показываем)
	const getSubgroupTitle = (
		rawGroup?: string
	): string | null => {
		if (!rawGroup) return null;
		const lower = rawGroup.toLowerCase();

		if (
			lower.includes("1 подгруппа") ||
			lower.includes("1-я подгруппа") ||
			lower.includes("1 п/г") ||
			lower.includes("1п/г") ||
			lower.includes("(1)")
		) {
			return "1-я подгруппа";
		}
		if (
			lower.includes("2 подгруппа") ||
			lower.includes("2-я подгруппа") ||
			lower.includes("2 п/г") ||
			lower.includes("2п/г") ||
			lower.includes("(2)")
		) {
			return "2-я подгруппа";
		}
		if (
			lower.includes("3 подгруппа") ||
			lower.includes("3-я подгруппа") ||
			lower.includes("3 п/г") ||
			lower.includes("3п/г")
		) {
			return "3-я подгруппа";
		}

		return null;
	};

	const subgroupBadge = getSubgroupTitle(lesson.group);

	return (
		<View
			style={[
				styles.container,
				isCompleted && styles.containerCompleted,
			]}
		>
			{/* Левая колонка: время начала и конца */}
			<View style={styles.timeColumn}>
				<Text
					style={[
						styles.startTime,
						{
							color: isCurrent
								? theme.accent
								: theme.text,
						},
					]}
				>
					{startTime}
				</Text>
				{endTime ? (
					<Text
						style={[
							styles.endTime,
							{ color: theme.textSecondary },
						]}
					>
						{endTime}
					</Text>
				) : null}
			</View>

			{/* Правая карточка пары */}
			<View
				style={[
					styles.card,
					{
						backgroundColor: cardBg,
						borderColor: cardBorder,
					},
					isCurrent && styles.cardCurrent,
				]}
			>
				{/* Верхняя строка: пара и статус (если идет) */}
				<View style={styles.cardHeader}>
					<Text
						style={[
							styles.pairIndex,
							{
								color: isCurrent
									? theme.success
									: theme.textSecondary,
							},
						]}
					>
						{lesson.pairIndex} пара
					</Text>

					{isCurrent && (
						<View
							style={[
								styles.statusBadge,
								{
									backgroundColor: theme.isDark
										? "#0F3819"
										: "#D1F2D9",
								},
							]}
						>
							<View
								style={[
									styles.pulseDot,
									{
										backgroundColor:
											theme.success,
									},
								]}
							/>
							<Text
								style={[
									styles.statusText,
									{ color: theme.success },
								]}
							>
								{badgeText || "Идёт"}
							</Text>
						</View>
					)}
				</View>

				{/* Название предмета (без обрезки, аккуратный перенос) */}
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

				{/* Детали: кабинет, преподаватель, группа в виде адаптивных плашек */}
				<View style={styles.metaRow}>
					{formattedRoom ? (
						<View
							style={[
								styles.metaBadge,
								{
									backgroundColor:
										theme.chipBackground,
								},
							]}
						>
							<Ionicons
								name="location-outline"
								size={12}
								color={theme.accent}
								style={styles.metaIcon}
							/>
							<Text
								style={[
									styles.metaBadgeText,
									{ color: theme.text },
								]}
							>
								{formattedRoom}
							</Text>
						</View>
					) : null}

					{lesson.teacher ? (
						<View
							style={[
								styles.metaBadge,
								{
									backgroundColor:
										theme.chipBackground,
								},
							]}
						>
							<Ionicons
								name="person-outline"
								size={12}
								color={theme.textSecondary}
								style={styles.metaIcon}
							/>
							<Text
								style={[
									styles.metaBadgeText,
									{ color: theme.text },
								]}
							>
								{lesson.teacher}
							</Text>
						</View>
					) : null}

					{subgroupBadge ? (
						<View
							style={[
								styles.metaBadge,
								styles.subgroupBadge,
								{
									backgroundColor: theme.isDark
										? "rgba(10, 132, 255, 0.18)"
										: "rgba(0, 122, 255, 0.12)",
									borderColor: theme.isDark
										? "rgba(10, 132, 255, 0.35)"
										: "rgba(0, 122, 255, 0.25)",
								},
							]}
						>
							<Ionicons
								name="people"
								size={12}
								color={theme.accent}
								style={styles.metaIcon}
							/>
							<Text
								style={[
									styles.metaBadgeText,
									{
										color: theme.accent,
										fontWeight: "700",
									},
								]}
							>
								{subgroupBadge}
							</Text>
						</View>
					) : null}
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		paddingHorizontal: 18,
		marginBottom: 12,
		alignItems: "flex-start",
	},
	containerCompleted: {
		opacity: 0.55,
	},
	timeColumn: {
		width: 48,
		marginRight: 10,
		paddingTop: 8,
		alignItems: "flex-start",
	},
	startTime: {
		fontSize: 14,
		fontWeight: "700",
		letterSpacing: -0.2,
	},
	endTime: {
		fontSize: 12,
		fontWeight: "500",
		marginTop: 2,
	},
	card: {
		flex: 1,
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: RADIUS.card,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 6,
		elevation: 1,
	},
	cardCurrent: {
		shadowColor: "#34C759",
		shadowOpacity: 0.18,
		shadowRadius: 8,
		elevation: 3,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	pairIndex: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: RADIUS.badge,
	},
	pulseDot: {
		width: 5,
		height: 5,
		borderRadius: 2.5,
		marginRight: 4,
	},
	statusText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 0.2,
	},
	subject: {
		fontSize: 16,
		fontWeight: "700",
		lineHeight: 22,
		marginBottom: 8,
		letterSpacing: -0.3,
	},
	metaRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		gap: 6,
		marginTop: 2,
	},
	metaBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: RADIUS.badge,
		maxWidth: "100%",
	},
	subgroupBadge: {
		borderWidth: StyleSheet.hairlineWidth,
	},
	metaIcon: {
		marginRight: 4,
	},
	metaBadgeText: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: -0.1,
	},
});
