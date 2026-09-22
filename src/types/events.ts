/**
 * Типы данных для кастомных событий (кружки, секции, консультации, факультативы)
 */

export type EventCategory =
	| "club" // Кружок
	| "section" // Секция / спорт
	| "consultation" // Консультация
	| "elective" // Факультатив
	| "event" // Мероприятие
	| "exam" // Зачёт / Экзамен
	| "duty" // Дежурство
	| "other"; // Другое

export type EventRepeatType =
	| "none" // Только в этот день
	| "daily" // Каждый день
	| "weekdays" // По будням (Пн-Пт)
	| "weekly" // Каждую неделю
	| "biweekly" // Раз в 2 недели (чёт/нечёт)
	| "custom_days"; // Выбранные дни недели

export type EventPriority = "normal" | "high";

export type EventSubgroup = "all" | "1" | "2";

export interface CustomEvent {
	id: string; // Уникальный идентификатор (UUID/timestamp)
	title: string; // Название события (например: "Кружок робототехники")
	date: string; // Дата в формате "ДД.ММ.ГГГГ" (например: "21.09.2026")
	startTime: string; // Время начала (например: "15:00")
	endTime?: string; // Время окончания (например: "16:30")
	time?: string; // Полная строка времени (например: "15:00 - 16:30")
	room?: string; // Кабинет / аудитория / зал (например: "каб. 312а")
	teacher?: string; // Преподаватель / руководитель / тренер
	note?: string; // Заметка / памятка к событию
	color?: string; // Акцентный цвет карточки
	icon?: string; // Иконка (Ionicons name)
	category?: EventCategory; // Категория события
	repeatType?: EventRepeatType; // Тип повторения
	repeatDays?: number[]; // Дни недели для custom_days (0=Вс, 1=Пн ... 6=Сб)
	repeatUntil?: string; // Дата окончания повторений в формате "ДД.ММ.ГГГГ"
	priority?: EventPriority; // Приоритет
	subgroup?: EventSubgroup; // Привязка к подгруппе
	reminderMinutes?: number; // Напоминание (за сколько минут)
	createdAt: number; // Timestamp создания
	updatedAt: number; // Timestamp обновления
}

export interface CustomEventsStore {
	version: number;
	lastUpdated: number;
	events: CustomEvent[];
}
