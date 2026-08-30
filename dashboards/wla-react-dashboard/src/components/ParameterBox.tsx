import { useState } from "react";
import type { WlaParameter } from "../lib/data_loader";
import { Button, Checkbox, Select, Slider, Text, Theme } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";

/**
 * Map a dataset category to the CSS modifier class controlling the field's
 * left-border accent.
 */
function categoryClass(category: string): string {
    if (category === "Environment") return "cat-environment";
    if (category === "Population & Infrastructure") return "cat-infrastructure";
    if (category === "Social & Economy") return "cat-social";
    return "cat-other";
}

/**
 * Slim, single-column parameter row: checkbox + label + numeric weight badge on
 * top, optional variant select, slider, description, and an expand-for-sources
 * toggle. Renders as a `.wla-field` inside the sticky Parameters panel.
 */
export function ParameterBox({
    parameter,
    onWeightChange,
    onCheckedChange,
    onVariantChange,
}: {
    parameter: WlaParameter;
    onWeightChange: (w: number) => void;
    onCheckedChange: (c: boolean) => void;
    onVariantChange: (v: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const sources = parameter.descriptor.sources ?? [];
    const disabled = !parameter.checked;
    const variants = parameter.descriptor.variants
        ? (parameter.descriptor.variants as Record<string, string>)
        : null;
    const variantValue = parameter.variant ?? parameter.descriptor.defaultVariant ?? "";

    return (
        <div className={`wla-field ${categoryClass(parameter.descriptor.category)} ${disabled ? "is-disabled" : ""}`}>
            <div className="wla-field-top">
                <Text as="label" size="2" weight="bold" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <Checkbox
                        size="1"
                        checked={parameter.checked}
                        onCheckedChange={(c) => onCheckedChange(c === true)}
                    />
                    {parameter.descriptor.name}
                    {parameter.descriptor.countryLevel && (
                        <div
                            className="wla-field-country"
                            title="This metric uses country-level data — values are largely flat inside country borders and don't reflect intra-country variation."
                        >
                            country level
                        </div>
                    )}
                </Text>
                <span className="wla-field-val">{(parameter.weight * parameter.descriptor.correlationMultiplier).toFixed(1)}</span>
            </div>

            {variants && (
                <Theme appearance="light" accentColor="amber" grayColor="olive" radius="medium" hasBackground={false}>
                    <Select.Root
                        value={variantValue}
                        disabled={disabled}
                        onValueChange={onVariantChange}
                        size="1"
                    >
                        <Select.Trigger style={{ width: "100%", marginTop: 8 }} />
                        <Select.Content>
                            {Object.entries(variants).map(([key, label]) => (
                                <Select.Item key={key} value={key}>{label}</Select.Item>
                            ))}
                        </Select.Content>
                    </Select.Root>
                </Theme>
            )}

            <Slider
                size="1"
                min={0.1}
                max={2.0}
                step={0.1}
                value={[parameter.weight]}
                disabled={disabled}
                onValueChange={(v) => onWeightChange(v[0])}
                style={{ marginTop: 12 }}
            />

            <div className="wla-field-desc">{parameter.descriptor.description}</div>

            {sources.length > 0 && (
                <>
                    <Button
                        type="button"
                        variant="ghost"
                        size="1"
                        color="gray"
                        onClick={() => setExpanded((e) => !e)}
                        aria-expanded={expanded}
                        style={{ marginTop: 8 }}
                    >
                        {expanded ? "Hide sources" : "Show sources"}
                        {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </Button>
                    {expanded && (
                        <div className="wla-field-sources">
                            {sources.map((src) => (
                                <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer">
                                    {src.name}
                                </a>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
