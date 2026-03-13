import { AppleMaps, GoogleMaps } from 'expo-maps';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { fetchMapObjects, type MapObjectFromApi } from '@/constants/api';

const DEFAULT_LAT = 55.7558;
const DEFAULT_LNG = 37.6173;
const DEFAULT_ZOOM = 12;

type Coords = { latitude: number; longitude: number };

export function ObjectsMapViewNative() {
  const [location, setLocation] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [objects, setObjects] = useState<MapObjectFromApi[]>([]);
  const [objectsError, setObjectsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Доступ к геолокации запрещён');
        setLocation({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setLocationError(null);
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : 'Ошибка геолокации');
      setLocation({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
    }
  }, []);

  const loadObjects = useCallback(async () => {
    try {
      const list = await fetchMapObjects();
      setObjects(list);
      setObjectsError(null);
    } catch (e) {
      setObjectsError(e instanceof Error ? e.message : 'Ошибка загрузки объектов');
      setObjects([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadLocation(), loadObjects()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadLocation, loadObjects]);

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Карта доступна на iOS и Android</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Загрузка карты…</Text>
      </View>
    );
  }

  const center = location ?? { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
  const cameraPosition = {
    coordinates: { latitude: center.latitude, longitude: center.longitude },
    zoom: DEFAULT_ZOOM,
  };

  const markersIos = objects.map((o) => ({
    id: o.id,
    coordinates: { latitude: o.lat, longitude: o.lng },
    title: o.address,
  }));
  const markersAndroid = objects.map((o) => ({
    id: o.id,
    coordinates: { latitude: o.lat, longitude: o.lng },
    title: o.address,
    showCallout: true,
  }));

  const commonProps = {
    style: styles.map,
    cameraPosition,
    properties: {
      isMyLocationEnabled: true,
    },
    uiSettings: {
      myLocationButtonEnabled: true,
    },
  };

  return (
    <View style={styles.container}>
      {locationError ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{locationError}. Карта открыта по умолчанию.</Text>
        </View>
      ) : null}
      {objectsError ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{objectsError}</Text>
        </View>
      ) : null}
      {Platform.OS === 'ios' ? (
        <AppleMaps.View {...commonProps} markers={markersIos} />
      ) : (
        <GoogleMaps.View {...commonProps} markers={markersAndroid} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, width: '100%' },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 16 },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fallbackText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  banner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  bannerText: { fontSize: 13 },
});
