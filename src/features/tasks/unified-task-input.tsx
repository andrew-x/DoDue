import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { registerLexicalTextEntity } from '@lexical/text'
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  type EditorConfig,
  type EditorState,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type RangeSelection,
  type SerializedTextNode,
  TextNode,
} from 'lexical'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  classifyTaskInputTokenText,
  getTaskInputTokenMatch,
  type TaskInputTokenKind,
} from '@/features/tasks/task-input-parser'
import {
  isTaskPriority,
  taskPriorityClassNames,
} from '@/features/tasks/task-priority'
import { getTagSuggestions } from '@/lib/tags'
import { cn } from '@/lib/utils'

const tokenClassNames = {
  doDate: 'task-input-token--do-date',
  dueDate: 'task-input-token--due-date',
  priority: 'task-input-token--priority',
  tag: 'task-input-token--tag',
} satisfies Record<TaskInputTokenKind, string>

const tagSuggestionPopoverGap = 6
const tagSuggestionPopoverGutter = 8
const tagSuggestionPopoverMinWidth = 176
const tagSuggestionPopoverWidth = 224

export function UnifiedTaskInput({
  className,
  focusRequestKey = null,
  initialValue = '',
  onChange,
  onFocusRequestComplete,
  onSubmit,
  rememberedTags = [],
}: {
  className?: string
  focusRequestKey?: number | null
  initialValue?: string
  onChange: (value: string) => void
  onFocusRequestComplete?: () => void
  onSubmit: () => void
  rememberedTags?: string[]
}) {
  const initialValueRef = useRef(initialValue)
  const initialConfig = useMemo(
    () => getTaskInputEditorConfig(initialValueRef.current),
    [],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative">
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              autoCapitalize="none"
              autoCorrect="off"
              ariaLabel="Task title"
              className={cn(
                className,
                'task-input-editor min-h-10 whitespace-pre-wrap break-words',
              )}
              spellCheck={false}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
          placeholder={
            <div className="pointer-events-none absolute top-2 left-3 text-muted-foreground text-sm">
              Task title, #tag, p1, due tomorrow
            </div>
          }
        />
        <TaskInputTokenPlugin />
        <TaskInputChangePlugin onChange={onChange} />
        <TaskInputTagSuggestionsPlugin rememberedTags={rememberedTags} />
        <TaskInputSubmitPlugin onSubmit={onSubmit} />
        <TaskInputFocusPlugin
          focusRequestKey={focusRequestKey}
          onFocusRequestComplete={onFocusRequestComplete}
        />
        <HistoryPlugin />
      </div>
    </LexicalComposer>
  )
}

function getTaskInputEditorConfig(initialValue: string) {
  return {
    ...taskInputEditorConfig,
    ...(initialValue
      ? {
          editorState: () => {
            const root = $getRoot()
            const paragraph = $createParagraphNode()
            const textNode = $createTextNode(initialValue)

            paragraph.append(textNode)
            root.clear()
            root.append(paragraph)
          },
        }
      : {}),
  }
}

class TaskInputTokenNode extends TextNode {
  static override getType() {
    return 'task-input-token'
  }

  static override clone(node: TaskInputTokenNode) {
    return new TaskInputTokenNode(node.__text, node.__key)
  }

  static override importJSON(serializedNode: SerializedTextNode) {
    return $createTaskInputTokenNode().updateFromJSON(serializedNode)
  }

  override createDOM(config: EditorConfig) {
    const element = super.createDOM(config)
    updateTokenElement(element, this.getTextContent())

    return element
  }

  override updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig) {
    const shouldUpdate = super.updateDOM(prevNode, dom, config)
    updateTokenElement(dom, this.getTextContent())

    return shouldUpdate
  }

  override canInsertTextBefore() {
    return false
  }

  override isTextEntity() {
    return true
  }
}

const taskInputEditorConfig = {
  namespace: 'TaskInput',
  nodes: [TaskInputTokenNode],
  onError(error: Error) {
    throw error
  },
}

function $createTaskInputTokenNode(text = '') {
  return $applyNodeReplacement(new TaskInputTokenNode(text))
}

function TaskInputTokenPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const unregisters = registerLexicalTextEntity(
      editor,
      getTaskInputTokenMatch,
      TaskInputTokenNode,
      (textNode) => $createTaskInputTokenNode(textNode.getTextContent()),
    )

    return () => {
      for (const unregister of unregisters) {
        unregister()
      }
    }
  }, [editor])

  return null
}

function TaskInputChangePlugin({
  onChange,
}: {
  onChange: (value: string) => void
}) {
  function handleChange(editorState: EditorState) {
    editorState.read(() => {
      onChange($getRoot().getTextContent().replace(/\s+/g, ' ').trimStart())
    })
  }

  return <OnChangePlugin ignoreSelectionChange onChange={handleChange} />
}

type TagDraftRange = {
  end: number
  start: number
}

type TagDraftCaret = {
  key: string
  offset: number
}

type TagSuggestionAnchor = {
  left: number
  top: number
  width: number
}

type TagSuggestionState = {
  activeIndex: number
  anchor: TagSuggestionAnchor
  draft: string
  range: TagDraftRange
  suggestions: string[]
}

function TaskInputTagSuggestionsPlugin({
  rememberedTags,
}: {
  rememberedTags: string[]
}) {
  const [editor] = useLexicalComposerContext()
  const [suggestionState, setSuggestionState] =
    useState<TagSuggestionState | null>(null)
  const visibleSuggestions = suggestionState?.suggestions ?? []
  const activeIndex = suggestionState
    ? Math.min(suggestionState.activeIndex, visibleSuggestions.length - 1)
    : 0

  const refreshSuggestions = useCallback(() => {
    editor.getEditorState().read(() => {
      const tagDraft = getActiveTagDraft()

      if (!tagDraft) {
        setSuggestionState(null)
        return
      }

      const suggestions = getTagSuggestions({
        draft: tagDraft.draft,
        rememberedTags,
      })

      if (suggestions.length === 0) {
        setSuggestionState(null)
        return
      }

      const anchor = getTagSuggestionAnchor(editor, tagDraft.caret)

      if (!anchor) {
        setSuggestionState(null)
        return
      }

      setSuggestionState((currentState) => ({
        activeIndex:
          currentState?.draft === tagDraft.draft
            ? Math.min(currentState.activeIndex, suggestions.length - 1)
            : 0,
        anchor,
        draft: tagDraft.draft,
        range: tagDraft.range,
        suggestions,
      }))
    })
  }, [editor, rememberedTags])

  const commitSuggestion = useCallback(
    (suggestion: string | undefined) => {
      if (!suggestion || !suggestionState) {
        return false
      }

      editor.update(() => {
        replaceTagDraftWithSuggestion(suggestionState.range, suggestion)
      })
      setSuggestionState(null)
      return true
    },
    [editor, suggestionState],
  )

  useEffect(
    () =>
      editor.registerUpdateListener(() => {
        refreshSuggestions()
      }),
    [editor, refreshSuggestions],
  )

  useEffect(() => {
    refreshSuggestions()
  }, [refreshSuggestions])

  useEffect(
    () =>
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          if (visibleSuggestions.length === 0) {
            return false
          }

          event?.preventDefault()
          setSuggestionState((currentState) =>
            currentState
              ? {
                  ...currentState,
                  activeIndex:
                    currentState.activeIndex >= visibleSuggestions.length - 1
                      ? 0
                      : currentState.activeIndex + 1,
                }
              : currentState,
          )
          return true
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    [editor, visibleSuggestions.length],
  )

  useEffect(
    () =>
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          if (visibleSuggestions.length === 0) {
            return false
          }

          event?.preventDefault()
          setSuggestionState((currentState) =>
            currentState
              ? {
                  ...currentState,
                  activeIndex:
                    currentState.activeIndex <= 0
                      ? visibleSuggestions.length - 1
                      : currentState.activeIndex - 1,
                }
              : currentState,
          )
          return true
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    [editor, visibleSuggestions.length],
  )

  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (visibleSuggestions.length === 0) {
            return false
          }

          event?.preventDefault()
          return commitSuggestion(visibleSuggestions[activeIndex])
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    [activeIndex, commitSuggestion, editor, visibleSuggestions],
  )

  useEffect(
    () =>
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          if (visibleSuggestions.length === 0) {
            return false
          }

          event?.preventDefault()
          return commitSuggestion(visibleSuggestions[activeIndex])
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    [activeIndex, commitSuggestion, editor, visibleSuggestions],
  )

  useEffect(
    () =>
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event) => {
          if (visibleSuggestions.length === 0) {
            return false
          }

          event?.preventDefault()
          setSuggestionState(null)
          return true
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    [editor, visibleSuggestions.length],
  )

  if (visibleSuggestions.length === 0) {
    return null
  }

  const anchor = suggestionState?.anchor

  if (!anchor) {
    return null
  }

  return (
    <div
      className="absolute z-30 max-h-52 overflow-y-auto rounded-md border border-border/80 bg-popover py-1 text-popover-foreground shadow-xl"
      style={{
        left: `${anchor.left}px`,
        top: `${anchor.top}px`,
        width: `${anchor.width}px`,
      }}
    >
      {visibleSuggestions.map((suggestion, index) => (
        <button
          className={cn(
            'flex w-full min-w-0 items-center px-2.5 py-1.5 text-left text-xs transition hover:bg-secondary/70',
            index === activeIndex && 'bg-secondary/70',
          )}
          key={suggestion}
          onMouseDown={(event) => {
            event.preventDefault()
            commitSuggestion(suggestion)
          }}
          type="button"
        >
          <span className="truncate">#{suggestion}</span>
        </button>
      ))}
    </div>
  )
}

function TaskInputSubmitPlugin({ onSubmit }: { onSubmit: () => void }) {
  const [editor] = useLexicalComposerContext()

  // HIGH must stay below the suggestion plugin's CRITICAL Enter handler so
  // accepting a tag suggestion does not also submit the form.
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          event?.preventDefault()
          onSubmit()

          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor, onSubmit],
  )

  return null
}

function TaskInputFocusPlugin({
  focusRequestKey,
  onFocusRequestComplete,
}: {
  focusRequestKey: number | null
  onFocusRequestComplete: (() => void) | undefined
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (focusRequestKey === null) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      editor.focus(() => {
        $getRoot().selectEnd()
      })
      onFocusRequestComplete?.()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [editor, focusRequestKey, onFocusRequestComplete])

  return null
}

function getActiveTagDraft() {
  const selection = $getSelection()

  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null
  }

  const text = $getRoot().getTextContent()
  const caretOffset = getCollapsedSelectionTextOffset(selection)

  if (caretOffset === null) {
    return null
  }

  const match = text
    .slice(0, caretOffset)
    .match(/(^|[\s([{["'])#([A-Za-z0-9_-]{0,64})$/)

  if (!match) {
    return null
  }

  const draft = match[2] ?? ''
  const start = caretOffset - draft.length - 1

  return {
    caret: {
      key: selection.anchor.key,
      offset: selection.anchor.offset,
    },
    draft,
    range: {
      end: caretOffset,
      start,
    },
  }
}

function getCollapsedSelectionTextOffset(selection: RangeSelection) {
  const anchorKey = selection.anchor.key
  let textOffset = 0

  for (const textNode of $getRoot().getAllTextNodes()) {
    if (textNode.getKey() === anchorKey) {
      return textOffset + selection.anchor.offset
    }

    textOffset += textNode.getTextContentSize()
  }

  return null
}

function getTagSuggestionAnchor(
  editor: LexicalEditor,
  caret: TagDraftCaret,
): TagSuggestionAnchor | null {
  const rootElement = editor.getRootElement()
  const wrapperElement = rootElement?.parentElement

  if (!rootElement || !wrapperElement) {
    return null
  }

  const rootRect = rootElement.getBoundingClientRect()
  const wrapperRect = wrapperElement.getBoundingClientRect()
  const caretRect = getCaretClientRect(editor, caret) ?? rootRect
  const availableWidth = Math.max(
    0,
    wrapperRect.width - tagSuggestionPopoverGutter * 2,
  )
  const width =
    availableWidth < tagSuggestionPopoverMinWidth
      ? availableWidth
      : Math.min(tagSuggestionPopoverWidth, availableWidth)
  const maxLeft = Math.max(
    tagSuggestionPopoverGutter,
    wrapperRect.width - width - tagSuggestionPopoverGutter,
  )
  const left = clamp(
    caretRect.left - wrapperRect.left,
    tagSuggestionPopoverGutter,
    maxLeft,
  )
  const top = Math.max(
    0,
    caretRect.bottom - wrapperRect.top + tagSuggestionPopoverGap,
  )

  return {
    left,
    top,
    width,
  }
}

function getCaretClientRect(
  editor: LexicalEditor,
  caret: TagDraftCaret,
): DOMRect | null {
  const element = editor.getElementByKey(caret.key)
  const textNode = element ? getFirstTextNode(element) : null

  if (!element || !textNode) {
    return null
  }

  const range = document.createRange()
  const offset = clamp(caret.offset, 0, textNode.textContent?.length ?? 0)

  range.setStart(textNode, offset)
  range.setEnd(textNode, offset)

  return getRangeClientRect(range) ?? element.getBoundingClientRect()
}

function getFirstTextNode(element: HTMLElement) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)

  return walker.nextNode() as Text | null
}

function getRangeClientRect(range: Range) {
  const rects = range.getClientRects()
  const firstRect = rects[0]

  if (firstRect) {
    return firstRect
  }

  const rect = range.getBoundingClientRect()

  if (rect.width > 0 || rect.height > 0 || rect.left !== 0 || rect.top !== 0) {
    return rect
  }

  return null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function replaceTagDraftWithSuggestion(range: TagDraftRange, tag: string) {
  const root = $getRoot()
  const text = root.getTextContent()
  const textBeforeTag = text.slice(0, range.start)
  const textAfterTag = text.slice(range.end)
  const spacer = textAfterTag.length > 0 && /^\s/.test(textAfterTag) ? '' : ' '
  const insertedText = `#${tag}${spacer}`
  const nextText = `${textBeforeTag}${insertedText}${textAfterTag}`
  const caretOffset = textBeforeTag.length + insertedText.length
  const paragraph = $createParagraphNode()
  const textNode = $createTextNode(nextText)

  paragraph.append(textNode)
  root.clear()
  root.append(paragraph)
  textNode.select(caretOffset, caretOffset)
}

function updateTokenElement(element: HTMLElement, text: string) {
  for (const className of Object.values(tokenClassNames)) {
    element.classList.remove(className)
  }

  for (const className of Object.values(taskPriorityClassNames)) {
    element.classList.remove(className)
  }

  element.classList.remove('task-priority')
  element.classList.add('task-input-token')

  const tokenKind = classifyTaskInputTokenText(text)

  if (tokenKind) {
    element.classList.add(tokenClassNames[tokenKind])
  }

  if (tokenKind === 'priority') {
    const priorityClassName = getPriorityTokenClassName(text)

    if (priorityClassName) {
      element.classList.add('task-priority', priorityClassName)
    }
  }
}

function getPriorityTokenClassName(text: string) {
  const priority = text.trim().toLocaleLowerCase()

  return isTaskPriority(priority) ? taskPriorityClassNames[priority] : null
}
