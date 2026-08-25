import { useLayoutEffect, useRef, useState } from "react";
import { Box, Card, Select, Text, Checkbox, Flex, Slider, Strong, Link, Button } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import type { WlaParameter } from "../lib/data_loader";

export function ParameterBox({parameter, onWeightChange, onCheckedChange, onVariantChange}
    : {parameter: WlaParameter, onWeightChange : (w: number) => void, onCheckedChange : (c: boolean) => void, onVariantChange : (v: string) => void}) {

    const bgcolor =
        parameter.descriptor.category == "Environment" ? "var(--environment-color)" :
        parameter.descriptor.category == "Population & Infrastructure" ? "var(--infrastructure-color)" :
        parameter.descriptor.category == "Social & Economy" ? "var(--social-color)" : "none";

    const [expanded, setExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    function renderVariants() {
        if (parameter.descriptor.variants)
            return (
                <Flex gap="2" align="center" mt="2">
                    <Select.Root value={parameter.variant ?? parameter.descriptor.defaultVariant} disabled={!parameter.checked} onValueChange={onVariantChange}>
                        <Select.Trigger style={{ flex: 1 }} />
                        <Select.Content>
                            <Select.Group>
                            <Select.Label>Personal Preference</Select.Label>
                            { Object.entries(parameter.descriptor.variants).map(([key,val]) => {
                            return (
                                    <Select.Item key={key} value={key}>{val}</Select.Item>
                            )
                            })}
                            </Select.Group>
                        </Select.Content>
                    </Select.Root>
                </Flex>
            );
        else
            return;
    }

    const sources = parameter.descriptor.sources ?? [];

    return (
        <Box className="parameter-box">
            <Card style={{ background: bgcolor }}>
                {/* <Text size="1" align="right" as="div">{parameter.category}</Text> */}
                <Text size="3" as="label">
                    <Flex gap="2">
                        <Checkbox checked={parameter.checked} onCheckedChange={(c) => onCheckedChange(c === true)} />
                        <Strong>{parameter.descriptor.name}</Strong>
                    </Flex>
                </Text>
                { renderVariants() }
                <Flex gap="2" mb="1" mt="3">
                    <Slider value={[parameter.weight]} step={0.1} max={2.0} min={0.1} onValueChange={(v) => onWeightChange(v[0])} disabled={!parameter.checked} />
                    <Box width="25px"><Text size="2" as="div" align="right" style={{marginTop : "-6px"}}>{parameter.weight.toFixed(1)}</Text></Box>
                </Flex>
                <Box
                    ref={contentRef}
                    style={{
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    <Text as="p">{parameter.descriptor.description}</Text>
                    {expanded && sources.length > 0 && (
                        <Box mt="2">
                            <Text weight="bold" as="div">Sources</Text>
                            <Flex direction="column" gap="1" mt="1">
                                {sources.map((src) => (
                                    <Link key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" size="2">
                                        {src.name}
                                    </Link>
                                ))}
                            </Flex>
                        </Box>
                    )}
                </Box>
                <Button
                    variant="ghost"
                    size="2"
                    mt="2"
                    onClick={() => setExpanded((e) => !e)}
                    aria-expanded={expanded}
                >
                    {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    {expanded ? "Show less" : "Show more"}
                </Button>
            </Card>
        </Box>
    )
}
