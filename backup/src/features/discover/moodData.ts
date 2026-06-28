export type Mood = 'happy' | 'calm' | 'sad';

export interface MoodConfig {
  id: Mood;
  label: string;
  icon: string;
  theme: string;
  tags: string[];
  bgImage: string;
  gradient: string;
}

export const MOOD_CONFIGS: Record<Mood, MoodConfig> = {
  happy: {
    id: 'happy',
    label: '开心',
    icon: '/happy.svg',
    theme: 'mood-happy',
    tags: ['欢快', '流行', '舞曲', '开心', '阳光'],
    bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200',
    gradient: 'from-sky-400/40 via-cyan-300/25 to-blue-400/30',
  },
  calm: {
    id: 'calm',
    label: '平静',
    icon: '/normal.svg',
    theme: 'mood-calm',
    tags: ['治愈', '民谣', '下午茶', '轻音乐', '安静'],
    bgImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200',
    gradient: 'from-emerald-600/40 via-green-500/25 to-teal-500/30',
  },
  sad: {
    id: 'sad',
    label: '伤心',
    icon: '/sad.svg',
    theme: 'mood-sad',
    tags: ['伤感', '夜晚', '怀旧', '忧郁', '慢歌'],
    bgImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200',
    gradient: 'from-blue-800/50 via-indigo-700/30 to-slate-800/40',
  },
};

export const MOOD_PHRASES: Record<Mood, string[]> = {
  happy: [
    '开心的一天从欢快的音乐开始',
    '让音符跳起来，今天值得被快乐包围',
    '好心情需要好音乐来配',
    '张开双臂，拥抱旋律中的阳光',
    '每一拍都是快乐的理由',
    '让节奏带着你起飞',
    '今天不emo，今天只想high',
    '快乐不需要理由，音乐就是答案',
    '嘴角上扬的弧度，是音乐给的',
  ],
  calm: [
    '让心情慢下来，听一首刚刚好的歌',
    '安静的时光适合一首好歌',
    '给自己一杯茶的时间，和音乐独处',
    '风很轻，云很淡，歌很暖',
    '世界很吵，戴上耳机就安静了',
    '慢下来的每一秒，都值得被温柔对待',
    '闭上眼，让旋律带你去远方',
    '此刻的宁静，是最好的礼物',
  ],
  sad: [
    '让音乐陪你度过这段时光',
    '每段低谷都会过去，音乐会陪你',
    '把心事交给旋律，让它替你诉说',
    '难过的时候，歌单是最好的朋友',
    '眼泪和旋律，都是情绪的出口',
    '深夜的歌，唱给懂的人听',
    '允许自己难过，也允许自己被治愈',
    '这首歌，送给此刻的你',
  ],
};

export function getTodaysPhrase(mood: Mood): string {
  const phrases = MOOD_PHRASES[mood];
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return phrases[dayOfYear % phrases.length];
}

export function getTodaysTag(mood: Mood): string {
  const tags = MOOD_CONFIGS[mood].tags;
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return tags[dayOfYear % tags.length];
}
