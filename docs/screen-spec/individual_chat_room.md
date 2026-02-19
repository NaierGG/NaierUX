# Naier Screen Spec: Individual Chat Room

Date: 2026-02-19  
Target Device: iPhone 16 Pro (Black Titanium), status bar fixed at `9:41`, full signal, `87%` battery

## 1) Detailed Screen Description (Figma-ready)

Frame:
- Size: `1179 x 2556` (3x for iPhone 16 Pro), design base at `393 x 852`
- Background: vertical gradient `#000000 -> #0A0A0A`
- Overlay: subtle monochrome noise at `4%` opacity

Top area:
- Status bar fixed top (`54` height in design base)
- Chat header (`64` height):
  - Left: back icon button `28 x 28`, avatar `36 x 36`
  - Center: name `Astra`, trust badge `Verified`
  - Right: voice call + video call icon buttons `28 x 28`
  - Subline: route badge + latency (`Direct P2P | 48ms`)

Message area:
- Scroll container with `16` horizontal padding and `8` vertical gap
- My messages:
  - Background `#1A1A1A`
  - Border `1px #00D4FF`
  - Neon glow `0 0 12 #00D4FF20`
  - Radius `8`
- Peer messages:
  - Background `#151515`
  - Border `1px #202020`
  - Radius `8`
- Bubble max width: `78%`
- Metadata row in each bubble:
  - Timestamp, delivery state, optional expiry tag

Security strip above composer:
- Left: `Screenshot block: ON`
- Middle: `Anti-delete: ON`
- Right: `Queue in-flight: N`

Composer:
- Height: `52`
- Left buttons: attachment, voice (`28 x 28`)
- Middle input: encrypted text field
- Right send button: `76 x 52`, radius `4`, neon pulse on press

## 2) Exact Component Specs (Size/Spacing/States)

Layout:
- Global horizontal gutter: `16`
- Top spacing between header and first bubble: `12`
- Bubble vertical gap: `8`
- Bubble internal padding: `10`

Header states:
- `verified`: trust text green `#39FF14`
- `unverified`: text secondary `#AAAAAA`
- `key_changed`: alert `#FF2E63` + warning dot

Route badge states:
- `Direct P2P`: text and border `#39FF14`
- `2-hop Relay`: text and border `#00D4FF`
- `Tor`: text and border `#FF2E63`

Message states:
- `sending`: subtle shimmer bar at bubble bottom
- `sent`: check icon muted gray
- `failed`: red retry icon + tap to resend
- `expired`: replaced with `Message expired` placeholder

Composer states:
- Idle: border `#272727`
- Focus: border `#00D4FF`
- Send disabled: opacity `0.45`
- Send pressed: `200ms` neon pulse

## 3) Color + Typography Codes

Color tokens:
- Background: `#000000`, `#0A0A0A`
- Card: `#111111`
- My bubble: `#1A1A1A`
- Peer bubble: `#151515`
- Accent main: `#00FF9D`
- Accent cyber: `#00D4FF`
- Alert: `#FF2E63`
- Highlight: `#7C3AED`
- Text primary: `#F0F0F0`
- Text secondary: `#AAAAAA`

Typography:
- Heading: SF Pro Display `600`, tracking `-0.01em`
- Body: Inter `400/500`, tracking `-0.01em`
- Header title: `18/24`
- Header subtitle: `12/16`
- Message body: `14/20`
- Metadata: `11/14`

## 4) User Flow Explanation

1. User opens 1:1 chat from chat list.
2. Header shows trust status and active route (`Direct P2P`, `2-hop Relay`, or `Tor`).
3. User types message and presses send.
4. Message is locally queued and marked `sending`.
5. Transport attempts current route; on failure, fallback route applies.
6. Bubble state updates to `sent` or `failed`.
7. If disappearing mode is enabled, expiry timer appears and message transitions to expired placeholder.

## 5) Ultra-realistic 4K Mobile UI Prompt

`Ultra-realistic 4K product render of a premium privacy messenger app called Naier on iPhone 16 Pro Black Titanium, cyberpunk minimal black UI, pure black gradient background with subtle film noise, neon cyan and neon green accents, status bar showing 9:41 full signal 87% battery, individual chat room with secure message bubbles (my bubble dark graphite with cyan edge glow, received bubble charcoal), top header with verified contact badge and route label "Direct P2P | 48ms", security strip showing screenshot block ON and anti-delete ON, refined SF Pro + Inter typography, soft glass reflections on device frame, studio lighting, high contrast, Apple-level polish, no clutter, realistic hand-held perspective, sharp details.`

## 6) Code: React Native + Tailwind (NativeWind)

```tsx
import React, { useState } from "react";
import { SafeAreaView, Text, View, TextInput, Pressable, ScrollView } from "react-native";

type RouteMode = "Direct P2P" | "2-hop Relay" | "Tor";
type Msg = { id: string; me: boolean; text: string; meta: string };

const routeColor: Record<RouteMode, string> = {
  "Direct P2P": "#39FF14",
  "2-hop Relay": "#00D4FF",
  Tor: "#FF2E63",
};

export default function IndividualChatRoom() {
  const [route] = useState<RouteMode>("Direct P2P");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { id: "1", me: false, text: "Handshake complete. Route is onion relay.", meta: "09:21 | sent" },
    { id: "2", me: true, text: "Set timer to 5 minutes for this thread.", meta: "09:22 | sent" },
  ]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: `${Date.now()}`, me: true, text, meta: "now | sending" }]);
    setDraft("");
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="h-6 flex-row items-center justify-between px-4 border-b border-[#151515]">
        <Text className="text-[#F0F0F0] text-xs">9:41</Text>
        <Text className="text-[#F0F0F0] text-xs">|||| 87%</Text>
      </View>

      <View className="px-4 pt-3 pb-2 border-b border-[#151515]">
        <Text className="text-[#F0F0F0] text-lg font-semibold tracking-tight">Astra</Text>
        <Text className="text-xs mt-1" style={{ color: routeColor[route] }}>
          {route} | 48ms
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 py-3">
        {messages.map((msg) => (
          <View
            key={msg.id}
            className={`mb-2 max-w-[78%] rounded-lg border px-3 py-2 ${msg.me ? "self-end bg-[#1A1A1A]" : "self-start bg-[#151515]"}`}
            style={{
              borderColor: msg.me ? "#00D4FF" : "#202020",
              shadowColor: msg.me ? "#00D4FF" : "transparent",
              shadowOpacity: msg.me ? 0.2 : 0,
              shadowRadius: 10,
            }}
          >
            <Text className="text-[#F0F0F0] text-[14px] leading-5">{msg.text}</Text>
            <Text className="text-[#AAAAAA] text-[11px] mt-1">{msg.meta}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="px-4 pb-2">
        <View className="rounded-xl border border-[#1E1E1E] bg-[#111111] px-3 py-2 mb-2">
          <Text className="text-[#AAAAAA] text-xs">Screenshot block: ON | Anti-delete: ON</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Encrypted message"
            placeholderTextColor="#AAAAAA"
            className="flex-1 h-[52px] rounded-lg border border-[#272727] bg-[#111111] px-3 text-[#F0F0F0]"
          />
          <Pressable
            onPress={send}
            className="h-[52px] min-w-[76px] items-center justify-center rounded"
            style={{ borderWidth: 1, borderColor: "#00FF9D" }}
          >
            <Text className="text-[#00FF9D] font-semibold text-[13px]">Send</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
```

## 7) Code: Flutter (Dark Theme)

```dart
import 'package:flutter/material.dart';

class IndividualChatRoomPage extends StatefulWidget {
  const IndividualChatRoomPage({super.key});

  @override
  State<IndividualChatRoomPage> createState() => _IndividualChatRoomPageState();
}

class _IndividualChatRoomPageState extends State<IndividualChatRoomPage> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [
    {"me": false, "text": "Handshake complete. Route is onion relay.", "meta": "09:21 | sent"},
    {"me": true, "text": "Set timer to 5 minutes for this thread.", "meta": "09:22 | sent"},
  ];

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add({"me": true, "text": text, "meta": "now | sending"});
      _controller.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              height: 24,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFF151515))),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("9:41", style: TextStyle(color: Color(0xFFF0F0F0), fontSize: 12)),
                  Text("|||| 87%", style: TextStyle(color: Color(0xFFF0F0F0), fontSize: 12)),
                ],
              ),
            ),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFF151515))),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Astra", style: TextStyle(color: Color(0xFFF0F0F0), fontSize: 18, fontWeight: FontWeight.w600)),
                  SizedBox(height: 4),
                  Text("Direct P2P | 48ms", style: TextStyle(color: Color(0xFF39FF14), fontSize: 12)),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final me = msg["me"] as bool;
                  return Align(
                    alignment: me ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      constraints: const BoxConstraints(maxWidth: 300),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: me ? const Color(0xFF1A1A1A) : const Color(0xFF151515),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: me ? const Color(0xFF00D4FF) : const Color(0xFF202020)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(msg["text"], style: const TextStyle(color: Color(0xFFF0F0F0), fontSize: 14, height: 1.35)),
                          const SizedBox(height: 4),
                          Text(msg["meta"], style: const TextStyle(color: Color(0xFFAAAAAA), fontSize: 11)),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF111111),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E1E1E)),
                    ),
                    child: const Text(
                      "Screenshot block: ON | Anti-delete: ON",
                      style: TextStyle(color: Color(0xFFAAAAAA), fontSize: 12),
                    ),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 52,
                          decoration: BoxDecoration(
                            color: const Color(0xFF111111),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF272727)),
                          ),
                          child: TextField(
                            controller: _controller,
                            style: const TextStyle(color: Color(0xFFF0F0F0)),
                            decoration: const InputDecoration(
                              hintText: "Encrypted message",
                              hintStyle: TextStyle(color: Color(0xFFAAAAAA)),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 52,
                        width: 76,
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF00FF9D)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                          ),
                          onPressed: _send,
                          child: const Text("Send", style: TextStyle(color: Color(0xFF00FF9D), fontSize: 13)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

## 8) Iteration-ready Improvement Directions

1. Add per-message trust tooltips (cipher suite, ratchet epoch, send route) to improve transparency.
2. Introduce adaptive route policy (latency threshold based auto-switch with user override lock).
3. Add secure media tray with encrypted preview and chunk-transfer progress for large files.
