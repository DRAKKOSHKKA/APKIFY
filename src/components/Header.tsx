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
import { ThemeColors } from "../theme/colors";

interface HeaderProps {
	entity: SearchResultItem;
	weekNum: string;
	weekDates: string;
	isFav: boolean;
	isLoading: boolean;
	theme: ThemeColors;
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
	theme,
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
		<View
			style={[
				styles.container,
				{
					backgroundColor: theme.headerBackground,
					borderBottomColor: theme.border,
				},
			]}
		>
			{/* Верхняя строка: логотип и действия */}
			<View style={styles.topRow}>
				<View style={styles.branding}>
					<Text
						style={[
							styles.collegeName,
							{ color: theme.textSecondary },
						]}
					>
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
							style={[
								styles.entityName,
								{ color: theme.text },
							]}
							numberOfLines={1}
						>
							{entity.SearchContent}
						</Text>
						<View
							style={[
								styles.entityBadge,
								{
									backgroundColor:
										theme.accentSubtle,
								},
							]}
						>
							<Text
								style={[
									styles.entityBadgeText,
									{ color: theme.accent },
								]}
							>
								{getTypeLabel(entity.Type)}
							</Text>
						</View>
						<Ionicons
							name="chevron-down"
							size={16}
							color={theme.accent}
							style={styles.chevron}
						/>
					</TouchableOpacity>
				</View>

				<View style={styles.actionsRow}>
					{/* Избранное */}
					<TouchableOpacity
						style={[
							styles.iconButton,
							{
								backgroundColor:
									theme.chipBackground,
							},
						]}
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
							size={20}
							color={
								isFav
									? "#FF9F0A"
									: theme.textSecondary
							}
						/>
					</TouchableOpacity>

					{/* Расписание звонков */}
					<TouchableOpacity
						style={[
							styles.iconButton,
							{
								backgroundColor:
									theme.chipBackground,
							},
						]}
						activeOpacity={0.7}
						onPress={() => {
							triggerHaptic();
							onOpenCalls();
						}}
					>
						<Ionicons
							name="notifications-outline"
							size={20}
							color={theme.accent}
						/>
					</TouchableOpacity>

					{/* Поиск */}
					<TouchableOpacity
						style={[
							styles.iconButton,
							{
								backgroundColor:
									theme.chipBackground,
							},
						]}
						activeOpacity={0.7}
						onPress={() => {
							triggerHaptic();
							onOpenSearch();
						}}
					>
						<Ionicons
							name="search-outline"
							size={20}
							color={theme.accent}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Нижняя строка: выбор недели */}
			<View style={styles.weekBar}>
				<TouchableOpacity
					style={[
						styles.weekButton,
						{
							backgroundColor:
								theme.chipBackground,
						},
					]}
					activeOpacity={0.7}
					onPress={() => {
						triggerHaptic();
						onOpenWeeks();
					}}
				>
					<Ionicons
						name="calendar"
						size={15}
						color={theme.accent}
						style={{ marginRight: 6 }}
					/>
					<Text
						style={[
							styles.weekText,
							{ color: theme.text },
						]}
					>
						{weekNum
							? `${weekNum} неделя`
							: "Выбрать неделю"}
					</Text>
					{weekDates ? (
						<Text
							style={[
								styles.weekDatesText,
								{ color: theme.textSecondary },
							]}
						>
							({weekDates})
						</Text>
					) : null}
					<Ionicons
						name="chevron-down"
						size={14}
						color={theme.textSecondary}
						style={{ marginLeft: 4 }}
					/>
				</TouchableOpacity>

				{/* Кнопка обновления */}
				<TouchableOpacity
					style={[
						styles.refreshButton,
						{
							backgroundColor:
								theme.chipBackground,
						},
					]}
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
							color={theme.accent}
						/>
					) : (
						<Ionicons
							name="refresh-outline"
							size={18}
							color={theme.accent}
						/>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		borderBottomWidth: StyleSheet.hairlineWidth,
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
		letterSpacing: -0.5,
		maxWidth: "65%",
	},
	entityBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		marginLeft: 8,
	},
	entityBadgeText: {
		fontSize: 11,
		fontWeight: "700",
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
		width: 36,
		height: 36,
		borderRadius: 18,
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
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 20,
		flex: 1,
		marginRight: 10,
	},
	weekText: {
		fontSize: 13,
		fontWeight: "600",
	},
	weekDatesText: {
		fontSize: 12,
		marginLeft: 6,
	},
	refreshButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
	},
});
