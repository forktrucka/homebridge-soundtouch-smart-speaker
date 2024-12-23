import { SoundTouchDevice } from '../devices/SoundTouch/SoundTouchDevice.js';
import { PlatformAccessory } from 'homebridge';
import { SoundTouchHomebridgePlatform } from '../platform.js';
import { SoundTouchOnService } from './services/SoundTouchOnService.js';
import {
  getServiceName,
  ServiceType,
  SoundTouchService,
} from './services/ServiceType.js';
import { SoundTouchInformationService } from './services/SoundTouchInformationService.js';
import { FormattedLogger } from '../utils/FormattedLogger.js';
import { SoundTouchVolumeService } from './services/SoundTouchVolumeService.js';
import { SoundTouchMuteService } from './services/SoundTouchMuteService.js';

export type SpeakerType = 'none' | 'lightbulb' | 'speaker';

export class SoundTouchSpeakerPlatformAccessory implements SoundTouchService {
  private readonly services: SoundTouchService[];
  private readonly device: SoundTouchDevice;
  private readonly log: FormattedLogger;

  constructor(props: {
    accessory: PlatformAccessory;
    device: SoundTouchDevice;
    platform: SoundTouchHomebridgePlatform;
    services: SoundTouchService[];
  }) {
    this.device = props.device;
    this.log = FormattedLogger.create(props.platform.log, this.device);
    this.services = props.services;
  }

  async init(): Promise<void> {
    for (const service of this.services) {
      if (service.init) {
        await service.init();
      }
    }

    if (this.device.pollingInterval !== undefined) {
      this._refreshDeviceServices().then(() => {
        //no-op
      });
    }

    if (this.device.verbose) {
      this.log.info(`Device ready`);
    }
  }

  async refresh(): Promise<void> {
    for (const service of this.services) {
      if (service.refresh) {
        await service.refresh();
      }
    }
  }

  private async _refreshDeviceServices(): Promise<void> {
    while (true) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.device.pollingInterval)
      );

      await this.refresh();
    }
  }

  static async create(props: {
    platform: SoundTouchHomebridgePlatform;
    accessory: PlatformAccessory;
    device: SoundTouchDevice;
  }): Promise<SoundTouchSpeakerPlatformAccessory> {
    const log = FormattedLogger.create(props.platform.log, props.device);

    const speakerService = getServiceName({
      device: props.device,
      serviceType: ServiceType.SMART_SPEAKER,
    });

    log.debug('initialising speaker service: %s', speakerService);

    let accessoryService = props.accessory.getService(speakerService);

    if (!accessoryService) {
      accessoryService = props.accessory.addService(
        props.platform.Service.SmartSpeaker,
        speakerService,
        ServiceType.SMART_SPEAKER
      );
    }

    const defaultServices: SoundTouchService[] = [
      await SoundTouchInformationService.create(props),
      await SoundTouchOnService.create({
        service: accessoryService,
        ...props,
      }),
      await SoundTouchVolumeService.create({
        service: accessoryService,
        ...props,
      }),
      await SoundTouchMuteService.create({
        service: accessoryService,
        ...props,
      }),
    ];

    const accessory = new SoundTouchSpeakerPlatformAccessory({
      services: [...defaultServices],
      ...props,
    });

    await accessory.init();

    return accessory;
  }
}
