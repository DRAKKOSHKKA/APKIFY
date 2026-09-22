import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { CustomEvent, CustomEventsStore } from "../types/events";

const STORAGE_KEY = "@apkify_custom_events";
const FOLDER_NAME = "Apkify_Events";
const FILE_NAME = "custom_events.json";

// Постоянная папка внутри Documents, видимая в приложении iOS «Файлы»
const getEventsDirectory = () => {
	const docDir = FileSystem.documentDirectory || "";
	return `${docDir}${FOLDER_NAME}/`;
};

const getEventsFilePath = () => {
	return `${getEventsDirectory()}${FILE_NAME}`;
};

/**
 * Обеспечивает существование папки для хранения событий
 */
async function ensureDirectoryExists(): Promise<string> {
	const dir = getEventsDirectory();
	try {
		const dirInfo = await FileSystem.getInfoAsync(dir);
		if (!dirInfo.exists) {
			await FileSystem.makeDirectoryAsync(dir, {
				intermediates: true,
			});
		}
	} catch (err) {
		console.warn("Ошибка создания директории событий:", err);
	}
	return dir;
}

/**
 * Запись в файл на диске
 */
async function writeToFile(
	data: CustomEventsStore
): Promise<void> {
	try {
		await ensureDirectoryExists();
		const filePath = getEventsFilePath();
		const jsonString = JSON.stringify(data, null, 2);
		await FileSystem.writeAsStringAsync(
			filePath,
			jsonString,
			{
				encoding: FileSystem.EncodingType.UTF8,
			}
		);
	} catch (err) {
		console.warn("Ошибка записи файла событий:", err);
	}
}

/**
 * Чтение из файла на диске
 */
async function readFromFile(): Promise<CustomEventsStore | null> {
	try {
		const filePath = getEventsFilePath();
		const info = await FileSystem.getInfoAsync(filePath);
		if (info.exists) {
			const content = await FileSystem.readAsStringAsync(
				filePath,
				{
					encoding: FileSystem.EncodingType.UTF8,
				}
			);
			if (content && content.trim().length > 0) {
				const parsed = JSON.parse(content);
				if (Array.isArray(parsed.events)) {
					return parsed as CustomEventsStore;
				}
				if (Array.isArray(parsed)) {
					return {
						version: 1,
						lastUpdated: Date.now(),
						events: parsed,
					};
				}
			}
		}
	} catch (err) {
		console.warn("Ошибка чтения файла событий:", err);
	}
	return null;
}

/**
 * Получить хранилище событий (двухуровневое: AsyncStorage + файл на диске)
 */
export async function getEventsStore(): Promise<CustomEventsStore> {
	let memoryData: CustomEventsStore | null = null;

	try {
		const cachedJson =
			await AsyncStorage.getItem(STORAGE_KEY);
		if (cachedJson) {
			memoryData = JSON.parse(cachedJson);
		}
	} catch (err) {
		console.warn("Ошибка чтения AsyncStorage событий:", err);
	}

	const fileData = await readFromFile();

	// Восстановление из файла, если кэш пуст
	if (
		(!memoryData || memoryData.events.length === 0) &&
		fileData &&
		fileData.events.length > 0
	) {
		try {
			await AsyncStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(fileData)
			);
		} catch {}
		return fileData;
	}

	// Если файл свежее кэша
	if (
		fileData &&
		memoryData &&
		fileData.lastUpdated > memoryData.lastUpdated
	) {
		try {
			await AsyncStorage.setItem(
				STORAGE_KEY,
				JSON.stringify(fileData)
			);
		} catch {}
		return fileData;
	}

	if (memoryData) {
		if (!fileData) {
			writeToFile(memoryData);
		}
		return memoryData;
	}

	const emptyStore: CustomEventsStore = {
		version: 1,
		lastUpdated: Date.now(),
		events: [],
	};
	return emptyStore;
}

/**
 * Сохранить все события в хранилище
 */
export async function saveEventsStore(
	store: CustomEventsStore
): Promise<void> {
	const updatedStore: CustomEventsStore = {
		...store,
		lastUpdated: Date.now(),
	};

	try {
		await AsyncStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(updatedStore)
		);
	} catch (err) {
		console.warn(
			"Ошибка сохранения событий в AsyncStorage:",
			err
		);
	}

	await writeToFile(updatedStore);
}

/**
 * Получить список всех кастомных событий
 */
export async function getCustomEvents(): Promise<CustomEvent[]> {
	const store = await getEventsStore();
	return store.events;
}

/**
 * Добавить или обновить кастомное событие
 */
export async function upsertCustomEvent(
	eventData: Omit<
		CustomEvent,
		"id" | "createdAt" | "updatedAt"
	> & {
		id?: string;
	}
): Promise<CustomEvent> {
	const store = await getEventsStore();
	const now = Date.now();

	const formattedTime =
		eventData.time ||
		(eventData.startTime && eventData.endTime
			? `${eventData.startTime} - ${eventData.endTime}`
			: eventData.startTime || "");

	let resultEvent: CustomEvent;

	if (eventData.id) {
		const index = store.events.findIndex(
			(e) => e.id === eventData.id
		);
		if (index !== -1) {
			resultEvent = {
				...store.events[index],
				...eventData,
				time: formattedTime,
				id: eventData.id,
				updatedAt: now,
			};
			store.events[index] = resultEvent;
		} else {
			resultEvent = {
				...eventData,
				time: formattedTime,
				id: eventData.id,
				createdAt: now,
				updatedAt: now,
			};
			store.events.push(resultEvent);
		}
	} else {
		const newId = `evt_${now}_${Math.random().toString(36).substring(2, 7)}`;
		resultEvent = {
			...eventData,
			time: formattedTime,
			id: newId,
			createdAt: now,
			updatedAt: now,
		};
		store.events.push(resultEvent);
	}

	await saveEventsStore(store);
	return resultEvent;
}

/**
 * Удалить событие по id
 */
export async function deleteCustomEvent(
	id: string
): Promise<void> {
	const store = await getEventsStore();
	store.events = store.events.filter((e) => e.id !== id);
	await saveEventsStore(store);
}

/**
 * Дублировать событие
 */
export async function duplicateCustomEvent(
	id: string,
	newDate?: string
): Promise<CustomEvent | null> {
	const store = await getEventsStore();
	const original = store.events.find((e) => e.id === id);
	if (!original) return null;
	const now = Date.now();
	const duplicated: CustomEvent = {
		...original,
		id: `evt_${now}_${Math.random().toString(36).substring(2, 7)}`,
		title: `${original.title} (копия)`,
		date: newDate || original.date,
		createdAt: now,
		updatedAt: now,
	};
	store.events.push(duplicated);
	await saveEventsStore(store);
	return duplicated;
}

/**
 * Парсинг строки даты "ДД.ММ.ГГГГ" в объект Date
 */
function parseEventDate(str: string): Date | null {
	if (!str) return null;
	const parts = str.split(".");
	if (parts.length !== 3) return null;
	const day = parseInt(parts[0], 10);
	const month = parseInt(parts[1], 10) - 1;
	const year = parseInt(parts[2], 10);
	if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
	return new Date(year, month, day, 12, 0, 0, 0);
}

/**
 * Проверка, попадает ли событие на целевую дату с учетом правил повторения
 */
export function isEventOccurringOnDate(
	event: CustomEvent,
	targetDateStr: string
): boolean {
	if (event.date === targetDateStr) {
		return true;
	}

	const repeatType = event.repeatType;
	if (!repeatType || repeatType === "none") {
		return false;
	}

	const origDate = parseEventDate(event.date);
	const targetDate = parseEventDate(targetDateStr);
	if (!origDate || !targetDate) return false;

	// Повторение не действует до даты начала события
	if (targetDate.getTime() < origDate.getTime()) {
		return false;
	}

	// Проверка даты окончания повторений
	if (event.repeatUntil) {
		const untilDate = parseEventDate(event.repeatUntil);
		if (untilDate && targetDate.getTime() > untilDate.getTime()) {
			return false;
		}
	}

	const targetDayOfWeek = targetDate.getDay(); // 0=Вс, 1=Пн, ..., 6=Сб
	const origDayOfWeek = origDate.getDay();

	switch (repeatType) {
		case "daily":
			return true;
		case "weekdays":
			return targetDayOfWeek >= 1 && targetDayOfWeek <= 5;
		case "weekly":
			return targetDayOfWeek === origDayOfWeek;
		case "biweekly": {
			if (targetDayOfWeek !== origDayOfWeek) return false;
			const diffDays = Math.round(
				(targetDate.getTime() - origDate.getTime()) /
					(1000 * 60 * 60 * 24)
			);
			const diffWeeks = Math.floor(diffDays / 7);
			return diffWeeks % 2 === 0;
		}
		case "custom_days":
			return (
				Array.isArray(event.repeatDays) &&
				event.repeatDays.includes(targetDayOfWeek)
			);
		default:
			return false;
	}
}

/**
 * Получить отсортированные события для конкретной даты (с учетом повторений)
 */
export function getEventsForDate(
	events: CustomEvent[],
	date: string
): CustomEvent[] {
	return events
		.filter((e) => isEventOccurringOnDate(e, date))
		.map((e) => {
			// Если событие повторяющееся и это не оригинальный день — проставляем текущую дату
			if (e.date !== date) {
				return { ...e, date };
			}
			return e;
		})
		.sort((a, b) => {
			const timeA = a.startTime || a.time || "";
			const timeB = b.startTime || b.time || "";
			return timeA.localeCompare(timeB);
		});
}

export { getEventsStore as getCustomEventsStore };
