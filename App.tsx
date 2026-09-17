import React, { useState, useEffect, useCallback } from "react";
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	RefreshControl,
	ActivityIndicator,
	TouchableOpacity,
	useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
	SafeAreaProvider,
	SafeAreaView,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
	FavoriteItem,
	ScheduleData,
	SearchResultItem,
} from "./src/types/schedule";
import {
	fetchSchedule,
	getCurrentWeekId,
} from "./src/services/api";
import {
	getCurrentEntity,
	saveCurrentEntity,
	getCachedSchedule,
	saveCachedSchedule,
	getFavorites,
	toggleFavorite,
	isFavorite,
	DEFAULT_ENTITY,
} from "./src/services/storage";
import { formatFullDate } from "./src/utils/timeUtils";
import { getTheme } from "./src/theme/colors";

import { Header } from "./src/components/Header";
import { DaySelector } from "./src/components/DaySelector";
import { LessonCard } from "./src/components/LessonCard";
import { EmptyDay } from "./src/components/EmptyDay";
import { WeekModal } from "./src/components/WeekModal";
import { SearchModal } from "./src/components/SearchModal";
import { CallsScheduleModal } from "./src/components/CallsScheduleModal";

export default function App() {
	const colorScheme = useColorScheme();
	const theme = getTheme(colorScheme);

	const [entity, setEntity] =
		useState<SearchResultItem>(DEFAULT_ENTITY);
	const [schedule, setSchedule] =
		useState<ScheduleData | null>(null);
	const [selectedDayIndex, setSelectedDayIndex] =
		useState<number>(0);
	const [selectedWeekId, setSelectedWeekId] = useState<
		string | undefined
	>(undefined);
	const [favorites, setFavorites] = useState<FavoriteItem[]>(
		[]
	);
	const [isFav, setIsFav] = useState<boolean>(false);

	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isRefreshing, setIsRefreshing] =
		useState<boolean>(false);
	const [isOffline, setIsOffline] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<
		string | null
	>(null);

	// Модальные окна
	const [isSearchOpen, setIsSearchOpen] =
		useState<boolean>(false);
	const [isWeeksOpen, setIsWeeksOpen] =
		useState<boolean>(false);
	const [isCallsOpen, setIsCallsOpen] =
		useState<boolean>(false);

	// Таймер для периодического обновления статуса пар ("Идёт сейчас")
	const [, setTick] = useState<number>(0);
	useEffect(() => {
		const timer = setInterval(
			() => setTick((t) => t + 1),
			60000
		);
		return () => clearInterval(timer);
	}, []);

	/**
	 * Выбор сегодняшнего дня недели в массиве дней
	 */
	const pickTodayIndex = (
		days: ScheduleData["days"]
	): number => {
		const todayIndex = days.findIndex((d) => d.isToday);
		if (todayIndex >= 0) return todayIndex;

		const now = new Date();
		const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday...
		if (dayOfWeek === 0) return 0;
		const targetIdx = dayOfWeek - 1;
		return targetIdx < days.length ? targetIdx : 0;
	};

	/**
	 * Загрузка расписания
	 */
	const loadSchedule = useCallback(
		async (
			targetEntity: SearchResultItem,
			weekId?: string,
			isRefresh = false
		) => {
			if (isRefresh) {
				setIsRefreshing(true);
			} else {
				setIsLoading(true);
			}
			setErrorMessage(null);

			// Сначала пытаемся подтянуть кэш для мгновенного отображения
			const cached = await getCachedSchedule(
				targetEntity,
				weekId
			);
			if (cached && !isRefresh) {
				setSchedule(cached);
				setSelectedDayIndex(pickTodayIndex(cached.days));
			}

			try {
				const targetWeek =
					weekId ||
					(await getCurrentWeekId(
						targetEntity.OwnerId
					));
				setSelectedWeekId(targetWeek);

				const freshData = await fetchSchedule(
					targetEntity,
					targetWeek
				);
				setSchedule(freshData);
				setIsOffline(false);
				await saveCachedSchedule(freshData);

				// Обновляем индекс дня только если это первая загрузка или смена группы
				if (!cached || isRefresh) {
					setSelectedDayIndex(
						pickTodayIndex(freshData.days)
					);
				}
			} catch (err: any) {
				console.warn("Ошибка загрузки расписания:", err);
				if (cached) {
					setIsOffline(true);
				} else {
					setErrorMessage(
						"Не удалось загрузить расписание. Проверьте подключение к сети."
					);
				}
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[]
	);

	/**
	 * Начальная инициализация приложения
	 */
	useEffect(() => {
		async function init() {
			const savedEntity = await getCurrentEntity();
			const favList = await getFavorites();
			const favStatus = await isFavorite(savedEntity);

			setEntity(savedEntity);
			setFavorites(favList);
			setIsFav(favStatus);

			await loadSchedule(savedEntity);
		}
		init();
	}, [loadSchedule]);

	/**
	 * Выбор новой группы / преподавателя / кабинета
	 */
	const handleSelectEntity = async (
		newEntity: SearchResultItem
	) => {
		setEntity(newEntity);
		setSelectedWeekId(undefined);
		await saveCurrentEntity(newEntity);

		const favStatus = await isFavorite(newEntity);
		setIsFav(favStatus);

		await loadSchedule(newEntity, undefined);
	};

	/**
	 * Выбор другой недели
	 */
	const handleSelectWeek = async (weekId: string) => {
		setSelectedWeekId(weekId);
		await loadSchedule(entity, weekId);
	};

	/**
	 * Переключение избранного
	 */
	const handleToggleFavorite = async () => {
		const newStatus = await toggleFavorite(entity);
		setIsFav(newStatus);
		const updatedFavorites = await getFavorites();
		setFavorites(updatedFavorites);
	};

	const selectedDay = schedule?.days[selectedDayIndex];

	return (
		<SafeAreaProvider>
			<SafeAreaView
				style={[
					styles.container,
					{ backgroundColor: theme.background },
				]}
				edges={["top"]}
			>
				<StatusBar
					style={theme.isDark ? "light" : "dark"}
				/>

				{/* Верхняя панель управления */}
				<Header
					entity={entity}
					weekNum={schedule?.currentWeekNum || ""}
					weekDates={schedule?.currentWeekDates || ""}
					isFav={isFav}
					isLoading={isLoading}
					theme={theme}
					onOpenSearch={() => setIsSearchOpen(true)}
					onOpenWeeks={() => setIsWeeksOpen(true)}
					onOpenCalls={() => setIsCallsOpen(true)}
					onToggleFav={handleToggleFavorite}
					onRefresh={() =>
						loadSchedule(
							entity,
							selectedWeekId,
							true
						)
					}
				/>

				{/* Офлайн бейдж */}
				{isOffline && (
					<View
						style={[
							styles.offlineBanner,
							{
								backgroundColor:
									theme.warningSubtle,
								borderBottomColor: theme.warning,
							},
						]}
					>
						<Ionicons
							name="cloud-offline-outline"
							size={16}
							color={theme.warning}
							style={{ marginRight: 6 }}
						/>
						<Text
							style={[
								styles.offlineText,
								{ color: theme.warning },
							]}
						>
							Офлайн-режим • Показана сохранённая
							копия
						</Text>
					</View>
				)}

				{/* Переключатель дней недели */}
				{schedule?.days && schedule.days.length > 0 && (
					<DaySelector
						days={schedule.days}
						selectedIndex={selectedDayIndex}
						theme={theme}
						onSelectIndex={setSelectedDayIndex}
					/>
				)}

				{/* Основной контент: пары на выбранный день */}
				<ScrollView
					style={styles.content}
					contentContainerStyle={
						styles.scrollContainer
					}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing}
							onRefresh={() =>
								loadSchedule(
									entity,
									selectedWeekId,
									true
								)
							}
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
									{
										color: theme.textSecondary,
									},
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
								onPress={() =>
									loadSchedule(
										entity,
										selectedWeekId
									)
								}
							>
								<Text
									style={
										styles.retryButtonText
									}
								>
									Попробовать снова
								</Text>
							</TouchableOpacity>
						</View>
					) : selectedDay ? (
						<View>
							{/* Дата и день недели */}
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

							{/* Список занятий */}
							{selectedDay.lessons.length > 0 ? (
								selectedDay.lessons.map(
									(lesson) => (
										<LessonCard
											key={lesson.id}
											lesson={lesson}
											isToday={
												selectedDay.isToday
											}
											theme={theme}
										/>
									)
								)
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
									{
										color: theme.textSecondary,
									},
								]}
							>
								Загрузка расписания...
							</Text>
						</View>
					) : null}
				</ScrollView>

				{/* Модальные окна */}
				<SearchModal
					visible={isSearchOpen}
					favorites={favorites}
					theme={theme}
					onSelectEntity={handleSelectEntity}
					onClose={() => setIsSearchOpen(false)}
				/>

				<WeekModal
					visible={isWeeksOpen}
					weeks={schedule?.weeks || []}
					currentWeekId={
						schedule?.weekId || selectedWeekId || ""
					}
					theme={theme}
					onSelectWeek={handleSelectWeek}
					onClose={() => setIsWeeksOpen(false)}
				/>

				<CallsScheduleModal
					visible={isCallsOpen}
					theme={theme}
					onClose={() => setIsCallsOpen(false)}
				/>
			</SafeAreaView>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
	},
	scrollContainer: {
		paddingVertical: 12,
		paddingBottom: 40,
	},
	offlineBanner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 7,
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
