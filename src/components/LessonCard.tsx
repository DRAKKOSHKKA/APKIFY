import React from "react";
import { StyleSheet, Text, View } from "react-native";
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
	const isCompleted = status === "completed";

	// Разделяем время "08:00 - 09:20" на начало и конец
	const timeParts = lesson.time
		.split(/[-—]/)
		.map((t) => t.trim());
	const startTime = timeParts[0] || lesson.time;
	const endTime = timeParts[1] || "";

	// Формируем чистую строку деталей
	const metaParts: string[] = [];
	if (lesson.room) metaParts.push(`каб. ${lesson.room}`);
	if (lesson.teacher) metaParts.push(lesson.teacher);
	if (lesson.group) metaParts.push(lesson.group);
	const metaLine = metaParts.join(" • ");

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
						backgroundColor: theme.card,
						borderColor: isCurrent
							? theme.success
							: "transparent",
					},
					isCurrent && [
						styles.cardCurrent,
						{ backgroundColor: theme.successSubtle },
					],
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

				{/* Преподаватель и кабинет в одну спокойную строку */}
				{metaLine ? (
					<Text
						style={[
							styles.metaText,
							{ color: theme.textSecondary },
						]}
						numberOfLines={1}
					>
						{metaLine}
					</Text>
				) : null}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		paddingHorizontal: 16,
		marginBottom: 10,
	},
	containerCompleted: {
		opacity: 0.55,
	},
	timeColumn: {
		width: 52,
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
		borderRadius: 18,
		borderWidth: 1.5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 6,
		elevation: 1,
	},
	cardCurrent: {
		shadowColor: "#34C759",
		shadowOpacity: 0.15,
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
		borderRadius: 8,
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
		lineHeight: 21,
		marginBottom: 6,
		letterSpacing: -0.3,
	},
	metaText: {
		fontSize: 13,
		fontWeight: "500",
		letterSpacing: -0.1,
	},
});
