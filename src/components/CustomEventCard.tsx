import React from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Share,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CustomEvent } from "../types/events";
import { Lesson } from "../types/schedule";
import { ThemeColors } from "../theme/colors";
import { RADIUS } from "../theme/tokens";
import { parseTimeRange } from "../utils/timeUtils";

interface CustomEventCardProps {
	event: CustomEvent;
	theme: ThemeColors;
	glassEffect?: boolean;
	dayLessons?: Lesson[];
	isToday?: boolean;
	mockDate?: Date | null;
	onPress?: () => void;
	onDuplicate?: () => void;
	onDelete?: () => void;
}

export const CustomEventCard: React.FC<CustomEventCardProps> = ({
	event,
	theme,
	glassEffect = true,
	dayLessons = [],
	isToday = false,
	mockDate,
	onPress,
	onDuplicate,
	onDelete,
}) => {
	const eventColor = event.color || "#007AFF";
	const eventIcon = (event.icon || "calendar-outline") as keyof typeof Ionicons.glyphMap;

	const startTime =
		event.startTime ||
		(event.time ? event.time.split(/[-—]/)[0]?.trim() : "");
	const endTime =
		event.endTime ||
		(event.time ? event.time.split(/[-—]/)[1]?.trim() : "");

	const formattedRoom = event.room
		? event.room.toLowerCase().startsWith("каб") ||
		  event.room.toLowerCase().startsWith("ауд")
			? event.room
			: `каб. ${event.room}`
		: "";

	const cardBg = glassEffect ? theme.glassCard : theme.card;
	const cardBorder = glassEffect ? theme.glassBorder : theme.border;

	// Расчет статуса повторения для бейджа
	const getRepeatBadgeText = () => {
		switch (event.repeatType) {
			case "daily":
				return "Ежедневно";
			case "weekdays":
				return "По будням";
			case "weekly":
				return "Еженедельно";
			case "biweekly":
				return "Раз в 2 нед.";
			case "custom_days":
				return "Выбранные дни";
			default:
				return null;
		}
	};

	const repeatBadge = getRepeatBadgeText();

	// Детектор конфликтов с парами расписания
	const conflictingLesson = React.useMemo(() => {
		if (!dayLessons || dayLessons.length === 0 || !startTime) return null;
		const eventRange = parseTimeRange(`${startTime} - ${endTime || startTime}`);
		if (!eventRange) return null;

		for (const lesson of dayLessons) {
			const lessonRange = parseTimeRange(lesson.time);
			if (lessonRange) {
				// Проверка пересечения временных интервалов: max(startA, startB) < min(endA, endB)
				const overlap =
					Math.max(eventRange.startMinutes, lessonRange.startMinutes) <
					Math.min(eventRange.endMinutes, lessonRange.endMinutes);
				if (overlap) {
					return lesson;
				}
			}
		}
		return null;
	}, [dayLessons, startTime, endTime]);

	// Индикатор реального времени (Идёт сейчас / Через X мин)
	const liveStatusTag = React.useMemo(() => {
		if (!isToday || !startTime) return null;
		const now = mockDate || new Date();
		const currentMinutes = now.getHours() * 60 + now.getMinutes();

		const eventRange = parseTimeRange(`${startTime} - ${endTime || startTime}`);
		if (!eventRange) return null;

		if (
			currentMinutes >= eventRange.startMinutes &&
			currentMinutes < eventRange.endMinutes
		) {
			return { type: "now", label: "Идёт сейчас" };
		}

		if (
			currentMinutes < eventRange.startMinutes &&
			eventRange.startMinutes - currentMinutes <= 60
		) {
			const left = eventRange.startMinutes - currentMinutes;
			return { type: "upcoming", label: `Через ${left} мин` };
		}

		return null;
	}, [isToday, startTime, endTime, mockDate]);

	const handleShareEvent = async () => {
		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			const lines = [
				`🏛 АПК • Событие`,
				`📅 ${event.date}`,
				`⏰ ${event.time || (startTime ? `${startTime}${endTime ? ` — ${endTime}` : ""}` : "")}`,
				`📌 ${event.title}`,
				repeatBadge ? `🔄 Повторение: ${repeatBadge}` : null,
				event.priority === "high" ? `🔴 Важное событие` : null,
				event.subgroup && event.subgroup !== "all"
					? `👥 Подгруппа: ${event.subgroup}`
					: null,
				formattedRoom ? `📍 ${formattedRoom}` : null,
				event.teacher ? `👤 ${event.teacher}` : null,
				event.note ? `📝 ${event.note}` : null,
			].filter(Boolean);

			await Share.share({
				message: lines.join("\n"),
			});
		} catch (err) {
			console.warn("Share error:", err);
		}
	};

	const handleLongPress = () => {
		try {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch {}

		Alert.alert(
			event.title,
			`Время: ${startTime}${endTime ? ` - ${endTime}` : ""}\nДата: ${event.date}`,
			[
				{ text: "Поделиться", onPress: handleShareEvent },
				...(onDuplicate
					? [
							{
								text: "Дублировать",
								onPress: onDuplicate,
							},
						]
					: []),
				{ text: "Редактировать", onPress: onPress },
				...(onDelete
					? [
							{
								text: "Удалить",
								style: "destructive" as const,
								onPress: onDelete,
							},
						]
					: []),
				{ text: "Отмена", style: "cancel" },
			]
		);
	};

	return (
		<View style={styles.container}>
			{/* Левая колонка времени */}
			<View style={styles.timeColumn}>
				<Text style={[styles.startTime, { color: eventColor }]}>
					{startTime || "—"}
				</Text>
				{endTime ? (
					<Text style={[styles.endTime, { color: theme.textSecondary }]}>
						{endTime}
					</Text>
				) : null}
			</View>

			{/* Карточка события */}
			<TouchableOpacity
				activeOpacity={0.85}
				onPress={onPress}
				onLongPress={handleLongPress}
				delayLongPress={350}
				style={[
					styles.card,
					{
						backgroundColor: cardBg,
						borderColor: cardBorder,
						borderLeftColor: eventColor,
						borderLeftWidth: 3.5,
					},
				]}
			>
				{/* Шапка события */}
				<View style={styles.cardHeader}>
					<View style={styles.headerLeftWrap}>
						<View
							style={[
								styles.iconPill,
								{ backgroundColor: eventColor + "20" },
							]}
						>
							<Ionicons name={eventIcon} size={13} color={eventColor} />
						</View>

						<Text style={[styles.headerTagText, { color: eventColor }]}>
							СОБЫТИЕ
						</Text>

						{/* Бейдж повторения */}
						{repeatBadge && (
							<View
								style={[
									styles.badgePill,
									{
										backgroundColor: theme.chipBackground,
										borderColor: theme.separator,
									},
								]}
							>
								<Ionicons
									name="repeat"
									size={10}
									color={theme.textSecondary}
									style={{ marginRight: 3 }}
								/>
								<Text
									style={[
										styles.badgeText,
										{ color: theme.textSecondary },
									]}
								>
									{repeatBadge}
								</Text>
							</View>
						)}

						{/* Бейдж высокого приоритета */}
						{event.priority === "high" && (
							<View
								style={[
									styles.badgePill,
									{
										backgroundColor: "rgba(255, 59, 48, 0.15)",
										borderColor: "#FF3B3060",
									},
								]}
							>
								<Text
									style={[
										styles.badgeText,
										{ color: "#FF3B30", fontWeight: "700" },
									]}
								>
									ВАЖНО
								</Text>
							</View>
						)}

						{/* Бейдж подгруппы */}
						{event.subgroup && event.subgroup !== "all" && (
							<View
								style={[
									styles.badgePill,
									{
										backgroundColor: theme.chipBackground,
										borderColor: theme.separator,
									},
								]}
							>
								<Text
									style={[
										styles.badgeText,
										{ color: theme.textSecondary },
									]}
								>
									{event.subgroup} п/г
								</Text>
							</View>
						)}
					</View>

					{/* Правая часть шапки: Live-статус или иконка редактирования */}
					{liveStatusTag ? (
						<View
							style={[
								styles.liveTag,
								{
									backgroundColor:
										liveStatusTag.type === "now"
											? "rgba(52, 199, 89, 0.15)"
											: "rgba(255, 149, 0, 0.15)",
									borderColor:
										liveStatusTag.type === "now"
											? "rgba(52, 199, 89, 0.4)"
											: "rgba(255, 149, 0, 0.4)",
								},
							]}
						>
							<View
								style={[
									styles.liveDot,
									{
										backgroundColor:
											liveStatusTag.type === "now"
												? "#34C759"
												: "#FF9500",
									},
								]}
							/>
							<Text
								style={[
									styles.liveTagText,
									{
										color:
											liveStatusTag.type === "now"
												? "#34C759"
												: "#FF9500",
									},
								]}
							>
								{liveStatusTag.label}
							</Text>
						</View>
					) : (
						<Ionicons
							name="ellipsis-horizontal"
							size={16}
							color={theme.textSecondary}
						/>
					)}
				</View>

				{/* Название */}
				<Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
					{event.title}
				</Text>

				{/* Предупреждение о конфликте с парой */}
				{conflictingLesson && (
					<View
						style={[
							styles.conflictBox,
							{
								backgroundColor: "rgba(255, 149, 0, 0.12)",
								borderColor: "rgba(255, 149, 0, 0.35)",
							},
						]}
					>
						<Ionicons
							name="warning-outline"
							size={13}
							color="#FF9500"
							style={{ marginRight: 5 }}
						/>
						<Text style={styles.conflictText} numberOfLines={1}>
							Пересекается с {conflictingLesson.pairIndex} парой (
							{conflictingLesson.subject})
						</Text>
					</View>
				)}

				{/* Мета-информация: кабинет и преподаватель */}
				{(formattedRoom || event.teacher) && (
					<View style={styles.metaRow}>
						{formattedRoom ? (
							<View style={styles.metaItem}>
								<Ionicons
									name="location-outline"
									size={13}
									color={eventColor}
									style={{ marginRight: 4 }}
								/>
								<Text
									style={[
										styles.metaText,
										{ color: theme.textSecondary },
									]}
									numberOfLines={1}
								>
									{formattedRoom}
								</Text>
							</View>
						) : null}

						{event.teacher ? (
							<View style={styles.metaItem}>
								<Ionicons
									name="person-outline"
									size={13}
									color={theme.textSecondary}
									style={{ marginRight: 4 }}
								/>
								<Text
									style={[
										styles.metaText,
										{ color: theme.textSecondary },
									]}
									numberOfLines={1}
								>
									{event.teacher}
								</Text>
							</View>
						) : null}
					</View>
				)}

				{/* Заметка к событию */}
				{event.note ? (
					<View
						style={[
							styles.noteBox,
							{
								backgroundColor: theme.chipBackground,
								borderColor: theme.border,
							},
						]}
					>
						<Ionicons
							name="document-text-outline"
							size={12}
							color={eventColor}
							style={{ marginRight: 6, marginTop: 1 }}
						/>
						<Text
							style={[styles.noteText, { color: theme.text }]}
							numberOfLines={3}
						>
							{event.note}
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
		alignItems: "flex-start",
		paddingHorizontal: 16,
		marginBottom: 10,
	},
	timeColumn: {
		width: 52,
		alignItems: "flex-end",
		paddingRight: 10,
		paddingTop: 12,
	},
	startTime: {
		fontSize: 14,
		fontWeight: "700",
		letterSpacing: -0.2,
	},
	endTime: {
		fontSize: 12,
		marginTop: 2,
		fontWeight: "500",
	},
	card: {
		flex: 1,
		borderRadius: RADIUS.card,
		borderWidth: 1,
		padding: 13,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 6,
	},
	headerLeftWrap: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 6,
		flex: 1,
		paddingRight: 6,
	},
	iconPill: {
		width: 22,
		height: 22,
		borderRadius: 6,
		alignItems: "center",
		justifyContent: "center",
	},
	headerTagText: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 0.6,
	},
	badgePill: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		borderWidth: StyleSheet.hairlineWidth,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: "600",
	},
	liveTag: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: StyleSheet.hairlineWidth,
	},
	liveDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 5,
	},
	liveTagText: {
		fontSize: 11,
		fontWeight: "700",
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		lineHeight: 21,
		letterSpacing: -0.2,
		marginBottom: 6,
	},
	conflictBox: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 5,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
		marginBottom: 8,
	},
	conflictText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#FF9500",
		flex: 1,
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 12,
		marginTop: 2,
	},
	metaItem: {
		flexDirection: "row",
		alignItems: "center",
	},
	metaText: {
		fontSize: 13,
		fontWeight: "500",
	},
	noteBox: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 10,
		borderWidth: StyleSheet.hairlineWidth,
		marginTop: 8,
	},
	noteText: {
		fontSize: 13,
		lineHeight: 18,
		flex: 1,
	},
});
