import type { ModelListItem } from "@cursor/sdk";

// Generated with @cursor/sdk@1.5.2 from 40 Cursor models.
// Refresh with: npm run refresh:cursor-snapshots -- --write
// Do not add secrets; this file stores public model metadata only.
export const FALLBACK_MODEL_ITEMS = [
	{
		id: "auto-smart",
		displayName: "Auto",
		parameters: [
			{
				id: "optimize_for",
				values: [
					{
						value: "intelligence"
					},
					{
						value: "balanced"
					},
					{
						value: "cost"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "optimize_for",
						value: "intelligence"
					}
				],
				displayName: "Auto Intelligence"
			},
			{
				params: [
					{
						id: "optimize_for",
						value: "balanced"
					}
				],
				displayName: "Auto Balance",
				isDefault: true
			},
			{
				params: [
					{
						id: "optimize_for",
						value: "cost"
					}
				],
				displayName: "Auto Cost"
			}
		]
	},
	{
		id: "claude-fable-5",
		displayName: "Claude Fable 5",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Fable 5",
				isDefault: true
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Fable 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Fable 5"
			}
		]
	},
	{
		id: "claude-fable-5-1",
		displayName: "Claude Fable 5.1",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Fable 5.1",
				isDefault: true
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Fable 5.1"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Fable 5.1"
			}
		]
	},
	{
		id: "claude-haiku-4-5",
		displayName: "Claude Haiku 4.5",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "thinking",
						value: "false"
					}
				],
				displayName: "Claude Haiku 4.5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					}
				],
				displayName: "Claude Haiku 4.5",
				isDefault: true
			}
		]
	},
	{
		id: "claude-opus-4-5",
		displayName: "Claude Opus 4.5",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "thinking",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.5",
				isDefault: true
			}
		]
	},
	{
		id: "claude-opus-4-6",
		displayName: "Claude Opus 4.6",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "200k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "max"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Opus 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Opus 4.6",
				isDefault: true
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Opus 4.6"
			}
		]
	},
	{
		id: "claude-opus-4-7",
		displayName: "Claude Opus 4.7",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7",
				isDefault: true
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.7"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.7"
			}
		]
	},
	{
		id: "claude-opus-4-8",
		displayName: "Claude Opus 4.8",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8",
				isDefault: true
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 4.8"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 4.8"
			}
		]
	},
	{
		id: "claude-opus-5",
		displayName: "Claude Opus 5",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5",
				isDefault: true
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5"
			}
		]
	},
	{
		id: "claude-opus-5-5",
		displayName: "Claude Opus 5.5",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5",
				isDefault: true
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Claude Opus 5.5"
			},
			{
				params: [
					{
						id: "cyber",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Claude Opus 5.5"
			}
		]
	},
	{
		id: "claude-sonnet-4",
		displayName: "Claude Sonnet 4",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "200k"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					}
				],
				displayName: "Claude Sonnet 4",
				isDefault: true
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					}
				],
				displayName: "Claude Sonnet 4"
			}
		]
	},
	{
		id: "claude-sonnet-4-5",
		displayName: "Claude Sonnet 4.5",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "200k"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					}
				],
				displayName: "Claude Sonnet 4.5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					}
				],
				displayName: "Claude Sonnet 4.5",
				isDefault: true
			}
		]
	},
	{
		id: "claude-sonnet-4-6",
		displayName: "Claude Sonnet 4.6",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "200k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "max"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "200k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 4.6",
				isDefault: true
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 4.6"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 4.6"
			}
		]
	},
	{
		id: "claude-sonnet-5",
		displayName: "Claude Sonnet 5",
		parameters: [
			{
				id: "thinking",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			},
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "false"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "300k"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 5",
				isDefault: true
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Sonnet 5"
			},
			{
				params: [
					{
						id: "thinking",
						value: "true"
					},
					{
						id: "context",
						value: "1m"
					},
					{
						id: "effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 5"
			}
		]
	},
	{
		id: "claude-sonnet-5-5",
		displayName: "Claude Sonnet 5.5",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning_effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 5.5  Low"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 5.5  Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 5.5  High"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Sonnet 5.5  Extra High"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 5.5  Max"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Claude Sonnet 5.5 1M Low"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Claude Sonnet 5.5 1M Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Claude Sonnet 5.5 1M High",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					}
				],
				displayName: "Claude Sonnet 5.5 1M Extra High"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "max"
					}
				],
				displayName: "Claude Sonnet 5.5 1M Max"
			}
		]
	},
	{
		id: "composer-2",
		displayName: "Composer 2",
		parameters: [
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Composer 2",
				isDefault: true
			},
			{
				params: [
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Composer 2"
			}
		]
	},
	{
		id: "composer-2.5",
		displayName: "Composer 2.5",
		parameters: [
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Composer 2.5",
				isDefault: true
			},
			{
				params: [
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Composer 2.5"
			}
		]
	},
	{
		id: "default",
		displayName: "Auto",
		variants: [
			{
				params: [],
				displayName: "Auto",
				isDefault: true
			}
		]
	},
	{
		id: "gemini-2.5-flash",
		displayName: "Gemini 2.5 Flash",
		variants: [
			{
				params: [],
				displayName: "Gemini 2.5 Flash",
				isDefault: true
			}
		]
	},
	{
		id: "gemini-3-flash",
		displayName: "Gemini 3 Flash",
		variants: [
			{
				params: [],
				displayName: "Gemini 3 Flash",
				isDefault: true
			}
		]
	},
	{
		id: "gemini-3.1-pro",
		displayName: "Gemini 3.1 Pro",
		variants: [
			{
				params: [],
				displayName: "Gemini 3.1 Pro",
				isDefault: true
			}
		]
	},
	{
		id: "gemini-3.5-flash",
		displayName: "Gemini 3.5 Flash",
		variants: [
			{
				params: [],
				displayName: "Gemini 3.5 Flash",
				isDefault: true
			}
		]
	},
	{
		id: "gemini-4-argon",
		displayName: "Gemini 4 Argon",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning_effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Gemini 4 Argon  Low"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Gemini 4 Argon  Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Gemini 4 Argon  High"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Gemini 4 Argon 1M Low"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Gemini 4 Argon 1M Medium",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Gemini 4 Argon 1M High"
			}
		]
	},
	{
		id: "gemini-4-carbon",
		displayName: "Gemini 4 Carbon",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning_effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Gemini 4 Carbon  Low"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Gemini 4 Carbon  Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Gemini 4 Carbon  High"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Gemini 4 Carbon 1M Low"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Gemini 4 Carbon 1M Medium",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Gemini 4 Carbon 1M High"
			}
		]
	},
	{
		id: "gemini-4-hydrogen",
		displayName: "Gemini 4 Hydrogen",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning_effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Gemini 4 Hydrogen  Low"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Gemini 4 Hydrogen  Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Gemini 4 Hydrogen  High"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					}
				],
				displayName: "Gemini 4 Hydrogen  Extra High"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Gemini 4 Hydrogen 1M Low"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Gemini 4 Hydrogen 1M Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Gemini 4 Hydrogen 1M High",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					}
				],
				displayName: "Gemini 4 Hydrogen 1M Extra High"
			}
		]
	},
	{
		id: "gemini-4-neon",
		displayName: "Gemini 4 Neon",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "300k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning_effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Gemini 4 Neon  Low"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Gemini 4 Neon  Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Gemini 4 Neon  High"
			},
			{
				params: [
					{
						id: "context",
						value: "300k"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					}
				],
				displayName: "Gemini 4 Neon  Extra High"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "low"
					}
				],
				displayName: "Gemini 4 Neon 1M Low"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					}
				],
				displayName: "Gemini 4 Neon 1M Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "high"
					}
				],
				displayName: "Gemini 4 Neon 1M High",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					}
				],
				displayName: "Gemini 4 Neon 1M Extra High"
			}
		]
	},
	{
		id: "gpt-5-mini",
		displayName: "GPT-5 Mini",
		variants: [
			{
				params: [],
				displayName: "GPT-5 Mini",
				isDefault: true
			}
		]
	},
	{
		id: "gpt-5.1",
		displayName: "GPT-5.1",
		parameters: [
			{
				id: "reasoning",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "reasoning",
						value: "low"
					}
				],
				displayName: "GPT-5.1"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "medium"
					}
				],
				displayName: "GPT-5.1",
				isDefault: true
			},
			{
				params: [
					{
						id: "reasoning",
						value: "high"
					}
				],
				displayName: "GPT-5.1"
			}
		]
	},
	{
		id: "gpt-5.2",
		displayName: "GPT-5.2",
		parameters: [
			{
				id: "reasoning",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "extra-high"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.2"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.2"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.2"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.2"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.2"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.2",
				isDefault: true
			},
			{
				params: [
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.2"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.2"
			}
		]
	},
	{
		id: "gpt-5.3-codex",
		displayName: "Codex 5.3",
		parameters: [
			{
				id: "reasoning",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "extra-high"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Codex 5.3"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Codex 5.3"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Codex 5.3"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Codex 5.3"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Codex 5.3"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Codex 5.3",
				isDefault: true
			},
			{
				params: [
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Codex 5.3"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Codex 5.3"
			}
		]
	},
	{
		id: "gpt-5.4",
		displayName: "GPT-5.4",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "272k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning",
				values: [
					{
						value: "none"
					},
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "extra-high"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.4"
			}
		]
	},
	{
		id: "gpt-5.4-mini",
		displayName: "GPT-5.4 Mini",
		parameters: [
			{
				id: "reasoning",
				values: [
					{
						value: "none"
					},
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "reasoning",
						value: "none"
					}
				],
				displayName: "GPT-5.4 Mini"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "low"
					}
				],
				displayName: "GPT-5.4 Mini"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "medium"
					}
				],
				displayName: "GPT-5.4 Mini",
				isDefault: true
			},
			{
				params: [
					{
						id: "reasoning",
						value: "high"
					}
				],
				displayName: "GPT-5.4 Mini"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "xhigh"
					}
				],
				displayName: "GPT-5.4 Mini"
			}
		]
	},
	{
		id: "gpt-5.4-nano",
		displayName: "GPT-5.4 Nano",
		parameters: [
			{
				id: "reasoning",
				values: [
					{
						value: "none"
					},
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "reasoning",
						value: "none"
					}
				],
				displayName: "GPT-5.4 Nano"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "low"
					}
				],
				displayName: "GPT-5.4 Nano"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "medium"
					}
				],
				displayName: "GPT-5.4 Nano",
				isDefault: true
			},
			{
				params: [
					{
						id: "reasoning",
						value: "high"
					}
				],
				displayName: "GPT-5.4 Nano"
			},
			{
				params: [
					{
						id: "reasoning",
						value: "xhigh"
					}
				],
				displayName: "GPT-5.4 Nano"
			}
		]
	},
	{
		id: "gpt-5.5",
		displayName: "GPT-5.5",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "272k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning",
				values: [
					{
						value: "none"
					},
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "extra-high"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "extra-high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.5"
			}
		]
	},
	{
		id: "gpt-5.6-luna",
		displayName: "GPT-5.6 Luna",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "272k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning",
				values: [
					{
						value: "none"
					},
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Luna"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Luna"
			}
		]
	},
	{
		id: "gpt-5.6-sol",
		displayName: "GPT-5.6 Sol",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "272k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning",
				values: [
					{
						value: "none"
					},
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Sol"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Sol"
			}
		]
	},
	{
		id: "gpt-5.6-terra",
		displayName: "GPT-5.6 Terra",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "272k"
					},
					{
						value: "1m"
					}
				]
			},
			{
				id: "reasoning",
				values: [
					{
						value: "none"
					},
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					},
					{
						value: "max"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "272k"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "none"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "GPT-5.6 Terra"
			},
			{
				params: [
					{
						id: "context",
						value: "1m"
					},
					{
						id: "reasoning",
						value: "max"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "GPT-5.6 Terra"
			}
		]
	},
	{
		id: "grok-4.5",
		displayName: "Grok 4.5",
		parameters: [
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.5"
			},
			{
				params: [
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.5"
			},
			{
				params: [
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.5"
			},
			{
				params: [
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.5"
			},
			{
				params: [
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.5"
			},
			{
				params: [
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.5",
				isDefault: true
			}
		]
	},
	{
		id: "grok-4.6",
		displayName: "Grok 4.6",
		parameters: [
			{
				id: "effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.6"
			},
			{
				params: [
					{
						id: "effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.6"
			},
			{
				params: [
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.6"
			},
			{
				params: [
					{
						id: "effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.6"
			},
			{
				params: [
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.6"
			},
			{
				params: [
					{
						id: "effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.6",
				isDefault: true
			},
			{
				params: [
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.6"
			},
			{
				params: [
					{
						id: "effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.6"
			}
		]
	},
	{
		id: "grok-4.7",
		displayName: "Grok 4.7",
		parameters: [
			{
				id: "context",
				values: [
					{
						value: "256k"
					},
					{
						value: "500k"
					}
				]
			},
			{
				id: "reasoning_effort",
				values: [
					{
						value: "low"
					},
					{
						value: "medium"
					},
					{
						value: "high"
					},
					{
						value: "xhigh"
					}
				]
			},
			{
				id: "fast",
				values: [
					{
						value: "false"
					},
					{
						value: "true"
					}
				]
			}
		],
		variants: [
			{
				params: [
					{
						id: "context",
						value: "256k"
					},
					{
						id: "reasoning_effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.7  Low"
			},
			{
				params: [
					{
						id: "context",
						value: "256k"
					},
					{
						id: "reasoning_effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.7  Low Fast​​"
			},
			{
				params: [
					{
						id: "context",
						value: "256k"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.7  Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "256k"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.7  Medium Fast​​"
			},
			{
				params: [
					{
						id: "context",
						value: "256k"
					},
					{
						id: "reasoning_effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.7  High"
			},
			{
				params: [
					{
						id: "context",
						value: "256k"
					},
					{
						id: "reasoning_effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.7  High Fast​​"
			},
			{
				params: [
					{
						id: "context",
						value: "256k"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.7  Extra High"
			},
			{
				params: [
					{
						id: "context",
						value: "256k"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.7  Extra High Fast​​"
			},
			{
				params: [
					{
						id: "context",
						value: "500k"
					},
					{
						id: "reasoning_effort",
						value: "low"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.7  Low"
			},
			{
				params: [
					{
						id: "context",
						value: "500k"
					},
					{
						id: "reasoning_effort",
						value: "low"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.7  Low Fast​​"
			},
			{
				params: [
					{
						id: "context",
						value: "500k"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.7  Medium"
			},
			{
				params: [
					{
						id: "context",
						value: "500k"
					},
					{
						id: "reasoning_effort",
						value: "medium"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.7  Medium Fast​​"
			},
			{
				params: [
					{
						id: "context",
						value: "500k"
					},
					{
						id: "reasoning_effort",
						value: "high"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.7  High"
			},
			{
				params: [
					{
						id: "context",
						value: "500k"
					},
					{
						id: "reasoning_effort",
						value: "high"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.7  High Fast​​",
				isDefault: true
			},
			{
				params: [
					{
						id: "context",
						value: "500k"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "false"
					}
				],
				displayName: "Grok 4.7  Extra High"
			},
			{
				params: [
					{
						id: "context",
						value: "500k"
					},
					{
						id: "reasoning_effort",
						value: "xhigh"
					},
					{
						id: "fast",
						value: "true"
					}
				],
				displayName: "Grok 4.7  Extra High Fast​​"
			}
		]
	}
] satisfies ModelListItem[];
