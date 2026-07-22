import { useState } from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';
import { getMemoryFootprint } from 'react-native-memory-footprint';

function formatBytes(bytes: number): string {
  if (bytes < 0) return 'unavailable';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function App() {
  const [footprint, setFootprint] = useState(() => getMemoryFootprint());

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Memory footprint</Text>
      <Text style={styles.value}>{formatBytes(footprint)}</Text>
      <Text style={styles.raw}>{footprint} bytes</Text>
      <View style={styles.spacer} />
      <Button
        title="Refresh"
        onPress={() => setFootprint(getMemoryFootprint())}
      />
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
