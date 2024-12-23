import { Logging, LogLevel } from 'homebridge';
import { SoundTouchDevice } from '../devices/SoundTouch/SoundTouchDevice.js';

export class FormattedLogger {
  private logger: Logging;
  private device: SoundTouchDevice;

  constructor({
    logger,
    device,
  }: {
    logger: Logging;
    device: SoundTouchDevice;
  }) {
    this.logger = logger;
    this.device = device;
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(message: string, ...parameters: any[]): void {
    this.log(LogLevel.INFO, message, ...parameters);
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  success(message: string, ...parameters: any[]): void {
    this.log(LogLevel.SUCCESS, message, ...parameters);
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(message: string, ...parameters: any[]): void {
    this.log(LogLevel.WARN, message, ...parameters);
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(message: string, ...parameters: any[]): void {
    this.log(LogLevel.ERROR, message, ...parameters);
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(message: string, ...parameters: any[]): void {
    this.log(LogLevel.DEBUG, message, ...parameters);
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(level: LogLevel, message: string, ...parameters: any[]): void {
    let formattedMsg = '';

    formattedMsg = `[${this.device.name}] - ${message}`;

    this.logger.log(level, formattedMsg, ...parameters);
  }

  static create(logger: Logging, device: SoundTouchDevice) {
    return new FormattedLogger({ logger, device });
  }
}
