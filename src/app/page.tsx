import { LobbyView } from "@/components/lobby/LobbyView";

export default function LobbyPage() {
  // 伺服器端只需知道「有沒有金鑰」，語言由 layout 的 cookie 決定並在 client 端切換。
  const live = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  return <LobbyView liveAi={live} />;
}
