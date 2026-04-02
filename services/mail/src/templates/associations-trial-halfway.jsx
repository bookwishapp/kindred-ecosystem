import { render as renderEmail } from '@react-email/render';
import { Text } from '@react-email/components';
import { BaseLayout } from './base';

function AssociationsTrialHalfway({ name }) {
  return (
    <BaseLayout
      product="associations"
      footerText="Associations by Damp Concrete"
      unsubscribeUrl={`${process.env.MAIL_BASE_URL}/unsubscribe/associations/{email}`}
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

module.exports.render = function(data) {
  return {
    subject: 'Your pool is growing',
    html: renderEmail(<AssociationsTrialHalfway {...data} />),
  };
};
