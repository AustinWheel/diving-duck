'use client';

import { Heading, Text, Flex, Column } from '@once-ui-system/core';
import { Navbar } from '@/components/Navbar';

export default function TermsPage() {
    return (
        <>
            <Navbar />
            <Column
                fillWidth
                style={{
                    minHeight: "100vh",
                    paddingTop: "144px",
                    paddingLeft: "24px",
                    paddingRight: "24px",
                }}
            >
                <Column maxWidth="m" style={{ margin: "0 auto" }} gap="l">
                <Heading variant="display-strong-l">Terms of Service</Heading>
                
                <Text variant="body-default-l">Last updated: {new Date().toLocaleDateString()}</Text>
                
                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">1. Acceptance of Terms</Heading>
                    <Text variant="body-default-m">
                        By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">2. Use License</Heading>
                    <Text variant="body-default-m">
                        Permission is granted to temporarily use this service for personal and commercial purposes. This is the grant of a license, not a transfer of title.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">3. Disclaimer</Heading>
                    <Text variant="body-default-m">
                        The materials on this service are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">4. Limitations</Heading>
                    <Text variant="body-default-m">
                        In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use this service.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">5. Privacy</Heading>
                    <Text variant="body-default-m">
                        Your use of our service is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the site and informs users of our data collection practices.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">6. Governing Law</Heading>
                    <Text variant="body-default-m">
                        These terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
                    </Text>
                </Flex>
                </Column>
            </Column>
        </>
    );
}