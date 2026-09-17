import React from "react";
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SearchResultItem } from "../types/schedule";

interface HeaderProps {
	entity: SearchResultItem;
	weekNum: string;
	weekDates: string;
	isFav: boolean;
	isLoading: boolean;
	onOpenSearch: () => void;
	onOpenWeeks: () => void;
	onOpenCalls: () => void;
	onToggleFav: () => void;
	onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
	entity,
	weekNum,
	weekDates,
	isFav,
	isLoading,
	onOpenSearch,
	onOpenWeeks,
	onOpenCalls,
	onToggleFav,
	onRefresh,
}) => {
	const triggerHaptic = (
		style: Haptics.ImpactFeedbackStyle = Haptics
			.ImpactFeedbackStyle.Light
	) => {
		try {
			Haptics.impactAsync(style);
		} catch {}
	};

	const getTypeLabel = (type: string) => {
		switch (type) {
			case "Teacher":
				return "Преподаватель";
			case "Classroom":
				return "Кабинет";
			default:
				return "Группа";
		}
	};

	return (
		<View style={styles.container}>
			{/* Верхняя строка: логотип и действия */}
			<View style={styles.topRow}>
				<View style={styles.branding}>
					<Text style={styles.collegeName}>
						АЛЬМЕТЬЕВСКИЙ ПРОФ. КОЛЛЕДЖ
					</Text>
					<TouchableOpacity
						style={styles.entityButton}
						activeOpacity={0.7}
						onPress={() => {
							triggerHaptic();
							onOpenSearch();
						}}
					>
						<Text
							style={styles.entityName}
							numberOfLines={1}
						>
							{entity.SearchContent}
						</Text>
						<View style={styles.entityBadge}>
							<Text style={styles.entityBadgeText}>
								{getTypeLabel(entity.Type)}
							</Text>
						</View>
						<Ionicons
							name="chevron-down"
							size={16}
							color="#007AFF"
							style={styles.chevron}
						/>
					</TouchableOpacity>
				</View>

				<View style={styles.actionsRow}>
					{/* Избранное */}
					<TouchableOpacity
						style={styles.iconButton}
						activeOpacity={0.7}
						onPress={() => {
							triggerHaptic(
								Haptics.ImpactFeedbackStyle
									.Medium
							);
							onToggleFav();
						}}
					>
						<Ionicons
							name={
								isFav ? "star" : "star-outline"
							}
							size={22}
							color={isFav ? "#FF9500" : "#8E8E93"}
						/>
					</TouchableOpacity>

					{/* Расписание звонков */}
					<TouchableOpacity
						style={styles.iconButton}
						activeOpacity={0.7}
						onPress={() => {
							triggerHaptic();
							onOpenCalls();
						}}
					>
						<Ionicons
							name="notifications-outline"
							size={22}
							color="#007AFF"
						/>
					</TouchableOpacity>

					{/* Поиск */}
					<TouchableOpacity
						style={styles.iconButton}
						activeOpacity={0.7}
						onPress={() => {
							triggerHaptic();
							onOpenSearch();
						}}
					>
						<Ionicons
							name="search-outline"
							size={22}
							color="#007AFF"
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Нижняя строка: выбор недели */}
			<View style={styles.weekBar}>
				<TouchableOpacity
					style={styles.weekButton}
					activeOpacity={0.7}
					onPress={() => {
						triggerHaptic();
						onOpenWeeks();
					}}
				>
					<Ionicons
						name="calendar-outline"
						size={15}
						color="#007AFF"
						style={{ marginRight: 6 }}
					/>
					<Text style={styles.weekText}>
						{weekNum
							? `${weekNum} неделя`
							: "Выбрать неделю"}
					</Text>
					{weekDates ? (
						<Text style={styles.weekDatesText}>
							({weekDates})
						</Text>
					) : null}
					<Ionicons
						name="chevron-down"
						size={14}
						color="#8E8E93"
						style={{ marginLeft: 4 }}
					/>
				</TouchableOpacity>

				{/* Кнопка обновления */}
				<TouchableOpacity
					style={styles.refreshButton}
					activeOpacity={0.7}
					onPress={() => {
						triggerHaptic();
						onRefresh();
					}}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator
							size="small"
							color="#007AFF"
						/>
					) : (
						<Ionicons
							name="refresh-outline"
							size={18}
							color="#007AFF"
						/>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "#FFFFFF",
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#D1D1D6",
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 10,
	},
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	branding: {
		flex: 1,
		marginRight: 8,
	},
	collegeName: {
		fontSize: 10,
		fontWeight: "700",
		color: "#8E8E93",
		letterSpacing: 0.8,
		marginBottom: 2,
	},
	entityButton: {
		flexDirection: "row",
		alignItems: "center",
	},
	entityName: {
		fontSize: 22,
		fontWeight: "800",
		color: "#000000",
		letterSpacing: -0.5,
		maxWidth: "65%",
	},
	entityBadge: {
		backgroundColor: "#E5F1FF",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		marginLeft: 8,
	},
	entityBadgeText: {
		fontSize: 11,
		fontWeight: "600",
		color: "#007AFF",
	},
	chevron: {
		marginLeft: 4,
	},
	actionsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	iconButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: "#F2F2F7",
		alignItems: "center",
		justifyContent: "center",
	},
	weekBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 10,
	},
	weekButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#F2F2F7",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		flex: 1,
		marginRight: 10,
	},
	weekText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#000000",
	},
	weekDatesText: {
		fontSize: 12,
		color: "#8E8E93",
		marginLeft: 6,
	},
	refreshButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "#F2F2F7",
		alignItems: "center",
		justifyContent: "center",
	},
});
