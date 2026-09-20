import React from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Lesson } from "../types/schedule";
import { GradeEntry } from "../types/grades";
import { getLessonStatus } from "../utils/timeUtils";
import { ThemeColors } from "../theme/colors";
import { RADIUS } from "../theme/tokens";

interface LessonCardProps {
	lesson: Lesson;
	isToday: boolean;
	theme: ThemeColors;
	glassEffect?: boolean;
	mockDate?: Date | null;
	gradeEntry?: GradeEntry;
	onPress?: () => void;
}

function getGradeColor(grade?: string): string {
	if (!grade) return "#8E8E93";
	switch (grade.toLowerCase()) {
		case "5":
			return "#34C759";
		case "4":
			return "#007AFF";
		case "3":
			return "#FF9500";
		case "2":
			return "#FF3B30";
		case "зачет":
		case "зачёт":
			return "#30D158";
		case "незачет":
		case "незачёт":
			return "#FF453A";
		default:
			return "#8E8E93";
	}
}

export const LessonCard: React.FC<LessonCardProps> = ({
	lesson,
	isToday,
	theme,
	glassEffect = true,
	mockDate = null,
	gradeEntry,
	onPress,
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

	const handleShareLesson = async () => {
		try {
			Haptics.impactAsync(
				Haptics.ImpactFeedbackStyle.Medium
			);
			const lines = [
				`🏛 АПК • Расписание`,
				`🔔 ${lesson.pairIndex} пара (${lesson.time})`,
				`📚 ${lesson.subject}`,
				formattedRoom ? `📍 ${formattedRoom}` : null,
				lesson.teacher ? `👤 ${lesson.teacher}` : null,
				subgroupBadge ? `👥 ${subgroupBadge}` : null,
			].filter(Boolean);

			await Share.share({
				message: lines.join("\n"),
			});
		} catch (err) {
			console.warn("Share error:", err);
		}
	};

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
			<TouchableOpacity
				activeOpacity={0.88}
				onPress={onPress}
				onLongPress={handleShareLesson}
				delayLongPress={350}
				style={[
					styles.card,
					{
						backgroundColor: cardBg,
						borderColor: cardBorder,
					},
					isCurrent && styles.cardCurrent,
				]}
			>
				{/* Верхняя строка: пара, оценка, статус (если идет) и кнопка быстрого добавления */}
				<View style={styles.cardHeader}>
					<View style={styles.headerLeftRow}>
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

						{/* Бейдж полученной оценки */}
						{gradeEntry?.grade && (
							<View
								style={[
									styles.gradeBadge,
									{
										backgroundColor: getGradeColor(
											gradeEntry.grade
										),
									},
								]}
							>
								<Text style={styles.gradeBadgeText}>
									{gradeEntry.grade}
								</Text>
							</View>
						)}

						{/* Индикатор заметки без оценки */}
						{gradeEntry?.note && !gradeEntry?.grade && (
							<View
								style={[
									styles.noteBadge,
									{
										backgroundColor:
											theme.chipBackground,
									},
								]}
							>
								<Ionicons
									name="document-text-outline"
									size={11}
									color={theme.accent}
									style={{ marginRight: 3 }}
								/>
								<Text
									style={[
										styles.noteBadgeText,
										{
											color: theme.textSecondary,
										},
									]}
								>
									Заметка
								</Text>
							</View>
						)}
					</View>

					<View style={styles.headerRightRow}>
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

						<View
							style={[
								styles.quickAddBtn,
								{
									backgroundColor: gradeEntry
										? theme.chipBackground
										: "transparent",
								},
							]}
						>
							<Ionicons
								name={
									gradeEntry
										? "create-outline"
										: "add-circle-outline"
								}
								size={16}
								color={
									gradeEntry
										? theme.accent
										: theme.textSecondary + "80"
								}
							/>
						</View>
					</View>
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
								numberOfLines={1}
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
								numberOfLines={1}
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
									backgroundColor:
										theme.accentSubtle,
									borderColor:
										theme.accent + "40",
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
								numberOfLines={1}
							>
								{subgroupBadge}
							</Text>
						</View>
					) : null}
				</View>

				{/* Заметка или Д/З, если добавлена пользователем */}
				{gradeEntry?.note ? (
					<View
						style={[
							styles.notePreviewBox,
							{
								backgroundColor: theme.chipBackground,
								borderColor: theme.border,
							},
						]}
					>
						<Ionicons
							name="document-text"
							size={13}
							color={theme.accent}
							style={{ marginRight: 6 }}
						/>
						<Text
							style={[
								styles.notePreviewText,
								{ color: theme.text },
							]}
							numberOfLines={2}
						>
							{gradeEntry.note}
						</Text>
					</View>
				) : null}
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		paddingHorizontal: 18,
		marginBottom: 12,
		alignItems: "flex-start",
		maxWidth: 720,
		width: "100%",
		alignSelf: "center",
	},
	containerCompleted: {
		opacity: 0.55,
	},
	timeColumn: {
		width: 48,
		marginRight: 10,
		paddingTop: 8,
	},
	startTime: {
		fontSize: 15,
		fontWeight: "700",
		fontVariant: ["tabular-nums"],
		letterSpacing: -0.3,
	},
	endTime: {
		fontSize: 12,
		fontWeight: "500",
		fontVariant: ["tabular-nums"],
		marginTop: 2,
	},
	card: {
		flex: 1,
		borderRadius: RADIUS.card,
		padding: 14,
		borderWidth: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 6,
		elevation: 2,
	},
	cardCurrent: {
		shadowColor: "#34C759",
		shadowOpacity: 0.12,
		shadowRadius: 10,
		elevation: 4,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 6,
	},
	headerLeftRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	headerRightRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	pairIndex: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.2,
		textTransform: "uppercase",
	},
	gradeBadge: {
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 6,
		alignItems: "center",
		justifyContent: "center",
	},
	gradeBadgeText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "800",
	},
	noteBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	noteBadgeText: {
		fontSize: 10,
		fontWeight: "600",
	},
	quickAddBtn: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	statusBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 2.5,
		borderRadius: RADIUS.capsule,
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
	notePreviewBox: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: RADIUS.badge,
		borderWidth: StyleSheet.hairlineWidth,
	},
	notePreviewText: {
		fontSize: 12,
		fontWeight: "500",
		flex: 1,
		lineHeight: 16,
	},
});
