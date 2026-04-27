import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function DateInput({ value, onPress, icon }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.text}>{value || 'Select date'}</Text>
      <Image source={icon} style={styles.icon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  text: { fontSize: 16 },
  icon: { width: 24, height: 24, tintColor: '#000' },
});
