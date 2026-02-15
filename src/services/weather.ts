import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const WEATHER_CACHE_KEY = '@reps_weather_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface WeatherData {
  temperature: number;
  condition: string;
  timestamp: number;
}

interface WeatherCache {
  data: WeatherData;
  timestamp: number;
}

// WMO Weather interpretation codes
const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Clear';
  if (code === 1 || code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Clear';
};

// Fetch weather from Open-Meteo API (free, no API key needed)
const fetchWeatherData = async (latitude: number, longitude: number): Promise<WeatherData | null> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.current) {
      return null;
    }

    const temperature = data.current.temperature_2m;
    const weatherCode = data.current.weather_code;
    const condition = getWeatherCondition(weatherCode);

    return {
      temperature,
      condition,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.log('Weather fetch failed:', error);
    return null;
  }
};

// Get cached weather data
const getCachedWeather = async (): Promise<WeatherData | null> => {
  try {
    const cached = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached) {
      return null;
    }

    const weatherCache: WeatherCache = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (less than 1 hour old)
    if (now - weatherCache.timestamp < CACHE_DURATION) {
      return weatherCache.data;
    }

    return null;
  } catch (error) {
    console.log('Weather cache read failed:', error);
    return null;
  }
};

// Save weather to cache
const cacheWeather = async (data: WeatherData): Promise<void> => {
  try {
    const weatherCache: WeatherCache = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherCache));
  } catch (error) {
    console.log('Weather cache save failed:', error);
  }
};

// Main function to get current weather
export const getCurrentWeather = async (): Promise<{ temperature: number; condition: string } | null> => {
  try {
    // Check cache first
    const cached = await getCachedWeather();
    if (cached) {
      return { temperature: cached.temperature, condition: cached.condition };
    }

    // Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;

    // Fetch fresh weather data
    const weatherData = await fetchWeatherData(latitude, longitude);
    if (weatherData) {
      await cacheWeather(weatherData);
      return { temperature: weatherData.temperature, condition: weatherData.condition };
    }

    return null;
  } catch (error) {
    console.log('Weather service error:', error);
    return null;
  }
};
