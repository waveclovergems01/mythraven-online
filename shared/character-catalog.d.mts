export interface CharacterDefinition {
  readonly id: string; readonly model: string; readonly classId: string;
  readonly gender: 'male' | 'female'; readonly hairStyle: number;
  readonly nameTh: string; readonly nameEn: string;
}
export const CHARACTERS: readonly CharacterDefinition[];
export const DEFAULT_CHARACTER_ID: string;
export function characterById(id: unknown): CharacterDefinition | undefined;
