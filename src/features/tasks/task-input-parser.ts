import type { TaskPriority } from '@/lib/data-model'

import { getDateOnlyValue } from './task-dates'

export type TaskInputTokenKind = 'doDate' | 'dueDate' | 'priority' | 'tag'

export type TaskInputToken = {
  end: number
  kind: TaskInputTokenKind
  start: number
  text: string
  value: string
}

export type ParsedTaskInput = {
  doDate: string | null
  dueDate: string | null
  name: string
  priority: TaskPriority | null
  tags: string[]
  tokens: TaskInputToken[]
}

const tokenEndBoundarySource = String.raw`(?=$|[\s,.;:!?)}\]"'])`
const tokenStartBoundarySource = String.raw`(^|[\s([{["'])`
const tagBodySource = '[A-Za-z0-9][A-Za-z0-9_-]{0,63}'
const weekdaySource =
  'sunday|sun|monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat'
const datePhraseSource = String.raw`(?:today|tomorrow|(?:(?:next|this)\s+)?(?:${weekdaySource}))`

const tokenKindOrder: Record<TaskInputTokenKind, number> = {
  dueDate: 0,
  doDate: 1,
  priority: 2,
  tag: 3,
}

const weekdayIndexByName: Record<string, number> = {
  fri: 5,
  friday: 5,
  mon: 1,
  monday: 1,
  sat: 6,
  saturday: 6,
  sun: 0,
  sunday: 0,
  thu: 4,
  thursday: 4,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
}

export function parseTaskInput(
  text: string,
  baseDate = new Date(),
): ParsedTaskInput {
  const tokens = collectTaskInputTokens(text, baseDate)
  const name = stripTaskInputTokens(text, tokens)
  let doDate: string | null = null
  let dueDate: string | null = null
  let priority: TaskPriority | null = null
  const tags: string[] = []
  const seenTags = new Set<string>()

  for (const token of tokens) {
    if (token.kind === 'doDate') {
      doDate = token.value
      continue
    }

    if (token.kind === 'dueDate') {
      dueDate = token.value
      continue
    }

    if (token.kind === 'priority') {
      priority = token.value as TaskPriority
      continue
    }

    const tagKey = token.value.toLocaleLowerCase()

    if (!seenTags.has(tagKey)) {
      tags.push(token.value)
      seenTags.add(tagKey)
    }
  }

  return {
    doDate,
    dueDate,
    name,
    priority,
    tags,
    tokens,
  }
}

export function removeTaskInputTag(text: string, tag: string) {
  const tagKey = tag.toLocaleLowerCase()
  const tokens = collectTaskInputTokens(text).filter(
    (token) =>
      token.kind === 'tag' && token.value.toLocaleLowerCase() === tagKey,
  )

  return tokens.length > 0 ? stripTaskInputTokens(text, tokens) : text
}

export function getTaskInputTokenMatch(text: string) {
  const [token] = collectTaskInputTokens(text)

  if (!token) {
    return null
  }

  return {
    end: token.end,
    start: token.start,
  }
}

export function classifyTaskInputTokenText(text: string) {
  const trimmedText = text.trim()

  if (getDueDatePattern(false).test(trimmedText)) {
    return 'dueDate' satisfies TaskInputTokenKind
  }

  if (getTagPattern(false).test(trimmedText)) {
    return 'tag' satisfies TaskInputTokenKind
  }

  if (getPriorityPattern(false).test(trimmedText)) {
    return 'priority' satisfies TaskInputTokenKind
  }

  if (resolveDatePhrase(trimmedText)) {
    return 'doDate' satisfies TaskInputTokenKind
  }

  return null
}

function collectTaskInputTokens(text: string, baseDate = new Date()) {
  const tokens: TaskInputToken[] = []

  addDueDateTokens(text, tokens, baseDate)
  addTagTokens(text, tokens)
  addPriorityTokens(text, tokens)
  addDoDateTokens(text, tokens, baseDate)

  return tokens.sort(
    (first, second) =>
      first.start - second.start ||
      tokenKindOrder[first.kind] - tokenKindOrder[second.kind],
  )
}

function addDueDateTokens(
  text: string,
  tokens: TaskInputToken[],
  baseDate: Date,
) {
  for (const match of text.matchAll(getDueDatePattern(true))) {
    const [tokenText, dateText] = match
    const value = resolveDatePhrase(dateText, baseDate)

    if (!value) {
      continue
    }

    addToken(tokens, {
      end: match.index + tokenText.length,
      kind: 'dueDate',
      start: match.index,
      text: tokenText,
      value,
    })
  }
}

function addDoDateTokens(
  text: string,
  tokens: TaskInputToken[],
  baseDate: Date,
) {
  for (const match of text.matchAll(getDatePattern(true))) {
    const [, prefix, tokenText] = match
    const value = resolveDatePhrase(tokenText, baseDate)

    if (!value) {
      continue
    }

    const start = match.index + prefix.length

    addToken(tokens, {
      end: start + tokenText.length,
      kind: 'doDate',
      start,
      text: tokenText,
      value,
    })
  }
}

function addTagTokens(text: string, tokens: TaskInputToken[]) {
  for (const match of text.matchAll(getTagPattern(true))) {
    const [, prefix, tag] = match
    const tokenText = `#${tag}`
    const start = match.index + prefix.length
    const value = tag.toLocaleLowerCase()

    addToken(tokens, {
      end: start + tokenText.length,
      kind: 'tag',
      start,
      text: tokenText,
      value,
    })
  }
}

function addPriorityTokens(text: string, tokens: TaskInputToken[]) {
  for (const match of text.matchAll(getPriorityPattern(true))) {
    const [, prefix, priority] = match
    const start = match.index + prefix.length

    addToken(tokens, {
      end: start + priority.length,
      kind: 'priority',
      start,
      text: priority,
      value: priority.toLocaleLowerCase(),
    })
  }
}

function addToken(tokens: TaskInputToken[], token: TaskInputToken) {
  if (
    tokens.some(
      (currentToken) =>
        token.start < currentToken.end && token.end > currentToken.start,
    )
  ) {
    return
  }

  tokens.push(token)
}

function stripTaskInputTokens(text: string, tokens: TaskInputToken[]) {
  let cursor = 0
  let strippedText = ''

  for (const token of tokens) {
    strippedText += text.slice(cursor, token.start)
    cursor = token.end
  }

  strippedText += text.slice(cursor)

  return strippedText
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,.;:!?]+|[\s,.;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveDatePhrase(text: string, baseDate = new Date()) {
  const phrase = text.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
  const today = startOfLocalDay(baseDate)

  if (phrase === 'today') {
    return getDateOnlyValue(today)
  }

  if (phrase === 'tomorrow') {
    return getDateOnlyValue(addDays(today, 1))
  }

  const weekdayName = phrase.replace(/^(?:next|this)\s+/, '')
  const weekdayIndex = weekdayIndexByName[weekdayName]

  if (weekdayIndex === undefined) {
    return null
  }

  let dayOffset = weekdayIndex - today.getDay()

  if (dayOffset < 0 || (dayOffset === 0 && !phrase.startsWith('this '))) {
    dayOffset += 7
  }

  return getDateOnlyValue(addDays(today, dayOffset))
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function getDueDatePattern(global: boolean) {
  return new RegExp(
    String.raw`\bdue\s+(${datePhraseSource})${tokenEndBoundarySource}`,
    global ? 'gi' : 'i',
  )
}

function getDatePattern(global: boolean) {
  return new RegExp(
    `${tokenStartBoundarySource}(${datePhraseSource})${tokenEndBoundarySource}`,
    global ? 'gi' : 'i',
  )
}

function getTagPattern(global: boolean) {
  return new RegExp(
    `${tokenStartBoundarySource}#(${tagBodySource})${tokenEndBoundarySource}`,
    global ? 'g' : '',
  )
}

function getPriorityPattern(global: boolean) {
  return new RegExp(
    `${tokenStartBoundarySource}([pP][1-4])${tokenEndBoundarySource}`,
    global ? 'g' : '',
  )
}
