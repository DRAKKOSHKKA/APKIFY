import React from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	RefreshControl,
	ActivityIndicator,
	TouchableOpacity,
	LayoutAnimation,
	Platform,
	UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
	AppSettings,
	Lesson,
	ScheduleData,
	SearchResultItem,
} from "../types/schedule";
import { ThemeColors } from "../theme/colors";
import { formatFullDate } from "../utils/timeUtils";

import { Header } from "../components/Header";
import { DaySelector } from "../components/DaySelector";
import { LessonCard } from "../components/LessonCard";
import { EmptyDay } from "../components/EmptyDay";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ScheduleScreenProps {
	entity: SearchResultItem;
	schedule: ScheduleData | null;
	selectedDayIndex: number;
	selectedWeekId?: string;
	isFav: boolean;
	isLoading: boolean;
	isRefreshing: boolean;
	isOffline: boolean;
	errorMessage: string | null;
	settings: AppSettings;
	theme: ThemeColors;
	onSelectDayIndex: (index: number) => void;
	onOpenSearch: () => void;
	onOpenWeeks: () => void;
	onOpenCalls: () => void;
	onToggleFav: () => void;
	onRefresh: () => void;
	onRetry: () => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
	entity,
	schedule,
	selectedDayIndex,
	isLoading,
	isRefreshing,
	isOffline,
	errorMessage,
	settings,
	theme,
	onSelectDayIndex,
	onOpenSearch,
	onOpenWeeks,
	onRefresh,
	onRetry,
}) => {
	const selectedDay = schedule?.days[selectedDayIndex];

	// Анимация при переключении дня
	const handleSelectDay = (idx: number) => {
		LayoutAnimation.configureNext(
			LayoutAnimation.Presets.easeInEaseOut
		);
		onSelectDayIndex(idx);
	};

	// Фильтрация по подгруппе
	const filterLessons = (lessons: Lesson[]): Lesson[] => {
		if (settings.subgroup === "all") return lessons;
		return lessons.filter((l) => {
			const g = l.group.toLowerCase();
			if (!g.includes("подгруппа") && !g.includes("п/г"))
				return true;
			if (
				settings.subgroup === "1" &&
				(g.includes("1") ||
					g.includes("1-я") ||
					g.includes("1 подгруппа"))
			)
				return true;
			if (
				settings.subgroup === "2" &&
				(g.includes("2") ||
					g.includes("2-я") ||
					g.includes("2 подгруппа"))
			)
				return true;
			return false;
		});
	};

	const displayedLessons = selectedDay
		? filterLessons(selectedDay.lessons)
		: [];

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: theme.background },
			]}
		>
			{/* Лаконичная шапка */}
			<Header
				entity={entity}
				weekNum={schedule?.currentWeekNum || ""}
				theme={theme}
				onOpenSearch={onOpenSearch}
				onOpenWeeks={onOpenWeeks}
			/>

			{/* Полоска дней */}
			{schedule?.days && schedule.days.length > 0 && (
				<DaySelector
					days={schedule.days}
					selectedIndex={selectedDayIndex}
					theme={theme}
					onSelectIndex={handleSelectDay}
				/>
			)}

			{/* Спокойное уведомление об офлайн-режиме (если сети нет) */}
			{isOffline && (
				<View style={styles.offlineNotice}>
					<Text
						style={[
							styles.offlineText,
							{ color: theme.textSecondary },
						]}
					>
						Офлайн-копия
					</Text>
				</View>
			)}

			{/* Список пар */}
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={onRefresh}
						tintColor={theme.accent}
					/>
				}
			>
				{errorMessage && !schedule ? (
					<View style={styles.centerBox}>
						<Ionicons
							name="cloud-offline-outline"
							size={48}
							color={theme.textSecondary}
						/>
						<Text
							style={[
								styles.errorTitle,
								{ color: theme.text },
							]}
						>
							Нет связи с сервером
						</Text>
						<Text
							style={[
								styles.errorSubtitle,
								{ color: theme.textSecondary },
							]}
						>
							{errorMessage}
						</Text>
						<TouchableOpacity
							style={[
								styles.retryBtn,
								{
									backgroundColor:
										theme.accent,
								},
							]}
							onPress={onRetry}
						>
							<Text style={styles.retryBtnText}>
								Повторить
							</Text>
						</TouchableOpacity>
					</View>
				) : selectedDay ? (
					<View>
						{/* Дата выбранного дня */}
						<View style={styles.dayHeader}>
							<Text
								style={[
									styles.dayTitle,
									{ color: theme.text },
								]}
							>
								{formatFullDate(
									selectedDay.dayDate,
									selectedDay.dayName
								)}
							</Text>
							{settings.subgroup !== "all" && (
								<Text
									style={[
										styles.subgroupNotice,
										{
											color: theme.textSecondary,
										},
									]}
								>
									{settings.subgroup}-я
									подгруппа
								</Text>
							)}
						</View>

						{/* Карточки занятий */}
						{displayedLessons.length > 0 ? (
							displayedLessons.map((lesson) => (
								<LessonCard
									key={lesson.id}
									lesson={lesson}
									isToday={selectedDay.isToday}
									theme={theme}
								/>
							))
						) : (
							<EmptyDay
								dayName={selectedDay.dayName}
								dayDate={selectedDay.dayDate}
								theme={theme}
							/>
						)}
					</View>
				) : isLoading ? (
					<View style={styles.centerBox}>
						<ActivityIndicator
							size="small"
							color={theme.accent}
						/>
					</View>
				) : null}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingTop: 8,
		paddingBottom: 110,
	},
	offlineNotice: {
		alignItems: "center",
		paddingVertical: 4,
	},
	offlineText: {
		fontSize: 11,
		fontWeight: "500",
	},
	dayHeader: {
		flexDirection: "row",
		alignItems: "baseline",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		marginBottom: 14,
		marginTop: 6,
	},
	dayTitle: {
		fontSize: 18,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	subgroupNotice: {
		fontSize: 12,
		fontWeight: "500",
	},
	centerBox: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 100,
		paddingHorizontal: 30,
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: "700",
		marginTop: 14,
		marginBottom: 6,
	},
	errorSubtitle: {
		fontSize: 13,
		textAlign: "center",
		marginBottom: 16,
		lineHeight: 18,
	},
	retryBtn: {
		paddingHorizontal: 18,
		paddingVertical: 8,
		borderRadius: 18,
	},
	retryBtnText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#FFFFFF",
	},
});
