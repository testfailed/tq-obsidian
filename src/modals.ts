import type TQPlugin from './main';
import type { Moment } from 'moment';
import { App, Modal } from 'obsidian';
import ReactDOM from 'react-dom';
import React from 'react';
import { CreateTask } from './ui/CreateTask';

export class CreateTaskModal extends Modal {
  private readonly plugin: TQPlugin;

  constructor(app: App, plugin: TQPlugin) {
    super(app);
    this.plugin = plugin;
  }

  public onOpen = (): void => {
    const { titleEl, contentEl } = this;
    titleEl.setText('Create New Task');

    ReactDOM.render(
      React.createElement(CreateTask, {
        close: () => this.close(),
        plugin: this.plugin,
      }),
      contentEl,
    );
  };

  public onClose = (): void => {
    const { contentEl } = this;
    contentEl.empty();
  };
}

export class DuePickerModal extends Modal {
  private readonly startDate: Moment;
  private readonly set: (date: Moment) => void;

  constructor(app: App, startDate: Moment, set: (date: Moment) => void) {
    super(app);

    this.startDate = startDate;
    this.set = set;
  }

  public onOpen = (): void => {
    const { titleEl, contentEl } = this;
    titleEl.setText('Set Due Date');
    /*
    new DuePicker({
      target: contentEl,
      props: {
        close: () => this.close(),
        set: this.set,
        startDate: this.startDate,
      },
    });
    */
  };

  public onClose = (): void => {
    const { contentEl } = this;
    contentEl.empty();
  };
}

export class RepeatPickerModal extends Modal {
  private readonly repeatConfig: string;
  private readonly set: (repeatConfig: string) => void;

  constructor(
    app: App,
    repeatConfig: string,
    set: (repeatConfig: string) => void,
  ) {
    super(app);

    this.repeatConfig = repeatConfig;
    this.set = set;
  }

  public onOpen = (): void => {
    const { titleEl, contentEl } = this;
    titleEl.setText('Set Repeat Config');
    /*
    new RepeatPicker({
      target: contentEl,
      props: {
        close: () => this.close(),
        set: this.set,
        repeatConfig: this.repeatConfig,
        repeats: this.repeatConfig !== 'none',
      },
    });
    */
  };

  public onClose = (): void => {
    const { contentEl } = this;
    contentEl.empty();
  };
}
