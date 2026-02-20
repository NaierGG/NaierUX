import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import type { ContactProfile, TrustState } from "../core";
import type { ContactRequest } from "../state/appStateStore";
import { COLORS, glow } from "../theme/tokens";
import { AppHeader } from "../components/AppHeader";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { normalizePeerId } from "../state/peer";
import { buildInviteQrImageUrl, createInvitePayload, parseInvitePayload } from "../state/invite";

export type NewChatScreenProps = NativeStackScreenProps<RootStackParamList, "NewChat"> & {
  accent: string;
  contacts: ContactProfile[];
  contactRequests: ContactRequest[];
  localPeerId: string;
  localDisplayName: string;
  onStartChat: (peerId: string, name: string, trust?: TrustState) => void;
  onSendFriendRequest: (peerId: string, name?: string) => void;
};

type NdefRecordLike = {
  recordType?: string;
  data?: DataView;
};

type NdefReadingEventLike = {
  message?: {
    records?: NdefRecordLike[];
  };
};

type NdefReaderLike = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: NdefReadingEventLike) => void) | null;
  onreadingerror: (() => void) | null;
};

function decodeNfcTextRecord(record: NdefRecordLike): string | null {
  const data = record.data;
  if (!data || data.byteLength < 1) {
    return null;
  }
  try {
    const status = data.getUint8(0);
    const langLength = status & 0x3f;
    const utf16 = (status & 0x80) !== 0;
    const start = 1 + langLength;
    if (start >= data.byteLength) {
      return null;
    }
    const textBytes = new Uint8Array(data.buffer, data.byteOffset + start, data.byteLength - start);
    return new TextDecoder(utf16 ? "utf-16" : "utf-8").decode(textBytes).trim();
  } catch {
    return null;
  }
}

export function NewChatScreen({
  accent,
  contacts,
  contactRequests,
  localPeerId,
  localDisplayName,
  onStartChat,
  onSendFriendRequest,
}: NewChatScreenProps) {
  const [query, setQuery] = useState("");
  const [manualPeerId, setManualPeerId] = useState("");
  const [manualName, setManualName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [nfcStatus, setNfcStatus] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const nfcAbortRef = useRef<AbortController | null>(null);

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (c) =>
          !query ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.peerId.toLowerCase().includes(query.toLowerCase()),
      ),
    [contacts, query],
  );

  const manualNormalizedPeerId = manualPeerId.trim() ? normalizePeerId(manualPeerId) : "";
  const existingRequest = useMemo(
    () => contactRequests.find((request) => request.peerId === manualNormalizedPeerId) ?? null,
    [contactRequests, manualNormalizedPeerId],
  );
  const localInvitePayload = useMemo(
    () =>
      createInvitePayload({
        peerId: localPeerId,
        name: localDisplayName,
      }),
    [localDisplayName, localPeerId],
  );
  const localInviteQrUrl = useMemo(
    () =>
      buildInviteQrImageUrl({
        peerId: localPeerId,
        name: localDisplayName,
      }),
    [localDisplayName, localPeerId],
  );
  const webNfcSupported = useMemo(() => {
    if (Platform.OS !== "web") {
      return false;
    }
    return typeof (globalThis as any).NDEFReader === "function";
  }, []);

  const applyInviteInput = useCallback(
    (raw: string): boolean => {
      const parsed = parseInvitePayload(raw);
      if (!parsed) {
        setInviteStatus("Invalid invite payload. Expected Naier QR/link format.");
        return false;
      }
      if (normalizePeerId(parsed.peerId) === normalizePeerId(localPeerId)) {
        setInviteStatus("This is your own invite payload.");
        return false;
      }
      setManualPeerId(parsed.peerId);
      if (parsed.name) {
        setManualName(parsed.name);
      }
      setInviteStatus(`Invite applied: ${parsed.peerId}`);
      return true;
    },
    [localPeerId],
  );

  const startNfcScan = useCallback(async () => {
    if (Platform.OS !== "web") {
      setNfcStatus("NFC scan is available on web runtime only.");
      return;
    }
    const NDEFReaderCtor = (globalThis as any).NDEFReader as (new () => NdefReaderLike) | undefined;
    if (typeof NDEFReaderCtor !== "function") {
      setNfcStatus("Web NFC is not supported in this browser/device.");
      return;
    }

    try {
      nfcAbortRef.current?.abort();
      const abortController = new AbortController();
      nfcAbortRef.current = abortController;

      const reader = new NDEFReaderCtor();
      reader.onreadingerror = () => {
        setNfcStatus("NFC read failed. Try another tap.");
      };
      reader.onreading = (event) => {
        const records = event.message?.records ?? [];
        for (const record of records) {
          if (record.recordType !== "text") {
            continue;
          }
          const decoded = decodeNfcTextRecord(record);
          if (!decoded) {
            continue;
          }
          setInviteInput(decoded);
          if (applyInviteInput(decoded)) {
            setNfcStatus("NFC invite detected and applied.");
            abortController.abort();
          } else {
            setNfcStatus("NFC read succeeded, but payload is invalid.");
          }
          return;
        }
        setNfcStatus("NFC tag read, but no text invite payload found.");
      };
      await reader.scan({ signal: abortController.signal });
      setNfcStatus("NFC scan started. Hold your device near a tag.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start NFC scan.";
      setNfcStatus(message);
    }
  }, [applyInviteInput]);

  useEffect(() => {
    return () => {
      nfcAbortRef.current?.abort();
      nfcAbortRef.current = null;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppHeader title="New Chat" subtitle="Search contacts or add by direct peer id" />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search contact / peer id..."
        placeholderTextColor={COLORS.textMuted}
        style={styles.searchInput}
      />

      <Card>
        <Text style={styles.sectionLabel}>Add Contact</Text>
        <Text style={styles.helperText}>Current method: Direct Peer ID (Profile {" > "} Network Peer ID).</Text>
        <View style={styles.methodRow}>
          <View style={[styles.methodChip, { borderColor: glow(accent, 0.3) }]}>
            <Text style={[styles.methodText, { color: accent }]}>Direct ID (Live)</Text>
          </View>
          <View style={[styles.methodChip, { borderColor: glow(accent, 0.2) }]}>
            <Text style={styles.methodText}>QR Invite (Live)</Text>
          </View>
          <View style={styles.methodChip}>
            <Text style={styles.methodText}>NFC (Optional)</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>My Invite QR</Text>
        <Text style={styles.helperText}>
          Share this with friends. It contains your peer id and display name only (no secret key material).
        </Text>
        {qrFailed ? (
          <Text style={styles.warnText}>QR image service unavailable. Share the invite payload text below.</Text>
        ) : (
          <Image source={{ uri: localInviteQrUrl }} style={styles.qrImage} onError={() => setQrFailed(true)} />
        )}
        <Text selectable style={styles.invitePayloadText}>
          {localInvitePayload}
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Paste / Scan Invite</Text>
        <Text style={styles.helperText}>Paste payload from QR scanner, NFC tag, or shared link.</Text>
        <TextInput
          value={inviteInput}
          onChangeText={setInviteInput}
          placeholder="naier://invite?v=1&peerId=peer-..."
          placeholderTextColor={COLORS.textMuted}
          style={[styles.peerInput, styles.inviteInput]}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        {inviteStatus ? <Text style={styles.infoText}>{inviteStatus}</Text> : null}
        <View style={styles.buttonRow}>
          <Pressable
            disabled={!inviteInput.trim()}
            style={[
              styles.manualButton,
              { borderColor: glow(accent, 0.35), backgroundColor: glow(accent, 0.08) },
              !inviteInput.trim() ? styles.manualButtonDisabled : null,
            ]}
            onPress={() => {
              applyInviteInput(inviteInput);
            }}
          >
            <Text style={[styles.manualButtonText, { color: accent }]}>Apply Invite Payload</Text>
          </Pressable>
          <Pressable
            style={[styles.manualButton, { borderColor: COLORS.glassBorder, backgroundColor: COLORS.bgElevated }]}
            onPress={() => {
              void startNfcScan();
            }}
          >
            <Text style={styles.secondaryButtonText}>Start NFC Scan (Web)</Text>
          </Pressable>
        </View>
        <Text style={styles.helperSubText}>
          NFC support: {webNfcSupported ? "Supported in this browser" : "Not supported in this runtime"}
        </Text>
        {nfcStatus ? <Text style={styles.infoText}>{nfcStatus}</Text> : null}
      </Card>

      {filteredContacts.map((contact) => (
        <View key={contact.peerId} style={styles.contactCard}>
          <Avatar label={contact.name} online={contact.online} borderColor={COLORS.glassBorderHover} />
          <View style={styles.contactMeta}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactPeer}>{contact.peerId}</Text>
          </View>
          <Pressable
            style={[styles.startButton, { borderColor: glow(accent, 0.4), backgroundColor: glow(accent, 0.08) }]}
            onPress={() => onStartChat(contact.peerId, contact.name, contact.trust)}
          >
            <Text style={[styles.startButtonText, { color: accent }]}>Start</Text>
          </Pressable>
        </View>
      ))}

      <Card>
        <Text style={styles.sectionLabel}>Direct Peer ID</Text>
        <Text style={styles.helperText}>Paste the peer id your friend shared with you.</Text>
        <TextInput
          value={manualPeerId}
          onChangeText={setManualPeerId}
          placeholder="peer-custom-id"
          placeholderTextColor={COLORS.textMuted}
          style={styles.peerInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          value={manualName}
          onChangeText={setManualName}
          placeholder="Display name (optional)"
          placeholderTextColor={COLORS.textMuted}
          style={styles.peerInput}
        />
        {existingRequest ? (
          <Text style={styles.pendingText}>
            Pending request: {existingRequest.direction === "incoming" ? "Incoming" : "Outgoing"}
          </Text>
        ) : null}
        <View style={styles.buttonRow}>
          <Pressable
            disabled={!manualPeerId.trim()}
            style={[
              styles.manualButton,
              { borderColor: glow(accent, 0.35), backgroundColor: glow(accent, 0.08) },
              !manualPeerId.trim() ? styles.manualButtonDisabled : null,
            ]}
            onPress={() => {
              const peerId = manualPeerId.trim();
              if (!peerId) {
                return;
              }
              const name = manualName.trim() || normalizePeerId(peerId);
              onStartChat(peerId, name, "unverified");
              setManualPeerId("");
              setManualName("");
            }}
          >
            <Text style={[styles.manualButtonText, { color: accent }]}>Start Secure Chat</Text>
          </Pressable>
          <Pressable
            disabled={!manualPeerId.trim()}
            style={[
              styles.manualButton,
              { borderColor: COLORS.glassBorder, backgroundColor: COLORS.bgElevated },
              !manualPeerId.trim() ? styles.manualButtonDisabled : null,
            ]}
            onPress={() => {
              const peerId = manualPeerId.trim();
              if (!peerId) {
                return;
              }
              onSendFriendRequest(peerId, manualName.trim() || undefined);
            }}
          >
            <Text style={styles.secondaryButtonText}>Send Friend Request</Text>
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.inputBg,
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 10,
  },
  helperSubText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  methodRow: {
    flexDirection: "row",
    gap: 10,
  },
  methodChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.bgElevated,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  qrImage: {
    width: 220,
    height: 220,
    alignSelf: "center",
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  invitePayloadText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: "monospace",
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 10,
    padding: 10,
    lineHeight: 16,
  },
  inviteInput: {
    height: 86,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  warnText: {
    color: COLORS.warn,
    fontSize: 12,
    marginBottom: 10,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
  },
  contactMeta: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactPeer: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  startButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  peerInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.inputBg,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    fontSize: 13,
    marginBottom: 10,
  },
  pendingText: {
    color: COLORS.warn,
    fontSize: 12,
    marginBottom: 8,
  },
  buttonRow: {
    gap: 8,
  },
  manualButton: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  manualButtonDisabled: {
    opacity: 0.45,
  },
  manualButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
});
