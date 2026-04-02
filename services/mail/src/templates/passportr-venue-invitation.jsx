import { render as renderEmail } from '@react-email/render';
import { Text, Link } from '@react-email/components';
import { BaseLayout } from './base';

function PassportrVenueInvitation({ subject, body, hopUrl, venueName }) {
  return (
    <BaseLayout
      product="passportr"
      footerText="Passportr — digital event passports"
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        {subject}
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
        {body}
      </Text>
      {hopUrl && (
        <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
          <Link href={hopUrl} style={{ color: '#2A2825', textDecoration: 'underline' }}>
            View your passport and hop details
          </Link>
        </Text>
      )}
    </BaseLayout>
  );
}

module.exports.render = function(data) {
  return {
    subject: data.subject || 'You've been invited to participate',
    html: renderEmail(<PassportrVenueInvitation {...data} />),
  };
};
