// Генерирует заглушки ассетов: тестовый PDF, мемы, обложки, ролики, музыку.
// Настоящие файлы просто кладутся поверх с теми же именами (или правится config.json).
// Запуск: npm run placeholders  (нужен ffmpeg; существующие файлы не перезаписываются без --force)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(root, 'public', 'assets');
const force = process.argv.includes('--force');

function out(rel) {
  const p = join(A, rel);
  mkdirSync(dirname(p), { recursive: true });
  return p;
}
function skip(p) {
  if (existsSync(p) && !force) {
    console.log('  есть, пропускаю:', p.replace(root + '/', ''));
    return true;
  }
  return false;
}
function ff(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
}

// ---------- PDF ----------
async function makePdf() {
  const p = out('presentation.pdf');
  if (skip(p)) return;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontsDir = '/System/Library/Fonts/Supplemental';
  const bold = await doc.embedFont(readFileSync(join(fontsDir, 'Arial Bold.ttf')), { subset: true });
  const reg = await doc.embedFont(readFileSync(join(fontsDir, 'Arial.ttf')), { subset: true });
  const W = 960, H = 540;
  const slides = [
    ['Мэтч', 'Знакомство с новой музыкой в Яндекс Музыке', 'Дипломный проект · тестовая презентация-заглушка'],
    ['Проблема', 'Люди слушают одно и то же', '73% времени — треки, которые уже знакомы'],
    ['Исследование', '24 интервью, 3 сегмента', 'Новое пугает, если непонятно, почему оно мне'],
    ['Инсайт', 'Знакомство, а не рекомендация', 'Трек должен «представиться», как человек'],
    ['Концепция', 'Карточки треков со свайпом', 'Вправо — мэтч, влево — мимо'],
    ['Сценарий', 'Утро · дорога · вечер', 'Разные волны под разное состояние'],
    ['Прототип', 'Три итерации', 'От бумаги до кликабельного прототипа'],
    ['Тестирование', '12 респондентов', 'Время до первого мэтча — 40 секунд'],
    ['Метрики', 'Доля новых треков в лайках', 'Цель: +15% за квартал'],
    ['Риски', 'Усталость от свайпов', 'Лимит карточек и мягкие напоминания'],
    ['Дорожная карта', 'MVP → пилот → запуск', 'Пилот на 5% аудитории'],
    ['Спасибо!', 'Любимая музыка ещё впереди', 'Вопросы комиссии'],
  ];
  const yellow = rgb(1, 0.86, 0.3);
  slides.forEach(([title, sub, note], i) => {
    const page = doc.addPage([W, H]);
    const dark = i % 2 === 0;
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: dark ? rgb(0.09, 0.09, 0.1) : rgb(0.97, 0.96, 0.93) });
    const fg = dark ? rgb(1, 1, 1) : rgb(0.08, 0.08, 0.08);
    page.drawRectangle({ x: 60, y: H - 90, width: 60, height: 8, color: yellow });
    page.drawText(title, { x: 60, y: H - 170, size: 64, font: bold, color: fg });
    page.drawText(sub, { x: 60, y: H - 230, size: 28, font: reg, color: fg });
    page.drawText(note, { x: 60, y: H - 275, size: 20, font: reg, color: dark ? rgb(0.7, 0.7, 0.7) : rgb(0.35, 0.35, 0.35) });
    // «обложка» справа внизу, чтобы было видно, где край слайда
    page.drawRectangle({ x: W - 300, y: 60, width: 240, height: 240, color: yellow, opacity: 0.9 });
    page.drawText(String(i + 1).padStart(2, '0'), { x: W - 270, y: 110, size: 120, font: bold, color: rgb(0.08, 0.08, 0.08) });
    page.drawText(`${i + 1} / ${slides.length}`, { x: 60, y: 40, size: 14, font: reg, color: dark ? rgb(0.6, 0.6, 0.6) : rgb(0.4, 0.4, 0.4) });
    page.drawText('ЗАГЛУШКА', { x: 60, y: 60, size: 12, font: bold, color: rgb(0.9, 0.3, 0.3) });
  });
  writeFileSync(p, await doc.save());
  console.log('  presentation.pdf');
}

// ---------- SVG-картинки ----------
function emojiSvg(emoji, label, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect x="8" y="8" width="240" height="240" fill="${bg}"/>
  <text x="128" y="150" font-size="130" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${emoji}</text>
  <rect x="8" y="198" width="240" height="50" fill="#111"/>
  <text x="128" y="232" font-size="26" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">${label}</text>
</svg>`;
}
const memes = [
  ['cat', '😹', 'Кот', '#ffdb4d'], ['fire', '🔥', 'Огонь', '#ff7a45'], ['clown', '🤡', 'Клоун', '#9b8cff'],
  ['skull', '💀', 'Умер', '#d9d9d9'], ['match', '😍', 'Мэтч', '#ff6fa3'], ['hundred', '💯', 'Сто', '#ff5a5a'],
  ['popcorn', '🍿', 'Попкорн', '#ffe9a8'], ['sus', '🤨', 'Хм', '#8fd3ff'], ['cry', '😭', 'Плачу', '#7fb2ff'],
  ['rocket', '🚀', 'Взлёт', '#a6f0c6'], ['goat', '🐐', 'Гоат', '#f0d7a6'], ['clap', '👏', 'Браво', '#ffd0a6'],
];
function makeImages() {
  for (const [id, e, label, bg] of memes) {
    const p = out(`memes/${id}.svg`);
    if (!skip(p)) writeFileSync(p, emojiSvg(e, label, bg));
  }
  const cover = out('cover.svg');
  if (!skip(cover)) {
    writeFileSync(cover, `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#ffdb4d"/><circle cx="128" cy="128" r="80" fill="#111"/><circle cx="128" cy="128" r="18" fill="#ffdb4d"/>
  <text x="128" y="240" font-size="22" font-weight="700" text-anchor="middle" fill="#111" font-family="Arial">МЭТЧ</text></svg>`);
  }
  const gColors = ['#6b4bff', '#ff4b8b', '#19c3a6', '#ffb020'];
  gColors.forEach((c, i) => {
    const p = out(`gacha/${i + 1}.svg`);
    if (!skip(p)) writeFileSync(p, `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${c}"/><circle cx="128" cy="118" r="70" fill="none" stroke="#fff" stroke-width="10"/>
  <circle cx="128" cy="118" r="30" fill="#fff"/><text x="128" y="236" font-size="24" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial">АЛИСА #${i + 1}</text></svg>`);
  });
}

// ---------- Видео (вертикальные 9:16) ----------
const videos = [
  ['subway', 'mandelbrot=s=360x640:rate=30'],
  ['carpet', 'life=s=360x640:mold=10:r=30:ratio=0.1:death_color=#202060:life_color=#ffdb4d'],
  ['detailing', 'testsrc2=s=360x640:r=30'],
  ['slime', 'cellauto=s=360x640:rule=110:r=30'],
];
function makeVideos() {
  for (const [id, src] of videos) {
    const p = out(`videos/${id}.mp4`);
    if (!skip(p)) {
      ff(['-f', 'lavfi', '-i', src, '-t', '12', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-movflags', '+faststart', '-an', p]);
      console.log('  videos/' + id + '.mp4');
    }
    const poster = out(`videos/${id}.jpg`);
    if (!skip(poster)) ff(['-ss', '2', '-i', p, '-frames:v', '1', '-q:v', '5', poster]);
  }
}

// ---------- Музыка (синтез через aevalsrc) ----------
const music = {
  'genres/cozy/music.mp3': '0.18*sin(2*PI*if(lt(mod(t,4),2),220,196)*t)*(0.7+0.3*sin(2*PI*0.5*t))+0.12*sin(2*PI*if(lt(mod(t,4),2),277.18,246.94)*t)+0.12*sin(2*PI*if(lt(mod(t,4),2),329.63,293.66)*t)',
  'genres/gothic/music.mp3': '0.3*sin(2*PI*55*t)+0.18*sin(2*PI*65.41*t)*(0.5+0.5*sin(2*PI*0.1*t))+0.08*sin(2*PI*110*t)*exp(-2*mod(t,4))',
  'genres/racing/music.mp3': '0.5*sin(2*PI*55*t)*lt(mod(t,0.25),0.12)+0.25*sin(2*PI*if(lt(mod(t,2),1),830,622)*t)*exp(-25*mod(t,0.5))',
  'genres/rave/music.mp3': '0.7*sin(2*PI*(50+120*exp(-30*mod(t,0.5)))*mod(t,0.5))*exp(-7*mod(t,0.5))+0.12*sin(2*PI*440*t)*gt(mod(t+0.25,0.5),0.4)',
  'genres/country/music.mp3': '0.35*sin(2*PI*if(eq(mod(floor(t/0.375),3),0),196,if(eq(mod(floor(t/0.375),3),1),246.94,293.66))*t)*exp(-6*mod(t,0.375))',
};
const gachaSongs = [
  '0.3*sin(2*PI*if(eq(mod(floor(t/0.3),4),0),523.25,if(eq(mod(floor(t/0.3),4),1),659.25,if(eq(mod(floor(t/0.3),4),2),783.99,659.25)))*t)*exp(-4*mod(t,0.3))',
  '0.3*sin(2*PI*if(eq(mod(floor(t/0.25),4),0),440,if(eq(mod(floor(t/0.25),4),1),554.37,if(eq(mod(floor(t/0.25),4),2),659.25,880)))*t)*exp(-5*mod(t,0.25))',
  '0.3*sin(2*PI*if(eq(mod(floor(t/0.4),3),0),392,if(eq(mod(floor(t/0.4),3),1),493.88,587.33))*t)*exp(-3*mod(t,0.4))+0.1*sin(2*PI*98*t)',
  '0.25*sin(2*PI*if(lt(mod(t,1),0.5),698.46,880)*t)*exp(-6*mod(t,0.5))+0.2*sin(2*PI*174.61*t)*(0.5+0.5*sin(2*PI*2*t))',
];
function tone(rel, expr, dur) {
  const p = out(rel);
  if (skip(p)) return;
  ff(['-f', 'lavfi', '-i', `aevalsrc='${expr}':s=44100:d=${dur}`, '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '96k', p]);
  console.log('  ' + rel);
}
function makeAudio() {
  for (const [rel, expr] of Object.entries(music)) tone(rel, expr, 24);
  gachaSongs.forEach((expr, i) => tone(`gacha/${i + 1}.mp3`, expr, 40));
}

console.log('Генерирую заглушки в public/assets …');
await makePdf();
makeImages();
makeVideos();
makeAudio();
console.log('Готово.');
