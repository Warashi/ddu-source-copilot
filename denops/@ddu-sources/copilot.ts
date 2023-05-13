import {
  BaseSource,
  Context,
  DduOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.2.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v2.8.3/deps.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_word@v0.1.0/word.ts";
import { ensure } from "https://deno.land/x/denops_std@v4.1.5/buffer/mod.ts";
import { delay } from "https://deno.land/std@0.184.0/async/delay.ts";

type Params = Record<never, never>;

type Suggestion = {
  displayText: string;
  text: string;
  uuid: string;
};

type Copilot = {
  first?: {
    status: string;
    result?: {
      completions?: Suggestion[];
    };
  };
  cycling?: {
    status: string;
    result?: {
      completions?: Suggestion[];
    };
  };
  suggestions?: Suggestion[];
};

function convert(suggestion: Suggestion): Item<ActionData> {
  return {
    word: suggestion.text,
    display: suggestion.text,
    kind: "word",
    action: {
      text: suggestion.displayText,
    },
  };
}

export class Source extends BaseSource<Params> {
  override kind = "word";

  override gather(args: {
    denops: Denops;
    context: Context;
    options: DduOptions;
    sourceOptions: SourceOptions;
    sourceParams: Params;
    input: string;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        if (!(await fn.exists(args.denops, "*copilot#Complete"))) {
          controller.close();
          return;
        }

        await ensure(args.denops, args.context.bufNr, async () => {
          await args.denops.call("copilot#Suggest");
        });

        let uuids: string[] = [];

        while (true) {
          const copilot = await fn.getbufvar(
            args.denops,
            args.context.bufNr,
            "_copilot",
            {},
          ) as Copilot;
          if (
            copilot.first != null && copilot.first.status !== "running"
          ) {
            const suggestions = copilot.first?.result?.completions ?? [];
            uuids = suggestions.map((suggestion) => suggestion.uuid);
            const items = suggestions.map(convert);

            controller.enqueue(items);
            break;
          }
          await delay(10);
        }

        await ensure(args.denops, args.context.bufNr, async () => {
          await args.denops.call("copilot#Suggest");
          await args.denops.call("copilot#Next");
          await args.denops.call("copilot#Previous");
        });

        while (true) {
          const copilot = await fn.getbufvar(
            args.denops,
            args.context.bufNr,
            "_copilot",
            {},
          ) as Copilot;
          if (copilot.cycling != null && copilot.cycling.status !== "running") {
            const suggestions = copilot.suggestions ?? [];
            const items = suggestions.filter((suggestion) =>
              !uuids.includes(suggestion.uuid)
            ).map(convert);

            controller.enqueue(items);
            break;
          }
          await delay(10);
        }

        controller.close();
      },
    });
  }

  override params(): Params {
    return {};
  }
}
