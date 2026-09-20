import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	AppSettings,
	FavoriteItem,
	ScheduleData,
	SearchResultItem,
} from "../types/schedule";
import { normalizeSaturdayTimes } from "../utils/timeUtils";
import { getRealCurrentWeekId, getSemesterWeeks } from "./api";

const STORAGE_KEYS = {
	CURRENT_ENTITY: "@schedule_current_entity",
	FAVORITES: "@schedule_favorites",
	SCHEDULE_CACHE_PREFIX: "@schedule_cache_",
	SCHEDULE_LATEST_PREFIX: "@schedule_latest_",
	GLOBAL_LATEST: "@schedule_cache_global_latest",
	SETTINGS: "@schedule_settings",
};

// Дефолтная группа (из запроса пользователя)
export const DEFAULT_ENTITY: SearchResultItem = {
	SearchContent: "21 нмо",
	Type: "Group",
	SearchId: 45041,
	OwnerId: 37,
};

export const DEFAULT_SETTINGS: AppSettings = {
	themeMode: "system",
	accentColor: "blue",
	subgroup: "all",
	compactView: false,
	glassEffect: true,
	notificationsEnabled: true,
	defaultEntity: DEFAULT_ENTITY,
};

/**
 * Получить настройки приложения
 */
export async function getSettings(): Promise<AppSettings> {
	try {
		const json = await AsyncStorage.getItem(
			STORAGE_KEYS.SETTINGS
		);
		if (json) {
			return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
		}
	} catch (err) {
		console.warn("Ошибка чтения настроек:", err);
	}
	return DEFAULT_SETTINGS;
}

/**
 * Сохранить настройки приложения
 */
export async function saveSettings(
	partial: Partial<AppSettings>
): Promise<AppSettings> {
	try {
		const current = await getSettings();
		const updated = { ...current, ...partial };
		await AsyncStorage.setItem(
			STORAGE_KEYS.SETTINGS,
			JSON.stringify(updated)
		);
		return updated;
	} catch (err) {
		console.warn("Ошибка сохранения настроек:", err);
		return DEFAULT_SETTINGS;
	}
}

/**
 * Сохранить текущую выбранную группу/преподавателя
 */
export async function saveCurrentEntity(
	entity: SearchResultItem
): Promise<void> {
	try {
		await AsyncStorage.setItem(
			STORAGE_KEYS.CURRENT_ENTITY,
			JSON.stringify(entity)
		);
	} catch (err) {
		console.warn("Ошибка сохранения сущности:", err);
	}
}

/**
 * Получить текущую выбранную группу/преподавателя
 */
export async function getCurrentEntity(): Promise<SearchResultItem> {
	try {
		const json = await AsyncStorage.getItem(
			STORAGE_KEYS.CURRENT_ENTITY
		);
		if (json) {
			return JSON.parse(json);
		}
	} catch (err) {
		console.warn("Ошибка чтения текущей сущности:", err);
	}
	return DEFAULT_ENTITY;
}

/**
 * Кэшировать расписание для группы и недели
 */
export async function saveCachedSchedule(
	data: ScheduleData
): Promise<void> {
	try {
		const payload: ScheduleData = {
			...data,
			lastUpdated: data.lastUpdated || Date.now(),
		};
		const json = JSON.stringify(payload);

		// 1. Кэш по номеру недели
		if (data.weekId) {
			const weekKey = `${STORAGE_KEYS.SCHEDULE_CACHE_PREFIX}${data.entity.OwnerId}_${data.entity.SearchId}_${data.weekId}`;
			await AsyncStorage.setItem(weekKey, json);
		}

		// 2. Последнее расписание именно для этой группы (для мгновенного офлайн-старта)
		const latestKey = `${STORAGE_KEYS.SCHEDULE_LATEST_PREFIX}${data.entity.OwnerId}_${data.entity.SearchId}`;
		await AsyncStorage.setItem(latestKey, json);

		// 3. Глобально последнее открытое расписание приложения
		await AsyncStorage.setItem(STORAGE_KEYS.GLOBAL_LATEST, json);

		// 4. Легаси-ключ для обратной совместимости
		const legacyKey = `${STORAGE_KEYS.SCHEDULE_CACHE_PREFIX}${data.entity.OwnerId}_${data.entity.SearchId}_current`;
		await AsyncStorage.setItem(legacyKey, json);
	} catch (err) {
		console.warn("Ошибка кэширования расписания:", err);
	}
}

/**
 * Получить расписание из локального кэша с интеллектуальным поиском
 */
export async function getCachedSchedule(
	entity: SearchResultItem,
	weekId?: string
): Promise<ScheduleData | null> {
	try {
		// 1. Если явно передана неделя, ищем точное совпадение
		if (weekId) {
			const exactKey = `${STORAGE_KEYS.SCHEDULE_CACHE_PREFIX}${entity.OwnerId}_${entity.SearchId}_${weekId}`;
			const json = await AsyncStorage.getItem(exactKey);
			if (json) {
				return normalizeSaturdayTimes(JSON.parse(json));
			}
		}

		// 2. Если недели нет, вычисляем текущую календарную неделю семестра
		const calWeekId = getRealCurrentWeekId();
		const calKey = `${STORAGE_KEYS.SCHEDULE_CACHE_PREFIX}${entity.OwnerId}_${entity.SearchId}_${calWeekId}`;
		const calJson = await AsyncStorage.getItem(calKey);
		if (calJson) {
			return normalizeSaturdayTimes(JSON.parse(calJson));
		}

		// 3. Ищем последнюю сохранённую неделю для этой конкретной группы
		const latestKey = `${STORAGE_KEYS.SCHEDULE_LATEST_PREFIX}${entity.OwnerId}_${entity.SearchId}`;
		const latestJson = await AsyncStorage.getItem(latestKey);
		if (latestJson) {
			return normalizeSaturdayTimes(JSON.parse(latestJson));
		}

		// 4. Сканируем все ключи этой группы в хранилище (любая сохраненная неделя)
		const allKeys = await AsyncStorage.getAllKeys();
		const entityPrefix = `${STORAGE_KEYS.SCHEDULE_CACHE_PREFIX}${entity.OwnerId}_${entity.SearchId}_`;
		const groupKeys = allKeys.filter((k) => k.startsWith(entityPrefix));
		if (groupKeys.length > 0) {
			const items = await AsyncStorage.multiGet(groupKeys);
			let bestData: ScheduleData | null = null;
			for (const [, val] of items) {
				if (val) {
					try {
						const parsed: ScheduleData = JSON.parse(val);
						if (
							!bestData ||
							(parsed.lastUpdated || 0) >
								(bestData.lastUpdated || 0)
						) {
							bestData = parsed;
						}
					} catch {}
				}
			}
			if (bestData) {
				return normalizeSaturdayTimes(bestData);
			}
		}

		// 5. Проверяем старый легаси-ключ _current
		const currentKey = `${STORAGE_KEYS.SCHEDULE_CACHE_PREFIX}${entity.OwnerId}_${entity.SearchId}_current`;
		const currentJson = await AsyncStorage.getItem(currentKey);
		if (currentJson) {
			return normalizeSaturdayTimes(JSON.parse(currentJson));
		}
	} catch (err) {
		console.warn("Ошибка чтения кэша расписания:", err);
	}
	return null;
}

/**
 * Получить абсолютно любое последнее сохранённое расписание из хранилища (аварийный офлайн-режим)
 */
export async function getLatestCachedSchedule(
	entity?: SearchResultItem
): Promise<ScheduleData | null> {
	try {
		if (entity) {
			const direct = await getCachedSchedule(entity);
			if (direct) return direct;
		}

		// Проверяем глобальный последний кэш
		const globalLatest = await AsyncStorage.getItem(
			STORAGE_KEYS.GLOBAL_LATEST
		);
		if (globalLatest) {
			return normalizeSaturdayTimes(JSON.parse(globalLatest));
		}

		// Сканируем вообще все кэши в AsyncStorage
		const allKeys = await AsyncStorage.getAllKeys();
		const allCacheKeys = allKeys.filter(
			(k) =>
				k.startsWith(STORAGE_KEYS.SCHEDULE_CACHE_PREFIX) ||
				k.startsWith(STORAGE_KEYS.SCHEDULE_LATEST_PREFIX)
		);
		if (allCacheKeys.length > 0) {
			const items = await AsyncStorage.multiGet(allCacheKeys);
			let bestData: ScheduleData | null = null;
			for (const [, val] of items) {
				if (val) {
					try {
						const parsed: ScheduleData = JSON.parse(val);
						if (
							!bestData ||
							(parsed.lastUpdated || 0) >
								(bestData.lastUpdated || 0)
						) {
							bestData = parsed;
						}
					} catch {}
				}
			}
			if (bestData) {
				return normalizeSaturdayTimes(bestData);
			}
		}
	} catch (err) {
		console.warn("Ошибка получения общего кэша:", err);
	}
	return null;
}

/**
 * Встроенное офлайн демонстрационное расписание для группы "21 нмо"
 * на случай первого запуска, когда сайт колледжа не работает и в памяти ещё ничего нет
 */
export function getFallbackDemoSchedule(
	targetEntity: SearchResultItem = DEFAULT_ENTITY
): ScheduleData {
	const currentWeekId = getRealCurrentWeekId();
	const weeks = getSemesterWeeks(currentWeekId, currentWeekId);
	const activeWeek = weeks.find((w) => w.weekId === currentWeekId) || weeks[0];

	const demoSchedule: ScheduleData = {
		entity: targetEntity,
		weekId: currentWeekId,
		currentWeekNum: activeWeek ? `${activeWeek.weekNum} неделя` : "1 неделя",
		currentWeekDates: activeWeek?.dateRange || "14.09 — 20.09",
		realCurrentWeekId: currentWeekId,
		weeks,
		lastUpdated: Date.now() - 3600000 * 3, // Сохранено 3 часа назад
		days: [
			{
				dayName: "Понедельник",
				dayDate: "14.09.2026",
				isToday: false,
				lessons: [
					{
						id: "fb-1",
						pairIndex: 1,
						time: "08:00 - 09:20",
						subject: "МДК 02.01 Разработка программных модулей (Лекция)",
						teacher: "Хайруллин Р.М.",
						room: "312а",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-2a",
						pairIndex: 2,
						time: "09:30 - 10:50",
						subject: "МДК 02.01 Разработка ПО (Лабораторная работа)",
						teacher: "Хайруллин Р.М.",
						room: "312а",
						group: `${targetEntity.SearchContent} (1-я подгруппа)`,
					},
					{
						id: "fb-2b",
						pairIndex: 2,
						time: "09:30 - 10:50",
						subject: "Иностранный язык в профессиональной деятельности",
						teacher: "Смирнова Е.А.",
						room: "204",
						group: `${targetEntity.SearchContent} (2-я подгруппа)`,
					},
					{
						id: "fb-3",
						pairIndex: 3,
						time: "11:20 - 12:40",
						subject: "Математические методы в программировании",
						teacher: "Закиров И.Р.",
						room: "108",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-4",
						pairIndex: 4,
						time: "12:50 - 14:10",
						subject: "Физическая культура",
						teacher: "Гарифуллин А.Х.",
						room: "спортзал",
						group: targetEntity.SearchContent,
					},
				],
			},
			{
				dayName: "Вторник",
				dayDate: "15.09.2026",
				isToday: true,
				lessons: [
					{
						id: "fb-2-1",
						pairIndex: 1,
						time: "08:00 - 09:20",
						subject: "Базы данных и СУБД",
						teacher: "Сафина Г.М.",
						room: "308",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-2-2",
						pairIndex: 2,
						time: "09:30 - 10:50",
						subject: "Проектирование и дизайн интерфейсов",
						teacher: "Валеев Т.И.",
						room: "310",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-2-3a",
						pairIndex: 3,
						time: "11:20 - 12:40",
						subject: "Иностранный язык в профессиональной деятельности",
						teacher: "Смирнова Е.А.",
						room: "204",
						group: `${targetEntity.SearchContent} 1 п/г`,
					},
					{
						id: "fb-2-3b",
						pairIndex: 3,
						time: "11:20 - 12:40",
						subject: "Учебная практика (Программирование)",
						teacher: "Закиров И.Р.",
						room: "108",
						group: `${targetEntity.SearchContent} 2 п/г`,
					},
				],
			},
			{
				dayName: "Среда",
				dayDate: "16.09.2026",
				isToday: false,
				lessons: [
					{
						id: "fb-3-1",
						pairIndex: 1,
						time: "08:00 - 09:20",
						subject: "МДК 02.02 Инструментальные средства разработки ПО",
						teacher: "Хайруллин Р.М.",
						room: "312а",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-3-2",
						pairIndex: 2,
						time: "09:30 - 10:50",
						subject: "Информационная безопасность",
						teacher: "Ахметов Р.Р.",
						room: "215",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-3-3",
						pairIndex: 3,
						time: "11:20 - 12:40",
						subject: "Базы данных и СУБД (Практикум)",
						teacher: "Сафина Г.М.",
						room: "308",
						group: targetEntity.SearchContent,
					},
				],
			},
			{
				dayName: "Четверг",
				dayDate: "17.09.2026",
				isToday: false,
				lessons: [
					{
						id: "fb-4-1",
						pairIndex: 1,
						time: "08:00 - 09:20",
						subject: "Основы алгоритмизации и логики",
						teacher: "Закиров И.Р.",
						room: "108",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-4-2",
						pairIndex: 2,
						time: "09:30 - 10:50",
						subject: "Компьютерные сети и телекоммуникации",
						teacher: "Газизов А.М.",
						room: "216",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-4-3",
						pairIndex: 3,
						time: "11:20 - 12:40",
						subject: "Философия",
						teacher: "Камалов Р.З.",
						room: "402",
						group: targetEntity.SearchContent,
					},
				],
			},
			{
				dayName: "Пятница",
				dayDate: "18.09.2026",
				isToday: false,
				lessons: [
					{
						id: "fb-5-1",
						pairIndex: 1,
						time: "08:00 - 09:20",
						subject: "Веб-разработка и клиентские технологии",
						teacher: "Шакиров И.Ф.",
						room: "314",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-5-2",
						pairIndex: 2,
						time: "09:30 - 10:50",
						subject: "МДК 02.01 Разработка программных модулей",
						teacher: "Хайруллин Р.М.",
						room: "312а",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-5-3",
						pairIndex: 3,
						time: "11:20 - 12:40",
						subject: "Кураторский / классный час",
						teacher: "Хайруллин Р.М.",
						room: "312а",
						group: targetEntity.SearchContent,
					},
				],
			},
			{
				dayName: "Суббота",
				dayDate: "19.09.2026",
				isToday: false,
				lessons: [
					{
						id: "fb-6-1",
						pairIndex: 1,
						time: "08:00 - 09:00",
						subject: "Учебная практика (Программирование)",
						teacher: "Закиров И.Р.",
						room: "108",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-6-2",
						pairIndex: 2,
						time: "09:05 - 10:05",
						subject: "МДК 02.01 Разработка программных модулей",
						teacher: "Хайруллин Р.М.",
						room: "312а",
						group: targetEntity.SearchContent,
					},
					{
						id: "fb-6-3",
						pairIndex: 3,
						time: "10:15 - 11:15",
						subject: "Консультация по курсовому проектированию",
						teacher: "Хайруллин Р.М.",
						room: "312а",
						group: targetEntity.SearchContent,
					},
				],
			},
		],
	};

	return normalizeSaturdayTimes(demoSchedule);
}

/**
 * Очистить весь локальный кэш расписаний
 */
export async function clearScheduleCache(): Promise<number> {
	try {
		const allKeys = await AsyncStorage.getAllKeys();
		const cacheKeys = allKeys.filter((k) =>
			k.startsWith(STORAGE_KEYS.SCHEDULE_CACHE_PREFIX)
		);
		if (cacheKeys.length > 0) {
			await AsyncStorage.multiRemove(cacheKeys);
		}
		return cacheKeys.length;
	} catch (err) {
		console.warn("Ошибка очистки кэша:", err);
		return 0;
	}
}

/**
 * Получить список избранных
 */
export async function getFavorites(): Promise<FavoriteItem[]> {
	try {
		const json = await AsyncStorage.getItem(
			STORAGE_KEYS.FAVORITES
		);
		if (json) {
			return JSON.parse(json);
		}
	} catch (err) {
		console.warn("Ошибка чтения избранного:", err);
	}
	return [
		{
			...DEFAULT_ENTITY,
			addedAt: Date.now(),
		},
	];
}

/**
 * Переключить статус избранного
 */
export async function toggleFavorite(
	entity: SearchResultItem
): Promise<boolean> {
	try {
		const favorites = await getFavorites();
		const existingIndex = favorites.findIndex(
			(f) =>
				f.SearchId === entity.SearchId &&
				f.OwnerId === entity.OwnerId
		);

		let newFavorites: FavoriteItem[];
		let isNowFavorite = false;

		if (existingIndex >= 0) {
			newFavorites = favorites.filter(
				(_, idx) => idx !== existingIndex
			);
			isNowFavorite = false;
		} else {
			newFavorites = [
				{ ...entity, addedAt: Date.now() },
				...favorites,
			];
			isNowFavorite = true;
		}

		await AsyncStorage.setItem(
			STORAGE_KEYS.FAVORITES,
			JSON.stringify(newFavorites)
		);
		return isNowFavorite;
	} catch (err) {
		console.warn("Ошибка переключения избранного:", err);
		return false;
	}
}

/**
 * Проверить, в избранном ли
 */
export async function isFavorite(
	entity: SearchResultItem
): Promise<boolean> {
	try {
		const favorites = await getFavorites();
		return favorites.some(
			(f) =>
				f.SearchId === entity.SearchId &&
				f.OwnerId === entity.OwnerId
		);
	} catch (err) {
		return false;
	}
}
