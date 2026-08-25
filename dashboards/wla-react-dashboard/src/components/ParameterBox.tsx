import { useState } from "react";
import type { WlaParameter } from "../lib/data_loader";

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
                <label>
                    <input
                        type="checkbox"
                        className="wla-field-check"
                        checked={parameter.checked}
                        onChange={(e) => onCheckedChange(e.target.checked)}
                    />
                    {parameter.descriptor.name}
                </label>
                <span className="wla-field-val">{parameter.weight.toFixed(1)}</span>
            </div>

            {variants && (
                <select
                    className="wla-field-preset"
                    value={variantValue}
                    disabled={disabled}
                    onChange={(e) => onVariantChange(e.target.value)}
                >
                    {Object.entries(variants).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </select>
            )}

            <input
                type="range"
                className="wla-field-slider"
                min={0.1}
                max={2.0}
                step={0.1}
                value={parameter.weight}
                disabled={disabled}
                onChange={(e) => onWeightChange(parseFloat(e.target.value))}
            />

            <div className="wla-field-desc">{parameter.descriptor.description}</div>

            {sources.length > 0 && (
                <>
                    <button
                        type="button"
                        className="wla-field-toggle"
                        onClick={() => setExpanded((e) => !e)}
                        aria-expanded={expanded}
                    >
                        {expanded ? "Hide sources ▲" : "Show sources ▼"}
                    </button>
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
