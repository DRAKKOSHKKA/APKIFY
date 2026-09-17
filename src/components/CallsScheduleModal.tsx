import React, { useState } from "react";
import {
	StyleSheet,
	Text,
	View,
	Modal,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
	CALLS_SCHEDULE,
	SATURDAY_CALLS_SCHEDULE,
} from "../utils/timeUtils";
import { ThemeColors } from "../theme/colors";

interface CallsScheduleModalProps {
	visible: boolean;
	theme: ThemeColors;
	onClose: () => void;
}

export const CallsScheduleModal: React.FC<
	CallsScheduleModalProps
> = ({ visible, theme, onClose }) => {
	const [scheduleType, setScheduleType] = useState<
		"weekday" | "saturday"
	>("weekday");

	const isSaturday = scheduleType === "saturday";
	const activeList = isSaturday
		? SATURDAY_CALLS_SCHEDULE
		: CALLS_SCHEDULE;
	const durationLabel = isSaturday ? "1 час" : "1ч 20м";

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<SafeAreaView
				style={[
					styles.safeArea,
					{ backgroundColor: theme.modalBackground },
				]}
			>
				<View
					style={[
						styles.header,
						{
							backgroundColor:
								theme.headerBackground,
							borderBottomColor: theme.border,
						},
					]}
				>
					<View style={styles.titleContainer}>
						<Ionicons
							name="notifications"
							size={22}
							color={theme.accent}
							style={{ marginRight: 8 }}
						/>
						<Text
							style={[
								styles.title,
								{ color: theme.text },
							]}
						>
							Расписание звонков
						</Text>
					</View>
					<TouchableOpacity
						style={styles.closeButton}
						onPress={onClose}
						hitSlop={{
							top: 10,
							bottom: 10,
							left: 10,
							right: 10,
						}}
					>
						<Ionicons
							name="close-circle"
							size={28}
							color={theme.textSecondary}
						/>
					</TouchableOpacity>
				</View>

				<ScrollView
					contentContainerStyle={styles.content}
				>
					{/* Переключатель: Будни / Суббота */}
					<View
						style={[
							styles.segmentedWrapper,
							{
								backgroundColor:
									theme.chipBackground,
							},
						]}
					>
						<TouchableOpacity
							style={[
								styles.segmentButton,
								!isSaturday && [
									styles.segmentButtonActive,
									{
										backgroundColor:
											theme.card,
									},
								],
							]}
							activeOpacity={0.7}
							onPress={() => {
								try {
									Haptics.selectionAsync();
								} catch {}
								setScheduleType("weekday");
							}}
						>
							<Text
								style={[
									styles.segmentText,
									{
										color: !isSaturday
											? theme.text
											: theme.textSecondary,
										fontWeight: !isSaturday
											? "700"
											: "500",
									},
								]}
							>
								Будни (Пн — Пт)
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.segmentButton,
								isSaturday && [
									styles.segmentButtonActive,
									{
										backgroundColor:
											theme.card,
									},
								],
							]}
							activeOpacity={0.7}
							onPress={() => {
								try {
									Haptics.selectionAsync();
								} catch {}
								setScheduleType("saturday");
							}}
						>
							<Text
								style={[
									styles.segmentText,
									{
										color: isSaturday
											? theme.text
											: theme.textSecondary,
										fontWeight: isSaturday
											? "700"
											: "500",
									},
								]}
							>
								Суббота (по 1 часу)
							</Text>
						</TouchableOpacity>
					</View>

					<Text
						style={[
							styles.subtitle,
							{ color: theme.textSecondary },
						]}
					>
						{isSaturday
							? "Особое субботнее расписание пар по 1 часу и перемены:"
							: "Стандартное расписание пар (1 час 20 мин) и перемены:"}
					</Text>

					{activeList.map((item, index) => (
						<View
							key={item.pair}
							style={styles.pairItemContainer}
						>
							<View
								style={[
									styles.pairRow,
									{
										backgroundColor:
											theme.card,
										borderColor:
											theme.border,
									},
								]}
							>
								<View
									style={[
										styles.pairBadge,
										{
											backgroundColor:
												theme.accentSubtle,
										},
									]}
								>
									<Text
										style={[
											styles.pairNumber,
											{
												color: theme.accent,
											},
										]}
									>
										{item.pair}
									</Text>
								</View>

								<View style={styles.timeBlock}>
									<Text
										style={[
											styles.pairTitle,
											{
												color: theme.textSecondary,
											},
										]}
									>
										Пара {item.pair}
									</Text>
									<Text
										style={[
											styles.timeRange,
											{
												color: theme.text,
											},
										]}
									>
										{item.start} — {item.end}
									</Text>
								</View>

								<View
									style={[
										styles.durationBadge,
										{
											backgroundColor:
												theme.chipBackground,
										},
									]}
								>
									<Text
										style={[
											styles.durationText,
											{
												color: theme.textSecondary,
											},
										]}
									>
										{durationLabel}
									</Text>
								</View>
							</View>

							{index < activeList.length - 1 && (
								<View style={styles.breakRow}>
									<View
										style={[
											styles.breakLine,
											{
												backgroundColor:
													theme.border,
											},
										]}
									/>
									<View
										style={[
											styles.breakBadge,
											{
												backgroundColor:
													theme.warningSubtle,
											},
										]}
									>
										<Ionicons
											name="cafe-outline"
											size={12}
											color={theme.warning}
											style={{
												marginRight: 4,
											}}
										/>
										<Text
											style={[
												styles.breakText,
												{
													color: theme.warning,
												},
											]}
										>
											{item.breakText}
										</Text>
									</View>
									<View
										style={[
											styles.breakLine,
											{
												backgroundColor:
													theme.border,
											},
										]}
									/>
								</View>
							)}
						</View>
					))}
				</ScrollView>
			</SafeAreaView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	titleContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
	},
	closeButton: {
		padding: 2,
	},
	content: {
		padding: 16,
		paddingBottom: 40,
	},
	segmentedWrapper: {
		flexDirection: "row",
		borderRadius: 12,
		padding: 3,
		marginBottom: 16,
	},
	segmentButton: {
		flex: 1,
		paddingVertical: 9,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 10,
	},
	segmentButtonActive: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 2,
	},
	segmentText: {
		fontSize: 13,
		letterSpacing: -0.2,
	},
	subtitle: {
		fontSize: 13,
		marginBottom: 16,
		lineHeight: 18,
	},
	pairItemContainer: {
		marginBottom: 4,
	},
	pairRow: {
		flexDirection: "row",
		alignItems: "center",
		padding: 14,
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
		elevation: 1,
	},
	pairBadge: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 14,
	},
	pairNumber: {
		fontSize: 16,
		fontWeight: "800",
	},
	timeBlock: {
		flex: 1,
	},
	pairTitle: {
		fontSize: 12,
		fontWeight: "600",
		textTransform: "uppercase",
	},
	timeRange: {
		fontSize: 17,
		fontWeight: "700",
		marginTop: 2,
	},
	durationBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	durationText: {
		fontSize: 12,
		fontWeight: "600",
	},
	breakRow: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 6,
		paddingHorizontal: 20,
	},
	breakLine: {
		flex: 1,
		height: 1,
	},
	breakBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 12,
		marginHorizontal: 8,
	},
	breakText: {
		fontSize: 11,
		fontWeight: "700",
	},
});
