import type { CSSProperties } from 'react';

export const colors = {
  brand: '#003DA5',
  brandHover: '#002d7a',
  brandLight: 'rgba(0,61,165,0.08)',

  border: '#D1D5DB',
  borderLight: '#E5E7EB',
  borderFocus: '#003DA5',

  text: '#1F2937',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textPlaceholder: '#9CA3AF',

  icon: '#9CA3AF',
  iconHover: '#6B7280',

  bgWhite: '#FFFFFF',
  bgHover: '#F9FAFB',
  bgMuted: '#F3F4F6',
  bgSubtle: '#FAFAFA',
} as const;

export const radius = {
  interactive: '10px',
  container: '12px',
  badge: '4px',
  check: '6px',
  inner: '8px',
} as const;

export const sizes = {
  inputHeight: '40px',
  iconInput: '18px',
  iconAction: '16px',
  iconContainer: '40px',
  clearButton: '34px',
} as const;

export const typography = {
  input: '15px',
  label: '14px',
  button: '14px',
  badge: '12px',
} as const;

export const searchContainerStyle: CSSProperties = {
  height: sizes.inputHeight,
  borderRadius: radius.interactive,
  border: `1px solid ${colors.border}`,
};

export const searchIconWrapStyle: CSSProperties = {
  width: sizes.iconContainer,
};

export const searchIconStyle: CSSProperties = {
  width: sizes.iconInput,
  height: sizes.iconInput,
  color: colors.icon,
};

export const searchInputStyle: CSSProperties = {
  fontSize: typography.input,
  color: colors.text,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  height: '100%',
  width: '100%',
  padding: '0 10px 0 0',
};

export const clearButtonStyle: CSSProperties = {
  width: sizes.clearButton,
  height: sizes.clearButton,
  borderRadius: radius.inner,
  marginRight: '2px',
};

export const clearIconStyle: CSSProperties = {
  width: sizes.iconAction,
  height: sizes.iconAction,
  color: colors.icon,
};

export const selectStyle: CSSProperties = {
  height: sizes.inputHeight,
  fontSize: typography.input,
  borderRadius: radius.interactive,
  border: `1px solid ${colors.border}`,
  paddingLeft: '10px',
  paddingRight: '28px',
  outline: 'none',
  color: colors.textSecondary,
};

export const textInputStyle: CSSProperties = {
  width: '100%',
  height: sizes.inputHeight,
  fontSize: typography.input,
  borderRadius: radius.interactive,
  border: `1px solid ${colors.border}`,
  paddingLeft: '10px',
  paddingRight: '10px',
  outline: 'none',
  color: colors.text,
};

export const dateInputStyle: CSSProperties = {
  ...textInputStyle,
  color: colors.textSecondary,
};

export const outlineButtonStyle: CSSProperties = {
  height: sizes.inputHeight,
  fontSize: typography.input,
  borderRadius: radius.interactive,
  border: `1px solid ${colors.border}`,
  paddingLeft: '14px',
  paddingRight: '14px',
  color: colors.textSecondary,
  backgroundColor: colors.bgWhite,
};

export const primaryButtonStyle: CSSProperties = {
  height: sizes.inputHeight,
  fontSize: typography.input,
  borderRadius: radius.interactive,
  border: 'none',
  paddingLeft: '14px',
  paddingRight: '14px',
  color: '#FFFFFF',
  backgroundColor: colors.brand,
};

export const filterBarContainerStyle: CSSProperties = {
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  borderRadius: radius.container,
  padding: '10px 14px',
};

export const fieldLabelStyle: CSSProperties = {
  fontSize: typography.label,
  color: colors.textSecondary,
};

export const searchContainerClass =
  'flex items-center bg-white transition-all focus-within:border-[#003DA5] focus-within:shadow-[0_0_0_3px_rgba(0,61,165,0.08)]';

export const searchIconWrapClass =
  'flex items-center justify-center flex-shrink-0 pointer-events-none';

export const clearButtonClass =
  'flex items-center justify-center flex-shrink-0 hover:bg-gray-100 transition-colors';

export const selectClass =
  'bg-white cursor-pointer font-medium transition-all hover:border-[#003DA5]';

