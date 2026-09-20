import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	StyleSheet,
	View,
	useColorScheme,
	Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
	SafeAreaProvider,
	SafeAreaView,
} from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import {
	AppSettings,
	FavoriteItem,
	Lesson,
	ScheduleData,
	SearchResultItem,
	DayCallMode,
} from "./src/types/schedule";
import { GradeEntry } from "./src/types/grades";
import { normalizeSaturdayTimes } from "./src/utils/timeUtils";
import {
	fetchSchedule,
	getCurrentWeekId,
} from "./src/services/api";
import {
	getCurrentEntity,
	saveCurrentEntity,
	getCachedSchedule,
	getLatestCachedSchedule,
	getFallbackDemoSchedule,
	saveCachedSchedule,
	getFavorites,
	toggleFavorite,
	isFavorite,
	getSettings,
	saveSettings,
	DEFAULT_ENTITY,
	DEFAULT_SETTINGS,
} from "./src/services/storage";
import {
	getGradesStore,
	upsertGradeEntry,
	deleteGradeEntry,
	exportGradesFile,
	importGradesFile,
	getGradesExportJsonString,
	importGradesFromJsonString,
} from "./src/services/gradesStorage";
import { getActiveTheme } from "./src/theme/colors";

import { TabBar, TabType } from "./src/components/TabBar";
import { ScheduleScreen } from "./src/screens/ScheduleScreen";
import { GradesScreen } from "./src/screens/GradesScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SearchModal } from "./src/components/SearchModal";
import { WeekModal } from "./src/components/WeekModal";
import { CallsScheduleModal } from "./src/components/CallsScheduleModal";
import { DebugModal } from "./src/components/DebugModal";
import { GradeModal } from "./src/components/GradeModal";

export default function App() {
	const systemColorScheme = useColorScheme();
	const [currentTab, setCurrentTab] =
		useState<TabType>("schedule");
	const [settings, setSettings] =
		useState<AppSettings>(DEFAULT_SETTINGS);

	// Вычисляем активную тему (с учетом режима, акцентного цвета и системной темы)
	const theme = getActiveTheme(
		settings.themeMode,
		settings.accentColor || "blue",
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
	const [isDebugOpen, setIsDebugOpen] =
		useState<boolean>(false);

	// Оценки и заметки (хранение в специальной папке)
	const [grades, setGrades] = useState<GradeEntry[]>([]);
	const [isGradeModalOpen, setIsGradeModalOpen] =
		useState<boolean>(false);
	const [selectedGradeEntry, setSelectedGradeEntry] =
		useState<GradeEntry | null>(null);
	const [gradeInitialData, setGradeInitialData] = useState<{
		subject: string;
		date: string;
		pairIndex?: number;
		time?: string;
		room?: string;
		teacher?: string;
	} | null>(null);

	// Автономность и симуляция Debug
	const [isScheduleUpdated, setIsScheduleUpdated] =
		useState<boolean>(false);
	const [mockDate, setMockDate] = useState<Date | null>(null);
	const [customSchedule, setCustomSchedule] =
		useState<ScheduleData | null>(null);

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
	 * Загрузка расписания с алгоритмом Stale-While-Revalidate:
	 * 1. Мгновенно отображаем сохранённый кэш (если есть).
	 * 2. В фоне опрашиваем сайт колледжа.
	 * 3. Если сайт недоступен — сохраняем кэш на экране и показываем информационную плашку.
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

			// 1. Мгновенная попытка загрузки из локального кэша
			let cached = await getCachedSchedule(
				targetEntity,
				weekId
			);
			if (!cached) {
				cached =
					await getLatestCachedSchedule(targetEntity);
			}

			if (cached && !isRefresh) {
				setSchedule(cached);
				setSelectedDayIndex(pickTodayIndex(cached.days));
				if (cached.weekId && !weekId) {
					setSelectedWeekId(cached.weekId);
				}
			}

			// 2. Фоновый запрос актуального расписания
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

				if (
					cached &&
					JSON.stringify(cached.days) !==
						JSON.stringify(freshData.days)
				) {
					setIsScheduleUpdated(true);
				}

				setSchedule(freshData);
				setIsOffline(false);
				setErrorMessage(null);
				await saveCachedSchedule(freshData);

				if (!cached || isRefresh) {
					setSelectedDayIndex(
						pickTodayIndex(freshData.days)
					);
				}
			} catch (err: any) {
				console.warn("Ошибка загрузки расписания:", err);
				// Если сайт недоступен, пробуем подтянуть любой сохранённый кэш
				if (!cached) {
					cached =
						await getLatestCachedSchedule(
							targetEntity
						);
				}

				if (cached) {
					setSchedule(cached);
					setIsOffline(true);
					setErrorMessage(null);
				} else {
					setIsOffline(true);
					setErrorMessage(
						"Сайт колледжа или интернет недоступен, а сохранённых данных для этой группы пока нет."
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

			// Загрузка оценок из специальной папки / кэша
			try {
				const store = await getGradesStore();
				setGrades(store.entries);
			} catch (err) {
				console.warn(
					"Ошибка загрузки оценок при старте:",
					err
				);
			}

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

	/**
	 * Стресс-тест расписания для проверки верстки (Debug)
	 */
	const handleInjectTestSchedule = () => {
		const base = schedule;
		if (!base) return;
		const stressDay = {
			dayName: "Понедельник",
			dayDate: "14.09.2026",
			isToday: true,
			lessons: [
				{
					id: "stress-1",
					pairIndex: 2, // Проверка уведомления: первой пары нет!
					time: "09:30 - 10:50",
					subject:
						"МДК 02.01 Разработка, внедрение и адаптация программного обеспечения отраслевой направленности с углубленным изучением распределенных систем",
					teacher:
						"Хайруллин Рамиль Миннефакилевич-Закиров",
					room: "312а лаб.",
					group: "21 нмо (2 подгруппа)",
				},
				{
					id: "stress-2",
					pairIndex: 3,
					time: "11:20 - 12:40",
					subject:
						"Архитектура аппаратных средств и микропроцессорных систем вычислительной техники",
					teacher: "Смирнова Елена Александровна",
					room: "204",
					group: "21 нмо",
				},
				{
					id: "stress-3",
					pairIndex: 4,
					time: "12:50 - 14:10",
					subject:
						"Основы проектирования баз данных и систем управления реляционными структурами данных",
					teacher: "Закиров Ильдар Рафаэлевич",
					room: "108 ауд.",
					group: "21 нмо (1 подгруппа)",
				},
			],
		};

		setCustomSchedule({
			...base,
			days: [stressDay, ...base.days.slice(1)],
		});
	};

	const handleResetSchedule = () => {
		setCustomSchedule(null);
	};

	/**
	 * Внедрение расписания с одновременными подгруппами (1 и 2 п/г)
	 */
	const handleInjectSubgroupsSchedule = () => {
		const base = schedule;
		if (!base) return;
		const subgroupsDay = {
			dayName: "Вторник",
			dayDate: "15.09.2026",
			isToday: true,
			lessons: [
				{
					id: "sg-1",
					pairIndex: 1,
					time: "08:00 - 09:20",
					subject:
						"МДК 02.01 Разработка программных модулей (Лекция)",
					teacher: "Хайруллин Р.М.",
					room: "312а",
					group: "21 нмо",
				},
				{
					id: "sg-2a",
					pairIndex: 2,
					time: "09:30 - 10:50",
					subject:
						"МДК 02.01 Разработка ПО (Лабораторная работа)",
					teacher: "Хайруллин Р.М.",
					room: "312а",
					group: "21 нмо (1-я подгруппа)",
				},
				{
					id: "sg-2b",
					pairIndex: 2,
					time: "09:30 - 10:50",
					subject:
						"Иностранный язык в профессиональной деятельности",
					teacher: "Смирнова Е.А.",
					room: "204",
					group: "21 нмо (2-я подгруппа)",
				},
				{
					id: "sg-3a",
					pairIndex: 3,
					time: "11:20 - 12:40",
					subject:
						"Иностранный язык в профессиональной деятельности",
					teacher: "Смирнова Е.А.",
					room: "204",
					group: "21 нмо 1 п/г",
				},
				{
					id: "sg-3b",
					pairIndex: 3,
					time: "11:20 - 12:40",
					subject:
						"Учебная практика (Программирование)",
					teacher: "Закиров И.Р.",
					room: "108",
					group: "21 нмо 2 п/г",
				},
				{
					id: "sg-4",
					pairIndex: 4,
					time: "12:50 - 14:10",
					subject: "Физическая культура",
					teacher: "Гарифуллин А.Х.",
					room: "спортзал",
					group: "21 нмо",
				},
			],
		};

		setCustomSchedule({
			...base,
			days: [subgroupsDay, ...base.days.slice(1)],
		});
		setSelectedDayIndex(0);
	};

	const handleSetMockDate = (date: Date | null) => {
		setMockDate(date);
		const targetSchedule = customSchedule || schedule;
		if (date && targetSchedule) {
			const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
			const targetDayIndex =
				dayOfWeek === 0 ? 0 : dayOfWeek - 1;
			if (targetDayIndex < targetSchedule.days.length) {
				setSelectedDayIndex(targetDayIndex);
			}
		}
	};

	const handleResetMockDate = () => {
		setMockDate(null);
		const targetSchedule = customSchedule || schedule;
		if (targetSchedule) {
			setSelectedDayIndex(
				pickTodayIndex(targetSchedule.days)
			);
		}
	};

	const handleLoadDemo = useCallback(async () => {
		setIsLoading(true);
		try {
			const demoData = getFallbackDemoSchedule(entity);
			setSchedule(demoData);
			setIsOffline(true);
			setErrorMessage(null);
			setSelectedDayIndex(pickTodayIndex(demoData.days));
			await saveCachedSchedule(demoData);
		} finally {
			setIsLoading(false);
		}
	}, [entity]);

	/**
	 * Открыть добавление/редактирование оценки для пары из расписания
	 */
	const handleOpenGradeForLesson = (
		lesson: Lesson,
		date: string
	) => {
		const existing = grades.find(
			(g) =>
				g.subject.trim().toLowerCase() ===
					lesson.subject.trim().toLowerCase() &&
				g.date === date &&
				g.pairIndex === lesson.pairIndex
		);
		if (existing) {
			setSelectedGradeEntry(existing);
			setGradeInitialData(null);
		} else {
			setSelectedGradeEntry(null);
			setGradeInitialData({
				subject: lesson.subject,
				date,
				pairIndex: lesson.pairIndex,
				time: lesson.time,
				room: lesson.room,
				teacher: lesson.teacher,
			});
		}
		setIsGradeModalOpen(true);
	};

	/**
	 * Ручное добавление оценки с экрана оценок
	 */
	const handleOpenAddGrade = () => {
		setSelectedGradeEntry(null);
		setGradeInitialData(null);
		setIsGradeModalOpen(true);
	};

	/**
	 * Редактирование существующей записи оценки
	 */
	const handleEditGrade = (entry: GradeEntry) => {
		setSelectedGradeEntry(entry);
		setGradeInitialData(null);
		setIsGradeModalOpen(true);
	};

	/**
	 * Сохранение оценки / заметки в специальную папку и кэш
	 */
	const handleSaveGrade = async (
		entryData: Omit<
			GradeEntry,
			"id" | "createdAt" | "updatedAt"
		> & {
			id?: string;
		}
	) => {
		await upsertGradeEntry(entryData);
		const updated = await getGradesStore();
		setGrades(updated.entries);
	};

	/**
	 * Удаление оценки
	 */
	const handleDeleteGrade = async (id: string) => {
		await deleteGradeEntry(id);
		const updated = await getGradesStore();
		setGrades(updated.entries);
	};

	/**
	 * Экспорт файла оценок через системный Share Sheet
	 */
	const handleExportGradesFile = async () => {
		const ok = await exportGradesFile();
		if (!ok) {
			Alert.alert(
				"Экспорт",
				"Не удалось открыть диалог экспорта файла."
			);
		}
	};

	/**
	 * Импорт файла оценок из системного диалога
	 */
	const handleImportGradesFile = async () => {
		try {
			const res = await importGradesFile();
			if (res) {
				const updated = await getGradesStore();
				setGrades(updated.entries);
				Alert.alert(
					"Успешно",
					`Импортировано записей: ${res.count}`
				);
			}
		} catch (err: any) {
			Alert.alert(
				"Ошибка импорта",
				err.message || "Не удалось импортировать файл."
			);
		}
	};

	/**
	 * Копирование JSON резервной копии в буфер
	 */
	const handleExportGradesClipboard = async () => {
		try {
			const json = await getGradesExportJsonString();
			await Clipboard.setStringAsync(json);
			Alert.alert(
				"Скопировано",
				"JSON резервной копии успешно скопирован в буфер обмена."
			);
		} catch (err: any) {
			Alert.alert(
				"Ошибка",
				"Не удалось скопировать данные в буфер обмена."
			);
		}
	};

	/**
	 * Импорт JSON из строки
	 */
	const handleImportGradesClipboard = async (
		jsonString: string
	) => {
		try {
			const res =
				await importGradesFromJsonString(jsonString);
			const updated = await getGradesStore();
			setGrades(updated.entries);
			Alert.alert(
				"Успешно",
				`Импортировано записей: ${res.count}`
			);
		} catch (err: any) {
			Alert.alert(
				"Ошибка импорта",
				err.message || "Некорректный формат JSON бэкапа."
			);
		}
	};

	/**
	 * Принудительное обновление состояния оценок
	 */
	const handleRefreshGrades = async () => {
		const updated = await getGradesStore();
		setGrades(updated.entries);
	};

	/**
	 * Переключение режима звонков для конкретного дня (стандартные 80м / сокращённые 45м / суббота 60м)
	 */
	const handleSetDayCallMode = async (
		date: string,
		mode: DayCallMode
	) => {
		const currentModes = { ...(settings.dayCallModes || {}) };
		currentModes[date] = mode;
		await handleUpdateSettings({ dayCallModes: currentModes });
	};

	const activeSchedule = useMemo(() => {
		const base = customSchedule || schedule;
		if (!base) return null;
		return normalizeSaturdayTimes(base, settings.dayCallModes);
	}, [customSchedule, schedule, settings.dayCallModes]);

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
						schedule={activeSchedule}
						selectedDayIndex={selectedDayIndex}
						selectedWeekId={selectedWeekId}
						isLoading={isLoading}
						isRefreshing={isRefreshing}
						isOffline={isOffline}
						isScheduleUpdated={isScheduleUpdated}
						mockDate={mockDate}
						errorMessage={errorMessage}
						settings={settings}
						theme={theme}
						grades={grades}
						onOpenGradeModal={
							handleOpenGradeForLesson
						}
						onSetDayCallMode={handleSetDayCallMode}
						onSelectDayIndex={setSelectedDayIndex}
						onOpenSearch={() =>
							setIsSearchOpen(true)
						}
						onOpenWeeks={() => setIsWeeksOpen(true)}
						onOpenCalls={() => setIsCallsOpen(true)}
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
						onLoadDemo={handleLoadDemo}
						onDismissUpdateNotice={() =>
							setIsScheduleUpdated(false)
						}
						onResetMockTime={handleResetMockDate}
					/>
				)}

				{/* Экран Оценки и успеваемость */}
				{currentTab === "grades" && (
					<GradesScreen
						grades={grades}
						theme={theme}
						settings={settings}
						onAddGrade={handleOpenAddGrade}
						onEditGrade={handleEditGrade}
						onExportFile={handleExportGradesFile}
						onImportFile={handleImportGradesFile}
						onExportClipboard={
							handleExportGradesClipboard
						}
						onImportClipboard={
							handleImportGradesClipboard
						}
						onRefreshGrades={handleRefreshGrades}
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
						onOpenDebugModal={() =>
							setIsDebugOpen(true)
						}
					/>
				)}

				{/* Нативная нижняя панель iOS (TabBar) */}
				<TabBar
					currentTab={currentTab}
					theme={theme}
					glassEffect={settings.glassEffect}
					onSelectTab={setCurrentTab}
				/>

				{/* Модальные окна */}
				<SearchModal
					visible={isSearchOpen}
					theme={theme}
					onSelectEntity={handleSelectEntity}
					onClose={() => setIsSearchOpen(false)}
				/>

				<WeekModal
					visible={isWeeksOpen}
					weeks={activeSchedule?.weeks || []}
					selectedWeekId={
						activeSchedule?.weekId ||
						selectedWeekId ||
						""
					}
					realCurrentWeekId={
						activeSchedule?.realCurrentWeekId
					}
					theme={theme}
					onSelectWeek={handleSelectWeek}
					onClose={() => setIsWeeksOpen(false)}
				/>

				<CallsScheduleModal
					visible={isCallsOpen}
					theme={theme}
					selectedDate={
						activeSchedule?.days[selectedDayIndex]?.dayDate
					}
					currentDayMode={
						activeSchedule?.days[selectedDayIndex]
							? settings.dayCallModes?.[
									activeSchedule.days[selectedDayIndex]
										.dayDate
							  ] ||
							  (selectedDayIndex === 5 ||
							  activeSchedule.days[
									selectedDayIndex
							  ].dayName
									.toLowerCase()
									.includes("суббот")
									? "saturday"
									: "standard")
							: "standard"
					}
					onSetDayCallMode={handleSetDayCallMode}
					initialScheduleType={
						activeSchedule?.days[selectedDayIndex]
							? settings.dayCallModes?.[
									activeSchedule.days[selectedDayIndex]
										.dayDate
							  ] ||
							  (selectedDayIndex === 5 ||
							  activeSchedule.days[
									selectedDayIndex
							  ].dayName
									.toLowerCase()
									.includes("суббот")
									? "saturday"
									: "standard")
							: "standard"
					}
					onClose={() => setIsCallsOpen(false)}
				/>

				{/* Детальный системный инспектор (Debug меню) */}
				<DebugModal
					visible={isDebugOpen}
					schedule={activeSchedule}
					settings={settings}
					theme={theme}
					mockDate={mockDate}
					onSetMockDate={handleSetMockDate}
					onInjectTestSchedule={
						handleInjectTestSchedule
					}
					onInjectSubgroupsSchedule={
						handleInjectSubgroupsSchedule
					}
					onResetSchedule={handleResetSchedule}
					onUpdateSettings={handleUpdateSettings}
					onRefreshLive={() =>
						loadSchedule(
							entity,
							selectedWeekId,
							true
						)
					}
					onClose={() => setIsDebugOpen(false)}
				/>

				{/* Модальное окно добавления/редактирования оценки и заметки */}
				<GradeModal
					visible={isGradeModalOpen}
					entryToEdit={selectedGradeEntry}
					initialData={gradeInitialData}
					theme={theme}
					onSave={handleSaveGrade}
					onDelete={handleDeleteGrade}
					onClose={() => setIsGradeModalOpen(false)}
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
