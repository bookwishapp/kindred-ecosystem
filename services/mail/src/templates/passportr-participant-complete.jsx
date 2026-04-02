import { render as renderEmail } from '@react-email/render';
import { Text, Link } from '@react-email/components';
import { BaseLayout } from './base';

function PassportrParticipantComplete({ hopName, hopUrl, rewardInfo }) {
  return (
    <BaseLayout
      product="passportr"
      footerText="Passportr — digital event passports"
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        You've completed the {hopName}!
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        Congratulations — you've collected all stamps.
      </Text>
      {rewardInfo && (
        <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px', whiteSpace: 'pre-wrap' }}>
          {rewardInfo}
        </Text>
      )}
      {hopUrl && (
        <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8' }}>
          <Link href={hopUrl} style={{ color: '#2A2825', textDecoration: 'underline' }}>
            View your completed passport
          </Link>
        </Text>
      )}
    </BaseLayout>
  );
}

module.exports.render = function(data) {
  return {
    subject: `You've completed the ${data.hopName}!`,
    html: renderEmail(<PassportrParticipantComplete {...data} />),
  };
};
