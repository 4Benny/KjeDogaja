
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import * as Brand from "@/constants/Colors";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onHide: () => void;
}

export function Toast({
  visible,
  message,
  type = "info",
  duration = 3000,
  onHide,
}: ToastProps) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  // Keep the latest onHide in a ref so an inline arrow prop doesn't restart
  // the animation on every parent re-render (which could keep the toast
  // visible forever on screens that re-render frequently).
  const onHideRef = React.useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!visible) return;

    const sequence = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    sequence.start(({ finished }) => {
      if (finished) {
        onHideRef.current();
      }
    });

    return () => {
      sequence.stop();
    };
    // `message` restarts the timer when a new toast replaces a visible one.
  }, [visible, message, duration, opacity]);

  if (!visible) return null;

  const backgroundColor =
    type === "success"
      ? Brand.successGreen
      : type === "error"
      ? Brand.dangerRed
      : Brand.btnPrimaryGradientStart;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View style={[styles.container, { backgroundColor, opacity }]}>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  container: {
    maxWidth: 520,
    width: "90%",
    padding: 16,
    borderRadius: 12,
  },
  message: {
    color: Brand.textPrimary,
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
});
