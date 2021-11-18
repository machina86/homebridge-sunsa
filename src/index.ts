import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { SunsaPlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, SunsaPlatform);
};
