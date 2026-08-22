import { Box, Card, Heading, Text, Checkbox, Flex, Slider, Strong } from "@radix-ui/themes";
import { useState } from "react";
import type { DatasetDiscriptor } from "../lib/data_loader";

export function ParameterBox({parameter} : {parameter: DatasetDiscriptor}) {
    const [value, setValue] = useState([1.0]);

    const bgcolor = 
        parameter.category == "Environment" ? "var(--environment-color)" : 
        parameter.category == "Population & Infrastructure" ? "var(--infrastructure-color)" : 
        parameter.category == "Social & Economy" ? "var(--social-color)" : "none";

    return (
        <Box className="parameter-box">
            <Card style={{ background: bgcolor }}>
                <Text size="1" align="right" as="div">{parameter.category}</Text>
                <Text size="3" as="label">
                    <Flex gap="2">
                        <Checkbox defaultChecked /> 
                        <Strong>{parameter.name}</Strong>
                    </Flex>  
                </Text>
                <Flex gap="2" mb="1" mt="3">
                    <Slider defaultValue={value} step={0.1} max={2.0} min={0.1} onValueChange={setValue} />
                    <Box width="25px"><Text size="2" as="div" align="right" style={{marginTop : "-6px"}}>{value[0].toFixed(1)}</Text></Box>
                </Flex>  
                <Text>{parameter.description}</Text>
            </Card>
        </Box>
    )
}