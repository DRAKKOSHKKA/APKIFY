/**
 * Типы данных для кастомных событий (кружки, секции, консультации, факультативы)
 */

export type EventCategory =
	| "club" // Кружок
	| "section" // Секция / спорт
	| "consultation" // Консультация
	| "elective" // Факультатив
	| "event" // Мероприятие
	| "other"; // Другое

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
	category?: EventCategory; // Категория события
	createdAt: number; // Timestamp создания
	updatedAt: number; // Timestamp обновления
}

export interface CustomEventsStore {
	version: number;
	lastUpdated: number;
	events: CustomEvent[];
}
