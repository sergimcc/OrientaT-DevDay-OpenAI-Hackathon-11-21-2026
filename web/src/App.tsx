import { useChat } from "@ai-sdk/react";
import { useEffect } from "react";
import { ChatPanel } from "@/components/chat/chat";
import { ExtensionSection, HeroCopy, SiteFooter, SiteHeader } from "@/components/landing/sections";
import { useI18n } from "@/i18n/i18n";
import { MockTramitesTransport } from "@/lib/mock-transport";

const transport = new MockTramitesTransport();

/** Public landing: the assistant first, then how the browser extension works. */
export default function App() {
  const { lang } = useI18n();
  // Switching language changes the next replies; earlier messages stay as they were.
  useEffect(() => transport.setLang(lang), [lang]);
  const chat = useChat({ transport });
  const ask = (text: string) => chat.sendMessage({ text });

  // ?q=… opens the page with that question already asked (links from the extension, shares).
  // Deferred and cancelled on cleanup, so React's dev double-mount sends it once, to the live chat.
  const { sendMessage } = chat;
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    const id = setTimeout(() => {
      sendMessage({ text: q });
      window.history.replaceState(null, "", window.location.pathname);
    }, 0);
    return () => clearTimeout(id);
  }, [sendMessage]);

  return (
    <div className="min-h-dvh bg-background" id="top">
      <SiteHeader onAsk={ask} />
      <main>
        <section className="scroll-mt-16" id="asistente">
          <div className="mx-auto max-w-5xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
            <HeroCopy />
            <ChatPanel chat={chat} className="mx-auto mt-9" />
          </div>
        </section>
        <ExtensionSection onAsk={ask} />
      </main>
      <SiteFooter />
    </div>
  );
}
