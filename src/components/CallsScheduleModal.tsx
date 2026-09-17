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
import { CALLS_SCHEDULE } from "../utils/timeUtils";

interface CallsScheduleModalProps {
	visible: boolean;
	onClose: () => void;
}

export const CallsScheduleModal: React.FC<
	CallsScheduleModalProps
> = ({ visible, onClose }) => {
	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.header}>
					<View style={styles.titleContainer}>
						<Ionicons
							name="notifications"
							size={22}
							color="#007AFF"
							style={{ marginRight: 8 }}
						/>
						<Text style={styles.title}>
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
							color="#8E8E93"
						/>
					</TouchableOpacity>
				</View>

				<ScrollView
					contentContainerStyle={styles.content}
				>
					<Text style={styles.subtitle}>
						Время начала и окончания учебных занятий
						(пар) и длительность перемен:
					</Text>

					{CALLS_SCHEDULE.map((item, index) => (
						<View
							key={item.pair}
							style={styles.pairItemContainer}
						>
							<View style={styles.pairRow}>
								<View style={styles.pairBadge}>
									<Text
										style={styles.pairNumber}
									>
										{item.pair}
									</Text>
								</View>

								<View style={styles.timeBlock}>
									<Text
										style={styles.pairTitle}
									>
										Пара {item.pair}
									</Text>
									<Text
										style={styles.timeRange}
									>
										{item.start} — {item.end}
									</Text>
								</View>

								<View
									style={styles.durationBadge}
								>
									<Text
										style={
											styles.durationText
										}
									>
										1ч 20м
									</Text>
								</View>
							</View>

							{index <
								CALLS_SCHEDULE.length - 1 && (
								<View style={styles.breakRow}>
									<View
										style={styles.breakLine}
									/>
									<View
										style={styles.breakBadge}
									>
										<Ionicons
											name="cafe-outline"
											size={12}
											color="#FF9500"
											style={{
												marginRight: 4,
											}}
										/>
										<Text
											style={
												styles.breakText
											}
										>
											{item.breakText}
										</Text>
									</View>
									<View
										style={styles.breakLine}
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
	titleContainer: {
		flexDirection: "row",
		alignItems: "center",
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
		marginBottom: 20,
		lineHeight: 20,
	},
	pairItemContainer: {
		marginBottom: 4,
	},
	pairRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		padding: 14,
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "#E5E5EA",
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
		backgroundColor: "#E5F1FF",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 14,
	},
	pairNumber: {
		fontSize: 16,
		fontWeight: "800",
		color: "#007AFF",
	},
	timeBlock: {
		flex: 1,
	},
	pairTitle: {
		fontSize: 12,
		fontWeight: "600",
		color: "#8E8E93",
		textTransform: "uppercase",
	},
	timeRange: {
		fontSize: 17,
		fontWeight: "700",
		color: "#1C1C1E",
		marginTop: 2,
	},
	durationBadge: {
		backgroundColor: "#F2F2F7",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	durationText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#8E8E93",
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
		backgroundColor: "#E5E5EA",
	},
	breakBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFF8E6",
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 12,
		marginHorizontal: 8,
	},
	breakText: {
		fontSize: 11,
		fontWeight: "600",
		color: "#D97706",
	},
});
