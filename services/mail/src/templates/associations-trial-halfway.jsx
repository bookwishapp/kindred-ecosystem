const { render: renderEmail } = require('@react-email/render');
const { Text } = require('@react-email/components');
const { BaseLayout } = require('./base');

function AssociationsTrialHalfway({ name, unsubscribeUrl }) {
  return (
    <BaseLayout
      product="associations"
      footerText="Associations by Damp Concrete"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        Your pool is growing.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        You're halfway through your trial. 7,500 words written.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        If you haven't already, add your existing writing under Project → Folders. Drafts, notes, story bible — anything related to what you're working on.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        The more material in the pool, the more it finds. A pool with three months of writing starts to know you.
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
    subject: 'Your pool is growing',
    html: await renderEmail(<AssociationsTrialHalfway {...data} unsubscribeUrl={unsubscribeUrl} />),
  };
};
