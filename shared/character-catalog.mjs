/** Stable appearance IDs shared by the picker and the authoritative room. */
export const CHARACTERS = Object.freeze([
  Object.freeze({ id: 'novice-male-01', model: 'novice', classId: 'novice', gender: 'male', hairStyle: 1,
    nameTh: 'Novice · ทรงผม 1', nameEn: 'Novice · Hairstyle 1' }),
  Object.freeze({ id: 'novice-male-02', model: 'novice', classId: 'novice', gender: 'male', hairStyle: 2,
    nameTh: 'Novice · ทรงผม 2', nameEn: 'Novice · Hairstyle 2' }),
  Object.freeze({ id: 'warrior-male-01', model: 'warrior', classId: 'warrior', gender: 'male', hairStyle: 1,
    nameTh: 'Warrior · ทรงผม 1', nameEn: 'Warrior · Hairstyle 1' }),
  Object.freeze({ id: 'warrior-male-02', model: 'warrior', classId: 'warrior', gender: 'male', hairStyle: 2,
    nameTh: 'Warrior · ทรงผม 2', nameEn: 'Warrior · Hairstyle 2' }),
  Object.freeze({ id: 'archer-male-01', model: 'archer', classId: 'archer', gender: 'male', hairStyle: 1,
    nameTh: 'Archer · ทรงผม 1', nameEn: 'Archer · Hairstyle 1' }),
  Object.freeze({ id: 'archer-male-02', model: 'archer', classId: 'archer', gender: 'male', hairStyle: 2,
    nameTh: 'Archer · ทรงผม 2', nameEn: 'Archer · Hairstyle 2' }),
]);
export const DEFAULT_CHARACTER_ID = CHARACTERS[0].id;
export const characterById = id => CHARACTERS.find(character => character.id === id);
