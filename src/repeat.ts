import RRule, { ByWeekday, Frequency, Weekday } from 'rrule';

export class RepeatAdapter {
  private readonly rrule: RRule;
  private subscriptions: { id: number; hook: (val: any) => void }[];

  constructor(rrule: RRule) {
    this.rrule = rrule;
    this.subscriptions = [];
  }

  /**
   * The subscribe function implements the Store interface in Svelte. The
   * subscribers must be called any time there is a change to the task.
   */
  public readonly subscribe = (
    subscription: (value: any) => void,
  ): (() => void) => {
    const maxID = this.subscriptions.reduce(
      (prev, { id }): number => Math.max(prev, id),
      0,
    );
    const newID = maxID + 1;

    this.subscriptions.push({ id: newID, hook: subscription });
    subscription(this);

    // Return an unsubscribe function
    return () => {
      this.subscriptions = this.subscriptions.filter(({ id }) => id !== newID);
      console.log(`Removing subscription ${newID}`);
    };
  };

  /**
   * The set function implements the Store interface in Svelte. We are not
   * actually using it to store new values, but it is needed when binding to
   * properties.
   */
  public readonly set = (_: any): void => {};

  public isValid = (): boolean => this.rrule.toString() !== '';

  public next = (count: number): Date[] =>
    this.rrule.all((_, len) => len < count);

  public toText = (): string =>
    this.rrule.isFullyConvertibleToText()
      ? this.rrule.toText()
      : this.rrule.toString();

  public toString = (): string => this.rrule.toString();

  public asRRule = (): RRule => RRule.fromText(this.toText());

  public get frequency(): Frequency {
    return this.rrule.options.freq;
  }

  public set frequency(frequency: Frequency) {
    if (
      ![
        Frequency.YEARLY,
        Frequency.MONTHLY,
        Frequency.WEEKLY,
        Frequency.DAILY,
      ].contains(frequency)
    ) {
      throw new Error(`Invalid frequency ${frequency} requested`);
    }

    this.rrule.options.freq = frequency;
    this.rrule.origOptions.freq = frequency;

    // reset other config options
    this.rrule.options.bymonth = undefined;
    this.rrule.origOptions.bymonth = undefined;
    this.rrule.options.bymonthday = undefined;
    this.rrule.origOptions.bymonthday = undefined;
    this.rrule.options.byweekday = undefined;
    this.rrule.origOptions.byweekday = undefined;

    this.notify();
  }

  public get interval(): number {
    return this.rrule.options.interval;
  }

  public set interval(n: number) {
    // do not set to null or 0
    const newVal = n ? n : 1;

    if (newVal !== this.rrule.options.interval) {
      this.rrule.options.interval = n ? n : 1;
      this.notify();
    }
  }

  public setDaysOfWeek = (ids: number[]): void => {
    const weekdayList: Weekday[] = new Array(ids.length);
    const numberList: number[] = new Array(ids.length);

    for (let i = 0; i < ids.length; i++) {
      weekdayList[i] = new Weekday(ids[i]);
      numberList[i] = ids[i];
    }

    this.rrule.origOptions.byweekday = weekdayList;
    this.rrule.options.byweekday = numberList;

    this.notify();
  };

  public get daysOfWeek(): number[] {
    const weekdays = this.rrule.origOptions.byweekday;
    if (!weekdays) {
      return [];
    } else if (Array.isArray(weekdays)) {
      return weekdays.map(this.ByWeekdayToNumber);
    }
    return [this.ByWeekdayToNumber(weekdays)];
  }

  public get dayOfMonth(): number | null {
    const day = this.rrule.origOptions.bymonthday;
    if (Array.isArray(day)) {
      if (day.length > 0) {
        return day[0];
      }
      return null;
    }

    return day;
  }

  public set dayOfMonth(n: number) {
    this.rrule.origOptions.bymonthday = n;
    this.rrule.options.bymonthday = [n];

    // Incompatible with day of month
    this.rrule.origOptions.byweekday = [];

    this.notify();
  }

  public set lastDayOfMonth(val: boolean) {
    if (val) {
      this.rrule.origOptions.bymonthday = -1;
      this.rrule.options.bymonthday = [-1];
    } else {
      this.rrule.origOptions.bymonthday = [];
      this.rrule.options.bymonthday = [];
    }

    this.notify();
  }

  public get lastDayOfMonth(): boolean {
    const day = this.rrule.origOptions.bymonthday;
    if (Array.isArray(day)) {
      return day.length > 0 ? day[0] === -1 : false;
    }
    return day === -1;
  }

  public setWeekDaysOfMonth = (
    selected: { week: string; weekDay: string }[],
  ): void => {
    this.rrule.origOptions.byweekday = selected.map(
      ({ week, weekDay }): Weekday =>
        new Weekday(parseInt(weekDay, 10), parseInt(week, 10)),
    );

    // Incompatible with week days of month
    this.rrule.origOptions.bymonthday = undefined;
    this.rrule.options.bymonthday = [];

    this.notify();
  };

  public getWeekDaysOfMonth = (): { week: string; weekDay: string }[] => {
    const weekdays = this.rrule.origOptions.byweekday;
    if (Array.isArray(weekdays)) {
      return weekdays
        .filter(
          (day): day is Weekday =>
            typeof day !== 'string' && typeof day !== 'number',
        )
        .filter((day) => day.n !== undefined)
        .map((day) => ({
          week: day.n.toString(),
          weekDay: day.weekday.toString(),
        }));
    }

    // TODO: This might be overly restrictive, if people write custom RRule syntax.
    return [];
  };

  public get monthsOfYear(): number[] {
    const months = this.rrule.origOptions.bymonth;
    if (months === undefined) {
      return [];
    }
    if (typeof months === 'number') {
      return [months];
    }
    return months;
  }

  public setMonthsOfYear = (ids: number[]): void => {
    this.rrule.origOptions.bymonth = ids;
    this.rrule.options.bymonth = this.rrule.origOptions.bymonth;

    this.notify();
  };

  /**
   * Notify subscriptions of a change.
   */
  private readonly notify = (): void =>
    this.subscriptions.forEach(({ hook }) => hook(this));

  private ByWeekdayToNumber(wd: ByWeekday): number {
    if (typeof wd === 'number') {
      return wd;
    } else if (typeof wd === 'string') {
      return 0; // TODO
    }
    return wd.weekday;
  }
}
