import { render as renderEmail } from '@react-email/render';
import { Text, Link } from '@react-email/components';
import { BaseLayout } from './base';

function AssociationsWelcome({ name }) {
  return (
    <BaseLayout
      product="associations"
      footerText="Associations by Damp Concrete"
      unsubscribeUrl={`${process.env.MAIL_BASE_URL}/unsubscribe/associations/{email}`}
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

module.exports.render = function(data) {
  return {
    subject: 'Welcome to Associations',
    html: renderEmail(<AssociationsWelcome {...data} />),
  };
};
