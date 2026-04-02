const { render: renderEmail } = require('@react-email/render');
const { Text } = require('@react-email/components');
const { BaseLayout } = require('./base');

function AssociationsTrialEnded({ name, unsubscribeUrl }) {
  return (
    <BaseLayout
      product="associations"
      footerText="Associations by Damp Concrete"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        Your trial has ended.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        15,000 words. Thank you for writing with Associations.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        If the connections were useful, subscribe to keep going. Your pool remains — the ghosts remember.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        <strong>$9/month</strong> or <strong>$79/year</strong>. Subscribe in the app under Account.
      </Text>
      <Text style={{ fontSize: '14px', color: '#C8C4BC', fontStyle: 'italic' }}>
        If not, your writing stays with you. Export anytime under File → Export.
      </Text>
    </BaseLayout>
  );
}

module.exports.render = async function(data) {
  const unsubscribeUrl = data.email
    ? `${process.env.MAIL_BASE_URL}/unsubscribe/associations/${data.email}`
    : null;
  return {
    subject: 'Your trial has ended',
    html: await renderEmail(<AssociationsTrialEnded {...data} unsubscribeUrl={unsubscribeUrl} />),
  };
};
