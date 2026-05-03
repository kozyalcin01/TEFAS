export const colors = {
  bg: {
    primary: '#0A0A0A',
    secondary: '#141414',
    tertiary: '#1E1E1E',
    card: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    input: 'rgba(255, 255, 255, 0.07)',
  },
  positive: '#00C896',
  positiveLight: 'rgba(0, 200, 150, 0.15)',
  negative: '#FF4757',
  negativeLight: 'rgba(255, 71, 87, 0.15)',
  neutral: '#8892A4',
  accent: '#4C6EF5',
  accentLight: 'rgba(76, 110, 245, 0.15)',
  text: {
    primary: '#FFFFFF',
    secondary: '#8892A4',
    tertiary: '#4A5568',
    inverse: '#0A0A0A',
  },
  chart: ['#4C6EF5', '#00C896', '#FFB347', '#FF6B9D', '#A78BFA', '#38BDF8'],
  border: 'rgba(255, 255, 255, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  hero: {
    fontSize: 40,
    fontWeight: '700' as const,
    letterSpacing: -1.5,
    color: colors.text.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.text.secondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
    color: colors.text.secondary,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    color: colors.text.primary,
  },
};
