export const GAME_TYPES = {
  CLASSIFICATION: 'classification',
  ORDERING: 'ordering',
  WRITTEN_ANSWER: 'written_answer'
};

export const STORY_THEMES = [
  'مدينة مستقبلية',
  'عالم خيالي',
  'رحلة فضائية',
  'لغز بوليسي'
];

export const EXPERIENCE_MODES = {
  CLASSIC: 'classic',
  PORTAL_REALMS: 'portal_realms'
};

export const REALM_WORLDS = [
  {
    id: 'maze',
    name: 'متاهة المعرفة',
    subtitle: 'Knowledge Maze',
    icon: '🌀',
    description: 'تحكم بشخصية "حارس النور" للوصول إلى بوابات الإجابة الصحيحة واجتياز العقبات الأركيدية.',
    badge: 'تحدي الحركة والاستكشاف',
    status: 'unlocked',
    colorTheme: 'from-purple-900/60 to-indigo-900/60 border-purple-500/50'
  },
  {
    id: 'sky_islands',
    name: 'جزر السماء',
    subtitle: 'Sky Islands',
    icon: '☁️',
    description: 'اقفز بين الجزر والمنصات التفاعلية الممثلة للإجابات للوصول إلى القمة المعرفية.',
    badge: 'تحدي المنصات التفاعلية',
    status: 'unlocked',
    colorTheme: 'from-blue-900/60 to-sky-900/60 border-sky-500/50'
  },
  {
    id: 'cosmic_racer',
    name: 'سباق المجرات',
    subtitle: 'Cosmic Racer',
    icon: '🏎️',
    description: 'اندفع بمركبتك النفاثة وانتقل بين مسارات الإجابة الصحيحة بأعلى سرعة لتجميع المضاعفات.',
    badge: 'تحدي السرعة والمسارات',
    status: 'unlocked',
    colorTheme: 'from-amber-900/60 to-orange-900/60 border-amber-500/50'
  },
  {
    id: 'ninja_guardian',
    name: 'نينجا المعرفة',
    subtitle: 'Ninja Knowledge',
    icon: '🥷',
    description: 'تحدّ بالسيف الأركيدي واقطع خيار الإجابة الصحيح بمهارة كنينجا المعرفة!',
    badge: 'تحدي السيف والسرعة',
    status: 'unlocked',
    colorTheme: 'from-amber-900/60 to-yellow-900/60 border-amber-500/50'
  }
];


