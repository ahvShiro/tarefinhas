import savedTheme from '@/config/bubble-theme.json'
import { FALLBACK_BUBBLE_THEME, validateBubbleTheme, type BubbleTheme } from './bubbleTheme'

/** The default theme of the homepage bubbles: the theme that the admin page saved in the project. */
export const DEFAULT_BUBBLE_THEME: BubbleTheme = validateBubbleTheme(savedTheme) ?? FALLBACK_BUBBLE_THEME
