import { parse } from "node-html-parser";
import {
	ScheduleData,
	SearchResultItem,
	WeekItem,
	DaySchedule,
	Lesson,
} from "../types/schedule";

export const BASE_URL = "https://it-institut.ru";
export const DEFAULT_OWNER_ID = 37; // Альметьевский профессиональный колледж

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
 * Загрузка и парсинг расписания с сайта
 */
export async function fetchSchedule(
	entity: SearchResultItem,
	weekId?: string
): Promise<ScheduleData> {
	let url = `${BASE_URL}/Raspisanie/SearchedRaspisanie?OwnerId=${entity.OwnerId}&SearchId=${entity.SearchId}&SearchString=${encodeURIComponent(entity.SearchContent)}&Type=${entity.Type}`;
	if (weekId) {
		url += `&WeekId=${weekId}`;
	}

	const response = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Ошибка загрузки страницы расписания: ${response.status}`
		);
	}

	const html = await response.text();
	return parseScheduleHtml(html, entity, weekId);
}

/**
 * Парсер HTML страницы расписания на чистом JS (node-html-parser)
 */
export function parseScheduleHtml(
	html: string,
	entity: SearchResultItem,
	requestedWeekId?: string
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

	// 2. Извлекаем список всех недель
	const weeks: WeekItem[] = [];
	let currentActiveWeekId = requestedWeekId || "";
	let currentWeekNum = "";

	const weekLinks = root.querySelectorAll(".weeks-navgroup a");
	for (const a of weekLinks) {
		const weekNum = a.text.trim();
		const href = a.getAttribute("href") || "";
		const match = href.match(/WeekId=(\d+)/i);
		const isCurrent = a.classList.contains("btn-primary");

		if (match) {
			const id = match[1];
			if (isCurrent) {
				currentActiveWeekId = id;
				currentWeekNum = weekNum;
			}
			weeks.push({
				weekNum,
				weekId: id,
				isCurrent,
			});
		}
	}

	// Если WeekId не найден в кнопках, берем из скрытого input
	if (!currentActiveWeekId) {
		const hiddenInput = root.querySelector(
			"input#ChangeWeekId"
		);
		if (hiddenInput) {
			const val = hiddenInput.getAttribute("value");
			if (val) {
				currentActiveWeekId = val;
			}
		}
	}

	// Текст с датами недели
	const weekNavDiv = root.querySelector(
		".weeks-searchedraspisanie"
	);
	const currentWeekInfoText = weekNavDiv
		? weekNavDiv.text.replace(/\s+/g, " ").trim()
		: "";
	const datesMatch = currentWeekInfoText.match(
		/c\s+(\d{2}\.\d{2}\.\d{4})\s+по\s+(\d{2}\.\d{2}\.\d{4})/i
	);
	const currentWeekDates = datesMatch
		? `${datesMatch[1]} — ${datesMatch[2]}`
		: "";

	// 3. Формируем сегодняшнюю дату
	const now = new Date();
	const todayStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;

	// 4. Парсим дни и пары
	const days: DaySchedule[] = [];
	const rows = root.querySelectorAll("table tbody tr");

	for (const row of rows) {
		const th = row.querySelector('th[scope="row"]');
		if (!th) continue;

		// "Понедельник<br />14.09.2026"
		const rawHtml = th.innerHTML;
		const dayParts = rawHtml
			.split(/<br\s*\/?>/i)
			.map((part) => parse(part).text.trim())
			.filter(Boolean);

		const dayName = dayParts[0] || "";
		const dayDate = dayParts[1] || "";
		const isToday = dayDate === todayStr;

		const lessons: Lesson[] = [];
		const tds = row.querySelectorAll("td");

		tds.forEach((td, colIndex) => {
			const time =
				timeSlots[colIndex] || `Пара ${colIndex + 1}`;
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
	}

	return {
		entity,
		weekId: currentActiveWeekId,
		currentWeekNum: currentWeekNum || "—",
		currentWeekDates,
		weeks,
		days,
		lastUpdated: Date.now(),
	};
}
