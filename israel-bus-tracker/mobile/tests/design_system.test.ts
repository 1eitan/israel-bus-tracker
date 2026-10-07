import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { AA_LARGE, AA_NORMAL, contrastRatio, readableTextOn, withAlpha } from '../src/theme/contrast';
import { colors, fonts, MAX_FONT_SCALE, radius, space, TOUCH_TARGET, typography } from '../src/theme/tokens';

const COMPONENTS = join(__dirname, '..', '..', 'src', 'components');
const files = readdirSync(COMPONENTS).filter((f) => f.endsWith('.tsx'));
const read = (f: string) => readFileSync(join(COMPONENTS, f), 'utf8');

describe('tokens', () => {
  it('צבעי הבסיס לפי המפרט', () => {
    assert.equal(colors.background, '#111111');
    assert.equal(colors.surface, '#1E1E1E');
    assert.equal(colors.primary, '#2B4ACB');
    assert.equal(colors.text, '#FFFFFF');
    assert.equal(colors.textSecondary, '#A0A0A0');
    assert.equal(colors.success, '#4CAF50');
    assert.equal(colors.warning, '#FFC107');
    assert.equal(colors.border, '#2C2C2C');
  });

  it('ריווח בסיס 4px', () => {
    assert.equal(space(1), 4);
    assert.equal(space(4), 16);
    assert.equal(space(0.5), 2);
  });

  it('רדיוסים: card 12, button 12, pill 9999', () => {
    assert.equal(radius.card, 12);
    assert.equal(radius.button, 12);
    assert.equal(radius.pill, 9999);
    assert.equal(radius.md, radius.card);
    assert.equal(radius.full, radius.pill);
  });

  it('touch target 44 ותקרת font scaling סבירה', () => {
    assert.equal(TOUCH_TARGET, 44);
    assert.ok(MAX_FONT_SCALE >= 1.2 && MAX_FONT_SCALE <= 1.5);
  });

  it('כל וריאנטי הטיפוגרפיה הנדרשים קיימים, בפונט Heebo, עם lineHeight >= fontSize', () => {
    for (const v of ['title', 'heading', 'body', 'caption', 'button', 'tab', 'navigation'] as const) {
      assert.ok(typography[v], `חסר ${v}`);
    }
    const heebo = new Set<string>(Object.values(fonts));
    for (const [name, t] of Object.entries(typography)) {
      assert.ok(heebo.has(t.fontFamily), `${name}: פונט לא Heebo`);
      assert.ok(t.lineHeight >= t.fontSize, `${name}: lineHeight קטן מ-fontSize`);
    }
  });

  it('אין טקסט קטן מ-12px', () => {
    for (const [name, t] of Object.entries(typography)) {
      assert.ok(t.fontSize >= 12, `${name}: ${t.fontSize}px`);
    }
  });
});

describe('ניגודיות (WCAG AA)', () => {
  const textOn = (fg: string, bg: string, min: number, label: string) => {
    const r = contrastRatio(fg, bg);
    assert.ok(r !== null && r >= min, `${label}: ${r?.toFixed(2)} < ${min}`);
  };

  it('טקסט ראשי ומשני על background / surface / surfaceElevated', () => {
    for (const bg of [colors.background, colors.surface, colors.surfaceElevated]) {
      textOn(colors.text, bg, AA_NORMAL, `text/${bg}`);
      textOn(colors.textSecondary, bg, AA_NORMAL, `textSecondary/${bg}`);
    }
  });

  it('טקסט/אייקון בצבע מותג וסטטוס על surface', () => {
    for (const [name, c] of [
      ['primaryText', colors.primaryText],
      ['success', colors.success],
      ['warning', colors.warning],
      ['danger', colors.danger],
      ['info', colors.info]
    ] as const) {
      textOn(c, colors.surface, AA_NORMAL, `${name}/surface`);
      textOn(c, colors.background, AA_NORMAL, `${name}/background`);
    }
  });

  it('טקסט לבן על כפתור primary (ורמת pressed)', () => {
    textOn(colors.onPrimary, colors.primary, AA_NORMAL, 'onPrimary/primary');
    textOn(colors.onPrimary, colors.primaryPressed, AA_NORMAL, 'onPrimary/primaryPressed');
  });

  it('תגי סטטוס: טקסט צבעוני על רקע soft מעל surface', () => {
    // הרקעים ה-soft שקופים; מחשבים מול הגרוע ביותר: surfaceElevated
    for (const c of [colors.success, colors.warning, colors.danger, colors.info, colors.primaryText]) {
      textOn(c, colors.surfaceElevated, AA_NORMAL, `${c}/surfaceElevated`);
    }
  });

  it('מצב Toggle כבוי: הידית מובחנת מהמסלול (רכיב UI, 3:1)', () => {
    textOn(colors.textSecondary, colors.controlOff, AA_LARGE, 'thumb/controlOff');
    textOn(colors.onPrimary, colors.primary, AA_LARGE, 'thumb/primary');
  });

  it('readableTextOn בוחר לבן על כהה וכהה על בהיר', () => {
    assert.equal(readableTextOn('#2B4ACB'), colors.onPrimary);
    assert.equal(readableTextOn('#FFC107'), colors.background);
    assert.equal(readableTextOn('#FFFFFF'), colors.background);
    assert.equal(readableTextOn('#000000'), colors.onPrimary);
  });

  it('readableTextOn: צבע לא תקין חוזר לברירת המחדל, ותמיד עומד ב-AA לגדול', () => {
    assert.equal(readableTextOn('not-a-color'), colors.onPrimary);
    for (const bg of ['#E53935', '#43A047', '#1E88E5', '#FDD835', '#8E24AA', '#FB8C00', '#00ACC1']) {
      textOn(readableTextOn(bg), bg, AA_LARGE, `badge ${bg}`);
    }
  });

  it('withAlpha / contrastRatio: קלט לא תקין לא זורק', () => {
    assert.equal(withAlpha('zzz', 0.5), null);
    assert.equal(withAlpha('#FF0000', 2), 'rgba(255, 0, 0, 1)');
    assert.equal(withAlpha('#fff', 0.16), 'rgba(255, 255, 255, 0.16)');
    assert.equal(contrastRatio('#fff', 'nope'), null);
    assert.equal(contrastRatio('#000000', '#FFFFFF')?.toFixed(0), '21');
  });
});

describe('רכיבים - אכיפה סטטית', () => {
  it('כל רכיבי ה-Design System הנדרשים קיימים', () => {
    for (const name of [
      'Screen', 'ScreenHeader', 'BottomNavBar', 'PrimaryButton', 'SecondaryButton', 'SearchInput',
      'RouteCard', 'StationCard', 'LineBadge', 'ArrivalBadge', 'StatusBadge', 'EmptyState',
      'ErrorState', 'LoadingSkeleton', 'Divider', 'Modal', 'BottomSheet', 'IconButton', 'Chip',
      'Toggle', 'SectionHeader'
    ]) {
      assert.ok(files.includes(`${name}.tsx`), `חסר ${name}.tsx`);
    }
  });

  it('אין צבעי hex/rgba קשיחים ברכיבים (רק tokens)', () => {
    for (const f of files) {
      const hits = read(f).match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g);
      assert.equal(hits, null, `${f}: ${hits?.join(', ')}`);
    }
  });

  it('RTL: אין left/right/marginLeft/paddingLeft/textAlign פיזיים ברכיבים (פרט למפה ול-banner המפורשים)', () => {
    const allowed = new Set(['BusMap.tsx', 'OfflineBanner.tsx']);
    const bad = /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft\w*|borderRight\w*)\b|textAlign: *'(left|right)'|flexDirection: *'row-reverse'/;
    for (const f of files) {
      if (allowed.has(f)) continue;
      assert.ok(!bad.test(read(f)), `${f}: שימוש בכיוון פיזי`);
    }
  });

  it('לחיצים: אין Pressable/TouchableOpacity גולמי מחוץ ל-PressableScale ול-Modal', () => {
    for (const f of files) {
      if (f === 'PressableScale.tsx' || f === 'Modal.tsx') continue;
      assert.ok(!/<Pressable\b|<TouchableOpacity\b|<TouchableWithoutFeedback\b/.test(read(f)), f);
    }
  });

  it('PressableScale שמקבל onPress מוגדר עם accessibilityRole', () => {
    for (const f of files) {
      const src = read(f);
      const blocks = src.match(/<PressableScale[\s\S]*?>/g) ?? [];
      for (const b of blocks) {
        if (!/onPress/.test(b)) continue;
        assert.ok(/accessibilityRole/.test(b), `${f}: PressableScale בלי accessibilityRole`);
      }
    }
  });

  it('אזורי מגע: IconButton/Chip/Toggle משתמשים ב-TOUCH_TARGET', () => {
    for (const f of ['IconButton.tsx', 'Chip.tsx', 'Toggle.tsx']) {
      assert.ok(/TOUCH_TARGET/.test(read(f)), `${f} בלי TOUCH_TARGET`);
    }
  });

  it('IconButton דורש accessibilityLabel (טיפוס חובה)', () => {
    assert.ok(/\n  accessibilityLabel: string;/.test(read('IconButton.tsx')));
    assert.ok(/\n  accessibilityLabel: string;/.test(read('Toggle.tsx')));
  });

  it('AppText מכבד font scaling עם תקרה מה-tokens', () => {
    const src = read('AppText.tsx');
    assert.ok(src.includes('MAX_FONT_SCALE'));
    assert.ok(!/allowFontScaling=\{false\}|allowFontScaling: *false/.test(src));
    for (const f of files) {
      assert.ok(!/allowFontScaling=\{false\}/.test(read(f)), `${f}: font scaling כבוי`);
    }
  });

  it('כפתורים משתמשים ב-radius.button ובווריאנט button', () => {
    for (const f of ['PrimaryButton.tsx', 'SecondaryButton.tsx']) {
      const src = read(f);
      assert.ok(src.includes('radius.button') && src.includes('variant="button"'), f);
    }
  });

  it('ה-Skeleton מכבד reduce-motion; Divider ו-skeleton מוסתרים מקורא מסך', () => {
    assert.ok(read('LoadingSkeleton.tsx').includes('useReducedMotion'));
    assert.ok(read('Divider.tsx').includes('importantForAccessibility'));
  });
});
