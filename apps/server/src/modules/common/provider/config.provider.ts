import { getConfig } from '../../../types/config';
import { Service } from '../../tokens';

export const configProvider = {
  provide: Service.CONFIG,
  useFactory: getConfig,
};
