import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
	SafeAreaProvider,
	SafeAreaView,
} from "react-native-safe-area-context";

import {
	AppSettings,
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
	getSettings,
	saveSettings,
	DEFAULT_ENTITY,
	DEFAULT_SETTINGS,
} from "./src/services/storage";
import { getActiveTheme } from "./src/theme/colors";

import { TabBar, TabType } from "./src/components/TabBar";
import { ScheduleScreen } from "./src/screens/ScheduleScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SearchModal } from "./src/components/SearchModal";
import { WeekModal } from "./src/components/WeekModal";
import { CallsScheduleModal } from "./src/components/CallsScheduleModal";

export default function App() {
	const systemColorScheme = useColorScheme();
	const [currentTab, setCurrentTab] =
		useState<TabType>("schedule");
	const [settings, setSettings] =
		useState<AppSettings>(DEFAULT_SETTINGS);

	// Вычисляем активную тему (с учетом настройки пользователя: авто, светлая или темная)
	const theme = getActiveTheme(
		settings.themeMode,
		systemColorScheme
	);

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

			// Проверяем локальный кэш для мгновенного рендера
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
						"Не удалось загрузить расписание. Проверьте интернет-соединение."
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
	 * Начальная загрузка настроек и данных
	 */
	useEffect(() => {
		async function init() {
			const loadedSettings = await getSettings();
			setSettings(loadedSettings);

			const savedEntity = await getCurrentEntity();
			const initialEntity =
				savedEntity ||
				loadedSettings.defaultEntity ||
				DEFAULT_ENTITY;
			setEntity(initialEntity);

			const favList = await getFavorites();
			setFavorites(favList);

			const favStatus = await isFavorite(initialEntity);
			setIsFav(favStatus);

			await loadSchedule(initialEntity);
		}
		init();
	}, [loadSchedule]);

	/**
	 * Обновление настроек приложения
	 */
	const handleUpdateSettings = async (
		partial: Partial<AppSettings>
	) => {
		const updated = await saveSettings(partial);
		setSettings(updated);
	};

	/**
	 * Выбор сущности из поиска
	 */
	const handleSelectEntity = async (
		newEntity: SearchResultItem
	) => {
		setEntity(newEntity);
		setSelectedWeekId(undefined);
		await saveCurrentEntity(newEntity);

		// Если выбор был сделан при смене дефолтной группы в профиле
		await handleUpdateSettings({ defaultEntity: newEntity });

		const favStatus = await isFavorite(newEntity);
		setIsFav(favStatus);

		await loadSchedule(newEntity, undefined);
	};

	/**
	 * Выбор недели
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

				{/* Экран Расписание */}
				{currentTab === "schedule" && (
					<ScheduleScreen
						entity={entity}
						schedule={schedule}
						selectedDayIndex={selectedDayIndex}
						selectedWeekId={selectedWeekId}
						isFav={isFav}
						isLoading={isLoading}
						isRefreshing={isRefreshing}
						isOffline={isOffline}
						errorMessage={errorMessage}
						settings={settings}
						theme={theme}
						onSelectDayIndex={setSelectedDayIndex}
						onOpenSearch={() =>
							setIsSearchOpen(true)
						}
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
						onRetry={() =>
							loadSchedule(entity, selectedWeekId)
						}
					/>
				)}

				{/* Экран Профиль и Настройки */}
				{currentTab === "profile" && (
					<ProfileScreen
						settings={settings}
						theme={theme}
						onUpdateSettings={handleUpdateSettings}
						onOpenGroupPicker={() =>
							setIsSearchOpen(true)
						}
						onOpenCallsModal={() =>
							setIsCallsOpen(true)
						}
					/>
				)}

				{/* Нативная нижняя панель iOS (TabBar) */}
				<TabBar
					currentTab={currentTab}
					theme={theme}
					onSelectTab={setCurrentTab}
				/>

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
});
