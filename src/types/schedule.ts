export type EntityType = "Group" | "Teacher" | "Classroom";

export interface SearchResultItem {
	SearchContent: string;
	Type: EntityType;
	SearchId: number;
	OwnerId: number;
}

export interface Lesson {
	id: string;
	pairIndex: number;
	time: string;
	subject: string;
	teacher: string;
	room: string;
	group: string;
	isCurrent?: boolean;
	isUpcoming?: boolean;
}

export interface DaySchedule {
	dayName: string; // "Понедельник"
	dayDate: string; // "14.09.2026"
	lessons: Lesson[];
	isToday: boolean;
}

export interface WeekItem {
	weekNum: string; // "1", "2", "3"
	weekId: string; // "14810"
	isCurrent: boolean;
}

export interface ScheduleData {
	entity: SearchResultItem;
	weekId: string;
	currentWeekNum: string;
	currentWeekDates: string;
	weeks: WeekItem[];
	days: DaySchedule[];
	lastUpdated: number;
}

export interface FavoriteItem extends SearchResultItem {
	addedAt: number;
}
