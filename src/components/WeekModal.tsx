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

interface WeekModalProps {
	visible: boolean;
	weeks: WeekItem[];
	currentWeekId: string;
	theme: ThemeColors;
	onSelectWeek: (weekId: string) => void;
	onClose: () => void;
}

export const WeekModal: React.FC<WeekModalProps> = ({
	visible,
	weeks,
	currentWeekId,
	theme,
	onSelectWeek,
	onClose,
}) => {
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
							size={20}
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
								week.weekId === currentWeekId;

							return (
								<TouchableOpacity
									key={week.weekId}
									style={[
										styles.weekRow,
										{
											backgroundColor:
												isSelected
													? theme.accent
													: theme.card,
											borderColor:
												isSelected
													? theme.accent
													: theme.border,
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
															? "rgba(255, 255, 255, 0.25)"
															: theme.accentSubtle,
												},
											]}
										>
											<Text
												style={[
													styles.numText,
													{
														color: isSelected
															? "#FFFFFF"
															: theme.accent,
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
															? "#FFFFFF"
															: theme.text,
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
															color: isSelected
																? "rgba(255, 255, 255, 0.8)"
																: theme.textSecondary,
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
										{week.isCurrent && (
											<View
												style={[
													styles.currentBadge,
													{
														backgroundColor:
															isSelected
																? "#FFFFFF"
																: theme.success,
													},
												]}
											>
												<Text
													style={[
														styles.currentBadgeText,
														{
															color: isSelected
																? theme.accent
																: "#FFFFFF",
														},
													]}
												>
													СЕЙЧАС
												</Text>
											</View>
										)}
										<Ionicons
											name={
												isSelected
													? "checkmark-circle"
													: "chevron-forward"
											}
											size={20}
											color={
												isSelected
													? "#FFFFFF"
													: theme.textSecondary
											}
											style={{
												marginLeft: 8,
											}}
										/>
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
		fontWeight: "700",
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
		padding: 14,
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
		elevation: 1,
	},
	weekInfo: {
		flexDirection: "row",
		alignItems: "center",
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
		fontSize: 16,
		fontWeight: "800",
	},
	weekDetails: {
		justifyContent: "center",
	},
	weekTitle: {
		fontSize: 16,
		fontWeight: "700",
	},
	weekDates: {
		fontSize: 13,
		marginTop: 2,
	},
	rightBadge: {
		flexDirection: "row",
		alignItems: "center",
	},
	currentBadge: {
		paddingHorizontal: 7,
		paddingVertical: 3,
		borderRadius: 8,
	},
	currentBadgeText: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 0.5,
	},
});
