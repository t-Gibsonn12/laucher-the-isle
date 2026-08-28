// Legacy routing placeholder.
// The user-facing skin editor and Teleport feature are removed. Keep this
// component temporarily so existing MainWindow routing compiles cleanly until
// the legacy `skin` route is fully removed.
type SkinEditorTabProps = {
  authed: boolean;
  onLogin: () => void;
};

export function SkinEditorTab(_props: SkinEditorTabProps) {
  return null;
}
