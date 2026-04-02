const { render: renderEmail } = require('@react-email/render');
const { Text, Link } = require('@react-email/components');
const { BaseLayout } = require('./base');

function AssociationsPaymentReceipt({ amount, date, plan, unsubscribeUrl }) {
  return (
    <BaseLayout
      product="associations"
      footerText="Associations by Damp Concrete"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={{ fontSize: '24px', color: '#2A2825', marginBottom: '24px', fontStyle: 'italic' }}>
        Payment received.
      </Text>
      <Text style={{ fontSize: '16px', color: '#6A6660', lineHeight: '1.8', marginBottom: '16px' }}>
        <strong>${amount}</strong> — {plan}
      </Text>
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
  const unsubscribeUrl = data.email
    ? `${process.env.MAIL_BASE_URL}/unsubscribe/associations/${data.email}`
    : null;
  return {
    subject: 'Associations — payment received',
    html: await renderEmail(<AssociationsPaymentReceipt {...data} unsubscribeUrl={unsubscribeUrl} />),
  };
};
