const { render: renderEmail } = require('@react-email/render');
const { Text, Link } = require('@react-email/components');
const { BaseLayout } = require('./base');

function PassportrPaymentReceipt({ amount, date, plan, organizationName }) {
  return (
    <BaseLayout
      product="passportr"
      footerText="Passportr — digital event passports"
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        Payment received.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        <strong>${amount}</strong> — {plan}
      </Text>
      {organizationName && (
        <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
          Organization: {organizationName}
        </Text>
      )}
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '32px' }}>
        Charged on {date}
      </Text>
      <Text style={{ fontSize: '14px', color: '#C8C4BC', lineHeight: '1.6' }}>
        Questions about billing? Email{' '}
        <Link href="mailto:terry@terryheath.com" style={{ color: '#C8C4BC', textDecoration: 'underline' }}>
          terry@terryheath.com
        </Link>
      </Text>
    </BaseLayout>
  );
}

module.exports.render = async function(data) {
  return {
    subject: 'Passportr — payment received',
    html: await renderEmail(<PassportrPaymentReceipt {...data} />),
  };
};
