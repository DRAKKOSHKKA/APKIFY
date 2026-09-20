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
import { CustomEvent } from "../types/events";
import { ThemeColors } from "../theme/colors";
import { RADIUS } from "../theme/tokens";

interface CustomEventCardProps {
	event: CustomEvent;
	theme: ThemeColors;
	glassEffect?: boolean;
	onPress?: () => void;
	onDelete?: () => void;
}

export const CustomEventCard: React.FC<CustomEventCardProps> = ({
	event,
	theme,
	glassEffect = true,
	onPress,
}) => {
	const eventColor = event.color || "#007AFF";

	const startTime =
		event.startTime ||
		(event.time ? event.time.split(/[-—]/)[0]?.trim() : "");
	const endTime =
		event.endTime ||
		(event.time ? event.time.split(/[-—]/)[1]?.trim() : "");

	const formattedRoom = event.room
		? event.room.toLowerCase().startsWith("каб")
			? event.room
			: `каб. ${event.room}`
		: "";

	const cardBg = glassEffect ? theme.glassCard : theme.card;
	const cardBorder = glassEffect
		? theme.glassBorder
		: theme.border;

	const handleShareEvent = async () => {
		try {
			Haptics.impactAsync(
				Haptics.ImpactFeedbackStyle.Medium
			);
			const lines = [
				`🏛 АПК • Событие`,
				`📅 ${event.date}`,
				`⏰ ${event.time || (startTime ? `${startTime}${endTime ? ` — ${endTime}` : ""}` : "")}`,
				`📌 ${event.title}`,
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

	return (
		<View style={styles.container}>
			{/* Левая колонка времени, выровненная по сетке с парами */}
			<View style={styles.timeColumn}>
				<Text
					style={[
						styles.startTime,
						{ color: eventColor },
					]}
				>
					{startTime || "—"}
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

			{/* Карточка события */}
			<TouchableOpacity
				activeOpacity={0.85}
				onPress={onPress}
				onLongPress={handleShareEvent}
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
					<View style={styles.headerLeftTag}>
						<View
							style={[
								styles.colorDot,
								{ backgroundColor: eventColor },
							]}
						/>
						<Text
							style={[
								styles.headerTagText,
								{ color: eventColor },
							]}
						>
							СОБЫТИЕ
						</Text>
					</View>

					<Ionicons
						name="create-outline"
						size={15}
						color={theme.textSecondary}
					/>
				</View>

				{/* Название */}
				<Text
					style={[styles.title, { color: theme.text }]}
					numberOfLines={2}
				>
					{event.title}
				</Text>

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
										{
											color: theme.textSecondary,
										},
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
										{
											color: theme.textSecondary,
										},
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
								backgroundColor:
									theme.chipBackground,
								borderColor: theme.border,
							},
						]}
					>
						<Ionicons
							name="document-text-outline"
							size={12}
							color={eventColor}
							style={{
								marginRight: 6,
								marginTop: 1,
							}}
						/>
						<Text
							style={[
								styles.noteText,
								{ color: theme.text },
							]}
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
		fontSize: 11,
		fontWeight: "500",
		marginTop: 2,
	},
	card: {
		flex: 1,
		borderRadius: RADIUS.card,
		borderWidth: 1,
		padding: 14,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 2,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 6,
	},
	headerLeftTag: {
		flexDirection: "row",
		alignItems: "center",
	},
	colorDot: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
		marginRight: 6,
	},
	headerTagText: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.5,
		textTransform: "uppercase",
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		letterSpacing: -0.2,
		marginBottom: 6,
		lineHeight: 20,
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
		marginTop: 10,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: StyleSheet.hairlineWidth,
	},
	noteText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 16,
	},
});
