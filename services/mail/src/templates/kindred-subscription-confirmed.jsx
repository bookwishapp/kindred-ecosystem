const { render: renderEmail } = require('@react-email/render');
const { Text, Link } = require('@react-email/components');
const { BaseLayout } = require('./base');

function KindredSubscriptionConfirmed({ plan, amount }) {
  return (
    <BaseLayout
      product="kindred"
      footerText="Kindred — keep the people you care about close"
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        You're subscribed to Kindred.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        Thank you for subscribing to <strong>{plan}</strong> for <strong>${amount}</strong>.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        Your Kin remain with you. Nothing changes except having space to keep everyone close.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        <Link href="https://kindred.dampconcrete.com" style={{ color: '#2A2825', textDecoration: 'underline' }}>
          Open Kindred
        </Link>
      </Text>
    </BaseLayout>
  );
}

module.exports.render = async function(data) {
  return {
    subject: 'Welcome to Kindred — you\'re subscribed',
    html: await renderEmail(<KindredSubscriptionConfirmed {...data} />),
  };
};
