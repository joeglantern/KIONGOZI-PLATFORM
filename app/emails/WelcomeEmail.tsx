import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
    firstName?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : '';

export const WelcomeEmail = ({
    firstName = 'Future Leader',
}: WelcomeEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Welcome to Kiongozi - Kenya's Civic Action Platform</Preview>
            <Tailwind>
                <Body className="bg-gray-50 my-auto mx-auto font-sans px-2">
                    <Container className="border border-solid border-gray-200 rounded-2xl my-[40px] mx-auto p-[20px] max-w-[465px] bg-white">
                        <Section className="mt-[32px] mb-[20px] text-center">
                            <Img
                                src={`${baseUrl}/logo.png`}
                                width="80"
                                height="80"
                                alt="Kiongozi Logo"
                                className="mx-auto"
                            />
                        </Section>

                        <Heading className="text-gray-900 text-[24px] font-bold text-center p-0 my-[30px] mx-0">
                            Karibu, {firstName}! 🇰🇪
                        </Heading>

                        <Text className="text-gray-700 text-[16px] leading-[24px] mb-[24px]">
                            We're excited to have you join The Kiongozi Platform. You are now part of a growing community dedicated to digital innovation, sustainable practices, and civic advocacy across Kenya.
                        </Text>

                        <Text className="text-gray-700 text-[16px] leading-[24px] mb-[24px]">
                            Here is what you can do right now to get started:
                        </Text>

                        <Section className="bg-orange-50 rounded-xl p-4 mb-6">
                            <Text className="text-orange-800 font-bold m-0 mb-2">📚 Start Learning</Text>
                            <Text className="text-orange-700 text-[14px] m-0">Gain skills in tech and sustainability completely free.</Text>
                        </Section>

                        <Section className="bg-blue-50 rounded-xl p-4 mb-6">
                            <Text className="text-blue-800 font-bold m-0 mb-2">🤝 Join the Community</Text>
                            <Text className="text-blue-700 text-[14px] m-0">Connect with other changemakers, sign petitions, and attend Town Halls.</Text>
                        </Section>

                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-orange-600 rounded-lg text-white text-[14px] font-bold no-underline text-center px-6 py-3"
                                href={`${baseUrl}/dashboard`}
                            >
                                Go to Dashboard
                            </Button>
                        </Section>

                        <Text className="text-gray-500 text-[12px] leading-[24px] text-center mt-12 mb-0">
                            You are receiving this because you signed up for the Kiongozi Platform. <br />
                            Kiongozi HQ, Nairobi, Kenya
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default WelcomeEmail;
