import {
  BaseSource,
  DduOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.2.0/types.ts";
import { batch, Denops, fn } from "https://deno.land/x/ddu_vim@v2.8.3/deps.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_word@v0.1.0/word.ts";
import { delay } from "https://deno.land/std@0.184.0/async/delay.ts";

type Params = Record<never, never>;

type Suggestion = {
  displayText: string;
  position: { character: number; line: number };
  range: {
    start: { character: number; line: number };
    end: { character: number; line: number };
  };
  text: string;
  uuid: string;
};

export class Source extends BaseSource<Params> {
  override kind = "word";

  override gather(args: {
    denops: Denops;
    options: DduOptions;
    sourceOptions: SourceOptions;
    sourceParams: Params;
    input: string;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        console.log(await fn.execute(args.denops, "lua =vim.fn.bufnr()"))

        if (!(await fn.exists(args.denops, "*copilot#Complete"))) {
          controller.close();
          return;
        }

        await batch(args.denops, async (denops: Denops) => {
          await denops.call("copilot#Suggest");
          await denops.call("copilot#Next");
          await denops.call("copilot#Previous");
        });

        while (!(await fn.exists(args.denops, "b:_copilot.suggestions"))) {
          await delay(10);
        }

        const suggestions = await args.denops.call(
          "eval",
          "b:_copilot.suggestions",
        ) as Suggestion[];

        const items = suggestions.map(({ text }) => {
          return {
            word: text,
            display: text,
            kind: "word",
            action: {
              text: text,
            },
          };
        });

        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override params(): Params {
    return {};
  }
}
