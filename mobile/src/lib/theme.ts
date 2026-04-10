export const colors = {
  primary: '#b91c1c',
  primaryDark: '#7f1d1d',
  primaryLight: '#fca5a5',
  primaryBg: '#fef2f2',

  accent: '#16a34a',
  accentLight: '#dcfce7',

  warning: '#d97706',
  warningLight: '#fef3c7',

  error: '#dc2626',
  errorLight: '#fee2e2',

  success: '#16a34a',
  successLight: '#dcfce7',

  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  textWhite: '#ffffff',

  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  bgTertiary: '#f3f4f6',

  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  shadowColor: '#000',
};

export const gradients = {
  header: [colors.primary, colors.primaryDark] as [string, string],
  card: ['#ffffff', '#fafafa'] as [string, string],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
};
