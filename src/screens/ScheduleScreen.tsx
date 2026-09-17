import React from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	RefreshControl,
	ActivityIndicator,
	TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
	AppSettings,
	DaySchedule,
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
	selectedWeekId,
	isFav,
	isLoading,
	isRefreshing,
	isOffline,
	errorMessage,
	settings,
	theme,
	onSelectDayIndex,
	onOpenSearch,
	onOpenWeeks,
	onOpenCalls,
	onToggleFav,
	onRefresh,
	onRetry,
}) => {
	const selectedDay = schedule?.days[selectedDayIndex];

	// Фильтрация пар по выбранной в профиле подгруппе
	const filterLessonsBySubgroup = (
		lessons: Lesson[]
	): Lesson[] => {
		if (settings.subgroup === "all") return lessons;
		return lessons.filter((lesson) => {
			const g = lesson.group.toLowerCase();
			// Если подгруппа не указана в скобках, значит пара для всей группы
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
		? filterLessonsBySubgroup(selectedDay.lessons)
		: [];

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: theme.background },
			]}
		>
			{/* Шапка iOS */}
			<Header
				entity={entity}
				weekNum={schedule?.currentWeekNum || ""}
				weekDates={schedule?.currentWeekDates || ""}
				isFav={isFav}
				isLoading={isLoading}
				theme={theme}
				onOpenSearch={onOpenSearch}
				onOpenWeeks={onOpenWeeks}
				onOpenCalls={onOpenCalls}
				onToggleFav={onToggleFav}
				onRefresh={onRefresh}
			/>

			{/* Офлайн бейдж */}
			{isOffline && (
				<View
					style={[
						styles.offlineBanner,
						{
							backgroundColor: theme.warningSubtle,
							borderBottomColor: theme.warning,
						},
					]}
				>
					<Ionicons
						name="cloud-offline-outline"
						size={15}
						color={theme.warning}
						style={{ marginRight: 6 }}
					/>
					<Text
						style={[
							styles.offlineText,
							{ color: theme.warning },
						]}
					>
						Офлайн-режим • Показана сохранённая копия
					</Text>
				</View>
			)}

			{/* Горизонтальный переключатель дней недели */}
			{schedule?.days && schedule.days.length > 0 && (
				<DaySelector
					days={schedule.days}
					selectedIndex={selectedDayIndex}
					theme={theme}
					onSelectIndex={onSelectDayIndex}
				/>
			)}

			{/* Список пар */}
			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.scrollContainer}
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
					<View style={styles.errorContainer}>
						<Ionicons
							name="alert-circle-outline"
							size={56}
							color={theme.danger}
						/>
						<Text
							style={[
								styles.errorTitle,
								{ color: theme.text },
							]}
						>
							Ошибка загрузки
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
								styles.retryButton,
								{
									backgroundColor:
										theme.accent,
								},
							]}
							onPress={onRetry}
						>
							<Text style={styles.retryButtonText}>
								Попробовать снова
							</Text>
						</TouchableOpacity>
					</View>
				) : selectedDay ? (
					<View>
						{/* Дата и статус "Сегодня" */}
						<View style={styles.dayInfoBar}>
							<Text
								style={[
									styles.dayDateTitle,
									{ color: theme.text },
								]}
							>
								{formatFullDate(
									selectedDay.dayDate,
									selectedDay.dayName
								)}
							</Text>
							<View style={styles.rightPillRow}>
								{settings.subgroup !== "all" && (
									<View
										style={[
											styles.subgroupPill,
											{
												backgroundColor:
													theme.chipBackground,
											},
										]}
									>
										<Text
											style={[
												styles.subgroupPillText,
												{
													color: theme.textSecondary,
												},
											]}
										>
											{settings.subgroup}{" "}
											подгр.
										</Text>
									</View>
								)}
								{selectedDay.isToday && (
									<View
										style={[
											styles.todayPill,
											{
												backgroundColor:
													theme.accent,
											},
										]}
									>
										<Text
											style={
												styles.todayPillText
											}
										>
											СЕГОДНЯ
										</Text>
									</View>
								)}
							</View>
						</View>

						{/* Карточки пар */}
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
					<View style={styles.loadingContainer}>
						<ActivityIndicator
							size="large"
							color={theme.accent}
						/>
						<Text
							style={[
								styles.loadingText,
								{ color: theme.textSecondary },
							]}
						>
							Загрузка расписания...
						</Text>
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
	content: {
		flex: 1,
	},
	scrollContainer: {
		paddingVertical: 12,
		paddingBottom: 110, // Чтобы не перекрывалось нижним таб-баром
	},
	offlineBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 6,
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	offlineText: {
		fontSize: 12,
		fontWeight: "600",
	},
	dayInfoBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		marginBottom: 12,
		marginTop: 4,
	},
	dayDateTitle: {
		fontSize: 17,
		fontWeight: "700",
	},
	rightPillRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	subgroupPill: {
		paddingHorizontal: 7,
		paddingVertical: 3,
		borderRadius: 8,
	},
	subgroupPillText: {
		fontSize: 11,
		fontWeight: "600",
	},
	todayPill: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 8,
	},
	todayPillText: {
		fontSize: 10,
		fontWeight: "800",
		color: "#FFFFFF",
		letterSpacing: 0.5,
	},
	loadingContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 100,
	},
	loadingText: {
		fontSize: 15,
		fontWeight: "500",
		marginTop: 14,
	},
	errorContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 80,
		paddingHorizontal: 30,
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: "700",
		marginTop: 16,
		marginBottom: 8,
	},
	errorSubtitle: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
		marginBottom: 20,
	},
	retryButton: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 20,
	},
	retryButtonText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#FFFFFF",
	},
});
