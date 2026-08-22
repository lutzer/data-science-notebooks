import { Box, Card, Select, Text, Checkbox, Flex, Slider, Strong } from "@radix-ui/themes";
import { useState } from "react";
import type { DatasetDiscriptor } from "../lib/data_loader";

export function ParameterBox({parameter} : {parameter: DatasetDiscriptor}) {
    const [value, setValue] = useState([1.0]);
    const [checked, setChecked] = useState<boolean  | "indeterminate">(true);

    const bgcolor = 
        parameter.category == "Environment" ? "var(--environment-color)" : 
        parameter.category == "Population & Infrastructure" ? "var(--infrastructure-color)" : 
        parameter.category == "Social & Economy" ? "var(--social-color)" : "none";

    function renderVariants() {
        if (parameter.variants)
            return (
                <Flex gap="2" align="center" mt="2">
                    <Select.Root defaultValue={Object.entries(parameter.variants)[0][0]} disabled={!checked}>
                        <Select.Trigger style={{ flex: 1 }} />
                        <Select.Content>
                            <Select.Group>
                            <Select.Label>Personal Preference</Select.Label>
                            { Object.entries(parameter.variants).map(([key,val]) => {
                            return (
                                    <Select.Item value={key}>{val}</Select.Item>
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

    return (
        <Box className="parameter-box">
            <Card style={{ background: bgcolor }}>
                {/* <Text size="1" align="right" as="div">{parameter.category}</Text> */}
                <Text size="3" as="label">
                    <Flex gap="2">
                        <Checkbox checked={checked} onCheckedChange={setChecked} /> 
                        <Strong>{parameter.name}</Strong>
                    </Flex>  
                </Text>
                { renderVariants() }
                <Flex gap="2" mb="1" mt="3">
                    <Slider defaultValue={value} step={0.1} max={2.0} min={0.1} onValueChange={setValue} disabled={!checked} />
                    <Box width="25px"><Text size="2" as="div" align="right" style={{marginTop : "-6px"}}>{value[0].toFixed(1)}</Text></Box>
                </Flex>  
                <Text>{parameter.description}</Text>
            </Card>
        </Box>
    )
}