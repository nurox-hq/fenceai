/**
 * FENCEAI — базовая палитра:
 *  - baseWhite:   #FFFFFF
 *  - baseBlack:   #000000
 *  - accentLime:  #CDFF07
 *  - accentBlue:  #69C5F8
 *  - softGray:    #F1F4F9
 */
const baseWhite = '#FFFFFF';
const baseBlack = '#000000';
const accentLime = '#CDFF07';
const accentBlue = '#69C5F8';
const softGray = '#F1F4F9';
const tintColorDark = accentBlue;

/** Таббар и активный фильтр */
const tabBarBg = baseBlack;
const tabBarIconActive = accentLime;
const tabBarIconInactive = baseWhite;
/** Фон главной (светлый серый) */
const homeBackgroundLight = softGray;
const homeBackgroundDark = '#0f1a12';

export default {
  light: {
    text: baseBlack,
    textSecondary: '#313642',
    background: baseWhite,
    homeBackground: homeBackgroundLight,
    surface: baseWhite,
    surfaceElevated: baseWhite,
    tint: accentBlue,
    accent: accentLime,
    accentMuted: softGray,
    tabIconDefault: '#9ca39e',
    tabIconSelected: accentBlue,
    tabBarBg,
    tabBarIconActive,
    tabBarIconInactive,
    filterActiveBg: tabBarBg,
    border: softGray,
    success: accentLime,
    cardBg: baseWhite,
    heroOverlay: 'rgba(0,0,0,0.25)',
    heroCardOverlay: 'rgba(45,90,69,0.94)',
  },
  dark: {
    text: '#f0f2f0',
    textSecondary: '#b0b5b0',
    background: '#121412',
    homeBackground: homeBackgroundDark,
    surface: '#1c1f1c',
    surfaceElevated: '#252825',
    tint: tintColorDark,
    accent: '#d4b84a',
    accentMuted: '#5c5220',
    tabIconDefault: '#6b716b',
    tabIconSelected: tintColorDark,
    tabBarBg,
    tabBarIconActive,
    tabBarIconInactive,
    filterActiveBg: tabBarBg,
    border: '#2d312d',
    success: '#6bb892',
    cardBg: '#1c1f1c',
    heroOverlay: 'rgba(0,0,0,0.5)',
    heroCardOverlay: 'rgba(107,184,146,0.88)',
  },
};
