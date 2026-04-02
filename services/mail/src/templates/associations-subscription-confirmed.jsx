const { render: renderEmail } = require('@react-email/render');
const { Text, Link } = require('@react-email/components');
const { BaseLayout } = require('./base');

function AssociationsSubscriptionConfirmed({ plan, amount, unsubscribeUrl }) {
  return (
    <BaseLayout
      product="associations"
      footerText="Associations by Damp Concrete"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        You're subscribed to Associations.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        Thank you for subscribing to <strong>{plan}</strong> for <strong>${amount}</strong>.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        Your pool and all your writing carry over. Nothing changes except unlimited access.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        <Link href="https://associations.dampconcrete.com" style={{ color: '#2A2825', textDecoration: 'underline' }}>
          Open Associations
        </Link>
      </Text>
      <Text style={{ fontSize: '14px', color: '#C8C4BC', fontStyle: 'italic' }}>
        Keep writing.
      </Text>
    </BaseLayout>
  );
}

module.exports.render = async function(data) {
  const unsubscribeUrl = data.email
    ? `${process.env.MAIL_BASE_URL}/unsubscribe/associations/${data.email}`
    : null;
  return {
    subject: 'Welcome to Associations — you\'re subscribed',
    html: await renderEmail(<AssociationsSubscriptionConfirmed {...data} unsubscribeUrl={unsubscribeUrl} />),
  };
};
