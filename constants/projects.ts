export type ProjectStatus = 'active' | 'done';

export type Project = {
  id: string;
  address: string;
  status: ProjectStatus;
  dateStart: string;
  dateEnd: string;
  startDateYmd: string;
  endDateYmd: string;
  /** URI обложки для карточки (левая плашка) */
  coverImageUri?: string | null;
};

export const MOCK_PROJECTS: Project[] = [
  { id: '1', address: 'ул. Ленина, 12', status: 'active', dateStart: '27/03', dateEnd: '7/05', startDateYmd: '2026-03-27', endDateYmd: '2026-05-07' },
  { id: '2', address: 'Дача Петровых', status: 'active', dateStart: '01/04', dateEnd: '15/05', startDateYmd: '2026-04-01', endDateYmd: '2026-05-15' },
  { id: '3', address: 'Коттедж Сидорова', status: 'done', dateStart: '10/02', dateEnd: '28/02', startDateYmd: '2026-02-10', endDateYmd: '2026-02-28' },
  { id: '4', address: 'ул. Мира, 5', status: 'done', dateStart: '15/01', dateEnd: '20/02', startDateYmd: '2026-01-15', endDateYmd: '2026-02-20' },
];

export function getProjectById(id: string): Project | undefined {
  return MOCK_PROJECTS.find((p) => p.id === id);
}
