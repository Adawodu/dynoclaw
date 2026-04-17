"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PLUGIN_REGISTRY, SKILL_REGISTRY } from "@dynoclaw/shared";
import type { WizardState } from "@/app/(dashboard)/deploy/page";

interface Props {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}

// Recommended plugins for quick start (pre-checked for new users)
const RECOMMENDED_PLUGINS = new Set([
  "clarify-ai",
  "convex-knowledge",
  "web-tools",
]);

// Plugins that are advanced / most users don't need right away
const ADVANCED_PLUGINS = new Set([
  "hubspot",
  "zoho",
  "twitter-research",
  "youtube-transcriber",
  "dynoclux",
  "dynosist",
  "job-search",
]);

// Recommended skills
const RECOMMENDED_SKILLS = new Set([
  "daily-briefing",
  "meeting-debrief",
  "crm-pipeline",
]);

export function StepTools({ state, update }: Props) {
  const enabledPluginCount = Object.values(state.plugins).filter(Boolean).length;
  const enabledSkillCount = Object.values(state.skills).filter(Boolean).length;

  // Split plugins into recommended vs others
  const recommendedPlugins = PLUGIN_REGISTRY.filter((p) => RECOMMENDED_PLUGINS.has(p.id));
  const commonPlugins = PLUGIN_REGISTRY.filter(
    (p) => !RECOMMENDED_PLUGINS.has(p.id) && !ADVANCED_PLUGINS.has(p.id),
  );
  const advancedPlugins = PLUGIN_REGISTRY.filter((p) => ADVANCED_PLUGINS.has(p.id));

  // Split skills into recommended vs packs vs individual
  const skillPacks = SKILL_REGISTRY.filter((s) => !!(s as any).bundledSkills?.length);
  const individualSkills = SKILL_REGISTRY.filter(
    (s) => !(s as any).bundledSkills?.length,
  );

  function togglePlugin(id: string, checked: boolean) {
    update({ plugins: { ...state.plugins, [id]: checked } });
  }

  function toggleSkill(id: string, checked: boolean) {
    update({ skills: { ...state.skills, [id]: checked } });
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{enabledPluginCount} plugins</Badge>
        <Badge variant="secondary">{enabledSkillCount} skills</Badge>
        <span className="text-xs text-muted-foreground">
          You can always add more later from Telegram
        </span>
      </div>

      {/* Recommended Plugins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recommended Plugins</CardTitle>
          <CardDescription>
            These are pre-selected for the best starting experience. You can disable any you don't need.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendedPlugins.map((plugin) => (
            <ToolRow
              key={plugin.id}
              name={plugin.name}
              description={plugin.description}
              checked={state.plugins[plugin.id] ?? false}
              onChange={(c) => togglePlugin(plugin.id, c)}
              recommended
            />
          ))}
        </CardContent>
      </Card>

      {/* Common Plugins */}
      {commonPlugins.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Integrations</CardTitle>
            <CardDescription>
              Connect to your social media, newsletter, and content tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {commonPlugins.map((plugin) => (
              <ToolRow
                key={plugin.id}
                name={plugin.name}
                description={plugin.description}
                checked={state.plugins[plugin.id] ?? false}
                onChange={(c) => togglePlugin(plugin.id, c)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Skills</CardTitle>
          <CardDescription>
            Pre-built automations your agent can run. Agent packs bundle multiple skills together.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Recommended individual skills first */}
          {individualSkills
            .filter((s) => RECOMMENDED_SKILLS.has(s.id))
            .map((skill) => {
              const disabled = skill.requiredPlugins.some((p) => !state.plugins[p]);
              return (
                <ToolRow
                  key={skill.id}
                  name={skill.name}
                  description={skill.description}
                  checked={state.skills[skill.id] ?? false}
                  onChange={(c) => toggleSkill(skill.id, c)}
                  disabled={disabled}
                  disabledReason={
                    disabled
                      ? `Requires: ${skill.requiredPlugins.filter((p) => !state.plugins[p]).join(", ")}`
                      : undefined
                  }
                  badge={skill.cron ? skill.cronDescription : undefined}
                  recommended
                />
              );
            })}

          {/* Skill packs */}
          {skillPacks.map((skill) => {
            const disabled = skill.requiredPlugins.some((p) => !state.plugins[p]);
            return (
              <ToolRow
                key={skill.id}
                name={skill.name}
                description={skill.description}
                checked={state.skills[skill.id] ?? false}
                onChange={(c) => toggleSkill(skill.id, c)}
                disabled={disabled}
                disabledReason={
                  disabled
                    ? `Requires: ${skill.requiredPlugins.filter((p) => !state.plugins[p]).join(", ")}`
                    : undefined
                }
                badge="Agent Pack"
                packHighlight
              />
            );
          })}

          {/* Other individual skills */}
          {individualSkills
            .filter((s) => !RECOMMENDED_SKILLS.has(s.id))
            .map((skill) => {
              const disabled = skill.requiredPlugins.some((p) => !state.plugins[p]);
              return (
                <ToolRow
                  key={skill.id}
                  name={skill.name}
                  description={skill.description}
                  checked={state.skills[skill.id] ?? false}
                  onChange={(c) => toggleSkill(skill.id, c)}
                  disabled={disabled}
                  disabledReason={
                    disabled
                      ? `Requires: ${skill.requiredPlugins.filter((p) => !state.plugins[p]).join(", ")}`
                      : undefined
                  }
                  badge={skill.cron ? skill.cronDescription : undefined}
                />
              );
            })}
        </CardContent>
      </Card>

      {/* Advanced Plugins (collapsed feel) */}
      {advancedPlugins.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Advanced Integrations</CardTitle>
            <CardDescription>
              CRM systems, research tools, and specialized integrations. Add these later if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {advancedPlugins.map((plugin) => (
              <ToolRow
                key={plugin.id}
                name={plugin.name}
                description={plugin.description}
                checked={state.plugins[plugin.id] ?? false}
                onChange={(c) => togglePlugin(plugin.id, c)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ClawHub note */}
      <p className="text-xs text-muted-foreground text-center">
        Need something specific? Your bot can install from <span className="font-medium text-foreground">49,000+ skills</span> on ClawHub — just message it on Telegram.
      </p>
    </div>
  );
}

function ToolRow({
  name,
  description,
  checked,
  onChange,
  disabled,
  disabledReason,
  badge,
  recommended,
  packHighlight,
}: {
  name: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
  badge?: string;
  recommended?: boolean;
  packHighlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border p-3 ${
        packHighlight ? "border-primary/30 bg-primary/5" : ""
      } ${recommended && checked ? "border-green-500/30 bg-green-500/5" : ""} ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0 flex-1 mr-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{name}</p>
          {recommended && (
            <Badge variant="default" className="text-[10px] bg-green-600">
              Recommended
            </Badge>
          )}
          {badge && (
            <Badge variant="secondary" className="text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        {disabledReason && (
          <p className="mt-1 text-xs text-destructive">{disabledReason}</p>
        )}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
