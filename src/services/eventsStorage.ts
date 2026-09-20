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
async function writeToFile(data: CustomEventsStore): Promise<void> {
	try {
		await ensureDirectoryExists();
		const filePath = getEventsFilePath();
		const jsonString = JSON.stringify(data, null, 2);
		await FileSystem.writeAsStringAsync(filePath, jsonString, {
			encoding: FileSystem.EncodingType.UTF8,
		});
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
			const content = await FileSystem.readAsStringAsync(filePath, {
				encoding: FileSystem.EncodingType.UTF8,
			});
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
		const cachedJson = await AsyncStorage.getItem(STORAGE_KEY);
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
		console.warn("Ошибка сохранения событий в AsyncStorage:", err);
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
	eventData: Omit<CustomEvent, "id" | "createdAt" | "updatedAt"> & {
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
		const index = store.events.findIndex((e) => e.id === eventData.id);
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
export async function deleteCustomEvent(id: string): Promise<void> {
	const store = await getEventsStore();
	store.events = store.events.filter((e) => e.id !== id);
	await saveEventsStore(store);
}

/**
 * Получить отсортированные события для конкретной даты
 */
export function getEventsForDate(
	events: CustomEvent[],
	date: string
): CustomEvent[] {
	return events
		.filter((e) => e.date === date)
		.sort((a, b) => {
			const timeA = a.startTime || a.time || "";
			const timeB = b.startTime || b.time || "";
			return timeA.localeCompare(timeB);
		});
}

export { getEventsStore as getCustomEventsStore };
