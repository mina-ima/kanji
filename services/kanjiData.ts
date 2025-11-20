
import type { Kanji } from '../types';

export const grade1Kanji: Kanji[] = [
  { character: '一', grade: 1, reading: 'いち', meaning: 'One' },
  { character: '二', grade: 1, reading: 'に', meaning: 'Two' },
  { character: '三', grade: 1, reading: 'さん', meaning: 'Three' },
  { character: '四', grade: 1, reading: 'し', meaning: 'Four' },
  { character: '五', grade: 1, reading: 'ご', meaning: 'Five' },
  { character: '六', grade: 1, reading: 'ろく', meaning: 'Six' },
  { character: '七', grade: 1, reading: 'しち', meaning: 'Seven' },
  { character: '八', grade: 1, reading: 'はち', meaning: 'Eight' },
  { character: '九', grade: 1, reading: 'きゅう', meaning: 'Nine' },
  { character: '十', grade: 1, reading: 'じゅう', meaning: 'Ten' },
  { character: '日', grade: 1, reading: 'にち', meaning: 'Day, Sun' },
  { character: '月', grade: 1, reading: 'げつ', meaning: 'Month, Moon' },
  { character: '火', grade: 1, reading: 'か', meaning: 'Fire' },
  { character: '水', grade: 1, reading: 'すい', meaning: 'Water' },
  { character: '木', grade: 1, reading: 'もく', meaning: 'Tree' },
  { character: '金', grade: 1, reading: 'きん', meaning: 'Gold, Money' },
  { character: '土', grade: 1, reading: 'ど', meaning: 'Earth, Soil' },
  { character: '山', grade: 1, reading: 'やま', meaning: 'Mountain' },
  { character: '川', grade: 1, reading: 'かわ', meaning: 'River' },
  { character: '田', grade: 1, reading: 'た', meaning: 'Rice Paddy' },
  { character: '人', grade: 1, reading: 'ひと', meaning: 'Person' },
  { character: '口', grade: 1, reading: 'くち', meaning: 'Mouth' },
  { character: '車', grade: 1, reading: 'くるま', meaning: 'Car' },
  { character: '門', grade: 1, reading: 'もん', meaning: 'Gate' },
  { character: '年', grade: 1, reading: 'ねん', meaning: 'Year' },
];

export const grade2Kanji: Kanji[] = [
  { character: '引', grade: 2, reading: 'ひ（く）', meaning: 'Pull' },
  { character: '羽', grade: 2, reading: 'はね', meaning: 'Feather' },
  { character: '雲', grade: 2, reading: 'くも', meaning: 'Cloud' },
  { character: '園', grade: 2, reading: 'えん', meaning: 'Garden' },
  { character: '遠', grade: 2, reading: 'とお（い）', meaning: 'Far' },
  { character: '何', grade: 2, reading: 'なに', meaning: 'What' },
  { character: '科', grade: 2, reading: 'か', meaning: 'Department' },
  { character: '夏', grade: 2, reading: 'なつ', meaning: 'Summer' },
  { character: '家', grade: 2, reading: 'いえ', meaning: 'House' },
  { character: '歌', grade: 2, reading: 'うた', meaning: 'Song' },
];

export const grade3Kanji: Kanji[] = [
  { character: '悪', grade: 3, reading: 'わる（い）', meaning: 'Bad' },
  { character: '安', grade: 3, reading: 'やす（い）', meaning: 'Cheap/Safe' },
  { character: '暗', grade: 3, reading: 'くら（い）', meaning: 'Dark' },
  { character: '医', grade: 3, reading: 'い', meaning: 'Doctor/Medicine' },
  { character: '委', grade: 3, reading: 'い', meaning: 'Committee' },
  { character: '意', grade: 3, reading: 'い', meaning: 'Mind/Meaning' },
  { character: '育', grade: 3, reading: 'いく', meaning: 'Nurture' },
  { character: '員', grade: 3, reading: 'いん', meaning: 'Member' },
  { character: '院', grade: 3, reading: 'いん', meaning: 'Institution' },
  { character: '飲', grade: 3, reading: 'の（む）', meaning: 'Drink' },
];

// Placeholders for 4-6 to demonstrate functionality
export const grade4Kanji: Kanji[] = [
  { character: '愛', grade: 4, reading: 'あい', meaning: 'Love' },
  { character: '案', grade: 4, reading: 'あん', meaning: 'Plan' },
  { character: '以', grade: 4, reading: 'い', meaning: 'By means of' },
  { character: '衣', grade: 4, reading: 'ころも', meaning: 'Clothes' },
  { character: '位', grade: 4, reading: 'くらい', meaning: 'Rank' },
];

export const grade5Kanji: Kanji[] = [
  { character: '圧', grade: 5, reading: 'あつ', meaning: 'Pressure' },
  { character: '移', grade: 5, reading: 'うつ（る）', meaning: 'Shift' },
  { character: '因', grade: 5, reading: 'いん', meaning: 'Cause' },
  { character: '永', grade: 5, reading: 'なが（い）', meaning: 'Eternal' },
  { character: '営', grade: 5, reading: 'えい', meaning: 'Manage' },
];

export const grade6Kanji: Kanji[] = [
  { character: '異', grade: 6, reading: 'こと', meaning: 'Uncommon' },
  { character: '遺', grade: 6, reading: 'い', meaning: 'Bequeath' },
  { character: '域', grade: 6, reading: 'いき', meaning: 'Region' },
  { character: '宇', grade: 6, reading: 'う', meaning: 'Eaves/Universe' },
  { character: '映', grade: 6, reading: 'えい', meaning: 'Reflect' },
];

export const getKanjiForGrade = (grade: number): Kanji[] => {
    switch (grade) {
        case 1: return grade1Kanji;
        case 2: return grade2Kanji;
        case 3: return grade3Kanji;
        case 4: return grade4Kanji;
        case 5: return grade5Kanji;
        case 6: return grade6Kanji;
        default: return grade1Kanji;
    }
};
