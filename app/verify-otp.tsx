import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Modal } from "@/components/ui/Modal";
import { supabase } from "@/app/integrations/supabase/client";
import * as Brand from "@/constants/Colors";

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { email, password } = useLocalSearchParams<{
    email: string;
    password: string;
  }>();
  const otpInputRef = useRef<TextInput>(null);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(
    null,
  );

  const emailDisplay = email || "";
  const otpDigits = otp.split("");

  const handleOtpChange = (text: string) => {
    setOtp(text.replace(/[^0-9]/g, "").slice(0, 6));
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError({
        title: "Neveljavna koda",
        message: "Vnesite 6-mestno kodo, poslano na vaš e-poštni naslov",
      });
      return;
    }

    if (!email || !password) {
      setError({
        title: "Napaka",
        message:
          "Manjka e-poštni naslov ali geslo. Poskusite se registrirati znova.",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("[VerifyOTP] Verifying OTP for email:", email);

      // Verify OTP
      const { data: verifyData, error: verifyError } =
        await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });

      if (verifyError) {
        throw verifyError;
      }

      console.log("[VerifyOTP] OTP verified successfully");

      // Wait for session to be established
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error("Session not established after OTP verification");
      }

      console.log("[VerifyOTP] Session established, navigating to onboarding");
      router.replace("/onboarding" as any);
    } catch (err: any) {
      console.error("[VerifyOTP] Error:", err);
      setError({
        title: "Potrditev ni uspela",
        message:
          err.message || "Koda je neveljavna ali je potekla. Poskusite znova.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email || !password) {
      setError({
        title: "Napaka",
        message:
          "Kode ni mogoče ponovno poslati. Poskusite se registrirati znova.",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("[VerifyOTP] Resending verification code");

      // Trigger a new signup to resend the code
      await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "https://natively.dev/email-confirmed",
        },
      });

      setError({
        title: "Koda poslana",
        message: "Nova potrditvena koda je bila poslana na vaš e-poštni naslov",
      });
    } catch (err: any) {
      console.error("[VerifyOTP] Resend error:", err);
      setError({
        title: "Ponovno pošiljanje ni uspelo",
        message:
          err.message ||
          "Kode ni bilo mogoče ponovno poslati. Poskusite znova.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Potrditev e-pošte</Text>
          <Text style={styles.subtitle}>Poslali smo 6-mestno kodo na</Text>
          <Text style={styles.email}>{emailDisplay}</Text>
          <Text style={styles.instruction}>
            Vnesite spodnjo kodo za potrditev računa
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => otpInputRef.current?.focus()}
            style={styles.otpInputContainer}
          >
            {Array.from({ length: 6 }).map((_, index) => {
              const digit = otpDigits[index];
              const isActive = index === otp.length && otp.length < 6;

              return (
                <View
                  key={index}
                  style={[
                    styles.otpCell,
                    digit && styles.otpCellFilled,
                    isActive && styles.otpCellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.otpCellText,
                      digit && styles.otpCellTextFilled,
                    ]}
                  >
                    {digit || ""}
                  </Text>
                </View>
              );
            })}
            <TextInput
              ref={otpInputRef}
              style={styles.hiddenOtpInput}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              caretHidden
              showSoftInputOnFocus
              onSubmitEditing={handleVerifyOTP}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>Potrdi e-pošto</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendCode}
            disabled={loading}
          >
            <Text style={styles.resendButtonText}>
              Niste prejeli kode? Pošlji znova
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {error && (
        <Modal
          visible={!!error}
          title={error.title}
          message={error.message}
          onClose={() => setError(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.primaryGradientStart,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: Brand.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Brand.textSecondary,
    textAlign: "center",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    color: Brand.secondaryGradientEnd,
    textAlign: "center",
    marginBottom: 16,
  },
  instruction: {
    fontSize: 14,
    color: Brand.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  otpInputContainer: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  otpCell: {
    width: 46,
    height: 58,
    borderWidth: 1,
    borderColor: Brand.borderSubtle,
    borderRadius: 16,
    backgroundColor: Brand.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  otpCellActive: {
    borderColor: Brand.accentOrange,
    backgroundColor: Brand.secondaryGradientEnd,
  },
  otpCellFilled: {
    borderColor: Brand.accentOrange,
  },
  otpCellText: {
    fontSize: 26,
    fontWeight: "700",
    color: Brand.textSecondary,
  },
  otpCellTextFilled: {
    color: Brand.textPrimary,
  },
  hiddenOtpInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
    left: 0,
    top: 0,
  },
  verifyButton: {
    height: 50,
    backgroundColor: Brand.accentOrange,
    borderRadius: Brand.borderRadiusInput,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  verifyButtonText: {
    color: Brand.primaryGradientStart,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  resendButtonText: {
    color: Brand.secondaryGradientEnd,
    fontSize: 14,
  },
});
