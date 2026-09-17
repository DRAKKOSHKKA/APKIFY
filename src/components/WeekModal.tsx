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

interface WeekModalProps {
	visible: boolean;
	weeks: WeekItem[];
	currentWeekId: string;
	onSelectWeek: (weekId: string) => void;
	onClose: () => void;
}

export const WeekModal: React.FC<WeekModalProps> = ({
	visible,
	weeks,
	currentWeekId,
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
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.header}>
					<Text style={styles.title}>
						Учебные недели
					</Text>
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
							color="#8E8E93"
						/>
					</TouchableOpacity>
				</View>

				<ScrollView
					contentContainerStyle={styles.content}
				>
					<Text style={styles.subtitle}>
						Выберите неделю для просмотра расписания:
					</Text>

					<View style={styles.grid}>
						{weeks.map((week) => {
							const isSelected =
								week.weekId === currentWeekId;

							return (
								<TouchableOpacity
									key={week.weekId}
									style={[
										styles.weekCard,
										isSelected &&
											styles.weekCardSelected,
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
									<Text
										style={[
											styles.weekNumber,
											isSelected &&
												styles.textSelected,
										]}
									>
										{week.weekNum}
									</Text>
									<Text
										style={[
											styles.weekLabel,
											isSelected &&
												styles.textSelected,
										]}
									>
										неделя
									</Text>
									{week.isCurrent && (
										<View
											style={
												styles.currentBadge
											}
										>
											<Text
												style={
													styles.currentBadgeText
												}
											>
												Сейчас
											</Text>
										</View>
									)}
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
		backgroundColor: "#F2F2F7",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#D1D1D6",
		backgroundColor: "#FFFFFF",
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		color: "#000000",
	},
	closeButton: {
		padding: 2,
	},
	content: {
		padding: 20,
	},
	subtitle: {
		fontSize: 14,
		color: "#8E8E93",
		marginBottom: 16,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	weekCard: {
		width: "30%",
		aspectRatio: 1,
		backgroundColor: "#FFFFFF",
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		padding: 10,
		borderWidth: 1.5,
		borderColor: "#E5E5EA",
		position: "relative",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
		elevation: 1,
	},
	weekCardSelected: {
		backgroundColor: "#007AFF",
		borderColor: "#007AFF",
		shadowColor: "#007AFF",
		shadowOpacity: 0.25,
		shadowRadius: 8,
		elevation: 3,
	},
	weekNumber: {
		fontSize: 26,
		fontWeight: "800",
		color: "#000000",
	},
	weekLabel: {
		fontSize: 12,
		fontWeight: "500",
		color: "#8E8E93",
		marginTop: 2,
	},
	currentBadge: {
		position: "absolute",
		top: 6,
		right: 6,
		backgroundColor: "#34C759",
		paddingHorizontal: 5,
		paddingVertical: 1,
		borderRadius: 6,
	},
	currentBadgeText: {
		fontSize: 9,
		fontWeight: "700",
		color: "#FFFFFF",
	},
	textSelected: {
		color: "#FFFFFF",
	},
});
