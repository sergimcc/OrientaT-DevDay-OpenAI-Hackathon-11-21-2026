import type { UseChatHelpers } from "@ai-sdk/react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { LockIcon, MicIcon, PhoneOffIcon, PuzzleIcon, RotateCcwIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import type { ToolPart } from "@/components/ai-elements/tool";
import { LogoMark } from "@/components/brand/logo";
import { AskContext, ToolResultCard, UserWordsContext } from "@/components/chat/tool-cards";
import { VoiceOrb } from "@/components/chat/voice-orb";
import { useVoiceSession } from "@/components/chat/use-voice-session";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n";
import { cn } from "@/lib/utils";

export type ChatHelpers = UseChatHelpers<UIMessage>;

/**
 * The assistant, embedded in the landing hero. Empty, it is just a prompt box with a few
 * suggestions; once the conversation starts it opens into a full panel.
 */
export function ChatPanel({ chat, className }: { chat: ChatHelpers; className?: string }) {
  const { messages, sendMessage, status, stop, setMessages } = chat;
  const { t } = useI18n();
  const voice = useVoiceSession({
    onText: text => sendMessage({ text }),
    busy: status === "submitted" || status === "streaming",
    replies: messages.filter(message => message.role === "assistant").map(message => ({
      id: message.id, text: message.parts.filter(part => part.type === "text").map(part => part.text).join("\n"),
    })),
    onGreeting: text => setMessages(current => [...current, {
      id: `voice-greeting-${crypto.randomUUID()}`, role: "assistant", parts: [{ type: "text", text }],
    }]),
  });
  const voiceActive = voice.status !== "idle";
  const voiceLabel = voiceActive ? t.chat.voice.stop : t.chat.voice.start;
  // The first suggestion is about the extension, so it gets the puzzle icon.
  const sugerencias = t.chat.suggestions.map((text, i) => ({ text, icon: i === 0 ? PuzzleIcon : undefined }));
  const send = (text: string) => {
    if (text.trim()) sendMessage({ text });
  };
  const empty = messages.length === 0;
  const userWords = messages
    .filter((m) => m.role === "user")
    .map((m) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim())
    .filter(Boolean);
  // The orb is drawn at its in-call size and scaled down while idle, so it can grow in place.
  // In a call it lifts to the vertical middle of the card and keeps an even margin around it.
  const orb = empty ? { size: 104, rest: 52, lift: 43, inset: 8 } : { size: 62, rest: 44, lift: 19, inset: 4 };
  const composer = (
    <PromptInput
      className={cn(
        "[&_[data-slot=input-group]]:bg-card",
        empty &&
          "[&_[data-slot=input-group]]:rounded-[24px] [&_[data-slot=input-group]]:border-foreground/10 [&_[data-slot=input-group]]:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_20px_48px_-24px_rgb(0_0_0/0.25)]",
        !empty && "[&_[data-slot=input-group]]:rounded-2xl"
      )}
      onSubmit={(m: PromptInputMessage) => send(m.text)}
    >
      <PromptInputBody>
        <PromptInputTextarea
          className={cn(
            empty ? "min-h-24 px-5 pt-5 text-[17px] md:text-[17px]" : "min-h-11 px-3.5 pt-3 text-[15px] md:text-[15px]",
            "placeholder:text-muted-foreground/70",
            // Keeps what the person types clear of the grown orb.
            voiceActive && (empty ? "pr-36" : "pr-24")
          )}
          placeholder={empty ? t.chat.placeholderEmpty : t.chat.placeholder}
        />
      </PromptInputBody>
      <PromptInputFooter className={cn(empty ? "px-4 pb-4" : "px-3 pb-3")}>
        <PromptInputTools>
          <span className="flex items-center gap-1.5 px-1 text-xs font-normal text-muted-foreground">
            {voiceActive ? (
              <span role="status">{voice.status === "connecting" ? t.chat.voice.connecting : t.chat.voice.connected}</span>
            ) : (
              <><LockIcon className="size-3 shrink-0" /> {t.chat.footnote}</>
            )}
          </span>
        </PromptInputTools>
        <div className="flex shrink-0 items-center gap-1">
          {voiceActive ? (
            <Button
              aria-label={t.chat.voice.stop}
              className="size-9 rounded-full"
              onClick={voice.stop}
              size="icon"
              title={t.chat.voice.stop}
              type="button"
              variant="destructive"
            >
              <PhoneOffIcon aria-hidden="true" />
            </Button>
          ) : (
            <PromptInputSubmit
              className="size-9 rounded-full bg-brand-red-solid text-white hover:bg-brand-red-solid/90"
              onStop={stop}
              status={status}
            />
          )}
          <button
            aria-label={voiceLabel}
            aria-pressed={voiceActive}
            className="group relative z-10 h-9 outline-none transition-[width] duration-500 ease-out motion-reduce:transition-none"
            onClick={voiceActive ? voice.stop : () => void voice.start()}
            style={{ width: voiceActive ? orb.size + orb.inset : orb.rest }}
            title={voiceLabel}
            type="button"
          >
            <span
              className={cn(
                "absolute top-1/2 right-0 grid origin-right place-items-center rounded-full ring-ring transition-[transform,filter] duration-500 ease-out group-focus-visible:ring-4 motion-reduce:transition-none",
                !voiceActive && "group-hover:brightness-110"
              )}
              style={{
                width: orb.size,
                height: orb.size,
                marginTop: -orb.size / 2,
                transform: voiceActive
                  ? `translate(${-orb.inset}px, ${-orb.lift}px)`
                  : `scale(${orb.rest / orb.size})`,
              }}
            >
              <VoiceOrb
                getLevels={voice.getLevels}
                size={orb.size}
                state={voice.status === "idle" ? "idle" : voice.status === "connecting" ? "connecting" : "live"}
              />
              <MicIcon
                aria-hidden="true"
                className={cn(
                  "absolute size-[42%] text-white drop-shadow-[0_2px_2px_rgb(0_0_0/0.35)] transition-opacity duration-300",
                  voiceActive && "opacity-0"
                )}
              />
            </span>
          </button>
        </div>
      </PromptInputFooter>
      {voice.error && <p className="px-4 pb-3 text-xs text-destructive" role="alert">{t.chat.voice[voice.error]}</p>}
    </PromptInput>
  );

  if (empty) {
    return (
      <div className={cn("max-w-2xl", className)}>
        {composer}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {sugerencias.map((s) => (
            <button
              key={s.text}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3.5 py-1.5 text-[13px] text-foreground/75 transition-colors hover:border-brand-red/40 hover:text-brand-red"
              onClick={() => send(s.text)}
              type="button"
            >
              {s.icon && <s.icon className="size-3.5 text-brand-red" />}
              {s.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <AskContext.Provider value={send}>
      <UserWordsContext.Provider value={userWords}>
        <div
          className={cn(
            "flex h-[680px] max-h-[calc(100dvh-6rem)] min-h-[460px] max-w-3xl flex-col overflow-hidden rounded-3xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_60px_-24px_rgb(0_0_0/0.18)]",
            className
          )}
        >
          <header className="flex items-center gap-2.5 border-b px-4 py-2.5">
            <LogoMark size={22} />
            <p className="flex-1 text-sm font-medium">{t.chat.title}</p>
            <button
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => {
                stop();
                voice.stop();
                setMessages([]);
              }}
              type="button"
            >
              <RotateCcwIcon className="size-3.5" /> {t.chat.reset}
            </button>
          </header>

          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="gap-6 px-5 py-6">
              {messages.map((m, i) => (
                <ChatMessage key={m.id} message={m} streaming={status === "streaming" && i === messages.length - 1} />
              ))}
              {status === "submitted" && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-brand-red" />
                  <Shimmer>{t.chat.reading}</Shimmer>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t p-3">{composer}</div>
        </div>
      </UserWordsContext.Provider>
    </AskContext.Provider>
  );
}

function ChatMessage({ message, streaming }: { message: UIMessage; streaming: boolean }) {
  const sources = message.parts.filter((p) => p.type === "source-url");

  return (
    <Message from={message.role}>
      <MessageContent className="w-full">
        {message.parts.map((part, i) => {
          const key = `${message.id}-${i}`;
          if (part.type === "text") return <MessageResponse key={key}>{part.text}</MessageResponse>;
          if (part.type === "reasoning") {
            return (
              <Reasoning key={key} className="mb-0" isStreaming={streaming && part.state === "streaming"}>
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
          }
          if (isToolUIPart(part)) return <ToolBlock key={key} part={part} />;
          return null;
        })}
        {sources.length > 0 && (
          <Sources className="mb-0">
            <SourcesTrigger count={sources.length} />
            <SourcesContent>
              {sources.map((s) => (
                <Source key={s.sourceId} href={s.url} title={s.title ?? s.url} />
              ))}
            </SourcesContent>
          </Sources>
        )}
      </MessageContent>
    </Message>
  );
}

function ToolBlock({ part }: { part: ToolPart }) {
  const { t } = useI18n();
  const name = getToolName(part);
  const label = t.tools[name] ?? { running: `${name}…`, done: name };

  if (part.state !== "output-available") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-brand-red" />
        <Shimmer>{label.running}</Shimmer>
      </div>
    );
  }

  return (
    <ToolResultCard name={name} output={part.output} />
  );
}
