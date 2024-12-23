import { SoundTouchDevice } from '../../devices/SoundTouch/SoundTouchDevice.js';

export enum ServiceType {
  'ON_OFF' = 'ON',
  'SMART_SPEAKER' = 'SMART SPEAKER',
}

export interface SoundTouchService {
  init?: () => Promise<void>;
  refresh?: () => Promise<void>;
}

export function getServiceName({
  serviceType,
  device,
}: {
  serviceType: ServiceType;
  device: SoundTouchDevice;
}) {
  return `${device.name} ${serviceType} Service`;
}
