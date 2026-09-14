import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

export function terminalPrompts(
  input = process.stdin,
  output = process.stdout,
) {
  if (!input.isTTY || !output.isTTY)
    throw new Error(
      "请在本机终端运行 dot-ai-quota setup；AI 自动配置可使用 --non-interactive，见 README 的 AI 提示词。",
    );
  let muted = false;
  const terminal = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) output.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input, output: terminal, terminal: true });
  const controller = new AbortController();
  rl.on("SIGINT", () => controller.abort());
  return {
    say: (text) => output.write(`${text}\n`),
    ask: (text) => rl.question(text, { signal: controller.signal }),
    async secret(text) {
      output.write(text);
      muted = true;
      try {
        return await rl.question("", { signal: controller.signal });
      } finally {
        muted = false;
        output.write("\n");
      }
    },
    close: () => rl.close(),
  };
}
