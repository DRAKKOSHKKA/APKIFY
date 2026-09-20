/**
 * Типы данных для системы оценок, успеваемости и заметок
 */

export type GradeValue =
	| "5"
	| "4"
	| "3"
	| "2"
	| "зачет"
	| "незачет"
	| "н/а"
	| string;

export interface GradeEntry {
	id: string; // Уникальный идентификатор записи (UUID / timestamp)
	subject: string; // Название предмета (например: "МДК 02.01 Разработка ПО")
	date: string; // Дата занятия в формате "ДД.ММ.ГГГГ" (например: "16.09.2026")
	pairIndex?: number; // Номер пары (1, 2, 3...)
	time?: string; // Время пары (например: "08:00 - 09:20")
	room?: string; // Кабинет (например: "312а")
	teacher?: string; // Преподаватель (например: "Хайруллин Р.М.")
	grade?: GradeValue; // Выставленная оценка
	note?: string; // Заметка / тема / Д/З / комментарий к сдаче
	createdAt: number; // Время создания (Unix timestamp ms)
	updatedAt: number; // Время последнего изменения (Unix timestamp ms)
}

export interface SubjectSummary {
	subject: string;
	grades: GradeValue[];
	average: number | null; // Средний балл по 5-балльной шкале (если есть цифровые оценки)
	totalGradesCount: number;
	count5: number;
	count4: number;
	count3: number;
	count2: number;
	notesCount: number;
	entries: GradeEntry[];
}

export interface GradesOverview {
	averageGrade: number | null; // Общий средний балл студента
	totalGradesCount: number;
	count5: number;
	count4: number;
	count3: number;
	count2: number;
	totalNotesCount: number;
	subjectsCount: number;
}

export interface GradesDataStore {
	version: number;
	lastUpdated: number;
	entries: GradeEntry[];
}
