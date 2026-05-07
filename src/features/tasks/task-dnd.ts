export type TaskDragData = {
  listKey: string
  taskId: string
}

export function getTaskDragData(data: unknown): TaskDragData | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const taskData = data as Partial<TaskDragData>

  if (
    typeof taskData.listKey !== 'string' ||
    typeof taskData.taskId !== 'string'
  ) {
    return null
  }

  return {
    listKey: taskData.listKey,
    taskId: taskData.taskId,
  }
}
