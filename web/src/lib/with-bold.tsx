/** Renders the `**bold**` spans of a short UI string (used for translated texts with emphasis). */
export function withBold(text: string, boldClassName?: string) {
  return text.split("**").map((part, i) =>
    i % 2 ? (
      <b key={i} className={boldClassName}>
        {part}
      </b>
    ) : (
      part
    )
  );
}
