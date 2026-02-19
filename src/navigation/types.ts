export type RootStackParamList = {
  Splash: undefined;
  Recovery: undefined;
  Home: undefined;
  NewChat: undefined;
  Chat: { peerId: string; peerName: string };
  Group: { groupId: string };
  Call: { peerId: string; mode: "voice" | "video" };
  Contacts: undefined;
  Profile: undefined;
  Settings: undefined;
  Appearance: undefined;
  Backup: undefined;
};
