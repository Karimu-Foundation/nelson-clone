export type ModelId = "claude-sonnet-5" | "claude-haiku-4-5";

export type ModelSpec = {
  id: ModelId;
  label: string;
  /** USD per 1M tokens. */
  inputPrice: number;
  outputPrice: number;
  /** Adaptive thinking + output_config.effort are only on the 5-series models. */
  supportsAdaptiveThinking: boolean;
  supportsEffort: boolean;
  note: string;
};

/**
 * Opus-tier models are deliberately not offered here: review sessions run many
 * turns over a large cached system prompt, and Opus made that too expensive to
 * do freely. `getModel` falls back to the first entry, so a request naming a
 * model that is not on this list is served by Sonnet rather than honoured.
 */
export const MODELS: ModelSpec[] = [
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    inputPrice: 2,
    outputPrice: 10,
    supportsAdaptiveThinking: true,
    supportsEffort: true,
    note: "The default for review sessions — strong judgement at a workable cost.",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    inputPrice: 1,
    outputPrice: 5,
    supportsAdaptiveThinking: false,
    supportsEffort: false,
    note: "Fastest and cheapest; use as a weak baseline when comparing answers.",
  },
];

export const DEFAULT_MODEL: ModelId = "claude-sonnet-5";

export const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORT_LEVELS)[number];
export const DEFAULT_EFFORT: Effort = "medium";

export function getModel(id: string): ModelSpec {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

/**
 * Cache reads bill at 0.1x the input rate, cache writes at 1.25x.
 * Returns USD for one request.
 */
export function estimateCost(
  model: ModelSpec,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  },
): number {
  const m = 1 / 1_000_000;
  return (
    usage.input_tokens * model.inputPrice * m +
    usage.output_tokens * model.outputPrice * m +
    (usage.cache_read_input_tokens ?? 0) * model.inputPrice * 0.1 * m +
    (usage.cache_creation_input_tokens ?? 0) * model.inputPrice * 1.25 * m
  );
}
