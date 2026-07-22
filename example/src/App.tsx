import { useState } from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';
import { getMemoryFootprint } from 'react-native-memory-footprint';

function formatBytes(bytes: number): string {
  if (bytes < 0) return 'unavailable';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function measureFootprint(): { footprint: number; elapsedMs: number } {
  const start = performance.now();
  const footprint = getMemoryFootprint();
  const elapsedMs = performance.now() - start;
  return { footprint, elapsedMs };
}

export default function App() {
  const [{ footprint, elapsedMs }, setResult] = useState(measureFootprint);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Memory footprint</Text>
      <Text style={styles.value}>{formatBytes(footprint)}</Text>
      <Text style={styles.raw}>{elapsedMs.toFixed(2)} ms</Text>
      <View style={styles.spacer} />
      <Button title="Refresh" onPress={() => setResult(measureFootprint())} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    marginVertical: 8,
  },
  raw: {
    fontSize: 14,
    color: '#999',
  },
  spacer: {
    height: 24,
  },
});
