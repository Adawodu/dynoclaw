export const OPENCLAW_VERSION = "2026.3.8";

export type {
  DeployConfig,
  GcpConfig,
  BrandingConfig,
  TelegramConfig,
  ModelsConfig,
  PluginMeta,
  ApiKeyMeta,
  SkillMeta,
  PresetConfig,
  CloudDeployer,
} from "./types";

export {
  PLUGIN_REGISTRY,
  PLATFORM_SECRETS,
  getAllSecretNames,
  getPluginById,
  getRequiredApiKeys,
} from "./plugins";

export {
  SKILL_REGISTRY,
  getSkillById,
} from "./skills";

export {
  BUILT_IN_PRESETS,
} from "./presets";
