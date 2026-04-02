import { render as renderEmail } from '@react-email/render';
import { Text, Link } from '@react-email/components';
import { BaseLayout } from './base';

function AssociationsTrialEnding({ name }) {
  return (
    <BaseLayout
      product="associations"
      footerText="Associations by Damp Concrete"
      unsubscribeUrl={`${process.env.MAIL_BASE_URL}/unsubscribe/associations/{email}`}
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        Your ghosts know you a little now.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        13,000 words written. Your trial is almost done.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        If Associations has been useful — if the connections have started to surprise you — subscribe to keep writing.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        <strong>$9/month</strong> or <strong>$79/year</strong>. One subscription, all projects, unlimited writing.
      </Text>
      <Text style={{ fontSize: '14px', color: '#C8C4BC', fontStyle: 'italic' }}>
        Subscribe in the app under Account.
      </Text>
    </BaseLayout>
  );
}

module.exports.render = function(data) {
  return {
    subject: 'Your ghosts know you a little now',
    html: renderEmail(<AssociationsTrialEnding {...data} />),
  };
};
