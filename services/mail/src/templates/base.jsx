import {
  Html, Head, Body, Container, Section, Text, Link, Hr, Font
} from '@react-email/components';

export function BaseLayout({ product, children, unsubscribeUrl, footerText }) {
  const colors = {
    'terryheath': { accent: '#2A2825', bg: '#F5F3EF' },
    'passportr': { accent: '#2A2825', bg: '#FFFFFF' },
    'associations': { accent: '#2A2825', bg: '#F5F3EF' },
    'analoglist': { accent: '#2AB8A0', bg: '#FFFFFF' },
  };

  const theme = colors[product] || colors['terryheath'];

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Georgia"
          fallbackFontFamily="serif"
        />
      </Head>
      <Body style={{ backgroundColor: theme.bg, margin: 0, padding: 0, fontFamily: 'Georgia, serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px' }}>
          {children}
          <Hr style={{ borderColor: 'rgba(42,40,37,0.1)', margin: '40px 0 24px' }} />
          <Text style={{ fontSize: '12px', color: '#C8C4BC', lineHeight: '1.6', margin: 0 }}>
            {footerText}
            {unsubscribeUrl && (
              <> — <Link href={unsubscribeUrl} style={{ color: '#C8C4BC' }}>unsubscribe</Link></>
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
