import { Lesson, ScheduleData } from "../types/schedule";

export interface TimeRange {
	startMinutes: number; // минуты от начала дня (0-1439)
	endMinutes: number;
}

export const CALLS_SCHEDULE = [
	{
		pair: 1,
		start: "08:00",
		end: "09:20",
		breakText: "перемена 10 мин",
	},
	{
		pair: 2,
		start: "09:30",
		end: "10:50",
		breakText: "большая перемена 30 мин",
	},
	{
		pair: 3,
		start: "11:20",
		end: "12:40",
		breakText: "перемена 10 мин",
	},
	{
		pair: 4,
		start: "12:50",
		end: "14:10",
		breakText: "перемена 15 мин",
	},
	{
		pair: 5,
		start: "14:25",
		end: "15:45",
		breakText: "перемена 5 мин",
	},
	{
		pair: 6,
		start: "15:50",
		end: "17:10",
		breakText: "перемена 5 мин",
	},
	{
		pair: 7,
		start: "17:15",
		end: "18:35",
		breakText: "перемена 5 мин",
	},
	{
		pair: 8,
		start: "18:40",
		end: "20:00",
		breakText: "конец занятий",
	},
];

export const SATURDAY_CALLS_SCHEDULE = [
	{
		pair: 1,
		start: "08:00",
		end: "09:00",
		breakText: "перемена 5 мин",
	},
	{
		pair: 2,
		start: "09:05",
		end: "10:05",
		breakText: "большая перемена 15 мин",
	},
	{
		pair: 3,
		start: "10:20",
		end: "11:20",
		breakText: "перемена 5 мин",
	},
	{
		pair: 4,
		start: "11:25",
		end: "12:25",
		breakText: "перемена 5 мин",
	},
	{
		pair: 5,
		start: "12:30",
		end: "13:30",
		breakText: "перемена 5 мин",
	},
	{
		pair: 6,
		start: "13:35",
		end: "14:35",
		breakText: "конец занятий",
	},
];

/**
 * Парсинг строки вида "8:00 - 9:20" в минуты
 */
export function parseTimeRange(
	timeStr: string
): TimeRange | null {
	const match = timeStr.match(
		/(\d{1,2}):(\d{2})\s*[-—]\s*(\d{1,2}):(\d{2})/
	);
	if (!match) return null;

	const startH = parseInt(match[1], 10);
	const startM = parseInt(match[2], 10);
	const endH = parseInt(match[3], 10);
	const endM = parseInt(match[4], 10);

	return {
		startMinutes: startH * 60 + startM,
		endMinutes: endH * 60 + endM,
	};
}

/**
 * Статус пары: идет сейчас, следующая, завершена или ожидается
 */
export type LessonStatus =
	| "current"
	| "upcoming"
	| "completed"
	| "none";

export function getLessonStatus(
	timeStr: string,
	isToday: boolean,
	mockDate?: Date | null
): {
	status: LessonStatus;
	badgeText?: string;
} {
	if (!isToday && !mockDate) {
		return { status: "none" };
	}

	const range = parseTimeRange(timeStr);
	if (!range) {
		return { status: "none" };
	}

	const refDate = mockDate || new Date();
	const currentMinutes =
		refDate.getHours() * 60 + refDate.getMinutes();

	if (
		currentMinutes >= range.startMinutes &&
		currentMinutes <= range.endMinutes
	) {
		const leftMinutes = range.endMinutes - currentMinutes;
		return {
			status: "current",
			badgeText:
				leftMinutes > 0
					? `Идёт • ост. ${leftMinutes} мин`
					: "Идёт сейчас",
		};
	}

	if (currentMinutes < range.startMinutes) {
		const diff = range.startMinutes - currentMinutes;
		if (diff <= 45) {
			return {
				status: "upcoming",
				badgeText: `Через ${diff} мин`,
			};
		}
	}

	if (currentMinutes > range.endMinutes) {
		return { status: "completed" };
	}

	return { status: "none" };
}

/**
 * Человекочитаемая дата
 */
export function formatFullDate(
	dateStr: string,
	dayName: string
): string {
	if (!dateStr) return dayName;
	const parts = dateStr.split(".");
	if (parts.length < 3) return `${dayName}, ${dateStr}`;

	const months = [
		"января",
		"февраля",
		"марта",
		"апреля",
		"мая",
		"июня",
		"июля",
		"августа",
		"сентября",
		"октября",
		"ноября",
		"декабря",
	];

	const day = parseInt(parts[0], 10);
	const monthIdx = parseInt(parts[1], 10) - 1;
	const monthName = months[monthIdx] || "";

	return `${day} ${monthName}, ${dayName.toLowerCase()}`;
}

export type DayLiveStatus =
	| {
			type: "in_lesson";
			lesson: Lesson;
			leftMinutes: number;
			progress: number; // 0..1
	  }
	| {
			type: "break";
			nextLesson: Lesson;
			prevLesson?: Lesson;
			breakLeftMinutes: number;
			breakTotalMinutes: number;
	  }
	| {
			type: "before_start";
			firstLesson: Lesson;
			minutesUntilStart: number;
	  }
	| {
			type: "day_ended";
	  };

/**
 * Определение текущего статуса дня: идет ли пара, перемена или занятия закончились
 */
export function getCurrentDayLiveStatus(
	lessons: Lesson[],
	isToday: boolean,
	mockDate?: Date | null
): DayLiveStatus | null {
	if (!isToday && !mockDate) {
		return null;
	}
	if (!lessons || lessons.length === 0) {
		return null;
	}

	const refDate = mockDate || new Date();
	const currentMinutes =
		refDate.getHours() * 60 + refDate.getMinutes();

	const parsedLessons = lessons
		.map((l) => ({
			lesson: l,
			range: parseTimeRange(l.time),
		}))
		.filter(
			(
				item
			): item is { lesson: Lesson; range: TimeRange } =>
				item.range !== null
		)
		.sort((a, b) => a.range.startMinutes - b.range.startMinutes);

	if (parsedLessons.length === 0) return null;

	const first = parsedLessons[0];
	const last = parsedLessons[parsedLessons.length - 1];

	// До начала первой пары
	if (currentMinutes < first.range.startMinutes) {
		return {
			type: "before_start",
			firstLesson: first.lesson,
			minutesUntilStart:
				first.range.startMinutes - currentMinutes,
		};
	}

	// После окончания последней пары
	if (currentMinutes > last.range.endMinutes) {
		return {
			type: "day_ended",
		};
	}

	// Проверяем: находимся ли внутри пары
	for (const item of parsedLessons) {
		if (
			currentMinutes >= item.range.startMinutes &&
			currentMinutes <= item.range.endMinutes
		) {
			const duration =
				item.range.endMinutes - item.range.startMinutes;
			const elapsed =
				currentMinutes - item.range.startMinutes;
			const progress =
				duration > 0
					? Math.min(
							Math.max(elapsed / duration, 0),
							1
						)
					: 0;
			const leftMinutes = Math.max(
				0,
				item.range.endMinutes - currentMinutes
			);
			return {
				type: "in_lesson",
				lesson: item.lesson,
				leftMinutes,
				progress,
			};
		}
	}

	// Если между парами — значит, сейчас перемена!
	for (let i = 0; i < parsedLessons.length - 1; i++) {
		const prev = parsedLessons[i];
		const next = parsedLessons[i + 1];
		if (
			currentMinutes > prev.range.endMinutes &&
			currentMinutes < next.range.startMinutes
		) {
			const breakTotalMinutes =
				next.range.startMinutes - prev.range.endMinutes;
			const breakLeftMinutes =
				next.range.startMinutes - currentMinutes;
			return {
				type: "break",
				nextLesson: next.lesson,
				prevLesson: prev.lesson,
				breakLeftMinutes,
				breakTotalMinutes,
			};
		}
	}

	return null;
}

/**
 * Корректировка времени пар для субботы (на случай если расписание загружено из старого кэша
 * или сервер прислал будничные слоты).
 */
export function normalizeSaturdayTimes(
	data: ScheduleData
): ScheduleData {
	if (!data || !data.days) return data;
	const updatedDays = data.days.map((day, rowIdx) => {
		const isSaturday =
			day.dayName.toLowerCase().includes("суббот") ||
			rowIdx === 5;
		if (!isSaturday) return day;

		const updatedLessons = day.lessons.map((lesson) => {
			const satCall =
				SATURDAY_CALLS_SCHEDULE.find(
					(s) => s.pair === lesson.pairIndex
				) || SATURDAY_CALLS_SCHEDULE[lesson.pairIndex - 1];
			if (satCall) {
				return {
					...lesson,
					time: `${satCall.start} - ${satCall.end}`,
				};
			}
			return lesson;
		});

		return {
			...day,
			lessons: updatedLessons,
		};
	});

	return {
		...data,
		days: updatedDays,
	};
}

