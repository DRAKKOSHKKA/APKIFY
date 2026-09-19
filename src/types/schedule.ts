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
	dateRange: string; // "14.09 — 20.09"
	isCurrent: boolean;
}

export interface DebugStats {
	lastUrl: string;
	httpStatus: number;
	latencyMs: number;
	htmlSizeBytes: number;
	timestamp: number;
	weekIdFormula: string;
}

export interface ScheduleData {
	entity: SearchResultItem;
	weekId: string;
	currentWeekNum: string;
	currentWeekDates: string;
	realCurrentWeekId?: string;
	weeks: WeekItem[];
	days: DaySchedule[];
	lastUpdated: number;
	debugStats?: DebugStats;
}

export interface FavoriteItem extends SearchResultItem {
	addedAt: number;
}

export type ThemeMode = "system" | "light" | "gray" | "oled" | "dark";
export type AccentColor =
	| "blue"
	| "purple"
	| "green"
	| "orange"
	| "pink"
	| "teal";
export type SubgroupFilter = "all" | "1" | "2";

export interface AppSettings {
	themeMode: ThemeMode;
	accentColor?: AccentColor;
	subgroup: SubgroupFilter;
	compactView: boolean;
	glassEffect: boolean;
	notificationsEnabled: boolean;
	defaultEntity: SearchResultItem;
}
