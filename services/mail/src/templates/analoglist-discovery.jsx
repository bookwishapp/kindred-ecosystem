const { render: renderEmail } = require('@react-email/render');
const { Text, Link } = require('@react-email/components');
const { BaseLayout } = require('./base');

function AnalogListDiscovery({ discoveries, unsubscribeUrl }) {
  return (
    <BaseLayout
      product="analoglist"
      footerText="AnalogList — your collection lists"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={{ fontSize: '24px', color: '#2AB8A0', marginBottom: '24px', fontStyle: 'italic' }}>
        Your weekly discoveries
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '24px' }}>
        Things worth keeping track of.
      </Text>
      {discoveries && discoveries.map((item, i) => (
        <div key={i} style={{ marginBottom: '24px' }}>
          <Text style={{ fontSize: '18px', color: '#2A2825', marginBottom: '8px' }}>
            <strong>{item.title}</strong>
          </Text>
          {item.description && (
            <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '8px' }}>
              {item.description}
            </Text>
          )}
          {item.url && (
            <Text style={{ fontSize: '14px', color: '#2AB8A0' }}>
              <Link href={item.url} style={{ color: '#2AB8A0', textDecoration: 'underline' }}>
                Learn more
              </Link>
            </Text>
          )}
        </div>
      ))}
    </BaseLayout>
  );
}

module.exports.render = async function(data) {
  const unsubscribeUrl = data.email
    ? `${process.env.MAIL_BASE_URL}/unsubscribe/analoglist/${data.email}`
    : null;
  return {
    subject: 'Your weekly discoveries',
    html: await renderEmail(<AnalogListDiscovery {...data} unsubscribeUrl={unsubscribeUrl} />),
  };
};
