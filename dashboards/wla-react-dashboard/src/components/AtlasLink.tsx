import { AlertDialog, Button, Code, Flex, Text, ScrollArea } from "@radix-ui/themes";
import type { WlaParameter } from "../lib/data_loader";
import { encodeObjectToHash, type SavedParam } from "../lib/utils";

export function AtlasLink({parameters} : { parameters: WlaParameter[]}) {

    function createParameterLink() {
        let hashedWeights = parameters.reduce<Record<string, SavedParam>>((acc, p) => {
            return {...acc, [p.descriptor.id] : { weight: p.weight, checked: p.checked, variant: p.variant }};
        }, {});
        const parameterHash = encodeObjectToHash(hashedWeights)
        return `${window.location.origin}${import.meta.env.BASE_URL}#${parameterHash}`;
    }

    async function copyToClipboard(text : string) {
        await navigator.clipboard.writeText(text);
    }

    return (
        <AlertDialog.Root>
            <AlertDialog.Trigger>
            <Button mt="3">Get Personal Atlas Link</Button>
            </AlertDialog.Trigger>
                <AlertDialog.Content maxWidth="300px">
                    <AlertDialog.Title>Parameter Link</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        Copy this link to save the selected parameters
                    </AlertDialog.Description>

                    <Flex direction="column" mt="3">
                        <ScrollArea style={{ maxHeight : "300px"}}>
                            <Code style={{
                                display: "block",
                                whiteSpace: "pre-wrap",   // allow wrapping instead of one long line
                                wordBreak: "break-all",   // break long words/URLs even without spaces
                                overflowWrap: "break-word",
                            }}>
                            {createParameterLink()}
                            </Code>
                        </ScrollArea>
                        <AlertDialog.Action>
                            <Button my="3" onClick={() => copyToClipboard(createParameterLink())}>
                                Copy to clipboard
                            </Button>
                        </AlertDialog.Action>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <AlertDialog.Action>
                        <Button>Close</Button>
                        </AlertDialog.Action>
                    </Flex>
                </AlertDialog.Content>
        </AlertDialog.Root>
    )
}