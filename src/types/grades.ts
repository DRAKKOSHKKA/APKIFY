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
	note?: string; // Заметка / тема / комментарий к сдаче
	homework?: string; // Домашнее задание (выделенный текст задания)
	isHomeworkDone?: boolean; // Статус выполнения Д/З (выполнено / сдано)
	homeworkDeadline?: string; // Срок сдачи Д/З
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
	homeworkCount: number;
	pendingHomeworkCount: number;
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
	totalHomeworkCount: number;
	pendingHomeworkCount: number;
	subjectsCount: number;
}

export interface GradesDataStore {
	version: number;
	lastUpdated: number;
	entries: GradeEntry[];
}
