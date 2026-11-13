<?php
/**
 * Weather from the US National Weather Service (api.weather.gov), in °F and mph.
 * Location comes from config: weather.lat, weather.lon, weather.location. Cached 10 minutes.
 */

declare(strict_types=1);

function nws(string $url): array {
  [$status, $text] = http_request('GET', $url, [
    'User-Agent: ChamberApp (' . site_url() . ')',
    'Accept: application/geo+json',
  ], null, 12);
  if ($status < 200 || $status >= 300) throw new RuntimeException("NWS $status for $url");
  $j = json_decode($text, true);
  if (!is_array($j)) throw new RuntimeException('NWS bad JSON');
  return $j;
}

function wround($n): ?int {
  return is_int($n) || is_float($n) ? (int) round($n) : null;
}

function to_f($q): ?int {
  $v = $q['value'] ?? null;
  if (!is_int($v) && !is_float($v)) return null;
  return wround(str_contains((string) ($q['unitCode'] ?? ''), 'degF') ? $v : $v * 9 / 5 + 32);
}

function to_mph($q): ?int {
  $v = $q['value'] ?? null;
  if (!is_int($v) && !is_float($v)) return null;
  $u = (string) ($q['unitCode'] ?? '');
  if (str_contains($u, 'm_s-1')) return wround($v * 2.23694);
  if (str_contains($u, 'mi_h-1')) return wround($v);
  return wround($v * 0.621371);
}

function compass($deg): ?string {
  if (!is_int($deg) && !is_float($deg)) return null;
  $dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return $dirs[((int) round($deg / 22.5)) % 16];
}

function weather_build(): array {
  $lat = (float) config('weather.lat', 34.2265);
  $lon = (float) config('weather.lon', -102.7238);
  $location = (string) config('weather.location', 'Muleshoe, TX');

  $points = cache_get("nws-points|$lat,$lon", 7 * 86400);
  if (!$points) {
    $p = nws("https://api.weather.gov/points/$lat,$lon");
    $points = [
      'forecast' => $p['properties']['forecast'],
      'forecastHourly' => $p['properties']['forecastHourly'],
      'stations' => $p['properties']['observationStations'],
    ];
    cache_put("nws-points|$lat,$lon", $points);
  }

  $forecast = nws($points['forecast']);
  try { $hourly = nws($points['forecastHourly']); } catch (Throwable $e) { $hourly = null; }

  $current = null;
  try {
    $stations = nws($points['stations']);
    $sid = $stations['features'][0]['properties']['stationIdentifier'] ?? null;
    if ($sid) {
      $obs = nws("https://api.weather.gov/stations/$sid/observations/latest");
      $p = $obs['properties'] ?? [];
      $t = to_f($p['temperature'] ?? null);
      if ($t !== null) {
        $current = [
          'temperatureF' => $t,
          'feelsLikeF' => to_f($p['heatIndex'] ?? null) ?? to_f($p['windChill'] ?? null) ?? $t,
          'condition' => ($p['textDescription'] ?? '') ?: null,
          'windMph' => to_mph($p['windSpeed'] ?? null),
          'windGustMph' => to_mph($p['windGust'] ?? null),
          'windDirection' => compass($p['windDirection']['value'] ?? null),
          'humidity' => wround($p['relativeHumidity']['value'] ?? null),
          'observedAt' => $p['timestamp'] ?? null,
        ];
      }
    }
  } catch (Throwable $e) {
    $current = null;
  }

  $alerts = [];
  try {
    $a = nws("https://api.weather.gov/alerts/active?point=$lat,$lon");
    foreach ($a['features'] ?? [] as $f) {
      $pr = $f['properties'] ?? [];
      $alerts[] = [
        'id' => $pr['id'] ?? ($f['id'] ?? null),
        'event' => $pr['event'] ?? 'Weather Alert',
        'headline' => $pr['headline'] ?? null,
        'severity' => $pr['severity'] ?? 'Unknown',
        'description' => $pr['description'] ?? '',
        'instruction' => $pr['instruction'] ?? null,
        'ends' => $pr['ends'] ?? ($pr['expires'] ?? null),
      ];
    }
  } catch (Throwable $e) {
  }

  $tF = fn($p) => ($p['temperatureUnit'] ?? 'F') === 'C' ? wround($p['temperature'] * 9 / 5 + 32) : $p['temperature'];
  $hp = $hourly['properties']['periods'] ?? [];
  $hourlyOut = array_map(fn($p) => [
    'time' => $p['startTime'],
    'temperatureF' => $tF($p),
    'condition' => $p['shortForecast'] ?? null,
    'precipChance' => $p['probabilityOfPrecipitation']['value'] ?? null,
    'isDaytime' => $p['isDaytime'] ?? true,
  ], array_slice($hp, 0, 12));

  $periods = array_map(fn($p) => [
    'name' => $p['name'] ?? '',
    'startTime' => $p['startTime'] ?? null,
    'isDaytime' => $p['isDaytime'] ?? true,
    'temperatureF' => $tF($p),
    'condition' => $p['shortForecast'] ?? null,
    'detailed' => $p['detailedForecast'] ?? null,
    'precipChance' => $p['probabilityOfPrecipitation']['value'] ?? null,
    'wind' => trim(implode(' ', array_filter([$p['windDirection'] ?? null, $p['windSpeed'] ?? null]))),
  ], $forecast['properties']['periods'] ?? []);

  $first = $hp[0] ?? null;
  if (!$current && $first) {
    $current = [
      'temperatureF' => $hourlyOut[0]['temperatureF'] ?? null,
      'feelsLikeF' => $hourlyOut[0]['temperatureF'] ?? null,
      'condition' => $first['shortForecast'] ?? null,
      'windMph' => (int) ($first['windSpeed'] ?? 0) ?: null,
      'windGustMph' => null,
      'windDirection' => $first['windDirection'] ?? null,
      'humidity' => $first['relativeHumidity']['value'] ?? null,
      'observedAt' => $first['startTime'] ?? null,
    ];
  }

  return [
    'location' => $location,
    'updatedAt' => gmdate('Y-m-d\TH:i:s.000\Z'),
    'isDaytime' => $first['isDaytime'] ?? ($periods[0]['isDaytime'] ?? true),
    'current' => $current,
    'hourly' => $hourlyOut,
    'periods' => array_slice($periods, 0, 14),
    'alerts' => $alerts,
  ];
}

/** Returns ['body' => weather, 'stale' => bool]. */
function weather_get(): array {
  $fresh = cache_get('weather', 10 * 60);
  if (is_array($fresh)) return ['body' => $fresh, 'stale' => false];
  try {
    $body = weather_build();
    cache_put('weather', $body);
    return ['body' => $body, 'stale' => false];
  } catch (Throwable $e) {
    $old = cache_get('weather', 0);
    if (is_array($old)) return ['body' => $old, 'stale' => true];
    throw $e;
  }
}
