const { render: renderEmail } = require('@react-email/render');
const { Text, Link } = require('@react-email/components');
const { BaseLayout } = require('./base');

function PassportrSubscriptionConfirmed({ plan, amount, organizationName }) {
  return (
    <BaseLayout
      product="passportr"
      footerText="Passportr — digital event passports"
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        You're subscribed to Passportr.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        Thank you for subscribing to <strong>{plan}</strong> for <strong>${amount}</strong>.
      </Text>
      {organizationName && (
        <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
          Organization: {organizationName}
        </Text>
      )}
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        <Link href="https://passportr.dampconcrete.com/organize" style={{ color: '#2A2825', textDecoration: 'underline' }}>
          Go to Passportr Dashboard
        </Link>
      </Text>
    </BaseLayout>
  );
}

module.exports.render = async function(data) {
  return {
    subject: 'Welcome to Passportr — you\'re subscribed',
    html: await renderEmail(<PassportrSubscriptionConfirmed {...data} />),
  };
};
