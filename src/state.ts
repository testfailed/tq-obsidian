import type { Task } from './file-interface';

const TaskListConfigDefaults: TaskListConfig = {
  overdue: false,
  due: true,
  noDue: true,
  completed: undefined,
  sort: 'score',
  group: undefined,
  selectTags: [],
  omitTags: [],
  selectDay: undefined,
  selectWeek: undefined,
};

export interface TaskListConfig {
  overdue: boolean;
  due: boolean;
  noDue: boolean;
  completed: boolean | undefined;
  sort: 'due' | 'score' | undefined;
  group: 'due' | 'completed' | undefined;

  selectTags: string[];
  omitTags: string[];
  selectDay: string | undefined;
  selectWeek: string | undefined;
}

export const taskListConfigWithDefaults = (
  props: Partial<TaskListConfig>,
): TaskListConfig => ({
  ...TaskListConfigDefaults,
  ...props,
});

export const parseTaskListConfig = (lines: string[]): TaskListConfig => {
  const state = taskListConfigWithDefaults({});
  lines.forEach((line) => {
    if (line === '') {
      return;
    }
    const parts = line.split(':').map((part) => part.trim());
    if (parts.length !== 2) {
      console.error(`tq: Invalid line in config "${line}"`);
      return;
    }
    switch (parts[0]) {
      case 'overdue':
        state.overdue = parts[1] === 'true';
        break;
      case 'due':
        state.due = parts[1] === 'true';
        break;
      case 'no-due':
        state.noDue = parts[1] === 'true';
        break;
      case 'completed':
        state.completed = parts[1] === 'true';
        break;
      case 'sort':
        switch (parts[1]) {
          case 'due':
            state.sort = 'due';
            break;
          case 'score':
            state.sort = 'score';
            break;
          default:
            console.error(`tq: Invalid line in config "${line}"`);
            state.sort = undefined;
            break;
        }
        break;
      case 'group':
        switch (parts[1]) {
          case 'due':
            state.group = 'due';
            break;
          case 'completed':
            state.group = 'completed';
            break;
          default:
            console.error(`tq: Invalid line in config "${line}"`);
            state.group = undefined;
            break;
        }
        break;
      case 'select-tags':
        if (parts[1].match(/^\[.*\]$/)) {
          state.selectTags = parts[1]
            .replace(/^\[/, '')
            .replace(/\]$/, '')
            .split(',')
            .map((t) => t.trim());
        } else {
          state.selectTags = [parts[1]];
        }
        break;
      case 'omit-tags':
        if (parts[1].match(/^\[.*\]$/)) {
          state.omitTags = parts[1]
            .replace(/^\[/, '')
            .replace(/\]$/, '')
            .split(',')
            .map((t) => t.trim());
        } else {
          state.omitTags = [parts[1]];
        }
        break;
      case 'select-day':
        state.selectDay = parts[1];
        state.due = true;
        break;
      case 'select-week':
        state.selectWeek = parts[1];
        state.due = true;
        break;
      default:
        break;
    }
  });

  return state;
};

export type Filter = (task: Task) => boolean;
export const filtersFromConfig = (state: TaskListConfig): Filter[] => {
  const filters = [];

  // Cheap and bulky comparisons first

  if (state.due && state.noDue) {
    // Keep all
  } else if (state.due) {
    // Filter tasks with no due property
    filters.push((task: Task) => task.due !== undefined);
  } else if (state.noDue) {
    // Filter tasks with a due property
    filters.push((task: Task) => task.due === undefined);
  } else {
    // Filter all (probably an error)
  }

  filters.push((task: Task) => task.hideUntil === undefined);

  if (state.selectDay && state.selectDay.length > 0) {
    // Filtering select-day does not remove tasks which do not have a due date.
    if (state.overdue) {
      const selectedDay = window.moment(state.selectDay);
      filters.push(
        (task: Task) =>
          task.due === undefined ||
          task.due.format('YYYY-MM-DD') === state.selectDay ||
          (task.due.isBefore(selectedDay) && !task.checked),
      );
    } else {
      filters.push(
        (task: Task) =>
          task.due === undefined ||
          task.due.format('YYYY-MM-DD') === state.selectDay,
      );
    }
  }

  if (state.completed) {
    filters.push((task: Task) => task.checked);
  } else if (state.completed === false) {
    filters.push((task: Task) => !task.checked);
  }

  // More expensive, targeted comparisons last

  if (state.selectTags && state.selectTags.length > 0) {
    filters.push((task: Task) => {
      let tags: string | string[] = task.frontmatter.get('tags');
      if (!tags) {
        return false;
      }
      if (!Array.isArray(tags)) {
        tags = [tags];
      }

      // Selection tags may match nested note tags
      // e.g. "work" matches "work/meetings"
      for (let i = 0; i < state.selectTags.length; i++) {
        const selectTagRe = new RegExp(`^${state.selectTags[i]}`);
        if (tags.some((noteTag) => selectTagRe.test(noteTag))) {
          return true;
        }
      }
      return false;
    });
  }
  if (state.omitTags && state.omitTags.length > 0) {
    filters.push((task: Task) => {
      let tags: string | string[] = task.frontmatter.get('tags');
      if (!tags) {
        return true;
      }
      if (!Array.isArray(tags)) {
        tags = [tags];
      }

      // Selection tags may match nested note tags
      // e.g. "work" matches "work/meetings"
      for (let i = 0; i < state.omitTags.length; i++) {
        const omitTagRe = new RegExp(`^${state.omitTags[i]}`);
        if (tags.some((noteTag) => omitTagRe.test(noteTag))) {
          return false;
        }
      }
      return true;
    });
  }

  if (state.selectWeek && state.selectWeek.length > 0) {
    const weekStart = window.moment(state.selectWeek).startOf('week');
    const weekEnd = weekStart.clone().add(1, 'week');

    // Filtering select-week does not remove tasks which do not have a due date.
    if (state.overdue) {
      filters.push(
        (task: Task) => task.due === undefined || task.due.isBefore(weekEnd),
      );
    } else {
      filters.push(
        (task: Task) =>
          task.due === undefined ||
          task.due.isBetween(weekStart, weekEnd, undefined, '[]'),
      );
    }
  }

  return filters;
};
