import { Animated, StyleSheet } from 'react-native';

export default function NameInput({ placeholder, value, onChange, height }) {
  return (
    <Animated.TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      placeholderTextColor="#9A9A9A"
      style={[styles.input, { height }]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '46%',
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: '#FFF',
  },
});
