const { render: renderEmail } = require('@react-email/render');
const { Text, Link } = require('@react-email/components');
const { BaseLayout } = require('./base');

function AnalogListSubscriptionConfirmed({ plan, amount }) {
  return (
    <BaseLayout
      product="analoglist"
      footerText="AnalogList — your collection lists"
    >
      <Text style={{ fontSize: '24px', color: '#2AB8A0', marginBottom: '24px', fontStyle: 'italic' }}>
        You're subscribed to AnalogList.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        Thank you for subscribing to <strong>{plan}</strong> for <strong>${amount}</strong>.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        <Link href="https://analoglist.dampconcrete.com" style={{ color: '#2AB8A0', textDecoration: 'underline' }}>
          Open AnalogList
        </Link>
      </Text>
    </BaseLayout>
  );
}

module.exports.render = async function(data) {
  return {
    subject: 'Welcome to AnalogList — you\'re subscribed',
    html: await renderEmail(<AnalogListSubscriptionConfirmed {...data} />),
  };
};
