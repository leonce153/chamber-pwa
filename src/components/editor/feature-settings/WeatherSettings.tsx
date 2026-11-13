import { CloudSun, MapPin, Thermometer, Settings } from 'lucide-react';
import type { FeatureSettingsProps } from './types';

/**
 * Weather is fixed to Muleshoe, TX in °F using the National Weather Service
 * (no API key needed). It is turned on or off in admin Settings.
 */
export function WeatherSettings(_props: FeatureSettingsProps) {
  return (
    <div data-ev-id="ev_weather_settings" className="flex flex-col gap-4">
      <div data-ev-id="ev_weather_settings_card" className="p-4 bg-background rounded-lg border border-border flex flex-col gap-3">
        <div data-ev-id="ev_weather_settings_row1" className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <p data-ev-id="ev_weather_settings_loc" className="text-sm text-text">Location: <strong data-ev-id="ev_feb598a66b">Muleshoe, TX</strong></p>
        </div>
        <div data-ev-id="ev_weather_settings_row2" className="flex items-center gap-3">
          <Thermometer className="w-5 h-5 text-primary" />
          <p data-ev-id="ev_weather_settings_units" className="text-sm text-text">Units: <strong data-ev-id="ev_77e191441a">°F and mph</strong></p>
        </div>
        <div data-ev-id="ev_weather_settings_row3" className="flex items-center gap-3">
          <CloudSun className="w-5 h-5 text-primary" />
          <p data-ev-id="ev_weather_settings_src" className="text-sm text-text">Source: National Weather Service, including active weather alerts</p>
        </div>
      </div>
      <div data-ev-id="ev_weather_settings_note" className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-3">
        <Settings className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p data-ev-id="ev_weather_settings_note_text" className="text-sm text-text">
          Turn the Home screen weather card on or off in <strong data-ev-id="ev_91d8d8879d">Settings → Weather</strong>.
        </p>
      </div>
    </div>);
}