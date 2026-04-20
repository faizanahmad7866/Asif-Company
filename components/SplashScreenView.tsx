import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  readonly onFinish: () => void;
}

export default function SplashScreenView({ onFinish }: Props) {
  // Animations
  const bgScale = useRef(new Animated.Value(1.15)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Background zooms in subtly
      Animated.timing(bgScale, { toValue: 1, duration: 250, useNativeDriver: true }),

      // 2. Logo fades + scales in
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }),
      ]),

      // 3. Loading bar fills up safely
      Animated.timing(barWidth, { toValue: width * 0.55, duration: 300, useNativeDriver: false }),

      // 4. Short pause then fade out whole screen
      Animated.delay(300),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* White background */}
      <Animated.View style={[styles.bg, { transform: [{ scale: bgScale }] }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image
          source={require('../assets/images/Asif & Company Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Loader bar */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0,
    width, height,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  logoWrap: {
    width: width * 0.75,
    height: width * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  barTrack: {
    width: width * 0.55,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: '#4ADE80',
    borderRadius: 3,
  },
});
