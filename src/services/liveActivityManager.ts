import {
	Platform,
	AppState,
	AppStateStatus,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	isSupported,
	areActivitiesEnabled,
	startLiveActivity,
	updateLiveActivity,
	endLiveActivity,
	endAllLiveActivities,
	getActiveLiveActivities,
	LiveActivityState,
} from "react-native-live-activity-kit";
import { Lesson } from "../types/schedule";
import {
	getCurrentDayLiveStatus,
	parseTimeRange,
} from "../utils/timeUtils";

const ACTIVE_ACTIVITY_KEY = "@apkify_live_activity_id";

let activeActivityId: string | null = null;
let syncIntervalTimer: ReturnType<typeof setInterval> | null =
	null;
let appStateSubscription: { remove: () => void } | null = null;

// Кеш последних параметров для повторной синхронизации
let lastSyncParams: {
	lessons: Lesson[];
	isToday: boolean;
	mockDate: Date | null;
	enabled: boolean;
	tintColorHex?: string;
	showNextLesson?: boolean;
} | null = null;

/**
 * Проверка, поддерживаются ли Live Activities на текущей платформе (iOS 16.1+)
 */
export function isNativeLiveActivitySupported(): boolean {
	return Platform.OS === "ios" && isSupported;
}

/**
 * Проверка, разрешены ли Live Activities пользователем в системных настройках iOS
 */
export function checkActivitiesEnabled(): boolean {
	if (!isNativeLiveActivitySupported()) return false;
	try {
		return areActivitiesEnabled();
	} catch {
		return false;
	}
}

/**
 * Получить ID текущей активной системной Live Activity
 */
export async function getStoredActiveActivityId(): Promise<
	string | null
> {
	if (activeActivityId) return activeActivityId;
	try {
		const stored = await AsyncStorage.getItem(
			ACTIVE_ACTIVITY_KEY
		);
		if (stored) {
			activeActivityId = stored;
			return stored;
		}
	} catch {}
	return null;
}

/**
 * Преобразование расписания и фазы дня в нативное состояние LiveActivityState
 */
export function buildScheduleLiveActivityState(
	lessons: Lesson[],
	now: Date = new Date(),
	options: {
		tintColorHex?: string;
		showNextLesson?: boolean;
	} = {}
): {
	state: LiveActivityState;
	phase: "before_start" | "in_lesson" | "break" | "day_ended";
} | null {
	const liveStatus = getCurrentDayLiveStatus(
		lessons,
		true,
		now
	);
	if (!liveStatus) return null;

	const tint = options.tintColorHex || "#007AFF";
	const currentHours = now.getHours();
	const currentMinutes = now.getMinutes();

	if (liveStatus.type === "before_start") {
		const first = liveStatus.firstLesson;
		const range = parseTimeRange(first.time);
		let targetEpochMs: number | undefined;

		if (range) {
			const targetDate = new Date(now);
			targetDate.setHours(
				Math.floor(range.startMinutes / 60),
				range.startMinutes % 60,
				0,
				0
			);
			targetEpochMs = targetDate.getTime();
		}

		return {
			phase: "before_start",
			state: {
				title: first.subject,
				subtitle: `каб. ${first.room || "—"}${first.teacher ? " • " + first.teacher : ""}`,
				body: `Начало 1 пары в ${first.time.split(" - ")[0]}`,
				status: "До пар",
				imageName: "alarm.fill",
				leading: "До пар",
				trailing: `${liveStatus.minutesUntilStart}м`,
				date: targetEpochMs,
				progress: 0,
				tintColorHex: tint,
			},
		};
	}

	if (liveStatus.type === "in_lesson") {
		const cur = liveStatus.lesson;
		const range = parseTimeRange(cur.time);
		let targetEpochMs: number | undefined;

		if (range) {
			const targetDate = new Date(now);
			targetDate.setHours(
				Math.floor(range.endMinutes / 60),
				range.endMinutes % 60,
				0,
				0
			);
			targetEpochMs = targetDate.getTime();
		}

		// Поиск следующей пары
		const nextLesson = lessons.find(
			(l) => l.pairIndex > cur.pairIndex
		);

		const nextPreview =
			options.showNextLesson !== false && nextLesson
				? `Далее: ${nextLesson.pairIndex} пара • ${nextLesson.subject}`
				: `Пара длится до ${cur.time.split(" - ")[1] || ""}`;

		return {
			phase: "in_lesson",
			state: {
				title: cur.subject,
				subtitle: `каб. ${cur.room || "—"}${cur.teacher ? " • " + cur.teacher : ""}`,
				body: nextPreview,
				status: `${cur.pairIndex} пара`,
				imageName: "book.fill",
				leading: `${cur.pairIndex} пара`,
				trailing: `${liveStatus.leftMinutes}м`,
				date: targetEpochMs,
				progress: Math.min(
					1,
					Math.max(0, liveStatus.progress)
				),
				tintColorHex: tint,
			},
		};
	}

	if (liveStatus.type === "break") {
		const next = liveStatus.nextLesson;
		const range = parseTimeRange(next.time);
		let targetEpochMs: number | undefined;

		if (range) {
			const targetDate = new Date(now);
			targetDate.setHours(
				Math.floor(range.startMinutes / 60),
				range.startMinutes % 60,
				0,
				0
			);
			targetEpochMs = targetDate.getTime();
		}

		const breakProgress =
			liveStatus.breakTotalMinutes > 0
				? (liveStatus.breakTotalMinutes -
						liveStatus.breakLeftMinutes) /
					liveStatus.breakTotalMinutes
				: 0;

		return {
			phase: "break",
			state: {
				title: next.subject,
				subtitle: `каб. ${next.room || "—"}${next.teacher ? " • " + next.teacher : ""}`,
				body: `Следующая: ${next.pairIndex} пара в ${next.time.split(" - ")[0]}`,
				status: "Перемена",
				imageName: "cup.and.saucer.fill",
				leading: "Перемена",
				trailing: `${liveStatus.breakLeftMinutes}м`,
				date: targetEpochMs,
				progress: Math.min(
					1,
					Math.max(0, breakProgress)
				),
				tintColorHex: "#FF9500", // Оранжевый акцент для перемены
			},
		};
	}

	if (liveStatus.type === "day_ended") {
		return {
			phase: "day_ended",
			state: {
				title: "Все пары завершены",
				subtitle: "Отличного отдыха!",
				body: "Занятия на сегодня окончены",
				status: "Завершено",
				imageName: "checkmark.circle.fill",
				leading: "Конец",
				trailing: "🎉",
				progress: 1.0,
				tintColorHex: "#34C759",
			},
		};
	}

	return null;
}

/**
 * Синхронизация системного Live Activity с текущим расписанием
 */
export async function syncScheduleLiveActivity(params: {
	lessons: Lesson[];
	isToday: boolean;
	mockDate?: Date | null;
	enabled?: boolean;
	tintColorHex?: string;
	showNextLesson?: boolean;
}): Promise<string | null> {
	lastSyncParams = {
		lessons: params.lessons,
		isToday: params.isToday,
		mockDate: params.mockDate || null,
		enabled: params.enabled ?? true,
		tintColorHex: params.tintColorHex,
		showNextLesson: params.showNextLesson,
	};

	if (!isNativeLiveActivitySupported()) {
		return null;
	}

	// Если выключено в настройках, или не сегодняшний день, или пустой список
	if (
		!params.enabled ||
		!params.isToday ||
		params.lessons.length === 0
	) {
		await stopAllScheduleLiveActivities();
		return null;
	}

	const now = params.mockDate || new Date();
	const built = buildScheduleLiveActivityState(
		params.lessons,
		now,
		{
			tintColorHex: params.tintColorHex,
			showNextLesson: params.showNextLesson,
		}
	);

	if (!built) {
		await stopAllScheduleLiveActivities();
		return null;
	}

	// Если пары окончены — мягко завершаем активность
	if (built.phase === "day_ended") {
		await stopAllScheduleLiveActivities();
		return null;
	}

	try {
		const existingId = await getStoredActiveActivityId();

		if (existingId) {
			// Обновляем существующий эфир
			try {
				await updateLiveActivity(existingId, {
					state: built.state,
				});
				return existingId;
			} catch (err) {
				// Если активность уже устарела или закрыта системой — запустим новую
				activeActivityId = null;
				await AsyncStorage.removeItem(
					ACTIVE_ACTIVITY_KEY
				);
			}
		}

		// Запуск нового системного Live Activity
		const activity = await startLiveActivity({
			attributes: {
				name: "ApkifySchedule",
			},
			state: built.state,
		});

		activeActivityId = activity.id;
		await AsyncStorage.setItem(
			ACTIVE_ACTIVITY_KEY,
			activity.id
		);
		return activity.id;
	} catch (err) {
		console.warn(
			"Ошибка запуска/обновления системного Live Activity:",
			err
		);
		return null;
	}
}

/**
 * Завершить все запущенные системные Live Activities
 */
export async function stopAllScheduleLiveActivities(): Promise<void> {
	if (!isNativeLiveActivitySupported()) return;

	try {
		const existingId = await getStoredActiveActivityId();
		if (existingId) {
			try {
				await endLiveActivity(existingId, {
					dismissalPolicy: "immediate",
				});
			} catch {}
		}
		await endAllLiveActivities({
			dismissalPolicy: "immediate",
		});
	} catch (err) {
		console.warn("Ошибка завершения Live Activities:", err);
	} finally {
		activeActivityId = null;
		await AsyncStorage.removeItem(ACTIVE_ACTIVITY_KEY);
	}
}

/**
 * Запустить тестовый Live Activity напрямую для проверки из Debug Menu
 */
export async function testLaunchNativeLiveActivity(
	scenario: "lesson" | "break" | "before_start" | "day_ended",
	tintColorHex: string = "#007AFF"
): Promise<string | null> {
	if (!isNativeLiveActivitySupported()) {
		throw new Error(
			"Live Activities поддерживаются только на iOS 16.1+ на физическом устройстве."
		);
	}

	const now = new Date();
	let state: LiveActivityState;

	if (scenario === "lesson") {
		const endDate = new Date(now.getTime() + 25 * 60 * 1000);
		state = {
			title: "МДК 02.01 Разработка ПО",
			subtitle: "каб. 312а • Хайруллин Р.М.",
			body: "Следующая: 2 пара • Архитектура аппаратных средств",
			status: "1 пара",
			imageName: "book.fill",
			leading: "1 пара",
			trailing: "25м",
			date: endDate.getTime(),
			progress: 0.65,
			tintColorHex,
		};
	} else if (scenario === "break") {
		const endDate = new Date(now.getTime() + 10 * 60 * 1000);
		state = {
			title: "Архитектура аппаратных средств",
			subtitle: "каб. 204 • Смирнова Е.А.",
			body: "Перемена 10 минут перед 2 парой",
			status: "Перемена",
			imageName: "cup.and.saucer.fill",
			leading: "Перемена",
			trailing: "10м",
			date: endDate.getTime(),
			progress: 0.4,
			tintColorHex: "#FF9500",
		};
	} else if (scenario === "before_start") {
		const startDate = new Date(
			now.getTime() + 15 * 60 * 1000
		);
		state = {
			title: "МДК 02.01 Разработка ПО",
			subtitle: "каб. 312а • Хайруллин Р.М.",
			body: "Начало 1 пары в 08:00",
			status: "До пар",
			imageName: "alarm.fill",
			leading: "До пар",
			trailing: "15м",
			date: startDate.getTime(),
			progress: 0,
			tintColorHex,
		};
	} else {
		state = {
			title: "Все пары завершены",
			subtitle: "Отличного отдыха!",
			body: "Занятия на сегодня окончены",
			status: "Завершено",
			imageName: "checkmark.circle.fill",
			leading: "Конец",
			trailing: "🎉",
			progress: 1.0,
			tintColorHex: "#34C759",
		};
	}

	try {
		await stopAllScheduleLiveActivities();

		const activity = await startLiveActivity({
			attributes: {
				name: "ApkifyScheduleTest",
			},
			state,
		});

		activeActivityId = activity.id;
		await AsyncStorage.setItem(
			ACTIVE_ACTIVITY_KEY,
			activity.id
		);
		return activity.id;
	} catch (err: any) {
		throw new Error(
			err?.message ||
				"Не удалось запустить системный Live Activity"
		);
	}
}

/**
 * Инициализация автоматической фоновой синхронизации (AppState + таймер)
 */
export function initLiveActivityLifecycle(): () => void {
	if (!isNativeLiveActivitySupported()) {
		return () => {};
	}

	// При сворачивании приложения в фон отправляем актуальное состояние на Lock Screen
	const handleAppStateChange = (nextState: AppStateStatus) => {
		if (
			nextState === "background" ||
			nextState === "inactive"
		) {
			if (lastSyncParams) {
				syncScheduleLiveActivity(lastSyncParams).catch(
					() => {}
				);
			}
		}
	};

	const sub = AppState.addEventListener(
		"change",
		handleAppStateChange
	);

	// Фоновый таймер периодической синхронизации каждые 60 секунд пока приложение живо
	if (!syncIntervalTimer) {
		syncIntervalTimer = setInterval(() => {
			if (lastSyncParams) {
				syncScheduleLiveActivity(lastSyncParams).catch(
					() => {}
				);
			}
		}, 60 * 1000);
	}

	return () => {
		sub.remove();
		if (syncIntervalTimer) {
			clearInterval(syncIntervalTimer);
			syncIntervalTimer = null;
		}
	};
}
