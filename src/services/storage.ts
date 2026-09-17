import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	FavoriteItem,
	ScheduleData,
	SearchResultItem,
} from "../types/schedule";

const STORAGE_KEYS = {
	CURRENT_ENTITY: "@schedule_current_entity",
	FAVORITES: "@schedule_favorites",
	SCHEDULE_CACHE_PREFIX: "@schedule_cache_",
};

// Дефолтная группа (из запроса пользователя)
export const DEFAULT_ENTITY: SearchResultItem = {
	SearchContent: "21 нмо",
	Type: "Group",
	SearchId: 45041,
	OwnerId: 37,
};

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
		const key = `${STORAGE_KEYS.SCHEDULE_CACHE_PREFIX}${data.entity.OwnerId}_${data.entity.SearchId}_${data.weekId || "current"}`;
		await AsyncStorage.setItem(key, JSON.stringify(data));
	} catch (err) {
		console.warn("Ошибка кэширования расписания:", err);
	}
}

/**
 * Получить расписание из локального кэша (для мгновенного открытия и офлайн-режима)
 */
export async function getCachedSchedule(
	entity: SearchResultItem,
	weekId?: string
): Promise<ScheduleData | null> {
	try {
		const key = `${STORAGE_KEYS.SCHEDULE_CACHE_PREFIX}${entity.OwnerId}_${entity.SearchId}_${weekId || "current"}`;
		const json = await AsyncStorage.getItem(key);
		if (json) {
			return JSON.parse(json);
		}
	} catch (err) {
		console.warn("Ошибка чтения кэша расписания:", err);
	}
	return null;
}

/**
 * Получить список избранных групп/преподавателей
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
	// По умолчанию добавляем группу 21 нмо в избранное
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
 * Проверить, находится ли группа в избранном
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
