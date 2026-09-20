import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
	GradeEntry,
	GradesDataStore,
	GradesOverview,
	SubjectSummary,
} from "../types/grades";

const STORAGE_KEY = "@apkify_grades_store";
const FOLDER_NAME = "Apkify_Grades";
const FILE_NAME = "grades_and_notes.json";

// Специальная постоянная папка внутри Documents, видимая в приложении iOS «Файлы»
const getGradesDirectory = () => {
	const docDir = FileSystem.documentDirectory || "";
	return `${docDir}${FOLDER_NAME}/`;
};

const getGradesFilePath = () => {
	return `${getGradesDirectory()}${FILE_NAME}`;
};

/**
 * Создаёт директорию, если она ещё не существует
 */
async function ensureDirectoryExists(): Promise<string> {
	const dir = getGradesDirectory();
	try {
		const dirInfo = await FileSystem.getInfoAsync(dir);
		if (!dirInfo.exists) {
			await FileSystem.makeDirectoryAsync(dir, {
				intermediates: true,
			});
		}
	} catch (err) {
		console.warn("Ошибка создания директории оценок:", err);
	}
	return dir;
}

/**
 * Записать актуальные данные в файл на диске в специальной папке
 */
async function writeToFile(
	data: GradesDataStore
): Promise<void> {
	try {
		await ensureDirectoryExists();
		const filePath = getGradesFilePath();
		const jsonString = JSON.stringify(data, null, 2);
		await FileSystem.writeAsStringAsync(
			filePath,
			jsonString,
			{
				encoding: FileSystem.EncodingType.UTF8,
			}
		);
	} catch (err) {
		console.warn(
			"Ошибка записи файла оценок в файловую систему:",
			err
		);
	}
}

/**
 * Прочитать данные из файла на диске в специальной папке
 */
async function readFromFile(): Promise<GradesDataStore | null> {
	try {
		const filePath = getGradesFilePath();
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
				if (Array.isArray(parsed.entries)) {
					return parsed as GradesDataStore;
				}
				// Если пользователь подложил обычный массив записей
				if (Array.isArray(parsed)) {
					return {
						version: 1,
						lastUpdated: Date.now(),
						entries: parsed,
					};
				}
			}
		}
	} catch (err) {
		console.warn(
			"Ошибка чтения файла оценок из диска:",
			err
		);
	}
	return null;
}

/**
 * Получить все оценки и заметки (двухуровневая загрузка: кэш + файл в спец. папке)
 */
export async function getGradesStore(): Promise<GradesDataStore> {
	let memoryData: GradesDataStore | null = null;

	// 1. Читаем из AsyncStorage для мгновенного доступа
	try {
		const cachedJson =
			await AsyncStorage.getItem(STORAGE_KEY);
		if (cachedJson) {
			memoryData = JSON.parse(cachedJson);
		}
	} catch (err) {
		console.warn("Ошибка чтения AsyncStorage оценок:", err);
	}

	// 2. Читаем из постоянного файла в специальной папке
	const fileData = await readFromFile();

	// Если в AsyncStorage пусто (например, после переустановки приложения), но файл на месте:
	if (
		(!memoryData || memoryData.entries.length === 0) &&
		fileData &&
		fileData.entries.length > 0
	) {
		// Восстанавливаем кэш из сохранённого файла
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
		// Если файла на диске почему-то нет, но есть в кэше — синхронизируем на диск
		if (!fileData) {
			writeToFile(memoryData);
		}
		return memoryData;
	}

	// Дефолтное пустое состояние
	const emptyStore: GradesDataStore = {
		version: 1,
		lastUpdated: Date.now(),
		entries: [],
	};
	return emptyStore;
}

/**
 * Сохранить все оценки сразу в AsyncStorage и в файл на диске
 */
export async function saveGradesStore(
	store: GradesDataStore
): Promise<void> {
	const updatedStore: GradesDataStore = {
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
			"Ошибка записи в AsyncStorage оценок:",
			err
		);
	}

	await writeToFile(updatedStore);
}

/**
 * Добавить или обновить запись оценки/заметки
 */
export async function upsertGradeEntry(
	entryData: Omit<
		GradeEntry,
		"id" | "createdAt" | "updatedAt"
	> & { id?: string }
): Promise<GradeEntry> {
	const store = await getGradesStore();
	const now = Date.now();

	let resultEntry: GradeEntry;

	if (entryData.id) {
		// Обновление существующей записи
		const index = store.entries.findIndex(
			(e) => e.id === entryData.id
		);
		if (index !== -1) {
			resultEntry = {
				...store.entries[index],
				...entryData,
				id: entryData.id,
				updatedAt: now,
			};
			store.entries[index] = resultEntry;
		} else {
			resultEntry = {
				...entryData,
				id: entryData.id,
				createdAt: now,
				updatedAt: now,
			};
			store.entries.unshift(resultEntry);
		}
	} else {
		// Создание новой записи
		const newId = `grade_${now}_${Math.random().toString(36).substring(2, 7)}`;
		resultEntry = {
			...entryData,
			id: newId,
			createdAt: now,
			updatedAt: now,
		};
		store.entries.unshift(resultEntry);
	}

	await saveGradesStore(store);
	return resultEntry;
}

/**
 * Удалить запись оценки/заметки
 */
export async function deleteGradeEntry(
	id: string
): Promise<void> {
	const store = await getGradesStore();
	store.entries = store.entries.filter((e) => e.id !== id);
	await saveGradesStore(store);
}

/**
 * Найти запись для конкретного предмета и даты (и опционально пары)
 */
export function findGradeForLesson(
	entries: GradeEntry[],
	subject: string,
	date: string,
	pairIndex?: number
): GradeEntry | undefined {
	const normSubject = subject.trim().toLowerCase();
	return entries.find((e) => {
		const isSameSubject =
			e.subject.trim().toLowerCase() === normSubject;
		const isSameDate = e.date === date;
		if (
			pairIndex !== undefined &&
			e.pairIndex !== undefined
		) {
			return (
				isSameSubject &&
				isSameDate &&
				e.pairIndex === pairIndex
			);
		}
		return isSameSubject && isSameDate;
	});
}

/**
 * Подсчёт средней оценки и группировка по предметам
 */
export function calculateSubjectSummaries(
	entries: GradeEntry[]
): SubjectSummary[] {
	const grouped: Record<string, GradeEntry[]> = {};

	for (const entry of entries) {
		const subj = entry.subject.trim();
		if (!grouped[subj]) {
			grouped[subj] = [];
		}
		grouped[subj].push(entry);
	}

	const summaries: SubjectSummary[] = Object.keys(grouped).map(
		(subject) => {
			const subjectEntries = grouped[subject].sort(
				(a, b) => b.createdAt - a.createdAt
			);

			let numericSum = 0;
			let numericCount = 0;
			let c5 = 0;
			let c4 = 0;
			let c3 = 0;
			let c2 = 0;
			let notesCount = 0;
			let homeworkCount = 0;
			let pendingHomeworkCount = 0;
			const gradesList: string[] = [];

			for (const e of subjectEntries) {
				if (e.homework && e.homework.trim().length > 0) {
					homeworkCount++;
					if (!e.isHomeworkDone) {
						pendingHomeworkCount++;
					}
				}
				if (e.note && e.note.trim().length > 0) {
					notesCount++;
				}
				if (e.grade) {
					gradesList.push(e.grade);
					const num = parseInt(e.grade, 10);
					if (!isNaN(num) && num >= 2 && num <= 5) {
						numericSum += num;
						numericCount++;
						if (num === 5) c5++;
						if (num === 4) c4++;
						if (num === 3) c3++;
						if (num === 2) c2++;
					}
				}
			}

			const average =
				numericCount > 0
					? Number(
							(numericSum / numericCount).toFixed(
								2
							)
						)
					: null;

			return {
				subject,
				grades: gradesList,
				average,
				totalGradesCount: gradesList.length,
				count5: c5,
				count4: c4,
				count3: c3,
				count2: c2,
				notesCount,
				homeworkCount,
				pendingHomeworkCount,
				entries: subjectEntries,
			};
		}
	);

	// Сортируем: сначала те предметы, по которым есть оценки (по алфавиту)
	return summaries.sort((a, b) =>
		a.subject.localeCompare(b.subject, "ru")
	);
}

/**
 * Общий обзор успеваемости (средний балл студента, общее число оценок)
 */
export function calculateOverview(
	entries: GradeEntry[]
): GradesOverview {
	let numericSum = 0;
	let numericCount = 0;
	let c5 = 0;
	let c4 = 0;
	let c3 = 0;
	let c2 = 0;
	let totalNotes = 0;
	let totalHomework = 0;
	let pendingHomework = 0;
	let totalGrades = 0;
	const subjects = new Set<string>();

	for (const e of entries) {
		subjects.add(e.subject.trim());
		if (e.homework && e.homework.trim().length > 0) {
			totalHomework++;
			if (!e.isHomeworkDone) {
				pendingHomework++;
			}
		}
		if (e.note && e.note.trim().length > 0) {
			totalNotes++;
		}
		if (e.grade) {
			totalGrades++;
			const num = parseInt(e.grade, 10);
			if (!isNaN(num) && num >= 2 && num <= 5) {
				numericSum += num;
				numericCount++;
				if (num === 5) c5++;
				if (num === 4) c4++;
				if (num === 3) c3++;
				if (num === 2) c2++;
			}
		}
	}

	const averageGrade =
		numericCount > 0
			? Number((numericSum / numericCount).toFixed(2))
			: null;

	return {
		averageGrade,
		totalGradesCount: totalGrades,
		count5: c5,
		count4: c4,
		count3: c3,
		count2: c2,
		totalNotesCount: totalNotes,
		totalHomeworkCount: totalHomework,
		pendingHomeworkCount: pendingHomework,
		subjectsCount: subjects.size,
	};
}

/**
 * Экспорт файла в системный диалог iOS (Share Sheet / AirDrop / Сохранить в Файлы / Telegram)
 */
export async function exportGradesFile(): Promise<boolean> {
	try {
		const store = await getGradesStore();
		await writeToFile(store);

		const filePath = getGradesFilePath();
		const isAvailable = await Sharing.isAvailableAsync();
		if (!isAvailable) {
			return false;
		}

		await Sharing.shareAsync(filePath, {
			mimeType: "application/json",
			dialogTitle: "Экспорт оценок и заметок Apkify",
			UTI: "public.json",
		});
		return true;
	} catch (err) {
		console.warn("Ошибка экспорта файла оценок:", err);
		return false;
	}
}

/**
 * Импорт файла из системного диалога выбора документов
 */
export async function importGradesFile(): Promise<{
	count: number;
} | null> {
	try {
		const res = await DocumentPicker.getDocumentAsync({
			type: ["application/json", "text/plain", "*/*"],
			copyToCacheDirectory: true,
		});

		if (
			res.canceled ||
			!res.assets ||
			res.assets.length === 0
		) {
			return null;
		}

		const fileAsset = res.assets[0];
		const content = await FileSystem.readAsStringAsync(
			fileAsset.uri,
			{
				encoding: FileSystem.EncodingType.UTF8,
			}
		);

		return importGradesFromJsonString(content);
	} catch (err) {
		console.warn("Ошибка импорта файла оценок:", err);
		throw new Error(
			"Не удалось прочитать выбранный файл. Убедитесь, что это корректный JSON файл бэкапа."
		);
	}
}

/**
 * Импорт из строки JSON (например, из буфера обмена или файла)
 */
export async function importGradesFromJsonString(
	jsonString: string
): Promise<{ count: number }> {
	try {
		const parsed = JSON.parse(jsonString);
		let importedEntries: GradeEntry[] = [];

		if (Array.isArray(parsed.entries)) {
			importedEntries = parsed.entries;
		} else if (Array.isArray(parsed)) {
			importedEntries = parsed;
		} else {
			throw new Error(
				"Неверная структура данных в файле."
			);
		}

		// Валидация записей
		const validEntries: GradeEntry[] =
			importedEntries.filter(
				(e) =>
					typeof e.subject === "string" &&
					typeof e.date === "string"
			);

		if (
			validEntries.length === 0 &&
			importedEntries.length > 0
		) {
			throw new Error(
				"В файле не найдено корректных записей оценок."
			);
		}

		const currentStore = await getGradesStore();

		// Объединяем существующие и новые записи по id
		const map = new Map<string, GradeEntry>();
		for (const existing of currentStore.entries) {
			map.set(existing.id, existing);
		}
		for (const imported of validEntries) {
			const id =
				imported.id ||
				`imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
			map.set(id, {
				...imported,
				id,
				createdAt: imported.createdAt || Date.now(),
				updatedAt: imported.updatedAt || Date.now(),
			});
		}

		const mergedEntries = Array.from(map.values()).sort(
			(a, b) => b.createdAt - a.createdAt
		);

		await saveGradesStore({
			version: 1,
			lastUpdated: Date.now(),
			entries: mergedEntries,
		});

		return { count: validEntries.length };
	} catch (err: any) {
		throw new Error(
			err.message || "Ошибка парсинга JSON бэкапа."
		);
	}
}

/**
 * Получить строку JSON для копирования в буфер обмена
 */
export async function getGradesExportJsonString(): Promise<string> {
	const store = await getGradesStore();
	return JSON.stringify(store, null, 2);
}

/**
 * Получить сведения о специальной папке и файле на устройстве
 */
export async function getStorageInfo(): Promise<{
	folderName: string;
	fileName: string;
	fullPath: string;
	fileExists: boolean;
	fileSizeFormatted: string;
	entriesCount: number;
	lastUpdatedFormatted: string;
}> {
	const filePath = getGradesFilePath();
	const store = await getGradesStore();

	let fileExists = false;
	let fileSizeFormatted = "0 КБ";

	try {
		const info = await FileSystem.getInfoAsync(filePath);
		if (info.exists) {
			fileExists = true;
			const bytes = (info as any).size || 0;
			fileSizeFormatted = `${(bytes / 1024).toFixed(1)} КБ`;
		}
	} catch {}

	const lastDate = store.lastUpdated
		? new Date(store.lastUpdated)
		: new Date();
	const lastUpdatedFormatted = `${String(lastDate.getDate()).padStart(2, "0")}.${String(lastDate.getMonth() + 1).padStart(2, "0")} в ${String(lastDate.getHours()).padStart(2, "0")}:${String(lastDate.getMinutes()).padStart(2, "0")}`;

	return {
		folderName: FOLDER_NAME,
		fileName: FILE_NAME,
		fullPath: filePath,
		fileExists,
		fileSizeFormatted,
		entriesCount: store.entries.length,
		lastUpdatedFormatted,
	};
}
