const { render: renderEmail } = require('@react-email/render');
const { Text, Link } = require('@react-email/components');
const { BaseLayout } = require('./base');

function PassportrParticipantStamp({ venueName, hopName, hopUrl, stampsCollected, stampsTotal }) {
  return (
    <BaseLayout
      product="passportr"
      footerText="Passportr — digital event passports"
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        You've been stamped at {venueName}.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        Your passport for <strong>{hopName}</strong> has been updated.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        {stampsCollected} of {stampsTotal} stamps collected.
        {stampsCollected < stampsTotal && ` ${stampsTotal - stampsCollected} more to complete the hop.`}
      </Text>
      {hopUrl && (
        <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8' }}>
          <Link href={hopUrl} style={{ color: '#2A2825', textDecoration: 'underline' }}>
            View your passport
          </Link>
        </Text>
      )}
    </BaseLayout>
  );
}

module.exports.render = async function(data) {
  return {
    subject: `You've been stamped at ${data.venueName}`,
    html: await renderEmail(<PassportrParticipantStamp {...data} />),
  };
};
