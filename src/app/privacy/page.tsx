'use client';

import { Heading, Text, Flex, Column } from '@once-ui-system/core';
import { Navbar } from '@/components/Navbar';

export default function PrivacyPage() {
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
                <Heading variant="display-strong-l">Privacy Policy</Heading>
                
                <Text variant="body-default-l">Last updated: {new Date().toLocaleDateString()}</Text>
                
                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">1. Information We Collect</Heading>
                    <Text variant="body-default-m">
                        We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include your name, email address, and usage data.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">2. How We Use Your Information</Heading>
                    <Text variant="body-default-m">
                        We use the information we collect to provide, maintain, and improve our services, process transactions, send notifications, and respond to your requests.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">3. Information Sharing</Heading>
                    <Text variant="body-default-m">
                        We do not sell, trade, or otherwise transfer your personal information to third parties. This does not include trusted partners who assist us in operating our service, as long as those parties agree to keep this information confidential.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">4. Data Security</Heading>
                    <Text variant="body-default-m">
                        We implement appropriate security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information and data stored on our service.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">5. Your Rights</Heading>
                    <Text variant="body-default-m">
                        You have the right to access, update, or delete your personal information. You can do this by logging into your account settings or contacting us directly.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">6. Cookies</Heading>
                    <Text variant="body-default-m">
                        We use cookies to enhance your experience, gather general visitor information, and track visits to our website. You can choose to disable cookies through your browser settings.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">7. Changes to This Policy</Heading>
                    <Text variant="body-default-m">
                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                    </Text>
                </Flex>

                <Flex direction="column" gap="m">
                    <Heading variant="heading-strong-l">8. Contact Us</Heading>
                    <Text variant="body-default-m">
                        If you have any questions about this Privacy Policy, please contact us through the contact information provided on our website.
                    </Text>
                </Flex>
                </Column>
            </Column>
        </>
    );
}