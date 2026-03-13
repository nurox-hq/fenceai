import Constants from 'expo-constants';
import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';

const ObjectsMapViewNative = React.lazy(() =>
  import('./ObjectsMapViewNative').then((m) => ({ default: m.ObjectsMapViewNative }))
);

function ExpoGoFallback() {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackTitle}>Карта в Expo Go недоступна</Text>
      <Text style={styles.fallbackText}>
        Чтобы увидеть карту с объектами и геолокацией, соберите приложение:{'\n\n'}
        npx expo run:ios{'\n'}
        или{'\n'}
        npx expo run:android
      </Text>
    </View>
  );
}

function MapLoading() {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" />
      <Text style={styles.loadingText}>Загрузка карты…</Text>
    </View>
  );
}

export function ObjectsMapView() {
  if (isExpoGo) {
    return <ExpoGoFallback />;
  }
  return (
    <Suspense fallback={<MapLoading />}>
      <ObjectsMapViewNative />
    </Suspense>
  );
}

const styles = StyleSheet.create({
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
  fallbackTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  fallbackText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
