import { parse } from "node-html-parser";
import {
	ScheduleData,
	SearchResultItem,
	WeekItem,
	DaySchedule,
	Lesson,
	DebugStats,
} from "../types/schedule";
import {
	CALLS_SCHEDULE,
	SATURDAY_CALLS_SCHEDULE,
	normalizeSaturdayTimes,
} from "../utils/timeUtils";

export const BASE_URL = "https://it-institut.ru";
export const DEFAULT_OWNER_ID = 37; // Альметьевский профессиональный колледж
export const DEFAULT_WEEK_ID = "14810"; // 3-я неделя (14.09.2026 - 20.09.2026)

/**
 * Расчёт ID реальной текущей недели семестра по календарю
 * 1-я неделя: 31.08.2026 — 06.09.2026 (ID: 14808)
 */
export function getRealCurrentWeekId(
	refDate: Date = new Date()
): string {
	const baseWeekId = 14808;
	const baseStart = new Date(2026, 7, 31); // 31 августа 2026

	// Разница от начала семестра (понедельник 00:00:00)
	const diffMs = refDate.getTime() - baseStart.getTime();
	const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
	const weekNum = Math.max(
		1,
		Math.min(17, Math.floor(diffDays / 7) + 1)
	);
	return String(baseWeekId + (weekNum - 1));
}

/**
 * Генератор списка недель семестра 2026-2027 с точными датами
 * @param selectedWeekId - выбранная пользователем неделя
 * @param realCurrentWeekId - реальная текущая неделя (для бейджа "СЕЙЧАС")
 */
export function getSemesterWeeks(
	selectedWeekId: string,
	realCurrentWeekId?: string
): WeekItem[] {
	const weeks: WeekItem[] = [];
	const baseWeekId = 14808; // 1 неделя
	const baseStart = new Date(2026, 7, 31); // 31 августа 2026
	const actualWeekId =
		realCurrentWeekId || getRealCurrentWeekId();

	for (let num = 1; num <= 17; num++) {
		const weekId = String(baseWeekId + (num - 1));
		const start = new Date(
			baseStart.getTime() +
				(num - 1) * 7 * 24 * 60 * 60 * 1000
		);
		const end = new Date(
			start.getTime() + 6 * 24 * 60 * 60 * 1000
		);

		const fmt = (d: Date) =>
			`${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
		const dateRange = `${fmt(start)} — ${fmt(end)}`;

		weeks.push({
			weekNum: String(num),
			weekId,
			dateRange,
			isCurrent: weekId === actualWeekId,
		});
	}
	return weeks;
}

/**
 * Получение текущей активной недели с главной страницы колледжа
 */
export async function getCurrentWeekId(
	ownerId: number = DEFAULT_OWNER_ID
): Promise<string> {
	try {
		const res = await fetch(
			`${BASE_URL}/SearchString/Index/${ownerId}`,
			{
				headers: {
					"User-Agent":
						"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
				},
			}
		);
		if (res.ok) {
			const html = await res.text();
			const root = parse(html);
			const hidden = root.querySelector("#ChangeWeekId");
			if (hidden) {
				const val = hidden.getAttribute("value");
				if (val && /^\d+$/.test(val)) {
					return val;
				}
			}
		}
	} catch (err) {
		console.warn(
			"Не удалось получить текущую неделю с сервера, используем дефолтную:",
			err
		);
	}
	return DEFAULT_WEEK_ID;
}

/**
 * Поиск групп, преподавателей или кабинетов
 */
export async function searchEntities(
	query: string,
	ownerId: number = DEFAULT_OWNER_ID
): Promise<SearchResultItem[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	const url = `${BASE_URL}/SearchString/KeySearch?Id=${ownerId}&SearchProductName=${encodeURIComponent(trimmed)}`;

	const response = await fetch(url, {
		headers: {
			"Accept": "application/json",
			"User-Agent":
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Ошибка поиска: статус ${response.status}`
		);
	}

	const data = await response.json();
	if (!Array.isArray(data)) return [];

	return data.map((item: any) => ({
		SearchContent: String(item.SearchContent || "").trim(),
		Type:
			(item.Type as "Group" | "Teacher" | "Classroom") ||
			"Group",
		SearchId: Number(item.SearchId),
		OwnerId: Number(item.OwnerId || ownerId),
	}));
}

/**
 * Загрузка расписания с замером метрик для Debug меню
 */
export async function fetchSchedule(
	entity: SearchResultItem,
	weekId?: string
): Promise<ScheduleData> {
	let targetWeekId = weekId;
	if (!targetWeekId) {
		targetWeekId = await getCurrentWeekId(entity.OwnerId);
	}

	const url = `${BASE_URL}/Raspisanie/SearchedRaspisanie?OwnerId=${entity.OwnerId}&SearchId=${entity.SearchId}&SearchString=${encodeURIComponent(entity.SearchContent)}&Type=${entity.Type}&WeekId=${targetWeekId}`;

	const startTime = Date.now();
	const response = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
		},
	});

	const latencyMs = Date.now() - startTime;

	if (!response.ok) {
		throw new Error(
			`Ошибка загрузки страницы расписания: ${response.status}`
		);
	}

	const html = await response.text();

	const debugStats: DebugStats = {
		lastUrl: url,
		httpStatus: response.status,
		latencyMs,
		htmlSizeBytes: html.length,
		timestamp: Date.now(),
		weekIdFormula: `14807 + N = ${targetWeekId}`,
	};

	return parseScheduleHtml(
		html,
		entity,
		targetWeekId,
		debugStats
	);
}

/**
 * Парсер HTML страницы расписания
 */
export function parseScheduleHtml(
	html: string,
	entity: SearchResultItem,
	activeWeekId: string,
	debugStats?: DebugStats
): ScheduleData {
	const root = parse(html);

	// 1. Извлекаем слоты времени из шапки таблицы
	const timeSlots: string[] = [];
	const ths = root.querySelectorAll("table thead tr th");
	for (const th of ths) {
		const span = th.querySelector("span");
		if (span) {
			const text = span.text.trim();
			if (text) {
				timeSlots.push(text);
			}
		}
	}

	// 2. Список недель
	const now = new Date();
	const realCurrentWeekId = getRealCurrentWeekId(now);
	const weeks = getSemesterWeeks(
		activeWeekId,
		realCurrentWeekId
	);

	const activeWeekItem = weeks.find(
		(w) => w.weekId === activeWeekId
	);
	const currentWeekNum = activeWeekItem
		? activeWeekItem.weekNum
		: "3";
	const currentWeekDates = activeWeekItem
		? activeWeekItem.dateRange
		: "14.09 — 20.09";

	// 3. Формируем сегодняшнюю дату
	const todayStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;

	const weekIndex = parseInt(currentWeekNum, 10) - 1;
	const mondayDate = new Date(2026, 7, 31 + weekIndex * 7);

	// 4. Парсим дни и пары
	const days: DaySchedule[] = [];
	const rows = root.querySelectorAll("table tbody tr");

	const defaultDayNames = [
		"Понедельник",
		"Вторник",
		"Среда",
		"Четверг",
		"Пятница",
		"Суббота",
		"Воскресенье",
	];

	rows.forEach((row, rowIdx) => {
		const th = row.querySelector('th[scope="row"]');
		if (!th) return;

		const rawHtml = th.innerHTML;
		const dayParts = rawHtml
			.split(/<br\s*\/?>/i)
			.map((part) => parse(part).text.trim())
			.filter(Boolean);

		let dayName =
			dayParts[0] || defaultDayNames[rowIdx] || "";
		let dayDate = dayParts[1] || "";

		// Защита от бага 0001
		if (!dayDate || dayDate.includes("0001")) {
			const dayOffsetDate = new Date(
				mondayDate.getTime() +
					rowIdx * 24 * 60 * 60 * 1000
			);
			dayDate = `${String(dayOffsetDate.getDate()).padStart(2, "0")}.${String(dayOffsetDate.getMonth() + 1).padStart(2, "0")}.${dayOffsetDate.getFullYear()}`;
		}

		const isToday = dayDate === todayStr;
		const isSaturday =
			dayName.toLowerCase().includes("суббот") ||
			rowIdx === 5;

		const lessons: Lesson[] = [];
		const tds = row.querySelectorAll("td");

		tds.forEach((td, colIndex) => {
			let time = "";
			if (isSaturday) {
				const satCall =
					SATURDAY_CALLS_SCHEDULE.find(
						(c) => c.pair === colIndex + 1
					) || SATURDAY_CALLS_SCHEDULE[colIndex];
				time = satCall
					? `${satCall.start} - ${satCall.end}`
					: timeSlots[colIndex] ||
						`Пара ${colIndex + 1}`;
			} else {
				time =
					timeSlots[colIndex] ||
					(CALLS_SCHEDULE[colIndex]
						? `${CALLS_SCHEDULE[colIndex].start} - ${CALLS_SCHEDULE[colIndex].end}`
						: `Пара ${colIndex + 1}`);
			}

			const contentDivs = td.querySelectorAll(
				'> div, div[style*="margin"]'
			);

			contentDivs.forEach((div, divIdx) => {
				const spans = div
					.querySelectorAll("span")
					.map((s) => s.text.trim());
				if (spans.length === 0) return;

				let subject = spans[0] || "";
				if (subject.endsWith(",")) {
					subject = subject.slice(0, -1).trim();
				}

				let teacher = "";
				let room = "";
				if (spans[1]) {
					const parts = spans[1].split(",");
					teacher = parts[0] ? parts[0].trim() : "";
					room = parts.slice(1).join(",").trim();
				}

				let group = spans[2] || "";
				if (
					group.startsWith("(") &&
					group.endsWith(")")
				) {
					group = group.slice(1, -1).trim();
				}

				if (subject) {
					lessons.push({
						id: `${dayDate}-${colIndex}-${divIdx}-${subject}`,
						pairIndex: colIndex + 1,
						time,
						subject,
						teacher,
						room,
						group,
					});
				}
			});
		});

		days.push({
			dayName,
			dayDate,
			lessons,
			isToday,
		});
	});

	const rawSchedule: ScheduleData = {
		entity,
		weekId: activeWeekId,
		currentWeekNum,
		currentWeekDates,
		realCurrentWeekId,
		weeks,
		days,
		lastUpdated: Date.now(),
		debugStats,
	};

	return normalizeSaturdayTimes(rawSchedule);
}
