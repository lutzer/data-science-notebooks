import { Box, Card, Heading, Text, Checkbox, Flex, Slider } from "@radix-ui/themes";
import { useState } from "react";

export function ParameterBox({name, description, datasets = []} : {name: string, description: string, datasets? : {name: string, url: string}[]}) {
    const [value, setValue] = useState([1.0]);
    
    return (
        <Box className="parameter-box">
            <Card>
                <Heading size="3" mb="3">
                    <Flex gap="2">
                        <Checkbox defaultChecked /> 
                        {name}
                    </Flex>  
                </Heading>
                <Flex gap="2" mb="1">
                    <Slider defaultValue={value} step={0.1} max={2.0} onValueChange={setValue} />
                    <Box width="25px"><Text size="2" as="div" align="right" style={{marginTop : "-6px"}}>{value[0].toFixed(1)}</Text></Box>
                </Flex>  
                <Text>{description}</Text>
            </Card>
        </Box>
    )
}