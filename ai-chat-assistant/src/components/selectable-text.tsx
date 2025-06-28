/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useRef, ReactNode } from 'react'

interface SelectableTextProps {
  children: ReactNode
  onTextSelect: (text: string, position: { x: number; y: number }) => void
  className?: string
}

export const SelectableText = ({ children, onTextSelect, className = '' }: SelectableTextProps) => {
  const textRef = useRef<HTMLDivElement>(null)

  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection()
    
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim()
      
      // Only proceed if selection is meaningful (more than just whitespace)
      if (selectedText.length < 2) {
        selection.removeAllRanges()
        return
      }
      
      // Get the position of the selection
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      // Calculate position relative to viewport
      const position = {
        x: rect.right + 10,
        y: rect.top + window.scrollY
      }
      
      // Call the parent handler
      onTextSelect(selectedText, position)
      
      // Clear selection after a brief delay to show what was selected
      setTimeout(() => {
        if (window.getSelection()) {
          window.getSelection()?.removeAllRanges()
        }
      }, 150)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow text selection by preventing drag behavior on mousedown
    e.stopPropagation()
  }

  return (
    <div
      ref={textRef}
      className={`select-text cursor-text ${className}`}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
      style={{ 
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text'
      }}
    >
      {children}
    </div>
  )
}