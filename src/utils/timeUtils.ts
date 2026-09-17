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
