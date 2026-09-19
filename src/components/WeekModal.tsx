import React from "react";
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
import { WeekItem } from "../types/schedule";
import { ThemeColors } from "../theme/colors";
import { RADIUS } from "../theme/tokens";

interface WeekModalProps {
	visible: boolean;
	weeks: WeekItem[];
	selectedWeekId?: string;
	currentWeekId?: string; // обратная совместимость
	realCurrentWeekId?: string;
	theme: ThemeColors;
	onSelectWeek: (weekId: string) => void;
	onClose: () => void;
}

export const WeekModal: React.FC<WeekModalProps> = ({
	visible,
	weeks,
	selectedWeekId,
	currentWeekId,
	realCurrentWeekId,
	theme,
	onSelectWeek,
	onClose,
}) => {
	const activeSelectedWeekId =
		selectedWeekId || currentWeekId || "";

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
					<View style={styles.titleRow}>
						<Ionicons
							name="calendar"
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
							Учебные недели
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
					showsVerticalScrollIndicator={false}
				>
					<Text
						style={[
							styles.subtitle,
							{ color: theme.textSecondary },
						]}
					>
						1 семестр 2026-2027 учебного года.
						Выберите неделю для просмотра:
					</Text>

					<View style={styles.list}>
						{weeks.map((week) => {
							const isSelected =
								week.weekId ===
								activeSelectedWeekId;
							const isRealCurrent =
								week.isCurrent ||
								(realCurrentWeekId
									? week.weekId ===
										realCurrentWeekId
									: false);

							const rowBg = isSelected
								? theme.isDark
									? "rgba(10, 132, 255, 0.14)"
									: "rgba(0, 122, 255, 0.08)"
								: theme.card;

							const rowBorder = isSelected
								? theme.accent
								: theme.border;

							return (
								<TouchableOpacity
									key={week.weekId}
									style={[
										styles.weekRow,
										{
											backgroundColor:
												rowBg,
											borderColor:
												rowBorder,
											borderWidth:
												isSelected
													? 1.5
													: StyleSheet.hairlineWidth,
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
										onSelectWeek(
											week.weekId
										);
										onClose();
									}}
								>
									<View
										style={styles.weekInfo}
									>
										<View
											style={[
												styles.numCircle,
												{
													backgroundColor:
														isSelected
															? theme.accent
															: theme.chipBackground,
												},
											]}
										>
											<Text
												style={[
													styles.numText,
													{
														color: isSelected
															? "#FFFFFF"
															: theme.text,
													},
												]}
											>
												{week.weekNum}
											</Text>
										</View>

										<View
											style={
												styles.weekDetails
											}
										>
											<Text
												style={[
													styles.weekTitle,
													{
														color: isSelected
															? theme.accent
															: theme.text,
														fontWeight:
															isSelected
																? "800"
																: "700",
													},
												]}
											>
												{week.weekNum}{" "}
												неделя
											</Text>
											{week.dateRange ? (
												<Text
													style={[
														styles.weekDates,
														{
															color: theme.textSecondary,
														},
													]}
												>
													{
														week.dateRange
													}
												</Text>
											) : null}
										</View>
									</View>

									<View
										style={styles.rightBadge}
									>
										{isRealCurrent && (
											<View
												style={[
													styles.currentBadge,
													{
														backgroundColor:
															theme.successSubtle,
														borderColor:
															theme.success,
													},
												]}
											>
												<View
													style={[
														styles.liveDot,
														{
															backgroundColor:
																theme.success,
														},
													]}
												/>
												<Text
													style={[
														styles.currentBadgeText,
														{
															color: theme.success,
														},
													]}
												>
													СЕЙЧАС
												</Text>
											</View>
										)}

										<View
											style={
												styles.checkIconWrap
											}
										>
											{isSelected ? (
												<Ionicons
													name="checkmark-circle"
													size={22}
													color={
														theme.accent
													}
												/>
											) : (
												<Ionicons
													name="chevron-forward"
													size={18}
													color={
														theme.separator
													}
												/>
											)}
										</View>
									</View>
								</TouchableOpacity>
							);
						})}
					</View>
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
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	title: {
		fontSize: 20,
		fontWeight: "800",
		letterSpacing: -0.4,
	},
	closeButton: {
		padding: 2,
	},
	content: {
		padding: 16,
		paddingBottom: 40,
	},
	subtitle: {
		fontSize: 13,
		marginBottom: 16,
		lineHeight: 18,
	},
	list: {
		gap: 8,
	},
	weekRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 13,
		paddingHorizontal: 16,
		borderRadius: RADIUS.card,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
		elevation: 1,
	},
	weekInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	numCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	numText: {
		fontSize: 15,
		fontWeight: "800",
	},
	weekDetails: {
		justifyContent: "center",
	},
	weekTitle: {
		fontSize: 16,
		letterSpacing: -0.2,
	},
	weekDates: {
		fontSize: 12,
		fontWeight: "500",
		marginTop: 2,
	},
	rightBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	currentBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: 1,
	},
	liveDot: {
		width: 5,
		height: 5,
		borderRadius: 2.5,
		marginRight: 4,
	},
	currentBadgeText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 0.5,
	},
	checkIconWrap: {
		width: 24,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 4,
	},
});
