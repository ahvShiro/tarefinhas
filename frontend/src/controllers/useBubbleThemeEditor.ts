import { useContext } from 'react'
import { BubbleThemeEditorContext, type BubbleThemeEditorValue } from './bubbleThemeEditorContext'

export function useBubbleThemeEditor(): BubbleThemeEditorValue {
  const value = useContext(BubbleThemeEditorContext)
  if (value === null) throw new Error('useBubbleThemeEditor must be used inside BubbleThemeEditorProvider')
  return value
}
