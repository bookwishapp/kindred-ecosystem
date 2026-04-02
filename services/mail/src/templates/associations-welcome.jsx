const { render: renderEmail } = require('@react-email/render');
const { Text, Link } = require('@react-email/components');
const { BaseLayout } = require('./base');

function AssociationsWelcome({ name, unsubscribeUrl }) {
  return (
    <BaseLayout
      product="associations"
      footerText="Associations by Damp Concrete"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        Welcome to Associations.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        Your writing now has a memory.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        As you write, Associations watches for connections — things you've said before that belong alongside what you're writing now. Not suggestions. Not generated text. Your own words, returning when they matter.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        The pool starts empty. Add your existing writing under Project → Folders. The more you give it, the more it finds.
      </Text>
      <Text style={{ fontSize: '14px', color: '#C8C4BC', fontStyle: 'italic' }}>
        Day one, it listens. Month three, it starts to surprise you.
      </Text>
    </BaseLayout>
  );
}

module.exports.render = async function(data) {
  const unsubscribeUrl = data.email
    ? `${process.env.MAIL_BASE_URL}/unsubscribe/associations/${data.email}`
    : null;
  return {
    subject: 'Welcome to Associations',
    html: await renderEmail(<AssociationsWelcome {...data} unsubscribeUrl={unsubscribeUrl} />),
  };
};
